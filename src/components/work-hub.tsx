"use client";

import { useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ClaimChatSheet, ClaimComposer } from "@/components/claim-assistant";
import { useDesk } from "@/components/desk-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mockClaimReply, type ChatMessage } from "@/lib/claim-assistant";
import { actionBlock, applyAction, fieldValue } from "@/lib/claim-actions";
import { DocumentExtract } from "@/components/document-extract";
import { DEMO_CLAIM_ID, demoClaim, demoGuide, demoStepCount, demoStepOf } from "@/lib/demo-tour";
import {
  applyExtraction,
  documentKindFor,
  type DocumentKind,
  type ExtractedField,
} from "@/lib/document-extract";
import { queueDot, type Claim, type Queue } from "@/lib/claims";

type QueueFilter = Queue | "all";

const TRACKER_SWATCH: Record<string, string> = {
  White: "bg-bone",
  Green: "bg-[#22C55E]",
  Red: "bg-[#EA4444]",
  Yellow: "bg-[#EAB308]",
  Orange: "bg-[#F97316]",
};

const SHORT_STEP: Record<string, string> = {
  "Clinic enters procedure onto shared Tracker": "Clinic enters procedure",
  "Reviews charges and rejections in AMD": "Review charges in AMD",
  "Mallory performs QA; notes reviewed-thru dates": "Mallory QA",
  "Alicia performs final review & sends charges": "Alicia final review & send",
  "TLs find MR denial in EDI report, AMD, AR report": "MR denial found",
  "G4 · Validate research against payer policies": "G4 · Validate against policy",
  "Attach medical records & example claim": "Attach records",
  "Receives and pulls EOB for posting": "Pull EOB for posting",
  "Team receives credentialing request or denial": "Request received",
  "Emails clinic for information or signature": "Email clinic",
  "Credentials updated; denied claims appealed": "Credentials updated",
  "Communicate status or resolution to clinic": "Tell the clinic",
};

function shortDate(value: string) {
  return value.replace(/,\s*\d{4}$/, "");
}

const queueFilters: { id: QueueFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "waiting", label: "Waiting" },
  { id: "deadline", label: "Deadline" },
];

