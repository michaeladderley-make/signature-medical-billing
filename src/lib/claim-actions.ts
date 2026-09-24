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

const FINISHED = new Set([
  "Mark step done",
  "Turn row green",
  "Ready for Alicia",
  "Send by portal",
  "Move along",
  "Post payment",
  "Adjust off",
  "Correct and resubmit",
  "Not on file — mail it",
  "Enough to move",
]);

function minutesFor(action: string) {
  if (!FINISHED.has(action)) return undefined;
  return 8 + (action.length % 17);
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
  if (action === "Ready for Alicia" && fieldValue(claim, "Auth number") === "Missing") {
    return "The auth number is still missing.";
  }
  if (action === "Enough to move" && !claim.history.some((entry) => entry.audience === "Call center")) {
    return "Log the call on this claim first.";
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

  if (action === "Attach record") {
    const missing = fieldValue(claim, "Missing");
    const file = missing.toLowerCase().includes("office") ? "office-note.pdf" : "operative-note.pdf";
    return {
      ...setField(noted, "Record", file),
      files: [...claim.files, file],
      statusLabel: "Record attached",
      actions: ["Send by portal"],
      nextStep: "The record is attached. Send it, then the claim can move.",
    };
  }

  if (action === "Send by portal" || (action === "Move along" && claim.desk === "records")) {
    return handoff(
      { ...noted, flag: "Yellow" },
      "tracker",
      "Tracker leads",
      ["Record sent", "Tracker lead"],
      1,
      "Record sent",
      "The record was sent by portal. Tracker lead has the claim.",
      [],
    );
  }

  if (action === "Enough to move") {
    if (fieldValue(claim, "About").toLowerCase().includes("patient balance")) {
      return {
        ...noted,
        steps: advanceSteps(claim.steps),
        statusLabel: "Statement",
        actions: ["Call again"],
        nextStep: "Send the statement. This balance stays with the call center.",
      };
    }
    return handoff(
      noted,
      "tracker",
      "Tracker leads",
      ["Call logged", "Tracker lead"],
      1,
      "Back with tracker lead",
      "The call is on the claim. Tracker lead has the next step.",
      ["Send to appeals", "Send to medical records"],
    );
  }

  if (action === "On file — send back") {
    return handoff(
      noted,
      "tracker",
      "Tracker leads",
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

  if (action === "Send to medical records") {
    return handoff(
      { ...noted, flag: "Yellow", queue: "waiting" },
      "records",
      "Medical records",
      ["Soft denial", "Waiting for medical records", "Send the record"],
      1,
      "Waiting for medical records",
      "Attach the record before this claim can move.",
      ["Attach record"],
    );
  }

  if (action === "Send to appeals") {
    return handoff(
      { ...noted, flag: "Red" },
      "appeals",
      "Appeals",
      ["Tracker lead copied it to appeals", "Appeals"],
      1,
      "Hard denial",
      "Appeals classifies the denial before another letter goes out.",
      ["Dispute", "Correct and resubmit"],
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

  if (action === "Ready for Alicia") {
    return {
      ...noted,
      steps: advanceSteps(claim.steps),
      statusLabel: "Ready for Alicia",
      actions: [],
      nextStep: "Alicia sends the charge in AdvancedMD.",
    };
  }

  if (action === "Waiting on clinic") {
    return {
      ...noted,
      queue: "waiting",
      statusLabel: "Waiting on clinic",
      nextStep: "Waiting on the clinic. The claim stays on this desk.",
    };
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
      "Tracker leads",
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
      actions: ["Send to tracker lead"],
      steps: advanceSteps(claim.steps),
      nextStep: "Held off the ERA. The denial stays on the patient account.",
    };
  }

  if (action === "Send to tracker lead") {
    return handoff(
      noted,
      "tracker",
      "Tracker leads",
      ["Held off the ERA", "Tracker lead works the EDI"],
      1,
      "Held",
      "The denial is off the ERA and still on the patient account.",
      ["Send to appeals", "Send to medical records"],
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
    return {
      ...setField(noted, "Last try", "Today"),
      nextStep: "Another try is logged. Move it only when the answer is complete.",
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
      "Billing",
      ["Paid, still on AR", "Correct the posting"],
      1,
      "Paid, still open",
      "Billing corrects the posting. The balance is still open.",
      ["Hold — do not bill patient"],
    );
  }

  return noted;
}
