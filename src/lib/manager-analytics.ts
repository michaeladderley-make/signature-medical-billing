import type { Queue } from "@/lib/claims";

/** Prototype seed for the manager page. Replace with live claim models later. */

export const performancePeriod = "September 2026";

export const performanceStats = [
  {
    label: "Open balance",
    value: "$186,420",
    detail: "412 claims still on the desk",
  },
  {
    label: "Collected",
    value: "$94,210",
    detail: "Paid this month",
  },
  {
    label: "Near deadline",
    value: "18",
    detail: "$22,640 at risk of filing late",
    tone: "deadline" as const,
  },
  {
    label: "Days to collect",
    value: "27",
    detail: "Average from submission to payment",
  },
];

export const stepPipeline = [
  { label: "Claim started", count: 64 },
  { label: "Charge review", count: 81 },
  { label: "Charge approval", count: 46 },
  { label: "Record submission", count: 58 },
  { label: "Collect", count: 97 },
  { label: "Finalize", count: 66 },
];

export const queueMix: { queue: Queue; label: string; count: number; balance: string }[] = [
  { queue: "open", label: "Open", count: 148, balance: "$71,300" },
  { queue: "waiting", label: "Waiting", count: 246, balance: "$92,480" },
  { queue: "deadline", label: "Deadline", count: 18, balance: "$22,640" },
];

export const weeklyVolume = [
  { label: "Aug 4", filed: 38, paid: 29 },
  { label: "Aug 11", filed: 42, paid: 31 },
  { label: "Aug 18", filed: 36, paid: 34 },
  { label: "Aug 25", filed: 47, paid: 33 },
  { label: "Sep 1", filed: 44, paid: 39 },
  { label: "Sep 8", filed: 51, paid: 36 },
  { label: "Sep 15", filed: 46, paid: 41 },
  { label: "Sep 22", filed: 40, paid: 28 },
];

export const practicesAtRisk = [
  { practice: "Cedar Row ENT", claims: 4, balance: "$3,240" },
  { practice: "Harbor Orthopedics", claims: 3, balance: "$8,110" },
  { practice: "Northline Family", claims: 3, balance: "$4,860" },
  { practice: "Pike Street Imaging", claims: 2, balance: "$6,430" },
];

export const payerPerformance = [
  { payer: "Regence", claims: 96, collected: "$28,400", outstanding: "$41,200", denial: "6%" },
  { payer: "Medicare", claims: 88, collected: "$22,150", outstanding: "$31,640", denial: "4%" },
  { payer: "Premera", claims: 72, collected: "$16,880", outstanding: "$24,110", denial: "8%" },
  { payer: "Aetna", claims: 54, collected: "$11,240", outstanding: "$18,900", denial: "9%" },
  { payer: "Cigna", claims: 41, collected: "$8,620", outstanding: "$12,440", denial: "7%" },
  { payer: "Self-pay", claims: 61, collected: "$6,920", outstanding: "$58,130", denial: "—" },
];