export function WorkHub() {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [caller, setCaller] = useState("");
  const [callNote, setCallNote] = useState("");
  const [demoSide, setDemoSide] = useState(false);
  const [extracting, setExtracting] = useState<{ claimId: string; kind: DocumentKind } | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { person, claims, setClaims } = useDesk();

  const mine = useMemo(() => {
    if (person.desk === "demo") return claims.filter((claim) => claim.id === DEMO_CLAIM_ID);
    const rows = (
      person.desk === "all" ? claims : claims.filter((claim) => claim.desk === person.desk)
    ).filter((claim) => claim.id !== DEMO_CLAIM_ID);
    if (person.desk !== "cloud") return rows;
    const order = ["Not on file", "New claims", "Called last time", "Paid, still on AR"];
    return [...rows].sort(
      (a, b) =>
        order.indexOf(fieldValue(a, "AR tab")) - order.indexOf(fieldValue(b, "AR tab")),
    );
  }, [claims, person.desk]);

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mine;
    return mine.filter((claim) =>
      [claim.number, claim.patient, claim.practice, claim.payer]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, mine]);

  const visible = useMemo(
    () =>
      queueFilter === "all"
        ? searched
        : searched.filter((claim) => claim.queue === queueFilter),
    [queueFilter, searched],
  );

  const selected =
    visible.find((claim) => claim.id === selectedId) ?? visible[0] ?? null;

  function updateClaim(id: string, updater: (claim: Claim) => Claim) {
    setClaims((current) =>
      current.map((claim) => (claim.id === id ? updater(claim) : claim)),
    );
  }

  function continueDemo() {
    if (!selected || selected.id !== DEMO_CLAIM_ID) return;
    const next = demoStepOf(selected) + 1;
    if (next >= demoStepCount()) return;
    setDemoSide(false);
    setExtracting(null);
    updateClaim(selected.id, () => demoClaim(next));
  }

  function restartDemo() {
    setDemoSide(false);
    setExtracting(null);
    updateClaim(DEMO_CLAIM_ID, () => demoClaim(0));
  }

  function confirmExtraction(fileName: string, fields: ExtractedField[], corrected: number) {
    if (!selected || !extracting) return;
    const kind = extracting.kind;
    const actor = person.desk === "demo" ? selected.owner : person.role;
    updateClaim(selected.id, (claim) => {
      const next = applyExtraction(claim, kind, fileName, fields, corrected, actor);
      return {
        ...next,
        fields: next.fields.map((field) =>
          field.label === "Fields from the report" ? { ...field, value: "Read and confirmed" } : field,
        ),
      };
    });
    setExtracting(null);
  }

  function demoSampleName(kind: DocumentKind) {
    return kind === "EOB" ? "medicare-eob.pdf" : "edi-denial-helen.pdf";
  }

  function addHistory(text: string, audience: string) {
    if (!selected) return;
    const source = person.desk === "demo" ? selected.owner : person.role;
    updateClaim(selected.id, (claim) => ({
      ...claim,
      history: [
        ...claim.history,
        { id: `${claim.id}-note-${Date.now()}`, date: "Today", source, audience, text },
      ],
    }));
  }

  function saveComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    addHistory(text, "Comment");
    setCommentText("");
    setCommentOpen(false);
  }

  function attachFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || !selected) return;
    const source = person.desk === "demo" ? selected.owner : person.role;
    updateClaim(selected.id, (claim) => ({
      ...claim,
      files: claim.files.includes(file.name) ? claim.files : [...claim.files, file.name],
      history: [
        ...claim.history,
        {
          id: `${claim.id}-file-${Date.now()}`,
          date: "Today",
          source,
          audience: source,
          text: `Attached ${file.name}.`,
        },
      ],
    }));
    if (fileRef.current) fileRef.current.value = "";
  }

  function openAttach() {
    if (selected?.actions.includes("Attach record")) {
      recordAction("Attach record");
      return;
    }
    fileRef.current?.click();
  }

  function recordAction(action: string) {
    if (!selected || actionBlock(selected, action)) return;
    const id = selected.id;
    const next = applyAction(selected, action, person.role);
    updateClaim(id, () => next);
    if (person.desk !== "all" && next.desk !== person.desk) {
      const rest = visible.filter((claim) => claim.id !== id);
      setSelectedId(rest[0]?.id ?? "");
    }
  }

  function addCall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const who = caller.trim();
    const said = callNote.trim();
    if (!who || !said) return;
    updateClaim(selected.id, (claim) => ({
      ...claim,
      history: [
        ...claim.history,
        {
          id: `${claim.id}-call-${claim.history.length + 1}`,
          date: "Today",
          source: person.name,
          audience: "Call Center",
          text: `${who}: ${said}`,
        },
      ],
    }));
    setCaller("");
    setCallNote("");
  }

  function askAssistant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!selected || !text) return;

    const claim = selected;
    const userId = `${claim.id}-ask-${Date.now()}`;
    setThreads((current) => ({
      ...current,
      [claim.id]: [
        ...(current[claim.id] ?? []),
        { id: userId, role: "user", text },
      ],
    }));
    setPrompt("");
    setOpenChatId(claim.id);
    setPendingClaimId(claim.id);

    window.setTimeout(() => {
      setThreads((current) => ({
        ...current,
        [claim.id]: [
          ...(current[claim.id] ?? []),
          {
            id: `${userId}-reply`,
            role: "assistant",
            text: mockClaimReply(claim, text),
          },
        ],
      }));
      setPendingClaimId((current) => (current === claim.id ? null : current));
    }, 700);
  }

  const queueCounts = useMemo(
    () => ({
      all: searched.length,
      open: searched.filter((claim) => claim.queue === "open").length,
      waiting: searched.filter((claim) => claim.queue === "waiting").length,
      deadline: searched.filter((claim) => claim.queue === "deadline").length,
    }),
    [searched],
  );

  const demoStep = selected && person.desk === "demo" ? demoGuide(demoStepOf(selected)) : null;
  const primaryAction = selected && person.desk !== "demo" ? (selected.actions[0] ?? null) : null;
  const primaryBlock = selected && primaryAction ? actionBlock(selected, primaryAction) : null;
  const secondaryActions = selected && person.desk !== "demo" ? selected.actions.slice(1) : [];

  return (
    <div className="flex h-dvh flex-col bg-pure-black text-bone">
      <AppHeader />

      <div className="flex min-h-0 flex-1 gap-4 px-5 pb-5">
        <aside className="flex w-[303px] shrink-0 flex-col">
          <div className="relative">
            <img
              src="/figma/search.svg"
              alt=""
              width={12}
              height={12}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search claims"
              className="h-10 rounded-[10px] border-iron bg-pure-black pl-[26px] text-sm text-bone placeholder:text-mist dark:border-iron dark:bg-pure-black"
            />
          </div>

          <div className="mt-4 flex items-center gap-1">
            {queueFilters.map((filter) => {
              const active = queueFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setQueueFilter(filter.id)}
                  className={`rounded-[10px] px-2.5 py-1.5 text-sm leading-[normal] font-normal whitespace-nowrap ${
                    active ? "bg-iron text-bone" : "text-mist"
                  }`}
                >
                  {filter.label}
                  <span className={active ? "text-ash" : "text-mist"}> {queueCounts[filter.id]}</span>
                </button>
              );
            })}
          </div>

          <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
            {visible.map((claim) => {
              const isSelected = claim.id === selected?.id;
              return (
                <li key={claim.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(claim.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className="group flex w-full items-center justify-between text-left focus-visible:outline-none"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <img src="/figma/hash.svg" alt="" width={12} height={12} />
                      <span
                        className={`shrink-0 text-sm leading-[normal] ${
                          isSelected || claim.queue !== "waiting"
                            ? "text-bone"
                            : "text-ash group-hover:text-bone"
                        }`}
                      >
                        {claim.number}
                      </span>
                      <span className="truncate text-sm leading-[normal] text-mist">
                        {claim.patient}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-caption text-mist">{shortDate(claim.dueDate)}</span>
                      <img
                        src={queueDot(claim.queue)}
                        alt={claim.queue}
                        title={claim.queue === "deadline" ? "Near a deadline" : claim.queue === "waiting" ? "Waiting" : "Open"}
                        width={8}
                        height={8}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 ? (
              <li className="text-sm text-ash">No claims in this view.</li>
            ) : null}
          </ul>
        </aside>

        <section className="flex min-w-0 flex-1 rounded-[12px] bg-graphite">
          <div className="flex min-h-0 w-[319px] shrink-0 flex-col self-stretch px-4 pt-4">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
              {selected?.steps.map((step) => (
                <div key={step.label} className="flex items-center justify-between gap-3">
                  <p
                    title={SHORT_STEP[step.label] ? step.label : undefined}
                    className={`min-w-0 text-[15px] leading-snug ${
                      step.status === "current" ? "text-bone" : "text-ash"
                    }`}
                  >
                    {SHORT_STEP[step.label] ?? step.label}
                  </p>
                  <span className="relative size-4 shrink-0">
                    <img
                      src={
                        step.status === "complete"
                          ? "/figma/step-complete.svg"
                          : "/figma/step-upcoming.svg"
                      }
                      alt={step.status === "complete" ? "Completed" : ""}
                      width={step.status === "complete" ? 16 : 32}
                      height={step.status === "complete" ? 16 : 32}
                      className="absolute top-0 left-0 max-w-none"
                    />
                  </span>
                </div>
              ))}
            </div>
            <p className="mb-4 flex h-10 shrink-0 items-center border-t border-iron text-[12px] leading-normal font-normal text-mist">
              {selected?.owner ?? person.role}
            </p>
          </div>

          <div className="w-px self-stretch bg-iron" />

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-14 justify-end px-4 pt-4">
              {demoStep?.button && !demoSide ? (
                <Button type="button" onClick={continueDemo} className="h-10 rounded-[10px] px-3.5">
                  {demoStep.button}
                </Button>
              ) : null}
              {primaryAction ? (
                <Button
                  type="button"
                  title={primaryBlock ?? undefined}
                  disabled={Boolean(primaryBlock)}
                  onClick={() => recordAction(primaryAction)}
                  className="h-10 rounded-[10px] px-3.5"
                >
                  {primaryAction}
                </Button>
              ) : null}
            </div>

            {selected ? (
              <div
                className={`min-h-0 flex-1 space-y-6 overflow-y-auto px-6 ${
                  openChatId === selected.id ? "pb-[calc(50%+1.5rem)]" : "pb-6"
                }`}
              >
                <div className="space-y-2">
                  <h1 className="text-heading-sm font-medium text-bone">
                    {selected.patient}
                  </h1>
                  <p className="text-body-sm text-ash">
                    {selected.practice}
                    <span> · {selected.owner}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-body-sm text-bone">
                    {selected.statusLabel}
                    <span className="text-ash">· {selected.urgency} ·</span>
                    <span className="inline-flex items-center gap-1.5 text-ash">
                      <span
                        className={`size-2.5 rounded-full ${TRACKER_SWATCH[selected.flag] ?? "bg-mist"}`}
                        aria-hidden
                      />
                      {selected.flag}
                    </span>
                  </p>
                  <p className="text-body-sm text-ash">{selected.dueDate}</p>
                  <p className="text-body-sm text-bone">
                    {selected.payer}
                    <span className="text-ash"> · {selected.balance}</span>
                  </p>
                </div>

                <div className="max-w-[640px] space-y-3">
                  <p className="text-body text-bone">
                    <span className="text-ash">Next step: </span>
                    {selected.nextStep}
                  </p>
                  {primaryBlock ? <p className="text-body-sm text-ash">{primaryBlock}</p> : null}
                  {person.desk === "demo" ? null : (
                    <div className="flex flex-wrap gap-2">
                      {secondaryActions.map((action) => {
                        const reason = actionBlock(selected, action);
                        return (
                          <Button
                            key={action}
                            type="button"
                            variant="outline"
                            title={reason ?? undefined}
                            disabled={Boolean(reason)}
                            className="h-10 rounded-[10px] px-3.5"
                            onClick={() => recordAction(action)}
                          >
                            {action}
                          </Button>
                        );
                      })}
                      {documentKindFor(selected) ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-[10px] px-3.5"
                          onClick={() =>
                            setExtracting({ claimId: selected.id, kind: documentKindFor(selected) as DocumentKind })
                          }
                        >
                          Upload {documentKindFor(selected)}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-[10px] px-3.5"
                        onClick={() => recordAction("Reviewed")}
                      >
                        Reviewed
                      </Button>
                    </div>
                  )}
                </div>

                {person.desk !== "demo" && extracting?.claimId === selected.id ? (
                  <DocumentExtract
                    key={`${selected.id}-${extracting.kind}`}
                    claim={selected}
                    kind={extracting.kind}
                    onConfirm={confirmExtraction}
                    onCancel={() => setExtracting(null)}
                  />
                ) : null}

                {person.desk === "demo" ? (() => {
                  const guide = demoGuide(demoStepOf(selected));
                  const showSide = demoSide && guide.side;
                  return (
                    <div className="max-w-[640px] space-y-3 rounded-[10px] border border-iron bg-pure-black px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="eyebrow">
                          Guided tour · {demoStepOf(selected) + 1} of {demoStepCount()} · {selected.owner}
                        </p>
                        <button
                          type="button"
                          onClick={restartDemo}
                          className="shrink-0 text-caption text-ash hover:text-bone"
                        >
                          Start over
                        </button>
                      </div>
                      {showSide && guide.side ? (
                        <>
                          <p className="text-body-sm font-medium text-bone">{guide.side.title}</p>
                          <p className="text-body-sm text-bone">{guide.side.text}</p>
                          <dl className="space-y-2">
                            {guide.side.fields.map((field) => (
                              <div
                                key={field.label}
                                className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-baseline gap-x-6"
                              >
                                <dt className="text-body-sm text-ash">{field.label}</dt>
                                <dd className="text-body-sm text-bone">{field.value}</dd>
                              </div>
                            ))}
                          </dl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDemoSide(false)}
                            className="h-10 rounded-[10px] px-3.5"
                          >
                            Back to the tour
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-body-sm text-bone">{guide.text}</p>
                          <div className="flex flex-wrap gap-2">
                            {guide.button ? null : (
                              <p className="text-body-sm text-ash">Tour complete. The claim is fully paid.</p>
                            )}
                            {guide.upload ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setExtracting({ claimId: selected.id, kind: guide.upload as DocumentKind })
                                }
                                className="h-10 rounded-[10px] px-3.5"
                              >
                                Upload the {guide.upload}
                              </Button>
                            ) : null}
                            {guide.side ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDemoSide(true)}
                                className="h-10 rounded-[10px] px-3.5"
                              >
                                {guide.side.button}
                              </Button>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })() : null}

                {person.desk === "demo" && extracting?.claimId === selected.id ? (
                  <DocumentExtract
                    key={`${selected.id}-${extracting.kind}-${demoStepOf(selected)}`}
                    claim={selected}
                    kind={extracting.kind}
                    sampleName={demoSampleName(extracting.kind)}
                    onConfirm={confirmExtraction}
                    onCancel={() => setExtracting(null)}
                  />
                ) : null}

                <dl className="max-w-[520px] space-y-2">
                  {selected.fields.map((field) => (
                    <div key={field.label} className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-baseline gap-x-6">
                      <dt className="text-body-sm text-ash">{field.label}</dt>
                      <dd className="text-body-sm text-bone">{field.value}</dd>
                    </div>
                  ))}
                </dl>

                {selected.files.length > 0 ? (
                  <ul className="space-y-2">
                    {selected.files.map((file) => (
                      <li key={file} className="flex items-center gap-2 text-body-sm text-bone">
                        <img src="/figma/attach.svg" alt="" width={16} height={16} />
                        {file}
                      </li>
                    ))}
                  </ul>
                ) : selected.statusLabel === "Waiting for medical records" ? (
                  <p className="text-body-sm text-ash">
                    Waiting for medical records. Nothing is attached yet.
                  </p>
                ) : null}


                {selected.desk === "calls" ? (
                  <form className="max-w-[520px] space-y-2" onSubmit={addCall}>
                    <h2 className="text-body-sm text-bone">Log this call</h2>
                    <Input
                      value={caller}
                      onChange={(event) => setCaller(event.target.value)}
                      placeholder="Who called"
                      aria-label="Who called"
                      className="h-10 rounded-[10px] border-slate-edge bg-graphite text-sm"
                    />
                    <Textarea
                      value={callNote}
                      onChange={(event) => setCallNote(event.target.value)}
                      placeholder="What they said"
                      aria-label="What they said"
                      className="min-h-16 rounded-[10px] border-slate-edge bg-graphite text-sm"
                    />
                    <Button type="submit" variant="outline" className="h-10 rounded-[10px] px-3.5">
                      Add to this claim
                    </Button>
                  </form>
                ) : null}

                <section className="space-y-3">
                  <h2 className="eyebrow">History</h2>
                  {selected.history.length === 0 ? (
                    <p className="text-body-sm text-ash">No history yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {[...selected.history].reverse().map((entry, index) => (
                        <li
                          key={entry.id}
                          className={`text-body-sm ${index === 0 ? "border-l-2 border-soft-indigo pl-3" : "pl-3.5"}`}
                        >
                          <p className="text-ash">
                            {index === 0 ? <span className="text-soft-indigo">Latest · </span> : null}
                            {entry.date} · {entry.source === entry.audience ? entry.source : `${entry.source} · ${entry.audience}`}
                          </p>
                          <p className="text-bone">{entry.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h2 className="text-body-sm text-bone">Note</h2>
                  <div className="space-y-3 text-body-sm text-ash">
                    {selected.note.split("\n\n").map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex flex-1 items-center px-6 text-sm text-ash">
                No claim selected.
              </div>
            )}

            {selected && openChatId === selected.id ? (
              <ClaimChatSheet
                patient={selected.patient}
                number={selected.number}
                messages={threads[selected.id] ?? []}
                pending={pendingClaimId === selected.id}
                prompt={prompt}
                onPromptChange={setPrompt}
                onSubmit={askAssistant}
                onClose={() => setOpenChatId(null)}
              />
            ) : (
              <>
                {selected && commentOpen ? (
                  <form onSubmit={saveComment} className="space-y-2 px-4 pb-3">
                    <Textarea
                      autoFocus
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Add a comment to this claim"
                      aria-label="Comment on this claim"
                      className="min-h-16 rounded-[10px] border-slate-edge bg-graphite text-sm"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="h-9 rounded-[10px] px-3.5" disabled={!commentText.trim()}>
                        Add comment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-[10px] px-3.5"
                        onClick={() => {
                          setCommentOpen(false);
                          setCommentText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => attachFile(event.target.files)}
                />
                <ClaimComposer
                  prompt={prompt}
                  disabled={!selected}
                  onPromptChange={setPrompt}
                  onSubmit={askAssistant}
                  onAttach={selected ? openAttach : undefined}
                  onComment={selected ? () => setCommentOpen((open) => !open) : undefined}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
