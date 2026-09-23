import type { Claim } from "@/lib/claims";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

export function mockClaimReply(claim: Claim, question: string): string {
  const q = question.toLowerCase();
  const current = claim.steps.find((step) => step.status === "current");
  const finished = claim.steps
    .filter((step) => step.status === "complete")
    .map((step) => step.label);
  const latest = claim.history.at(-1);

  if (/\b(next|step|do next|should i)\b/.test(q)) {
    return current
      ? `${claim.patient} is on ${current.label}. ${claim.nextStep}`
      : `Every step on ${claim.patient}'s claim is finished. Nothing is waiting in the tracker.`;
  }

  if (/\b(payer|insurance|balance|amount|how much|owe)\b/.test(q)) {
    return `${claim.payer} is the payer on claim ${claim.number}. The balance is ${claim.balance}, and the claim is ${claim.statusLabel.toLowerCase()}.`;
  }

  if (/\b(deadline|due|when|date|filing)\b/.test(q)) {
    return `The date on file is ${claim.dueDate}. ${claim.note}`;
  }

  if (/\b(status|where|held|hold|review|flag)\b/.test(q)) {
    const progress = finished.length
      ? `Finished so far: ${finished.join(", ")}.`
      : "No steps are finished yet.";
    return `${claim.patient} at ${claim.practice} is ${claim.statusLabel}, ${claim.urgency.toLowerCase()}, flag ${claim.flag}. ${progress}`;
  }

  if (/\b(history|note|who|comment|said)\b/.test(q)) {
    return latest
      ? `Latest note, ${latest.date}, from ${latest.source}: ${latest.text}`
      : `There is no history on this claim yet. ${claim.note}`;
  }

  return `On claim ${claim.number} for ${claim.patient} at ${claim.practice}: ${claim.note} ${claim.nextStep}`;
}
