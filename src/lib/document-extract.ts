import type { Claim, ClaimField } from "@/lib/claims";

export type DocumentKind = "EDI report" | "EOB";

export type ExtractedField = {
  label: string;
  value: string;
  page: number;
  check: boolean;
};

function value(claim: Claim, label: string) {
  return claim.fields.find((field) => field.label === label)?.value ?? "";
}

function money(text: string) {
  return /^\$[\d,]+\.\d{2}$/.test(text) ? text : "";
}

export function documentKindFor(claim: Claim): DocumentKind | null {
  if (claim.desk === "billing") return "EOB";
  if (claim.desk !== "tracker") return null;
  if (claim.flag === "Red" || claim.flag === "Yellow" || /denial/i.test(claim.statusLabel)) {
    return "EDI report";
  }
  if (/paid eob/i.test(claim.statusLabel)) return "EOB";
  return null;
}

export function sampleFileName(claim: Claim, kind: DocumentKind) {
  const last = claim.patient.split(" ").at(-1)?.toLowerCase() ?? "claim";
  return kind === "EOB" ? `${claim.payer.toLowerCase().replace(/\s+/g, "-")}-eob-${last}.pdf` : `edi-${last}.pdf`;
}

export function mockExtract(claim: Claim, kind: DocumentKind): ExtractedField[] {
  const dos = value(claim, "Date of service") || "Aug 12, 2026";
  const cpt = (value(claim, "CPT") || "99214").split(" ")[0];
  const base = [
    { label: "Patient", value: claim.patient, page: 1, check: false },
    { label: "Date of service", value: dos, page: 1, check: false },
    { label: "CPT", value: cpt, page: 2, check: false },
  ];

  if (kind === "EDI report") {
    return [
      ...base,
      { label: "Insurance paid", value: "$0.00", page: 2, check: false },
      { label: "Insurance balance", value: claim.balance, page: 2, check: false },
      { label: "Patient responsibility", value: "$0.00", page: 2, check: false },
      {
        label: "Denial reason",
        value: value(claim, "Denial reason") || "Medical records requested",
        page: 3,
        check: true,
      },
    ];
  }

  const paid =
    money(value(claim, "Insurance paid")) || money(value(claim, "Paid amount")) || claim.balance;
  return [
    ...base,
    { label: "Insurance paid", value: paid, page: 2, check: false },
    { label: "Patient paid", value: money(value(claim, "Patient paid")) || "$0.00", page: 2, check: false },
    {
      label: "Patient responsibility",
      value: money(value(claim, "Patient responsibility")) || "$0.00",
      page: 2,
      check: false,
    },
    { label: "Write-off", value: money(value(claim, "Write-off")) || "$0.00", page: 2, check: false },
    { label: "Remark", value: value(claim, "Remark") || "CO-45 contractual", page: 3, check: true },
  ];
}

export function applyExtraction(
  claim: Claim,
  kind: DocumentKind,
  fileName: string,
  fields: ExtractedField[],
  corrected: number,
  actor: string,
): Claim {
  const merged: ClaimField[] = [...claim.fields];
  for (const field of fields) {
    const index = merged.findIndex((item) => item.label === field.label);
    if (index === -1) merged.push({ label: field.label, value: field.value });
    else merged[index] = { label: field.label, value: field.value };
  }
  const note =
    corrected > 0
      ? `${kind} read from ${fileName}. ${fields.length - corrected} fields confirmed, ${corrected} corrected.`
      : `${kind} read from ${fileName}. ${fields.length} fields confirmed.`;
  return {
    ...claim,
    fields: merged,
    files: claim.files.includes(fileName) ? claim.files : [...claim.files, fileName],
    history: [
      ...claim.history,
      {
        id: `${claim.id}-${claim.history.length + 1}`,
        date: "Today",
        source: actor,
        audience: actor,
        text: note,
        minutes: 3,
      },
    ],
  };
}
