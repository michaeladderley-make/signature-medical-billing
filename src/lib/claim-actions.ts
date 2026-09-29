import { advanceSteps, stepsThrough, type Claim, type Desk } from "@/lib/claims";

export function fieldValue(claim: Claim, label: string) {
  return claim.fields.find((field) => field.label === label)?.value ?? "";
}

function setField(claim: Claim, label: string, value: string): Claim {
  const exists = claim.fields.some((field) => field.label === label);
  return {
    ...claim,
    fields: exists
      ? claim.fields.map((field) => (field.label === label ? { ...field, value } : field))
      : [...claim.fields, { label, value }],
  };
}

export const SCAN_ACTION = "Scan for add-ons & overnight charges";
export const QA_DONE = "QA done — send to Alicia";
export const REACHED = "Reached — update log and refer back";
const QA_STEP = "Mallory QA & reviewed-thru";
const ALICIA_STEP = "Alicia final review & sends";

export const CREDENTIALING_STEPS = [
  "Team receives credentialing request or denial",
  "Checks CAQH for provider details",
  "Check state boards / licensing websites",
  "Emails clinic for information or signature",
  "Follows carrier's process to submit",
  "Credentials updated; denied claims appealed",
];

export function callAttempts(claim: Claim) {
  const logged = Number(fieldValue(claim, "Attempts").split(" ")[0]);
  if (Number.isFinite(logged) && logged > 0) return logged;
  return claim.statusLabel === "Second attempt" ? 2 : 1;
}

const TASK_MINUTES: Record<string, number> = {
  "Mark step done": 10,
  "Correct in AdvancedMD": 12,
  [SCAN_ACTION]: 8,
  [QA_DONE]: 6,
  "Send back with screenshot": 5,
  "Turn row green": 5,
  "Pull op report and send": 18,
  "Send by portal": 8,
  "Move along": 3,
  "Post payment": 7,
  "Unapply copay": 9,
  "Adjust off": 6,
  "Correct and resubmit": 15,
  "Dispute": 30,
  "Not on file — mail it": 12,
  "On file — send back": 9,
  [REACHED]: 4,
  "Call again": 6,
};

function minutesFor(action: string) {
  return TASK_MINUTES[action];
}

function note(claim: Claim, actor: string, text: string, minutes?: number): Claim {
  return {
    ...claim,
    history: [
      ...claim.history,
      {
        id: `${claim.id}-${claim.history.length + 1}`,
        date: "Today",
        source: actor,
        audience: actor,
        text,
        minutes,
      },
    ],
  };
}

function handoff(
  claim: Claim,
  desk: Desk,
  owner: string,
  labels: string[],
  current: number,
  status: string,
  next: string,
  actions: string[],
): Claim {
  return {
    ...claim,
    desk,
    owner,
    steps: stepsThrough(labels, current),
    statusLabel: status,
    nextStep: next,
    actions,
    queue: claim.queue === "deadline" ? "deadline" : "open",
  };
}

function moveTo(claim: Claim, label: string) {
  const labels = claim.steps.map((step) => step.label);
  const index = labels.indexOf(label);
  return index === -1 ? advanceSteps(claim.steps) : stepsThrough(labels, index);
}

function unsafeToPost(claim: Claim) {
  const paid = fieldValue(claim, "Insurance paid");
  const writeOff = fieldValue(claim, "Write-off");
  return paid === "$0.00" && (writeOff === "None" || writeOff === "$0.00");
}

