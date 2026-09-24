export type Queue = "open" | "waiting" | "deadline";

export type Desk = "charge" | "calls" | "tracker" | "cloud" | "records" | "appeals" | "billing";

export type DeskView = "work-hub" | "managers-view";

export type StepStatus = "complete" | "current" | "upcoming";

export type Step = {
  label: string;
  status: StepStatus;
};

export type HistoryEntry = {
  id: string;
  date: string;
  source: string;
  audience: string;
  text: string;
  minutes?: number;
};

export type ClaimField = {
  label: string;
  value: string;
};

export type Claim = {
  id: string;
  number: string;
  queue: Queue;
  desk: Desk;
  owner: string;
  patient: string;
  practice: string;
  statusLabel: string;
  urgency: string;
  flag: string;
  dueDate: string;
  payer: string;
  balance: string;
  note: string;
  nextStep: string;
  steps: Step[];
  history: HistoryEntry[];
  actions: string[];
  fields: ClaimField[];
  files: string[];
};

export type Person = {
  id: string;
  name: string;
  role: string;
  email: string;
  desk: Desk | "all";
};

export const PEOPLE: Person[] = [
  { id: "charge", name: "Charge review", role: "Charge review", email: "", desk: "charge" },
  { id: "calls", name: "Call center", role: "Call center", email: "", desk: "calls" },
  { id: "tracker", name: "Tracker leads", role: "Tracker leads", email: "", desk: "tracker" },
  { id: "cloud", name: "Cloud Staff", role: "Cloud Staff", email: "", desk: "cloud" },
  { id: "records", name: "Medical records", role: "Medical records", email: "", desk: "records" },
  { id: "appeals", name: "Appeals", role: "Appeals", email: "", desk: "appeals" },
  { id: "billing", name: "Billing", role: "Billing", email: "", desk: "billing" },
  { id: "all", name: "All claims", role: "All claims", email: "", desk: "all" },
];

export const DESK_VIEWS: { id: DeskView; href: string; label: string }[] = [
  { id: "work-hub", href: "/", label: "Work Hub" },
  { id: "managers-view", href: "/managers-view", label: "Manager's View" },
];

const QUEUE_DOT: Record<Queue, string> = {
  open: "/figma/status-open.svg",
  waiting: "/figma/status-waiting.svg",
  deadline: "/figma/status-deadline.svg",
};

export function queueDot(queue: Queue) {
  return QUEUE_DOT[queue];
}

