import { stepsThrough, type Claim, type ClaimField, type Desk, type Queue, type Step } from "@/lib/claims";
import type { DocumentKind } from "@/lib/document-extract";

export const DEMO_CLAIM_ID = "demo-helen";

type Side = {
  button: string;
  title: string;
  text: string;
  fields: ClaimField[];
};

type Beat = {
  desk: Desk;
  owner: string;
  queue: Queue;
  flag: string;
  statusLabel: string;
  nextStep: string;
  note: string;
  steps: Step[];
  fields: ClaimField[];
  files: string[];
  guide: string;
  button: string | null;
  side?: Side;
  upload?: DocumentKind;
  balance?: string;
  urgency?: string;
};

const path = [
  "Clinic enters procedure onto shared Tracker",
  "Reviews charges and rejections in AMD",
  "Scan for add-ons and overnight charges",
  "Mallory performs QA; notes reviewed-thru dates",
  "Alicia performs final review & sends charges",
  "CS works the CS Follow-Up tab",
  "TLs find MR denial in EDI report, AMD, AR report",
  "Look up patient record in AMD",
  "Is auth on file?",
  "Route to Appeals (Renee)",
  "Collect additional information",
  "Waiting for medical records",
  "Record attached",
  "G4 · Validate research against payer policies",
  "Attach medical records & example claim",
  "Submit appeal; mark complete",
  "Receives and pulls EOB for posting",
  "Post payment",
  "TL updates Tracker",
  "Fully paid",
];

function at(current: number): Step[] {
  if (current >= path.length - 1) {
    return path.map((label) => ({ label, status: "complete" as const }));
  }
  return stepsThrough(path, current);
}

const TRACKER = "Tracker Leads";
const CHARGE = "Charge Review";
const APPEALS = "Claims Appeals";
const INTAKE = "Intake / Patient Accounts";