export function actionBlock(claim: Claim, action: string): string | null {
  if (action === "Post payment" && unsafeToPost(claim)) {
    return "No payment and no write-off. Hold it so the patient is not billed.";
  }
  if (
    action === "Post payment" &&
    fieldValue(claim, "Over-apply").startsWith("$") &&
    fieldValue(claim, "Over-apply") !== "Cleared"
  ) {
    return "Unapply the copay before posting.";
  }
  if (action === SCAN_ACTION && fieldValue(claim, "Auth number") === "Missing") {
    return "The auth number is still missing.";
  }
  if (action === REACHED && !claim.history.some((entry) => entry.audience === "Call Center")) {
    return "Log the call on this claim first.";
  }
  if (action === "Send patient a statement" && callAttempts(claim) < 3) {
    return "Make three attempts to call the patient first.";
  }
  if (action === "Move along" && claim.desk === "records" && claim.files.length === 0) {
    return "Attach the record first.";
  }
  if (action === "Adjust off") {
    const tries = fieldValue(claim, "Tries used");
    const used = Number(tries.split(" ")[0]);
    const limit = Number(tries.split("of ")[1]);
    if (Number.isFinite(used) && Number.isFinite(limit) && used < limit) {
      return "Tries are left. Dispute it or correct it first.";
    }
  }
  return null;
}

export function stepBlock(claim: Claim): string | null {
  const current = claim.steps.find((step) => step.status === "current");
  if (!current) return "Nothing is waiting on this claim.";
  if (current.label === "Waiting for medical records" && claim.files.length === 0) {
    return "The record is not attached.";
  }
  if (current.label === "Charge review" && fieldValue(claim, "Auth number") === "Missing") {
    return "The auth number is still missing.";
  }
  if ((current.label === "ERA review" || current.label === "Hold") && unsafeToPost(claim)) {
    return "Hold this line. Posting it would bill the patient.";
  }
  return null;
}

