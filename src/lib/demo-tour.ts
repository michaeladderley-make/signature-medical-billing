import { stepsThrough, type Claim, type ClaimField, type Desk, type Queue, type Step } from "@/lib/claims";

export const DEMO_CLAIM_ID = "demo-helen";

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
  balance?: string;
  urgency?: string;
};

const path = [
  "Clinic entered the visit",
  "Charge review",
  "Alicia sends the charge",
  "Cloud Staff checks the portal",
  "On file",
  "TL finds medical record denial in EDI report, AMD, or AR report",
  "Look up patient's medical records in AMD",
  "Is the authorization on file?",
  "Medical records",
  "Waiting for medical records",
  "Record attached",
  "Tracker Lead updates Tracker",
  "ERA review",
  "Post payment",
  "Turn the row green",
  "Fully paid",
];

function at(current: number): Step[] {
  if (current >= path.length - 1) {
    return path.map((label) => ({ label, status: "complete" as const }));
  }
  return stepsThrough(path, current);
}

const beats: Beat[] = [
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "White",
    statusLabel: "Clinic entered the visit",
    nextStep: "Charge review records what AdvancedMD found.",
    note: "The office added Helen Marsh to the tracker: patient, insurance, and the procedure.",
    steps: at(0),
    fields: [
      { label: "Patient", value: "Helen Marsh" },
      { label: "Insurance", value: "Medicare" },
      { label: "CPT", value: "31231" },
      { label: "Date of service", value: "Aug 2, 2026" },
    ],
    files: [],
    guide:
      "The clinic created the row on the shared tracker. SMB has not touched it. Next is charge review. That work happens in AdvancedMD. The hub only keeps what came back.",
    button: "Continue to charge review",
  },
  {
    desk: "charge",
    owner: "Charge review",
    queue: "open",
    flag: "White",
    statusLabel: "Charge review",
    nextStep: "Alicia sends the charge.",
    note: "AdvancedMD missed a payer rule. The subscriber ID was outside the effective date. That is a simple correction, not a credentialing problem.",
    steps: at(1),
    fields: [
      { label: "Where the work happened", value: "AdvancedMD" },
      { label: "Issue", value: "Simple. Subscriber ID." },
      { label: "Credentialing", value: "Provider can bill Medicare" },
      { label: "Complex?", value: "No. It does not go to credentialing." },
    ],
    files: [],
    guide:
      "Charge review still has to be recorded here, even though the checking is in AdvancedMD. Simple issues, like a subscriber ID, stay in this queue and get corrected. A complex issue would go to credentialing. This one does not.",
    button: "Alicia sends the charge",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "White",
    statusLabel: "Submitted",
    nextStep: "The row is white. No EOB yet.",
    note: "Alicia sent the claim electronically. White means no explanation of benefits yet.",
    steps: at(2),
    fields: [
      { label: "How it left", value: "Electronic, in AdvancedMD" },
      { label: "Who sent it", value: "Alicia" },
      { label: "Tracker color", value: "White" },
    ],
    files: [],
    guide:
      "The claim is out. Tracker leads own the white row. It is not paid and not denied. Unpaid claims like this show up on the aging report. Not-on-file is worked first, because the filing deadline is at risk.",
    button: "Ask Cloud Staff to check the portal",
  },
  {
    desk: "cloud",
    owner: "Cloud Staff",
    queue: "deadline",
    flag: "White",
    statusLabel: "Not on file",
    nextStep: "Check the payer portal before calling.",
    note: "This is the Not on file tab. Cloud Staff checks the portal before anyone calls Medicare.",
    steps: at(3),
    fields: [
      { label: "AR tab", value: "Not on file" },
      { label: "Portal", value: "Not checked" },
      { label: "Why this tab is first", value: "Filing deadline" },
    ],
    files: [],
    guide:
      "Cloud Staff comes in here. Chris’s aging report splits claims into tabs. Not on file is first. Cloud Staff checks the payer portal before calling. If the portal says it is not on file, they mail the claim. If a login is missing, that becomes a credentialing task. Their finding does not close the claim.",
    button: "Portal says the claim is on file",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "White",
    statusLabel: "On file",
    nextStep: "Wait for the EDI. The claim is still open.",
    note: "Cloud Staff checked the Medicare portal. The claim is on file. Reference MC-20411. Research is done. The claim is not finished.",
    steps: at(4),
    fields: [
      { label: "Portal", value: "On file" },
      { label: "Reference", value: "MC-20411" },
      { label: "If it were not on file", value: "Cloud Staff would mail the claim" },
      { label: "Tracker color", value: "White" },
    ],
    files: [],
    guide:
      "The finding comes back to the tracker lead. On file means no mail packet. The other branch, not on file, is a mailed claim. Either way the claim stays open until an EOB arrives. The row is still white.",
    button: "EDI report arrives",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "Yellow",
    statusLabel: "Medical record denial",
    nextStep: "Look up the patient in AdvancedMD.",
    note: "The EDI report includes a medical-record denial for this endoscopy.",
    steps: at(5),
    fields: [
      { label: "Came in on", value: "EDI report" },
      { label: "Also arrives by", value: "AdvancedMD, the AR, or an email from Alicia" },
      { label: "Diagram", value: "Medical records requests" },
    ],
    files: ["edi-denial-helen.pdf"],
    guide:
      "This is the first box on Crystal’s medical-records diagram. The tracker lead finds a medical-record denial on the EDI report. The same request can also arrive in AdvancedMD, on the AR, or in an email from Alicia.",
    button: "Look up the patient in AdvancedMD",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "Yellow",
    statusLabel: "Look up in AdvancedMD",
    nextStep: "Is the authorization on file?",
    note: "The chart is open in AdvancedMD. The authorization has not been answered yet.",
    steps: at(6),
    fields: [
      { label: "Looked up in", value: "AdvancedMD" },
      { label: "Authorization on file", value: "Not answered yet" },
    ],
    files: ["edi-denial-helen.pdf"],
    guide:
      "Next box on the diagram: look up the patient’s medical records in AdvancedMD. The following step is the decision. It has not been answered yet.",
    button: "Ask if the authorization is on file",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "Yellow",
    statusLabel: "Is the authorization on file?",
    nextStep: "Yes. The record still has to be pulled.",
    note: "The authorization is on file. If it were not, this claim would go to Renee in Denials.",
    steps: at(7),
    fields: [
      { label: "Authorization on file", value: "Yes" },
      { label: "If it were no", value: "Routed to Renee (Denials)" },
    ],
    files: ["edi-denial-helen.pdf"],
    guide:
      "The diagram asks: is the authorization on file? No routes the claim to Renee in Denials. Yes stays with the tracker lead, who pulls what they are allowed to pull. This authorization is on file, so the tour takes yes.",
    button: "Yes — authorization is on file",
  },
  {
    desk: "records",
    owner: "Medical records",
    queue: "waiting",
    flag: "Yellow",
    statusLabel: "Medical records",
    nextStep: "The tracker lead cannot pull the testing Medicare asked for.",
    note: "Auth is on file, but the request is more than an operative report. Tracker leads do not pull that testing.",
    steps: at(8),
    fields: [
      { label: "Authorization on file", value: "Yes" },
      { label: "What was asked", value: "Testing, not a simple operative report" },
      { label: "Who pulls a simple op report", value: "Tracker lead" },
      { label: "This request", value: "Medical records" },
    ],
    files: ["edi-denial-helen.pdf"],
    guide:
      "Medical records branches here. A simple operative report stays with the tracker lead: they pull it, check the codes, date of service, and signature, and send it. Testing, or anything they cannot pull, goes to the medical-records team. A hard denial or a missing authorization would have gone to appeals instead.",
    button: "Send to medical records",
  },
  {
    desk: "records",
    owner: "Medical records",
    queue: "waiting",
    flag: "Yellow",
    statusLabel: "Waiting for medical records",
    nextStep: "The file is not attached. Seen is not enough.",
    note: "Single patient. The office was asked for the testing note. They marked it seen. The record is not here.",
    steps: at(9),
    fields: [
      { label: "Request type", value: "Single patient" },
      { label: "Missing", value: "Testing note" },
      { label: "Office", value: "Marked seen" },
      { label: "Record", value: "Not attached" },
    ],
    files: ["edi-denial-helen.pdf"],
    guide:
      "Medical records keeps the claim on Waiting for medical records until the file is attached. The office saying they saw the request does not clear it. A bulk audit is the other shape of this same step: many patients, one request. This one is a single patient.",
    button: "The testing note arrives",
  },
  {
    desk: "records",
    owner: "Medical records",
    queue: "open",
    flag: "Yellow",
    statusLabel: "Record attached",
    nextStep: "Send it to Medicare.",
    note: "The testing note is on the claim. A copy is kept so a lost packet does not mean another trip to the chart.",
    steps: at(10),
    fields: [
      { label: "Record", value: "testing-note.pdf" },
      { label: "Copy kept", value: "Yes" },
      { label: "How to send", value: "Portal, then Vonage fax, then email, then mail" },
    ],
    files: ["edi-denial-helen.pdf", "testing-note.pdf"],
    guide:
      "The record is attached, so this step can move. Medical records sends it the same way the diagram ranks: provider portal first, then Vonage fax, then email, then mail. The completed copy stays on the claim.",
    button: "Send by provider portal",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "Yellow",
    statusLabel: "Tracker Lead updates Tracker",
    nextStep: "The record was sent. The claim is still open.",
    note: "Medical records sent the testing note on the portal and the tracker lead updated the row. Yellow stays until the payer pays.",
    steps: at(11),
    fields: [
      { label: "Sent by", value: "Provider portal (preferred)" },
      { label: "Tracker", value: "Updated" },
      { label: "Claim", value: "Still open" },
    ],
    files: ["edi-denial-helen.pdf", "testing-note.pdf"],
    guide:
      "The tracker lead updates the tracker. That is the last box on the records diagram. Sending the record does not finish the claim. It is paid only when the ERA says so.",
    button: "ERA payment comes back",
  },
  {
    desk: "billing",
    owner: "Billing",
    queue: "open",
    flag: "Yellow",
    statusLabel: "ERA review",
    nextStep: "Post the payment. The remark is the patient deductible.",
    note: "Insurance paid. The write-off and remark PR1 agree. A green line with no payment and no write-off would be held so the patient is not billed.",
    steps: at(12),
    fields: [
      { label: "Insurance paid", value: "$980.00" },
      { label: "Patient paid", value: "$0.00" },
      { label: "Patient responsibility", value: "$140.00" },
      { label: "Write-off", value: "$0.00" },
      { label: "Remark", value: "PR1 deductible" },
    ],
    files: ["edi-denial-helen.pdf", "testing-note.pdf", "medicare-eob.pdf"],
    guide:
      "Billing reads the ERA before anyone posts. Payment, write-off, and remark have to agree. PR1 means the rest is the patient’s deductible. The unsafe case, no payment and no write-off, is held instead.",
    button: "Post the payment",
  },
  {
    desk: "billing",
    owner: "Billing",
    queue: "open",
    flag: "Yellow",
    statusLabel: "Post payment",
    nextStep: "Tracker lead turns the row green.",
    note: "The payment is posted in AdvancedMD. The tracker row is not green yet.",
    steps: at(13),
    fields: [
      { label: "Posted in", value: "AdvancedMD" },
      { label: "Insurance paid", value: "$980.00" },
      { label: "Patient responsibility", value: "$140.00" },
    ],
    files: ["edi-denial-helen.pdf", "testing-note.pdf", "medicare-eob.pdf"],
    guide:
      "Posting happens in AdvancedMD. The hub records that it happened. The tracker color is still the tracker lead’s step.",
    button: "Turn the row green",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
    queue: "open",
    flag: "Green",
    statusLabel: "Turn the row green",
    nextStep: "Tell the clinic. The claim is paid.",
    note: "Paid amount and patient responsibility are on the row. Auth notes come off. The row is green.",
    steps: at(14),
    fields: [
      { label: "Tracker color", value: "Green" },
      { label: "Paid amount", value: "$980.00" },
      { label: "Patient responsibility", value: "$140.00" },
      { label: "Auth notes", value: "Removed" },
    ],
    files: ["edi-denial-helen.pdf", "testing-note.pdf", "medicare-eob.pdf"],
    guide:
      "Tracker leads write the paid amount and the patient responsibility, take the auth notes off, and turn the row green. Green means paid.",
    button: "Mark fully paid",
  },
  {
    desk: "tracker",
    owner: "Tracker leads",
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
      { label: "Balance", value: "$0.00" },
      { label: "Clinic", value: "Informed of the outcome" },
    ],
    files: ["edi-denial-helen.pdf", "testing-note.pdf", "medicare-eob.pdf"],
    guide:
      "The claim is fully paid. That is the end of this tour. The clinic sees the green row on the tracker.",
    button: null,
    balance: "$0.00",
    urgency: "Routine",
  },
];

export function demoClaim(step = 0): Claim {
  const index = Math.min(step, beats.length - 1);
  const beat = beats[index];
  const { guide: _guide, button: _button, balance, urgency, ...rest } = beat;
  return {
    id: DEMO_CLAIM_ID,
    number: "618440219",
    patient: "Helen Marsh",
    practice: "Cedar Row ENT",
    payer: "Medicare",
    balance: balance ?? "$1,120.00",
    urgency: urgency ?? (index === beats.length - 1 ? "Routine" : "Urgent"),
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
  return { text: beat.guide, button: beat.button };
}

export function demoStepCount() {
  return beats.length;
}

export function demoStepOf(claim: Claim) {
  const current = claim.steps.findIndex((step) => step.status === "current");
  if (current >= 0) return current;
  return beats.length - 1;
}