export function stepsThrough(labels: string[], currentIndex: number): Step[] {
  return labels.map((label, index) => ({
    label,
    status:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}

export function advanceSteps(steps: Step[]): Step[] {
  const currentIndex = steps.findIndex((step) => step.status === "current");
  if (currentIndex === -1) return steps;

  return steps.map((step, index) => {
    if (index < currentIndex) return step;
    if (index === currentIndex) return { ...step, status: "complete" };
    if (index === currentIndex + 1) return { ...step, status: "current" };
    return step;
  });
}

export const initialClaims: Claim[] = [
  {
    id: "ryan",
    number: "204739292",
    queue: "deadline",
    desk: "charge",
    owner: "Charge review",
    patient: "Ryan Cooper",
    practice: "Cedar Row ENT",
    statusLabel: "Charge review",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Sep 28, 2026",
    payer: "Regence",
    balance: "$860.00",
    note: "Filing date is close. The nasal endoscopy is on file. The auth number is the piece that holds the claim.",
    nextStep: "Finish charge review, then Alicia can send it.",
    steps: stepsThrough(
      ["Clinic entered the visit", "Charge review", "Alicia sends the charge"],
      1,
    ),
    fields: [
      { label: "CPT", value: "31231" },
      { label: "Date of service", value: "Jul 9, 2026" },
      { label: "Subscriber ID", value: "On file" },
      { label: "Auth number", value: "Missing" },
      { label: "Credentialing", value: "Provider can bill Regence" },
    ],
    files: [],
    history: [
      {
        id: "ryan-1",
        date: "Sep 18, 2026",
        source: "Cedar Row ENT",
        audience: "Tracker",
        text: "New tracker row. Nasal endoscopy. CPT 31231.",
      },
      {
        id: "ryan-done",
        date: "Today",
        source: "Charge review",
        audience: "Charge review",
        text: "Step done.",
        minutes: 18,
      },
    ],
    actions: ["Ready for Alicia", "Waiting on clinic"],
  },
  {
    id: "noah",
    number: "174839205",
    queue: "open",
    desk: "calls",
    owner: "Call center",
    patient: "Noah Grant",
    practice: "Lakeside Allergy",
    statusLabel: "Call center",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 15, 2026",
    payer: "Summit Blue",
    balance: "$2,460.00",
    note: "The clinic asked about a coordination-of-benefits balance. The call stays on this claim until Mallory has enough to move it.",
    nextStep: "Log the call. Move it when the coverage answer is complete.",
    steps: stepsThrough(
      ["Clinic asked about the balance", "Outbound call", "Move to tracker lead"],
      1,
    ),
    fields: [
      { label: "Who called", value: "Lakeside front desk" },
      { label: "About", value: "Coordination of benefits" },
      { label: "Call log", value: "Tue / Thu log, now on this claim" },
    ],
    files: [],
    history: [
      {
        id: "noah-1",
        date: "Sep 20, 2026",
        source: "Lakeside Allergy",
        audience: "Call center",
        text: "Email: patient says the other insurance should have paid.",
      },
    ],
    actions: ["Call again", "Enough to move"],
  },
  {
    id: "jonah",
    number: "583920471",
    queue: "open",
    desk: "cloud",
    owner: "Cloud Staff",
    patient: "Jonah Blake",
    practice: "Westbridge Orthopedics",
    statusLabel: "Not on file",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Oct 2, 2026",
    payer: "Aetna",
    balance: "$4,280.00",
    note: "Worked first on the AR because the filing date is at risk. Portal check comes before a call.",
    nextStep: "Check the Aetna portal, then send the finding back.",
    steps: stepsThrough(
      ["Submitted in AdvancedMD", "White case", "Not on file follow-up"],
      2,
    ),
    fields: [
      { label: "AR tab", value: "Not on file" },
      { label: "Portal", value: "Not checked yet" },
      { label: "Member ID", value: "On file" },
      { label: "Diagnosis change", value: "Cloud Staff cannot make one" },
    ],
    files: [],
    history: [
      {
        id: "jonah-1",
        date: "Sep 18, 2026",
        source: "Jordan Hale",
        audience: "Cloud Staff",
        text: "White case. Please check whether Aetna has this claim.",
      },
    ],
    actions: ["Not on file — mail it", "On file — send back"],
  },
  {
    id: "ruth",
    number: "103847592",
    queue: "open",
    desk: "tracker",
    owner: "Tracker leads",
    patient: "Ruth Keller",
    practice: "Harbor & Pine Family Medicine",
    statusLabel: "Paid EOB",
    urgency: "Routine",
    flag: "White",
    dueDate: "Nov 2, 2026",
    payer: "Humana",
    balance: "$540.00",
    note: "Every code paid. Write the amounts, apply the office cap, then turn the row green.",
    nextStep: "Record the paid amount and patient responsibility.",
    steps: stepsThrough(
      ["EDI received", "Paid EOB on the tracker", "Turn the row green"],
      1,
    ),
    fields: [
      { label: "Paid amount", value: "$486.00" },
      { label: "Patient responsibility", value: "$54.00" },
      { label: "Office cap", value: "$40.00" },
      { label: "Auth notes", value: "Delete when the row turns green" },
    ],
    files: ["humana-eob.pdf"],
    history: [
      {
        id: "ruth-1",
        date: "Sep 22, 2026",
        source: "Crystal Hershon",
        audience: "Tracker",
        text: "EDI shows all codes paid. No denial.",
      },
    ],
    actions: ["Turn row green"],
  },
  {
    id: "adele",
    number: "920374851",
    queue: "waiting",
    desk: "records",
    owner: "Medical records",
    patient: "Adele Fraser",
    practice: "Harbor & Pine Family Medicine",
    statusLabel: "Waiting for medical records",
    urgency: "Urgent",
    flag: "Yellow",
    dueDate: "Oct 7, 2026",
    payer: "Medicare",
    balance: "$1,120.00",
    note: "The payer asked for the operative note. The claim stays here until that file is attached. The office saying they saw the request does not clear it.",
    nextStep: "Attach the operative note, then move the claim along.",
    steps: stepsThrough(
      ["Soft denial", "Waiting for medical records", "Send the record"],
      1,
    ),
    fields: [
      { label: "Request type", value: "Single patient" },
      { label: "Missing", value: "Operative note" },
      { label: "Date asked", value: "Sep 12, 2026" },
      { label: "Record", value: "Not attached" },
    ],
    files: [],
    history: [
      {
        id: "adele-1",
        date: "Sep 12, 2026",
        source: "Jordan Hale",
        audience: "Records",
        text: "Payer asked for the operative note. Tracker lead cannot pull it.",
      },
      {
        id: "adele-2",
        date: "Sep 20, 2026",
        source: "Harbor & Pine",
        audience: "Records",
        text: "Office marked the request seen. The record is still not here.",
      },
    ],
    actions: ["Attach record"],
  },
  {
    id: "elena",
    number: "438100221",
    queue: "deadline",
    desk: "appeals",
    owner: "Appeals",
    patient: "Elena Vasquez",
    practice: "Harbor ENT",
    statusLabel: "Reconsideration upheld",
    urgency: "Urgent",
    flag: "Red",
    dueDate: "Oct 7, 2026",
    payer: "BrightPath",
    balance: "$5,120.00",
    note: "A reconsideration was mailed and upheld. This is a hard denial, so appeals works it again.",
    nextStep: "Classify the denial before another letter goes out.",
    steps: stepsThrough(
      ["Tracker lead copied it to appeals", "Appeals", "Outcome"],
      1,
    ),
    fields: [
      { label: "Denial reason", value: "Medical necessity" },
      { label: "Tries used", value: "1 of 2" },
      { label: "Last send", value: "Mail" },
      { label: "Payer received it", value: "Yes. Upheld." },
    ],
    files: ["brightpath-denial.pdf"],
    history: [
      {
        id: "elena-1",
        date: "Sep 9, 2026",
        source: "Jordan Hale",
        audience: "Appeals",
        text: "Reconsideration was mailed and upheld. Copied to the appeals tab.",
      },
    ],
    actions: ["Dispute", "Adjust off"],
  },
  {
    id: "walter",
    number: "302948175",
    queue: "waiting",
    desk: "tracker",
    owner: "Tracker leads",
    patient: "Walter Briggs",
    practice: "Northline Pediatrics",
    statusLabel: "Do not call",
    urgency: "Routine",
    flag: "White",
    dueDate: "Sep 12, 2026",
    payer: "Aetna",
    balance: "$195.00",
    note: "Credentialing is open for this provider. Crystal confirmed it on the provider and payer list.",
    nextStep: "Leave it. Do not call Aetna until credentialing closes.",
    steps: stepsThrough(["Charge held", "Do not call", "Credentialing closes"], 1),
    fields: [
      { label: "Provider", value: "Dr. Avery Lang" },
      { label: "Payer", value: "Aetna" },
      { label: "Issue list", value: "Confirmed by Crystal" },
    ],
    files: [],
    history: [
      {
        id: "walter-1",
        date: "Sep 15, 2026",
        source: "Crystal Hershon",
        audience: "Tracker",
        text: "Yes. This is a credentialing issue. Do not call.",
      },
    ],
    actions: ["Keep on do not call"],
  },
  {
    id: "thomas",
    number: "438295710",
    queue: "waiting",
    desk: "cloud",
    owner: "Cloud Staff",
    patient: "Thomas Nguyen",
    practice: "Northline Pediatrics",
    statusLabel: "Called last time",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 16, 2026",
    payer: "Providence",
    balance: "$240.00",
    note: "Portal said the claim was received. Check again around the 16th, including whether records arrived.",
    nextStep: "Follow up on the prior call.",
    steps: stepsThrough(["Not on file", "Called last time", "Still open"], 1),
    fields: [
      { label: "AR tab", value: "Called last time" },
      { label: "Last check", value: "Sep 16, 2026" },
      { label: "Portal", value: "Received" },
    ],
    files: [],
    history: [
      {
        id: "thomas-1",
        date: "Sep 16, 2026",
        source: "Priya Shah",
        audience: "Cloud Staff",
        text: "Providence portal says received. Check again in 30 days.",
      },
      {
        id: "thomas-done",
        date: "Today",
        source: "Cloud Staff",
        audience: "Cloud Staff",
        text: "Step done.",
        minutes: 22,
      },
    ],
    actions: ["Still open", "Paid but still on AR"],
  },
  {
    id: "zoe",
    number: "739204829",
    queue: "open",
    desk: "charge",
    owner: "Charge review",
    patient: "Zoe Bailey",
    practice: "Northline Pediatrics",
    statusLabel: "Unbilled",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 20, 2026",
    payer: "Aetna",
    balance: "$195.00",
    note: "The charge never went out. Subscriber ID is outside the effective date. That is a simple correction.",
    nextStep: "Correct the subscriber ID, then return to the charge review tab.",
    steps: stepsThrough(["Unbilled", "Simple correction", "Alicia sends the charge"], 1),
    fields: [
      { label: "CPT", value: "99213" },
      { label: "Date of service", value: "Sep 2, 2026" },
      { label: "Subscriber ID", value: "Outside effective date" },
      { label: "Issue", value: "Simple" },
    ],
    files: [],
    history: [],
    actions: ["Ready for Alicia", "Waiting on clinic"],
  },
  {
    id: "ethan",
    number: "203749292",
    queue: "open",
    desk: "charge",
    owner: "Charge review",
    patient: "Ethan Russell",
    practice: "Cedar Row ENT",
    statusLabel: "Rejection",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Oct 4, 2026",
    payer: "Regence",
    balance: "$640.00",
    note: "The clearinghouse rejected it. The rejection reason is not always the real reason.",
    nextStep: "Review the rejection in Claims Center, then scan for overnight add-ons.",
    steps: stepsThrough(["Submitted", "Clearinghouse rejection", "Charge review"], 1),
    fields: [
      { label: "CPT", value: "31231" },
      { label: "Where", value: "Claims Center · Exclusions" },
      { label: "Rejection", value: "Payer-specific rule" },
      { label: "Credentialing", value: "Clear" },
    ],
    files: [],
    history: [],
    actions: ["Ready for Alicia", "Waiting on clinic"],
  },
  {
    id: "brian",
    number: "203492972",
    queue: "open",
    desk: "calls",
    owner: "Call center",
    patient: "Brian Carter",
    practice: "Harbor ENT",
    statusLabel: "Inbound call",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 18, 2026",
    payer: "BrightPath",
    balance: "$320.00",
    note: "The clinic emailed a question. It is logged on this claim. A simple answer can close the call.",
    nextStep: "Log what they asked. Move it if the answer is complete.",
    steps: stepsThrough(["Inbound email", "Log the call", "Move along"], 1),
    fields: [
      { label: "Who called", value: "Harbor ENT" },
      { label: "About", value: "Claim status" },
      { label: "Simple or not", value: "Simple. About a minute." },
    ],
    files: [],
    history: [],
    actions: ["Call again", "Enough to move"],
  },
  {
    id: "emily",
    number: "204792639",
    queue: "waiting",
    desk: "calls",
    owner: "Call center",
    patient: "Emily Parker",
    practice: "Lakeside Allergy",
    statusLabel: "Second attempt",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 22, 2026",
    payer: "Summit Blue",
    balance: "$180.00",
    note: "First patient-balance call had no answer. The next try is this week. After that, the balance can move to the patient.",
    nextStep: "Call again. A statement is the step after a second miss.",
    steps: stepsThrough(["First call", "Second attempt", "Statement"], 1),
    fields: [
      { label: "About", value: "Patient balance" },
      { label: "Last try", value: "Sep 18, 2026" },
      { label: "Call log", value: "On this claim" },
    ],
    files: [],
    history: [],
    actions: ["Call again", "Enough to move"],
  },
  {
    id: "chloe",
    number: "294203792",
    queue: "open",
    desk: "tracker",
    owner: "Tracker leads",
    patient: "Chloe Griffin",
    practice: "Cedar Row ENT",
    statusLabel: "White case",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 30, 2026",
    payer: "Medicare",
    balance: "$1,040.00",
    note: "No EOB yet. Check that the claim is on file so it does not become a timely-filing denial.",
    nextStep: "Confirm it is on file, and note what insurance will pay.",
    steps: stepsThrough(["Submitted", "White case", "On file or not"], 1),
    fields: [
      { label: "Tracker color", value: "White" },
      { label: "On file", value: "Not checked" },
      { label: "Auth notes", value: "Still on the row" },
    ],
    files: [],
    history: [],
    actions: ["Ask Cloud Staff"],
  },
  {
    id: "michael",
    number: "392720849",
    queue: "open",
    desk: "cloud",
    owner: "Cloud Staff",
    patient: "Michael Bennett",
    practice: "Vale Cardiology",
    statusLabel: "New AR",
    urgency: "Routine",
    flag: "White",
    dueDate: "Nov 1, 2026",
    payer: "Moda",
    balance: "$3,050.00",
    note: "New on the non-surgical AR. Not on file is worked first. This one has not been called.",
    nextStep: "Check the portal before calling.",
    steps: stepsThrough(["New AR", "Portal check", "Call or send back"], 0),
    fields: [
      { label: "AR tab", value: "New claims" },
      { label: "Order", value: "After not-on-file" },
      { label: "Portal", value: "Not checked" },
    ],
    files: [],
    history: [],
    actions: ["On file — send back", "Not on file — mail it"],
  },
  {
    id: "sophia",
    number: "902347129",
    queue: "open",
    desk: "cloud",
    owner: "Cloud Staff",
    patient: "Sophia Mitchell",
    practice: "Harbor & Pine Family Medicine",
    statusLabel: "Paid, still on AR",
    urgency: "Urgent",
    flag: "Green",
    dueDate: "Oct 9, 2026",
    payer: "Humana",
    balance: "$540.00",
    note: "Marked paid, full amount, but the row is still on the AR. That is a posting error, not another payer call.",
    nextStep: "Send it to billing. Do not call Humana.",
    steps: stepsThrough(["Called", "Paid CS follow-up", "Billing posts it"], 1),
    fields: [
      { label: "AR tab", value: "Paid, still on AR" },
      { label: "Marked", value: "Paid in full" },
      { label: "Balance", value: "Still open" },
    ],
    files: [],
    history: [],
    actions: ["Paid but still on AR"],
  },
  {
    id: "olivia",
    number: "349720292",
    queue: "waiting",
    desk: "records",
    owner: "Medical records",
    patient: "Olivia Hayes",
    practice: "Northline Pediatrics",
    statusLabel: "Waiting for medical records",
    urgency: "Routine",
    flag: "Yellow",
    dueDate: "Oct 21, 2026",
    payer: "Providence",
    balance: "$240.00",
    note: "On Records Needed. The office list goes out Friday. The claim stays yellow until the page is attached.",
    nextStep: "Wait for the clinic file, then attach it.",
    steps: stepsThrough(["Records requested", "Waiting for medical records", "Send the record"], 1),
    fields: [
      { label: "Request type", value: "Single patient" },
      { label: "Missing", value: "Office note" },
      { label: "Date asked", value: "Sep 19, 2026" },
      { label: "Record", value: "Not attached" },
    ],
    files: [],
    history: [],
    actions: ["Attach record"],
  },
  {
    id: "james",
    number: "729204392",
    queue: "open",
    desk: "records",
    owner: "Medical records",
    patient: "James Reynolds",
    practice: "Harbor ENT",
    statusLabel: "Record attached",
    urgency: "Routine",
    flag: "Yellow",
    dueDate: "Oct 11, 2026",
    payer: "Medicare",
    balance: "$890.00",
    note: "The operative note is on the claim. Codes, date of service, and the signature were checked. Send it by portal.",
    nextStep: "Send the record, then the claim can move.",
    steps: stepsThrough(["Waiting for medical records", "Record attached", "Send the record"], 1),
    fields: [
      { label: "Request type", value: "Single patient" },
      { label: "Record", value: "op-report.pdf" },
      { label: "How to send", value: "Portal, then fax" },
    ],
    files: ["op-report.pdf"],
    history: [],
    actions: ["Move along"],
  },
  {
    id: "isabella",
    number: "294372890",
    queue: "open",
    desk: "appeals",
    owner: "Appeals",
    patient: "Isabella Simmons",
    practice: "Cedar Row ENT",
    statusLabel: "Coding error",
    urgency: "Routine",
    flag: "Red",
    dueDate: "Oct 19, 2026",
    payer: "Aetna",
    balance: "$760.00",
    note: "The denial is a coding error, not a payer dispute. Correct it and rebuild. This is not a diagnosis change for Cloud Staff.",
    nextStep: "Correct the code, then resubmit.",
    steps: stepsThrough(["Red on the tracker", "Coding error", "Resubmit"], 1),
    fields: [
      { label: "Denial reason", value: "Coding" },
      { label: "CPT", value: "31231" },
      { label: "Tries used", value: "0 of 2" },
    ],
    files: ["aetna-denial.pdf"],
    history: [],
    actions: ["Correct and resubmit"],
  },
  {
    id: "mia",
    number: "920472839",
    queue: "waiting",
    desk: "appeals",
    owner: "Appeals",
    patient: "Mia Lawson",
    practice: "Westbridge Orthopedics",
    statusLabel: "Valid denial",
    urgency: "Routine",
    flag: "Red",
    dueDate: "Oct 28, 2026",
    payer: "Moda",
    balance: "$210.00",
    note: "Tries are used up. The denial stands. Adjust it off. There is no tracker color for that yet.",
    nextStep: "Adjust off, and record why.",
    steps: stepsThrough(["Appeal sent", "Upheld", "Adjust off"], 2),
    fields: [
      { label: "Denial reason", value: "Valid. Tries exhausted." },
      { label: "Tries used", value: "2 of 2" },
      { label: "Last send", value: "Fax" },
    ],
    files: [],
    history: [],
    actions: ["Adjust off"],
  },
  {
    id: "david",
    number: "729203494",
    queue: "open",
    desk: "billing",
    owner: "Billing",
    patient: "David Foster",
    practice: "Harbor & Pine Family Medicine",
    statusLabel: "Ready to post",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 12, 2026",
    payer: "Humana",
    balance: "$540.00",
    note: "The ERA line is green and the remark is PR1. Insurance paid, and the rest is the patient deductible.",
    nextStep: "Post the payment. Do not treat green alone as done.",
    steps: stepsThrough(["EDI received", "ERA review", "Post payment"], 1),
    fields: [
      { label: "Insurance paid", value: "$486.00" },
      { label: "Patient paid", value: "$0.00" },
      { label: "Patient responsibility", value: "$54.00" },
      { label: "Write-off", value: "$0.00" },
      { label: "Remark", value: "PR1 deductible" },
      { label: "Date of service", value: "Aug 4, 2026" },
      { label: "CPT", value: "99214" },
    ],
    files: ["humana-eob.pdf"],
    history: [],
    actions: ["Post payment", "Hold — do not bill patient"],
  },
  {
    id: "andrew",
    number: "204739293",
    queue: "open",
    desk: "billing",
    owner: "Billing",
    patient: "Andrew Powell",
    practice: "Cedar Row ENT",
    statusLabel: "Hold",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Oct 8, 2026",
    payer: "Regence",
    balance: "$860.00",
    note: "The line looks green, but there is no payment and no write-off. Posting it would bill the patient.",
    nextStep: "Hold it. The denial stays on the patient account.",
    steps: stepsThrough(["ERA line", "Hold", "Work from the EDI"], 1),
    fields: [
      { label: "Insurance paid", value: "$0.00" },
      { label: "Write-off", value: "None" },
      { label: "Remark", value: "Code did not pay" },
      { label: "ERA color", value: "Green. Not safe." },
      { label: "CPT", value: "31231" },
    ],
    files: ["regence-eob.pdf"],
    history: [],
    actions: ["Hold — do not bill patient"],
  },
  {
    id: "lily",
    number: "294203793",
    queue: "waiting",
    desk: "billing",
    owner: "Billing",
    patient: "Lily Reed",
    practice: "Lakeside Allergy",
    statusLabel: "Copay over-apply",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 14, 2026",
    payer: "Summit Blue",
    balance: "$15.00",
    note: "The ERA would over-apply $15 because the patient already paid a copay.",
    nextStep: "Unapply the copay, then post.",
    steps: stepsThrough(["ERA line", "Copay conflict", "Post payment"], 1),
    fields: [
      { label: "Insurance paid", value: "$120.00" },
      { label: "Patient paid", value: "$15.00 copay" },
      { label: "Over-apply", value: "$15.00" },
      { label: "CPT", value: "95004" },
    ],
    files: [],
    history: [],
    actions: ["Unapply copay", "Hold — do not bill patient"],
  },
  {
    id: "daniel",
    number: "392720850",
    queue: "open",
    desk: "billing",
    owner: "Billing",
    patient: "Daniel Price",
    practice: "Northline Pediatrics",
    statusLabel: "Denial off the ERA",
    urgency: "Routine",
    flag: "Red",
    dueDate: "Oct 16, 2026",
    payer: "Aetna",
    balance: "$240.00",
    note: "Holding the line took it off the ERA. The denial is still on the patient account and has to be worked from the EDI.",
    nextStep: "Send the denial to the tracker lead. Do not treat the ERA as clear.",
    steps: stepsThrough(["ERA denial", "Held off the ERA", "Tracker lead works the EDI"], 1),
    fields: [
      { label: "Insurance paid", value: "$0.00" },
      { label: "Write-off", value: "None" },
      { label: "Where it sits", value: "Patient account, not the ERA" },
      { label: "CPT", value: "99213" },
    ],
    files: ["aetna-eob.pdf"],
    history: [],
    actions: ["Hold — do not bill patient"],
  },
];
