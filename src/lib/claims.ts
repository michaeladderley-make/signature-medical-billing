export type Queue = "open" | "waiting" | "deadline";

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
    number: "204739292",
    queue: "open",
    patient: "Ryan Cooper",
    practice: "Cedar Row ENT",
    statusLabel: "In review",
    urgency: "Urgent",
    flag: "White",
    dueDate: "Sep 28, 2026",
    payer: "Regence",
    balance: "$860.00",
    note: "Filing deadline is close. Charge review still needs the auth number from Cedar Row before this can move to record submission. Regence already has the nasal endoscopy on file, but the authorization is the piece that will hold the claim if it is not attached before Sep 28.\n\nThis stays an internal note so the desk can see it without writing it to the clinic tracker. The clinic has been asked once. If the auth number is not back by the next pass, leave charge review open and mark the claim waiting on clinic.",
    nextStep: "Get the auth number from Cedar Row before the filing date.",
    stepIndex: 2,
    history: [
      {
        id: "ryan-1",
        date: "Sep 18, 2026",
        source: "Cedar Row ENT",
        audience: "Tracker",
        text: "New tracker row. Nasal endoscopy. CPT 31231.",
      },
      {
        id: "ryan-2",
        date: "Sep 22, 2026",
        source: "Morgan Hale",
        audience: "Internal",
        text: "Filing deadline is close. Charge review still needs the auth number.",
      },
    ],
    actions: ["Pass", "Waiting on clinic", "Attach"],
  },
  {
    number: "739204829",
    queue: "open",
    patient: "Zoe Bailey",
  },
  {
    number: "203749292",
    queue: "open",
    patient: "Ethan Russell",
  },
  {
    number: "203492972",
    queue: "waiting",
    patient: "Brian Carter",
  },
  {
    number: "204792639",
    queue: "waiting",
    patient: "Emily Parker",
  },
  {
    number: "294203792",
    queue: "deadline",
    patient: "Chloe Griffin",
  },
  {
    number: "392720849",
    queue: "waiting",
    patient: "Michael Bennett",
  },
  {
    number: "920374829",
    queue: "deadline",
    patient: "Jacob Hayes",
  },
  {
    number: "902347129",
    queue: "waiting",
    patient: "Sophia Mitchell",
  },
  {
    number: "729203494",
    queue: "waiting",
    patient: "David Foster",
  },
  {
    number: "349720292",
    queue: "waiting",
    patient: "Olivia Hayes",
  },
  {
    number: "729204392",
    queue: "waiting",
    patient: "James Reynolds",
  },
  {
    number: "294372890",
    queue: "waiting",
    patient: "Isabella Simmons",
  },
  {
    number: "739204292",
    queue: "waiting",
    patient: "Christopher Grant",
  },
  {
    number: "920472839",
    queue: "waiting",
    patient: "Mia Lawson",
  },
  {
    number: "294739202",
    queue: "waiting",
    patient: "Matthew Brooks",
  },
  {
    number: "203749292",
    queue: "waiting",
    patient: "Amelia Turner",
  },
  {
    number: "729204932",
    queue: "waiting",
    patient: "Joshua Coleman",
  },
  {
    number: "392720849",
    queue: "waiting",
    patient: "Charlotte Morgan",
  },
  {
    number: "204739292",
    queue: "waiting",
    patient: "Andrew Powell",
  },
  {
    number: "920374829",
    queue: "waiting",
    patient: "Ella Foster",
  },
  {
    number: "739204829",
    queue: "waiting",
    patient: "Joseph Hayes",
  },
  {
    number: "294203792",
    queue: "waiting",
    patient: "Lily Reed",
  },
  {
    number: "203749292",
    queue: "waiting",
    patient: "Daniel Price",
  },
  {
    number: "920374829",
    queue: "waiting",
    patient: "Grace Kelly",
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
