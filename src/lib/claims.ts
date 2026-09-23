export type Queue = "open" | "waiting" | "deadline";

export type DeskView = "work-hub" | "my-work" | "tracker-leads";

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
};

export type Claim = {
  id: string;
  number: string;
  queue: Queue;
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
};

export const STEP_LABELS = [
  "Claim started",
  "Charge review",
  "Charge approval",
  "Record submission",
  "Collect",
  "Finalize",
] as const;

export const DESK_VIEWS: { id: DeskView; label: string }[] = [
  { id: "work-hub", label: "Work Hub" },
  { id: "my-work", label: "My work" },
  { id: "tracker-leads", label: "Tracker leads" },
];

const QUEUE_DOT: Record<Queue, string> = {
  open: "/figma/status-open.svg",
  waiting: "/figma/status-waiting.svg",
  deadline: "/figma/status-deadline.svg",
};

export function queueDot(queue: Queue) {
  return QUEUE_DOT[queue];
}

export function stepsThrough(currentIndex: number): Step[] {
  return STEP_LABELS.map((label, index) => ({
    label,
    status:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}

type ClaimSeed = {
  number: string;
  queue: Queue;
  owner?: string;
  patient?: string;
  practice?: string;
  statusLabel?: string;
  urgency?: string;
  flag?: string;
  dueDate?: string;
  payer?: string;
  balance?: string;
  note?: string;
  nextStep?: string;
  stepIndex?: number;
  history?: HistoryEntry[];
  actions?: string[];
};

const roster: ClaimSeed[] = [
  {
    number: "729349202",
    queue: "open",
    patient: "Marisol Vega",
    practice: "Cedar Row ENT",
    statusLabel: "In review",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Sep 28, 2026",
    payer: "Regence",
    balance: "$860.00",
    note: "Filing deadline is close. Charge review still needs the auth number.",
    nextStep: "Get the auth number from Cedar Row before the filing date.",
    stepIndex: 2,
    history: [
      {
        id: "marisol-1",
        date: "Sep 18, 2026",
        source: "Cedar Row ENT",
        audience: "Tracker",
        text: "New tracker row. Nasal endoscopy. CPT 31231.",
      },
      {
        id: "marisol-2",
        date: "Sep 22, 2026",
        source: "Morgan Hale",
        audience: "Internal",
        text: "Filing deadline is close. Charge review still needs the auth number.",
      },
    ],
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  {
    number: "583920471",
    queue: "open",
    patient: "Jonah Blake",
    practice: "Westbridge Orthopedics",
    statusLabel: "Held",
    urgency: "Urgent",
    flag: "Green",
    dueDate: "Oct 2, 2026",
    payer: "Aetna",
    balance: "$4,280.00",
    note: "Hold this. The EOB looks paid and the balance is still open.",
    nextStep: "Confirm whether the EOB payment posted before charge review continues.",
    stepIndex: 1,
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  {
    number: "174839205",
    queue: "open",
    patient: "Walter Briggs",
    practice: "Northline Pediatrics",
    statusLabel: "Held",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Oct 6, 2026",
    payer: "Aetna",
    balance: "$195.00",
    note: "Do not call. Aetna credentialing is open for this provider.",
    nextStep: "Leave the claim held until credentialing closes.",
    stepIndex: 0,
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  {
    number: "920374851",
    queue: "waiting",
    patient: "Adele Fraser",
    practice: "Harbor & Pine Family Medicine",
    statusLabel: "Records requested",
    urgency: "Urgent",
    flag: "Yellow",
    dueDate: "Oct 7, 2026",
    payer: "Medicare",
    balance: "$1,120.00",
    note: "Asked Harbor & Pine for the operative note.",
    nextStep: "Wait for the operative note, then return to charge review.",
    stepIndex: 1,
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  {
    number: "438295710",
    queue: "waiting",
    patient: "Thomas Nguyen",
    practice: "Northline Pediatrics",
    statusLabel: "Waiting on payer",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 16, 2026",
    payer: "Providence",
    balance: "$240.00",
    note: "Portal says the claim was received. Check again around the 16th.",
    nextStep: "Check the Providence portal again on the follow-up date.",
    stepIndex: 4,
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  {
    number: "759203184",
    queue: "deadline",
    patient: "Unassigned",
    practice: "Work hub",
    statusLabel: "Near deadline",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Sep 30, 2026",
    payer: "Unassigned",
    balance: "—",
    note: "Filing date is inside the deadline window.",
    nextStep: "Open the claim and confirm the filing date.",
    stepIndex: 0,
  },
  { number: "302948175", queue: "waiting" },
  { number: "814759320", queue: "waiting" },
  { number: "295817430", queue: "waiting" },
  { number: "471083295", queue: "waiting" },
  {
    number: "830471295",
    queue: "deadline",
    patient: "Unassigned",
    practice: "Work hub",
    statusLabel: "Near deadline",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Oct 1, 2026",
    payer: "Unassigned",
    balance: "—",
    note: "Deadline marker from the work hub list.",
    nextStep: "Review the filing deadline before the step can move.",
    stepIndex: 1,
  },
  { number: "592038471", queue: "waiting" },
  { number: "710294385", queue: "waiting" },
  { number: "384710592", queue: "waiting" },
  { number: "205938471", queue: "waiting" },
  { number: "471592038", queue: "waiting" },
  { number: "938471205", queue: "waiting" },
  { number: "284759103", queue: "waiting" },
  { number: "103847592", queue: "waiting" },
  { number: "759103284", queue: "waiting" },
  { number: "592038471", queue: "waiting" },
  { number: "471205938", queue: "waiting" },
  { number: "103284759", queue: "waiting" },
  {
    number: "847592103",
    queue: "waiting",
    patient: "Chris Padilla",
    practice: "Vale Cardiology",
    statusLabel: "In review",
    urgency: "Routine",
    flag: "White",
    dueDate: "Oct 21, 2026",
    payer: "Moda",
    balance: "$3,050.00",
    note: "Passed to Cloud Staff after a portal check.",
    nextStep: "Cloud Staff finishes the portal check, then charge review resumes.",
    stepIndex: 1,
    owner: "Cloud Staff",
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  { number: "284759103", queue: "waiting" },
  {
    number: "103847592",
    queue: "waiting",
    patient: "Ruth Keller",
    practice: "Harbor & Pine Family Medicine",
    statusLabel: "Submitted",
    urgency: "Routine",
    flag: "White",
    dueDate: "Nov 2, 2026",
    payer: "Humana",
    balance: "$540.00",
    note: "Filed in AdvancedMD by Morgan Hale. Electronic claim accepted.",
    nextStep: "Watch for the payer acknowledgement.",
    stepIndex: 3,
    history: [
      {
        id: "ruth-1",
        date: "Nov 2, 2026",
        source: "Morgan Hale",
        audience: "Tracker",
        text: "Filed in AdvancedMD. Electronic claim accepted.",
      },
    ],
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
];

function fallback(seed: ClaimSeed, index: number): Claim {
  const queueLabel =
    seed.queue === "open"
      ? "In review"
      : seed.queue === "deadline"
        ? "Near deadline"
        : "Waiting";

  return {
    id: `${seed.number}-${index}`,
    number: seed.number,
    queue: seed.queue,
    owner: seed.owner ?? "Morgan Hale",
    patient: seed.patient ?? "Unassigned",
    practice: seed.practice ?? "Work hub",
    statusLabel: seed.statusLabel ?? queueLabel,
    urgency: seed.urgency ?? (seed.queue === "waiting" ? "Routine" : "Urgent"),
    flag: seed.flag ?? "White",
    dueDate: seed.dueDate ?? "—",
    payer: seed.payer ?? "Unassigned",
    balance: seed.balance ?? "—",
    note: seed.note ?? "Sample claim. Not a live desk.",
    nextStep:
      seed.nextStep ?? "Open the claim and confirm the next tracker step.",
    steps: stepsThrough(seed.stepIndex ?? (index % STEP_LABELS.length)),
    history: seed.history ?? [],
    actions: seed.actions ?? ["Pass", "Waiting on clinic", "Attach"],
  };
}

export const initialClaims: Claim[] = roster.map(fallback);

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