export function applyAction(claim: Claim, action: string, actor: string): Claim {
  if (actionBlock(claim, action)) return claim;
  const noted = note(
    claim,
    actor,
    action === "Attach record" ? "Record attached." : action === "Mark step done" ? "Step done." : `${action}.`,
    minutesFor(action),
  );

  if (action === "No — routed to Renee (Denials)") {
    return handoff(
      {
        ...setField(noted, "Authorization on file", "No"),
        ...{ flag: "Red" },
      },
      "appeals",
      "Claims Appeals",
      [
        "TL finds medical record denial in EDI report, AMD, or AR report",
        "Look up patient's medical records in AMD",
        "Routed to Renee (Denials)",
      ],
      2,
      "Routed to Renee (Denials)",
      "No authorization is on file. Appeals has the denial.",
      ["Dispute"],
    );
  }

  if (action === "Yes — authorization is on file") {
    noted.history[noted.history.length - 1] = {
      ...noted.history[noted.history.length - 1],
      text: "Suggestion flagged. Authorization is on file.",
    };
    return {
      ...setField(noted, "Authorization on file", "Yes"),
      steps: advanceSteps(claim.steps),
      statusLabel: "TL pulls medical record from the EHR",
      actions: ["TL pulls medical record from the EHR"],
      nextStep: "Pull the record, then verify codes, date of service, and the provider's signature.",
    };
  }

  if (action === "TL pulls medical record from the EHR") {
    const file = "operative-note.pdf";
    return {
      ...setField(noted, "Record", file),
      files: claim.files.includes(file) ? claim.files : [...claim.files, file],
      steps: advanceSteps(claim.steps),
      statusLabel: "TL verifies signed codes, DOS, provider's signature",
      actions: ["TL verifies signed codes, DOS, provider's signature"],
      nextStep: "Verify the signed codes, the date of service, and the provider's signature.",
    };
  }

  if (action === "TL verifies signed codes, DOS, provider's signature") {
    return {
      ...setField(setField(setField(noted, "Codes", "Checked"), "Date of service check", "Checked"), "Provider signature", "Checked"),
      steps: advanceSteps(claim.steps),
      statusLabel: "Tracker Lead sends to requestor",
      actions: [
        "Provider Portal (preferred)",
        "Vonage Fax (2nd)",
        "Email (3rd)",
        "Mail via postal methods (last resort)",
      ],
      nextStep: "Send the record. Portal first, then fax, then email, then mail.",
    };
  }

  if (
    action === "Provider Portal (preferred)" ||
    action === "Vonage Fax (2nd)" ||
    action === "Email (3rd)" ||
    action === "Mail via postal methods (last resort)"
  ) {
    return {
      ...setField(noted, "Sent by", action),
      steps: advanceSteps(claim.steps),
      statusLabel: "Tracker Lead updates Tracker",
      actions: ["Tracker Lead updates Tracker"],
      nextStep: "Update the tracker now that the record was sent.",
    };
  }

  if (action === "Tracker Lead updates Tracker") {
    return {
      ...setField(noted, "Tracker", "Updated"),
      steps: advanceSteps(claim.steps),
      statusLabel: "Tracker updated",
      actions: [],
      nextStep: "The tracker shows the record was sent.",
    };
  }

  if (action === "Attach record") {
    const missing = fieldValue(claim, "Missing");
    const file = missing.toLowerCase().includes("office") ? "office-note.pdf" : "operative-note.pdf";
    return {
      ...setField(noted, "Record", file),
      files: [...claim.files, file],
      statusLabel: "Record attached",
      actions: ["Bill matches — send PDF", "Bill doesn't match — ask office"],
      nextStep: "Does the bill match the services reported in the record?",
    };
  }

  if (action === "Bill matches — send PDF") {
    return {
      ...setField(noted, "Completed folder", "Saved, initialed, dated"),
      statusLabel: "Record sent; marked complete",
      queue: "waiting",
      actions: [],
      steps: advanceSteps(claim.steps),
      nextStep: "The PDF was sent and filed as Completed. Payer follow-up waits for the next AR run.",
    };
  }

  if (action === "Bill doesn't match — ask office") {
    return {
      ...noted,
      statusLabel: "Missing information requested",
      queue: "waiting",
      actions: ["Bill valid — correct in AMD and send", "Bill not valid — void claim"],
      nextStep: "The office was asked for the missing information. Is the bill valid?",
    };
  }

  if (action === "Bill valid — correct in AMD and send") {
    return {
      ...noted,
      statusLabel: "Corrected in AMD; sent; complete",
      actions: [],
      steps: advanceSteps(claim.steps),
      nextStep: "Amanda sent the corrected record to the requestor and marked it complete.",
    };
  }

  if (action === "Bill not valid — void claim") {
    return {
      ...noted,
      statusLabel: "Voided claim sent; charges deleted",
      queue: "waiting",
      actions: [],
      nextStep: "Amanda sent a voided claim to insurance and deleted the charges.",
    };
  }

  if (action === "Not on file — rebill claim") {
    return {
      ...noted,
      statusLabel: "Rebilled",
      actions: [],
      steps: advanceSteps(claim.steps),
      nextStep: "The claim was rebilled. The row stays white until an EOB comes back.",
    };
  }

  if (action === "Record requested — upload to portal") {
    return {
      ...setField(noted, "Record", "Uploaded to the payer portal"),
      flag: "Yellow",
      statusLabel: "Record uploaded to portal",
      actions: [],
      steps: advanceSteps(claim.steps),
      nextStep: "The medical record is on the payer portal. The claim stays open until it is paid.",
    };
  }

  if (action === "Simple — resolve and tell the clinic" || action === "Resolved — tell the clinic") {
    return {
      ...noted,
      statusLabel: "Resolved; clinic told",
      queue: "waiting",
      actions: [],
      steps: claim.steps.map((step) => ({ ...step, status: "complete" as const })),
      nextStep: "The clinic has the answer.",
    };
  }

  if (action === "Complex — investigate") {
    return {
      ...noted,
      statusLabel: "Investigating",
      actions: ["Resolved — tell the clinic"],
      nextStep: "Investigate and resolve. Complex issues can take up to four days.",
    };
  }

  if (action === "Forward to the responsible team") {
    return {
      ...noted,
      statusLabel: "Forwarded to responsible staff",
      queue: "waiting",
      actions: ["Resolved — tell the clinic"],
      nextStep: "Forwarded to the SMB person who owns this. Tell the clinic when it is resolved.",
    };
  }

  if (action === "Send patient a statement") {
    return {
      ...setField(noted, "Balance", "Moved to patient"),
      statusLabel: "Statement sent",
      queue: "waiting",
      actions: [],
      steps: claim.steps.map((step) => ({ ...step, status: "complete" as const })),
      nextStep: "Three attempts failed. The patient got a statement and the insurance balance moved to the patient.",
    };
  }

  if (action === "Complete this credentialing step") {
    const steps = advanceSteps(claim.steps);
    const current = steps.find((step) => step.status === "current")?.label ?? "";
    const last = current === CREDENTIALING_STEPS[CREDENTIALING_STEPS.length - 1];
    return {
      ...noted,
      steps,
      statusLabel: current || "Credentials updated",
      actions: last ? ["Credentials updated — back to Charge Review"] : ["Complete this credentialing step"],
      nextStep: last
        ? "Credentials are updated. Send the claim back to Charge Review; denied claims get appealed."
        : `Next: ${current}.`,
    };
  }

  if (action === "Credentials updated — back to Charge Review") {
    return handoff(
      setField(noted, "Credentialing", "Approved"),
      "charge",
      "Charge Review",
      ["Charge review", "Scan add-ons & overnight", QA_STEP, ALICIA_STEP],
      0,
      "Charge review",
      "Credentialing is approved. Charge Review can release it.",
      [SCAN_ACTION],
    );
  }

  if (action === "Check timely filing limit") {
    return {
      ...setField(noted, "Timely filing", "Within limit"),
      actions: ["Correct and resubmit"],
      nextStep: "Within the filing limit. Correct the claim in AMD, resubmit, and mark complete.",
    };
  }

  if (action === "Flag for supervisor review") {
    return {
      ...noted,
      statusLabel: "Supervisor review",
      queue: "waiting",
      actions: ["Adjust off"],
      nextStep: "A supervisor confirms it is OK to adjust off.",
    };
  }

  if (action === "Flag for manager review") {
    return handoff(
      setField(noted, "Referred by", "Claims Appeals (G1)"),
      "credentialing",
      "Credentialing",
      CREDENTIALING_STEPS,
      1,
      CREDENTIALING_STEPS[1],
      "A provider issue. Credentialing checks the provider’s details.",
      ["Complete this credentialing step"],
    );
  }

  if (action === "Submit appeal as courtesy") {
    return {
      ...noted,
      statusLabel: "Courtesy appeal submitted; complete",
      queue: "waiting",
      actions: [],
      nextStep: "The courtesy appeal is in. Appeals marked its work complete; the claim waits on the payer.",
    };
  }

  if (action === "Send to Call Center (COB)") {
    return handoff(
      setField(noted, "About", "Coordination of benefits"),
      "calls",
      "Call Center",
      ["Consult COB Inactive Log", "First attempt", "Second attempt", "Third attempt", "Statement"],
      1,
      "Coordination of benefits",
      "Check the COB Inactive Log, then call the patient.",
      ["Call again", REACHED],
    );
  }

  if (action === "Correct diagnosis code and rebill") {
    return {
      ...noted,
      statusLabel: "Diagnosis corrected; rebilled",
      actions: [],
      steps: advanceSteps(claim.steps),
      nextStep: "The diagnosis code was corrected from the provider’s notes and the claim was rebilled.",
    };
  }

  if (action === "Send by portal" || (action === "Move along" && claim.desk === "records")) {
    return handoff(
      { ...noted, flag: "Yellow" },
      "tracker",
      "Tracker Leads",
      ["Record sent", "Tracker lead"],
      1,
      "Record sent",
      "The record was sent by portal. Tracker lead has the claim.",
      [],
    );
  }

  if (action === REACHED) {
    return {
      ...setField(noted, "COB Inactive Log", "Updated"),
      steps: claim.steps.map((step) => ({ ...step, status: "complete" as const })),
      statusLabel: "Reached; log updated",
      queue: "waiting",
      actions: [],
      nextStep: "The log has what was needed. Resubmit the claim or refer it back to the department that sent it.",
    };
  }

  if (action === "On file — send back") {
    return handoff(
      noted,
      "tracker",
      "Tracker Leads",
      ["Portal check", "On file"],
      1,
      "On file",
      "Cloud Staff confirmed it is on file. The claim stays open.",
      [],
    );
  }

  if (action === "Ask Cloud Staff") {
    return handoff(
      noted,
      "cloud",
      "Cloud Staff",
      ["White case", "Not on file follow-up"],
      1,
      "Not on file",
      "Check the portal before calling.",
      ["Not on file — mail it", "On file — send back"],
    );
  }

  if (action === "Send to Medical Records (NBSD)") {
    return handoff(
      { ...noted, flag: "Yellow", queue: "waiting" },
      "records",
      "Medical Records (NBSD)",
      ["Denial needs a record", "Waiting for medical records", "Bill matches services?"],
      1,
      "Waiting for medical records",
      "Attach the record before this claim can move.",
      ["Attach record"],
    );
  }

  if (action === "Send to appeals" || action === "Send to Claims Appeals") {
    return handoff(
      { ...noted, flag: "Red" },
      "appeals",
      "Claims Appeals",
      ["Tracker lead copied it to appeals", "Determine root cause (G1–G4)"],
      1,
      "Hard denial",
      "Appeals classifies the denial before another letter goes out.",
      ["Dispute", "Check timely filing limit"],
    );
  }

  if (action === "Not on file — mail it") {
    return {
      ...noted,
      statusLabel: "Claims mailed",
      actions: [],
      steps: advanceSteps(claim.steps),
      nextStep: "The claim was mailed. It stays open until it is on file.",
    };
  }

  if (action === SCAN_ACTION) {
    return {
      ...setField(noted, "Add-ons and overnight charges", "Scanned"),
      steps: moveTo(claim, QA_STEP),
      statusLabel: QA_STEP,
      actions: [QA_DONE, "Send back with screenshot"],
      nextStep: "Mallory performs QA on the team’s work and notes the reviewed-thru dates.",
    };
  }

  if (action === QA_DONE) {
    return {
      ...setField(noted, "Reviewed through", "Today"),
      steps: moveTo(claim, ALICIA_STEP),
      statusLabel: ALICIA_STEP,
      actions: [],
      nextStep: "Alicia performs her final review and sends the charges in AdvancedMD.",
    };
  }

  if (action === "Send back with screenshot") {
    const labels = claim.steps.map((step) => step.label);
    const review = labels.indexOf(QA_STEP);
    return {
      ...noted,
      steps: stepsThrough(labels, Math.max(0, review - 1)),
      statusLabel: "Sent back to the team",
      actions: [SCAN_ACTION],
      nextStep: "Mallory sent a screenshot of what to fix. The team corrects it and sends it back.",
    };
  }

  if (action === "Pull op report and send") {
    return {
      ...setField(noted, "Record", "op-report.pdf"),
      files: claim.files.includes("op-report.pdf") ? claim.files : [...claim.files, "op-report.pdf"],
      steps: advanceSteps(claim.steps),
      statusLabel: "Record sent",
      actions: [],
      nextStep: "The op report was pulled, checked, and sent by portal. The claim stays open until it is paid.",
    };
  }

  if (action === "Refer to credentialing") {
    return handoff(
      setField(noted, "Referred by", "Charge Review"),
      "credentialing",
      "Credentialing",
      CREDENTIALING_STEPS,
      1,
      CREDENTIALING_STEPS[1],
      "A complex issue. Credentialing checks the provider before Charge Review releases it.",
      ["Complete this credentialing step"],
    );
  }

  if (action === "Correct in AdvancedMD") {
    return {
      ...setField(noted, "Auth number", "Corrected in AdvancedMD"),
      actions: [SCAN_ACTION],
      nextStep: "The simple correction is recorded. Scan for add-ons and overnight charges, then Mallory performs QA.",
    };
  }

  if (action === "Reviewed") {
    noted.history[noted.history.length - 1] = {
      ...noted.history[noted.history.length - 1],
      text: "Reviewed. No change.",
    };
    return noted;
  }

  if (action === "Turn row green") {
    return {
      ...setField(noted, "Auth notes", "Removed"),
      flag: "Green",
      statusLabel: "Paid",
      steps: advanceSteps(claim.steps),
      actions: [],
      nextStep: "The row is green. Payment posting stays in AdvancedMD.",
    };
  }

  if (action === "Post payment") {
    return handoff(
      { ...noted, statusLabel: "Posted" },
      "tracker",
      "Tracker Leads",
      ["Payment posted", "Turn the row green"],
      1,
      "Posted",
      "Posted in AdvancedMD. Tracker lead turns the row green.",
      ["Turn row green"],
    );
  }

  if (action === "Hold — do not bill patient") {
    return {
      ...setField(noted, "Where it sits", "Patient account, not the ERA"),
      statusLabel: "Held",
      queue: "waiting",
      actions: ["Send EOB to Tracker Leads"],
      steps: advanceSteps(claim.steps),
      nextStep: "Held off the ERA. The denial stays on the patient account.",
    };
  }

  if (action === "Send EOB to Tracker Leads") {
    return handoff(
      noted,
      "tracker",
      "Tracker Leads",
      ["Held off the ERA", "Tracker lead works the EDI"],
      1,
      "Held",
      "The denial is off the ERA and still on the patient account.",
      ["Pull op report and send", "Send to appeals"],
    );
  }

  if (action === "Unapply copay") {
    let next = setField(noted, "Over-apply", "Cleared");
    next = setField(next, "Patient paid", "$0.00");
    next.history[next.history.length - 1] = {
      ...next.history[next.history.length - 1],
      text: "Copay unapplied.",
    };
    return {
      ...next,
      actions: ["Post payment"],
      nextStep: "The copay is unapplied. Post the payment.",
    };
  }

  if (action === "Dispute") {
    const tries = fieldValue(claim, "Tries used");
    const used = Number(tries.split(" ")[0]);
    const limit = Number(tries.split("of ")[1]);
    const nextUsed = Number.isFinite(used) ? used + 1 : 1;
    const value = Number.isFinite(limit) ? `${nextUsed} of ${limit}` : tries;
    return {
      ...setField(noted, "Tries used", value),
      statusLabel: "Dispute",
      actions: Number.isFinite(limit) && nextUsed >= limit ? ["Adjust off"] : ["Dispute"],
      nextStep: "The dispute is counted. Send it by portal, fax, or mail.",
    };
  }

  if (action === "Correct and resubmit") {
    return {
      ...noted,
      statusLabel: "Corrected",
      steps: advanceSteps(claim.steps),
      actions: [],
      nextStep: "The code was corrected and the claim was resubmitted in AdvancedMD.",
    };
  }

  if (action === "Adjust off") {
    return {
      ...noted,
      statusLabel: "Adjusted off",
      queue: "waiting",
      steps: advanceSteps(claim.steps),
      actions: [],
      nextStep: "Adjusted off in AdvancedMD. There is no tracker color for this yet.",
    };
  }

  if (action === "Call again") {
    const attempts = Math.min(3, callAttempts(claim) + 1);
    return {
      ...setField(setField(noted, "Attempts", `${attempts} of 3`), "Last try", "Today"),
      actions: attempts >= 3 ? ["Send patient a statement", REACHED] : ["Call again", REACHED],
      nextStep:
        attempts >= 3
          ? "Three attempts made. Send the patient a statement, or update the log if they called back."
          : "Another attempt is logged. Three attempts come before a statement.",
    };
  }

  if (action === "Keep on do not call") {
    return {
      ...setField(noted, "Last confirmed", "Today"),
      nextStep: "Still do not call. Credentialing is open.",
    };
  }

  if (action === "Mark step done") {
    return {
      ...noted,
      steps: advanceSteps(claim.steps),
      history: noted.history.slice(0, -1).concat({
        ...noted.history[noted.history.length - 1],
        text: "Step done.",
      }),
    };
  }

  if (action === "Paid but still on AR") {
    return handoff(
      {
        ...setField(setField(noted, "Insurance paid", fieldValue(noted, "Insurance paid") || "$0.00"), "Write-off", fieldValue(noted, "Write-off") || "None"),
      },
      "billing",
      "Intake / Patient Accounts",
      ["Paid, still on AR", "Correct the posting"],
      1,
      "Paid, still open",
      "Intake / Patient Accounts corrects the posting. The balance is still open.",
      ["Hold — do not bill patient"],
    );
  }

  return noted;
}