const beats: Beat[] = [
  {
    desk: "tracker",
    owner: TRACKER,
    queue: "open",
    flag: "White",
    statusLabel: "Clinic enters procedure onto shared Tracker",
    nextStep: "Charge Review records what AdvancedMD found.",
    note: "The office treated the patient and entered the procedure on the shared surgical tracker.",
    steps: at(0),
    fields: [
      { label: "Patient", value: "Helen Marsh" },
      { label: "Insurance", value: "Medicare" },
      { label: "CPT", value: "31296 · balloon sinus dilation" },
      { label: "Date of service", value: "Aug 2, 2026" },
      { label: "Kind", value: "Surgical (BSD)" },
    ],
    files: [],
    guide:
      "Clinic Office lane: the clinic treats the patient, bills insurance, and enters the procedure on the shared tracker. This is a surgical (BSD) claim, so Tracker Leads own the day-to-day work.",
    button: "Continue to Charge Review",
  },
  {
    desk: "charge",
    owner: CHARGE,
    queue: "open",
    flag: "White",
    statusLabel: "Reviews charges and rejections in AMD",
    nextStep: "Simple issue. Correct it, then scan for add-ons.",
    note: "AdvancedMD missed a payer rule. The subscriber ID was outside the effective date.",
    steps: at(1),
    fields: [
      { label: "Where the work happened", value: "AdvancedMD" },
      { label: "Simple or complex?", value: "Simple. Subscriber ID." },
      { label: "If it were credentialing", value: "Refer to Credentialing" },
    ],
    files: [],
    guide:
      "Charge Review lane: review the charges clinic offices generated in AdvancedMD, review rejections, and correct billing errors. The diagram asks: simple or complex? Credentialing goes to Credentialing. This one is simple, so it is corrected here.",
    button: "Correct errors, review rejections",
  },
  {
    desk: "charge",
    owner: CHARGE,
    queue: "open",
    flag: "White",
    statusLabel: "Scan for add-ons and overnight charges",
    nextStep: "Mallory performs QA.",
    note: "The team scanned the charge review list by provider for add-ons, then checked the next day for charges added overnight.",
    steps: at(2),
    fields: [
      { label: "Add-ons", value: "None for this provider" },
      { label: "Overnight charges", value: "None" },
    ],
    files: [],
    guide:
      "Two boxes on the diagram: scan the charge review list by provider for add-ons, then, the next day, scan to make sure charges received overnight are accounted for.",
    button: "Send to Mallory for QA",
  },
  {
    desk: "charge",
    owner: CHARGE,
    queue: "open",
    flag: "White",
    statusLabel: "Mallory performs QA; notes reviewed-thru dates",
    nextStep: "Alicia performs her final review and sends the charges.",
    note: "Mallory checked the team’s correction. Nothing needed a screenshot back to the team.",
    steps: at(3),
    fields: [
      { label: "QA by", value: "Mallory" },
      { label: "Reviewed thru", value: "Sep 29, 2026" },
    ],
    files: [],
    guide:
      "Mallory performs QA on her team’s work, completes the final review, and notes the reviewed-thru dates so Alicia knows what is ready.",
    button: "QA done — send to Alicia",
  },
  {
    desk: "charge",
    owner: CHARGE,
    queue: "open",
    flag: "White",
    statusLabel: "Alicia performs final review & sends charges",
    nextStep: "The claim is with Medicare. The row is white.",
    note: "Alicia reviewed and sent the charge electronically. White means no explanation of benefits yet.",
    steps: at(4),
    fields: [
      { label: "Sent by", value: "Alicia, in AdvancedMD" },
      { label: "Tracker color", value: "White" },
    ],
    files: [],
    guide:
      "Alicia performs her own final review and sends the charges. Then it is the Insurance lane: the payer accepts or rejects the claim, in full or in part.",
    button: "It shows up on the BSD AR report",
  },
  {
    desk: "cloud",
    owner: "Cloud Staff",
    queue: "open",
    flag: "White",
    statusLabel: "CS works the CS Follow-Up tab",
    nextStep: "Move the row to the Tracker Lead tab.",
    note: "Chris pulled the BSD AR report from AMD and split it into tabs. Cloud Staff called Medicare: the payer is asking for medical records.",
    steps: at(5),
    fields: [
      { label: "AR", value: "BSD AR report" },
      { label: "Tab", value: "CS Follow-Up" },
      { label: "Payer said", value: "Medical records requested" },
      { label: "Move to", value: "Tracker Lead tab" },
    ],
    files: [],
    guide:
      "BSD AR Processing lane: Chris pulls the AR report, compares it with the last run, and splits it into tabs. Cloud Staff works the CS Follow-Up tab and moves each row to the right tab. A records request goes to the Tracker Lead tab. A partial claim or formal denial would go to the Appeals tab.",
    button: "Move to the Tracker Lead tab",
  },
  {
    desk: "tracker",
    owner: TRACKER,
    queue: "open",
    flag: "Yellow",
    statusLabel: "TLs find MR denial in EDI report, AMD, AR report",
    nextStep: "Look up the patient record in AMD.",
    note: "The medical-record denial is also on the EDI report.",
    steps: at(6),
    fields: [
      { label: "Found on", value: "EDI report and the AR" },
      { label: "Fields from the report", value: "Not read yet" },
      { label: "Date of service", value: "Aug 2, 2026" },
      { label: "CPT", value: "31296" },
      { label: "Denial reason", value: "Medical records requested" },
    ],
    files: [],
    guide:
      "Medical Records Requests (BSD) lane, first box: tracker leads find the medical-record denial in the EDI report, AMD, or the AR report, or Crystal gets it in an email from Alicia. Today they copy the paid amount, balance, and denial reason into the clinic tracker by hand. Upload the EDI report to see those fields read for you, then check them.",
    button: "Look up patient record in AMD",
    upload: "EDI report",
  },
  {
    desk: "tracker",
    owner: TRACKER,
    queue: "open",
    flag: "Yellow",
    statusLabel: "Look up patient record in AMD",
    nextStep: "Is auth on file?",
    note: "The chart is open in AdvancedMD.",
    steps: at(7),
    fields: [
      { label: "Looked up in", value: "AdvancedMD" },
      { label: "Auth on file", value: "Not answered yet" },
    ],
    files: [],
    guide: "Next box: look up the patient record in AMD. The diagram then asks one question.",
    button: "Is auth on file?",
  },
  {
    desk: "tracker",
    owner: TRACKER,
    queue: "open",
    flag: "Yellow",
    statusLabel: "Is auth on file?",
    nextStep: "No. Route to Appeals (Renee).",
    note: "There is no authorization on file for this procedure.",
    steps: at(8),
    fields: [
      { label: "Auth on file", value: "No" },
      { label: "Route", value: "Appeals (Renee)" },
    ],
    files: [],
    guide:
      "Is auth on file? Yes: the tracker lead downloads the record from the EHR, verifies it, sends it to the requestor, and marks it complete. No: route to Appeals (Renee). This one has no auth, so it goes to Appeals.",
    button: "No — route to Appeals (Renee)",
    side: {
      button: "Show the Yes path",
      title: "Auth on file",
      text: "The tracker lead downloads the medical record from the EHR, verifies codes, date of service, and the provider’s signature, sends it to the requestor, and marks it complete. Appeals is not involved.",
      fields: [
        { label: "Download from", value: "EHR" },
        { label: "Send by", value: "Portal, Vonage fax, email, or mail" },
        { label: "Then", value: "Mark complete" },
      ],
    },
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "open",
    flag: "Red",
    statusLabel: "Route to Appeals (Renee)",
    nextStep: "Research the claim’s history, then collect what is missing.",
    note: "Renee researched the history of the claim to determine the denial reason: no auth on file, and Medicare wants the record.",
    steps: at(9),
    fields: [
      { label: "From", value: "Tracker Leads" },
      { label: "Denial reason", value: "No auth on file; records requested" },
    ],
    files: [],
    guide:
      "Claims Appeals lane: research the history of the claim to determine the denial reason. If more is needed, collect it before choosing an appeal path.",
    button: "Collect additional information",
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "waiting",
    flag: "Red",
    statusLabel: "Collect additional information",
    nextStep: "The record and the auth have been requested from the clinic.",
    note: "Two kinds of information are needed: an auth update and a missing record.",
    steps: at(10),
    fields: [
      { label: "Auth update", value: "Added to the Auth Needed sheet; Renee emailed the office" },
      { label: "Missing record", value: "Added to Records Needed for Lindsay to send to the clinic" },
      { label: "Payer details", value: "Not needed" },
    ],
    files: [],
    guide:
      "The diagram asks what type of information is needed. Auth update: add it to the Auth Needed sheet for Renee to email the office. Missing record: add it to Records Needed for Lindsay to send to the clinic. Payer details go to Cloud Staff to call. This claim needs the auth and the record.",
    button: "Wait for the record",
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "waiting",
    flag: "Red",
    statusLabel: "Waiting for medical records",
    nextStep: "Nothing is attached yet. Seen is not enough.",
    note: "Lindsay sent the Records Needed list to the clinic. The clinic marked it seen. The record is not here.",
    steps: at(11),
    fields: [
      { label: "Missing", value: "Operative report and signed auth" },
      { label: "Asked", value: "Sep 29, 2026" },
      { label: "Clinic", value: "Marked seen" },
      { label: "Record", value: "Not attached" },
    ],
    files: [],
    guide:
      "The claim waits on this step until the files are attached. The clinic saying they saw the request does not clear it.",
    button: "The record arrives",
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "open",
    flag: "Red",
    statusLabel: "Record attached",
    nextStep: "Determine the root cause and choose the appeal path.",
    note: "The clinic sent the operative report and the signed auth. Both are on the claim.",
    steps: at(12),
    fields: [
      { label: "Record", value: "op-report.pdf" },
      { label: "Auth", value: "signed-auth.pdf" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf"],
    guide:
      "With the information in, Appeals determines the root cause and proceeds with one of four paths: G1 provider issue, G2 claims correction, G3 claims adjustment, or G4 claims dispute. The payer denied a valid claim, so this is G4.",
    button: "G4 · Claims dispute",
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "open",
    flag: "Red",
    statusLabel: "G4 · Validate research against payer policies",
    nextStep: "Adjust the appeal approach for this payer, then attach the records.",
    note: "Medicare’s policy covers the procedure with the auth now on file.",
    steps: at(13),
    fields: [
      { label: "Appeal path", value: "G4 · Claims dispute" },
      { label: "Policy check", value: "Supports payment" },
      { label: "Payer form", value: "Medicare redetermination" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf"],
    guide:
      "G4 · Claims Disputes: validate the research against payer policies, then adjust the appeal approach to the dispute and the payer’s forms.",
    button: "Attach records & example claim",
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "open",
    flag: "Red",
    statusLabel: "Attach medical records & example claim",
    nextStep: "Submit the appeal.",
    note: "The packet has the op report, the signed auth, and the payer form.",
    steps: at(14),
    fields: [
      { label: "Packet", value: "Op report, signed auth, redetermination form" },
      { label: "Example claim", value: "Not needed; not a payment issue" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf"],
    guide:
      "Identify and attach the medical records, plus an example claim when it is a payment issue. This one is not a payment issue.",
    button: "Submit appeal; mark complete",
  },
  {
    desk: "appeals",
    owner: APPEALS,
    queue: "waiting",
    flag: "Red",
    statusLabel: "Submit appeal; mark complete",
    nextStep: "Medicare evaluates the appeal.",
    note: "Submitted on the provider portal. Appeals keeps the proof of what was sent.",
    steps: at(15),
    fields: [
      { label: "Sent by", value: "Provider portal" },
      { label: "Tries used", value: "1 of 2" },
      { label: "Appeals work", value: "Complete. The claim is still open." },
    ],
    files: ["op-report.pdf", "signed-auth.pdf"],
    guide:
      "Appeals submits the appeal and marks its work complete. The claim is not finished. Insurance lane: the payer evaluates the appeal and pays or denies.",
    button: "Medicare pays; the EOB comes in",
  },
  {
    desk: "billing",
    owner: INTAKE,
    queue: "open",
    flag: "Yellow",
    statusLabel: "Receives and pulls EOB for posting",
    nextStep: "Paid in full? Yes. Post the payment.",
    note: "Medicare paid on appeal. Insurance paid and the remark PR1 agree.",
    steps: at(16),
    fields: [
      { label: "Date of service", value: "Aug 2, 2026" },
      { label: "CPT", value: "31296" },
      { label: "Insurance paid", value: "$980.00" },
      { label: "Patient paid", value: "$0.00" },
      { label: "Patient responsibility", value: "$140.00" },
      { label: "Write-off", value: "$0.00" },
      { label: "Remark", value: "PR1 deductible" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf"],
    guide:
      "Intake / Patient Accounts lane: receive and pull EOBs for posting. Paid in full? Yes means post the payment. No would split BSD from NBSD, and a BSD EOB goes to Tracker Leads. Upload the EOB to check the amounts against the file, or look at a line that must not be posted.",
    button: "Post payment",
    upload: "EOB",
    side: {
      button: "Show an unsafe EOB line",
      title: "Green, but not safe",
      text: "The line shows green, but there is no payment and no write-off. Posting it would move the whole balance to the patient. It is held, and the denial stays on the patient account.",
      fields: [
        { label: "Insurance paid", value: "$0.00" },
        { label: "Write-off", value: "None" },
        { label: "Action", value: "Hold — do not bill patient" },
      ],
    },
  },
  {
    desk: "billing",
    owner: INTAKE,
    queue: "open",
    flag: "Yellow",
    statusLabel: "Post payment",
    nextStep: "Tracker Leads update the tracker.",
    note: "The payment is posted in AdvancedMD.",
    steps: at(17),
    fields: [
      { label: "Posted in", value: "AdvancedMD" },
      { label: "Insurance paid", value: "$980.00" },
      { label: "Patient responsibility", value: "$140.00" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf", "medicare-eob.pdf"],
    guide: "Posting happens in AdvancedMD. The hub records it. The clinic tracker is still the tracker lead’s to update.",
    button: "TL updates Tracker",
  },
  {
    desk: "tracker",
    owner: TRACKER,
    queue: "open",
    flag: "Green",
    statusLabel: "TL updates Tracker",
    nextStep: "The clinic sees the result.",
    note: "Paid amount and patient responsibility are on the row. Auth notes come off. The row is green.",
    steps: at(18),
    fields: [
      { label: "Tracker color", value: "Green" },
      { label: "Paid amount", value: "$980.00" },
      { label: "Patient responsibility", value: "$140.00" },
      { label: "Auth notes", value: "Removed" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf", "medicare-eob.pdf"],
    guide: "Tracker Leads write the paid amount and patient responsibility, take the auth notes off, and turn the row green. Green means paid.",
    button: "Mark fully paid",
  },
  {
    desk: "tracker",
    owner: TRACKER,
    queue: "open",
    flag: "Green",
    statusLabel: "Fully paid",
    nextStep: "The clinic has the outcome. Nothing else is waiting.",
    note: "The claim is fully paid. The clinic is informed.",
    steps: at(path.length - 1),
    fields: [
      { label: "Tracker color", value: "Green" },
      { label: "Insurance paid", value: "$980.00" },
      { label: "Patient responsibility", value: "$140.00" },
      { label: "Insurance balance", value: "$0.00" },
      { label: "Clinic", value: "Informed of the outcome" },
    ],
    files: ["op-report.pdf", "signed-auth.pdf", "medicare-eob.pdf"],
    guide: "The claim is fully paid. That is the end of this tour.",
    button: null,
    balance: "$0.00",
    urgency: "Routine",
  },
];

export function demoClaim(step = 0): Claim {
  const index = Math.min(step, beats.length - 1);
  const beat = beats[index];
  const { guide: _guide, button: _button, side: _side, upload: _upload, balance, urgency, ...rest } = beat;
  return {
    id: DEMO_CLAIM_ID,
    number: "618440219",
    patient: "Helen Marsh",
    practice: "Cedar Row ENT",
    payer: "Medicare",
    dueDate: "Oct 7, 2026",
    history: beats.slice(0, index + 1).map((item, historyIndex) => ({
      id: `demo-${historyIndex}`,
      date: "Today",
      source: item.owner,
      audience: item.owner,
      text: item.statusLabel,
    })),
    actions: [],
    ...rest,
    balance: balance ?? "$1,120.00",
    urgency: urgency ?? "Urgent",
  };
}

export function demoGuide(step: number) {
  const beat = beats[Math.min(step, beats.length - 1)];
  return { text: beat.guide, button: beat.button, side: beat.side ?? null, upload: beat.upload ?? null };
}

export function demoStepCount() {
  return beats.length;
}

export function demoStepOf(claim: Claim) {
  const current = claim.steps.findIndex((step) => step.status === "current");
  if (current >= 0) return current;
  return beats.length - 1;
}
