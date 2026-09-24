"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ClaimChatSheet, ClaimComposer } from "@/components/claim-assistant";
import { useDesk } from "@/components/desk-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mockClaimReply, type ChatMessage } from "@/lib/claim-assistant";
import { actionBlock, applyAction, fieldValue, stepBlock } from "@/lib/claim-actions";
import { queueDot, type Claim, type Queue } from "@/lib/claims";

type QueueFilter = Queue | "all";

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
  const { person, claims, setClaims } = useDesk();

  const mine = useMemo(() => {
    const rows =
      person.desk === "all" ? claims : claims.filter((claim) => claim.desk === person.desk);
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

  function markStepDone() {
    if (!selected || stepBlock(selected)) return;
    updateClaim(selected.id, (claim) => applyAction(claim, "Mark step done", person.role));
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
          audience: "Call center",
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

  const currentStep = selected?.steps.some((step) => step.status === "current");

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
                    <img
                      src={queueDot(claim.queue)}
                      alt=""
                      width={8}
                      height={8}
                    />
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
          <div className="flex w-[319px] shrink-0 flex-col self-stretch px-4 pt-4">
            <div className="flex flex-col gap-4">
              {selected?.steps.map((step) => (
                <div key={step.label} className="flex items-center justify-between gap-3">
                  <p
                    className={`min-w-0 text-[15px] leading-snug ${
                      step.status === "current" ? "text-bone" : "text-ash"
                    }`}
                  >
                    {step.label}
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
            <p className="mt-auto mb-4 flex h-10 items-center text-[12px] leading-normal font-normal text-mist">
              {selected?.owner ?? person.role}
            </p>
          </div>

          <div className="w-px self-stretch bg-iron" />

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex justify-end px-4 pt-4">
              <Button
                type="button"
                onClick={markStepDone}
                disabled={!selected || !currentStep || Boolean(stepBlock(selected))}
                className="h-10 rounded-[10px] px-3.5"
              >
                Mark Step Done
              </Button>
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
                  <p className="text-body-sm text-bone">
                    {selected.statusLabel}
                    <span className="text-ash"> · {selected.urgency} · {selected.flag}</span>
                  </p>
                  <p className="text-body-sm text-ash">{selected.dueDate}</p>
                  <p className="text-body-sm text-bone">
                    {selected.payer}
                    <span className="text-ash"> · {selected.balance}</span>
                  </p>
                </div>

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

                <p className="max-w-[640px] text-body text-bone">
                  <span className="text-ash">Next step: </span>
                  {selected.nextStep}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selected.actions.map((action) => {
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
                </div>
                {selected && stepBlock(selected) ? (
                  <p className="text-body-sm text-ash">{stepBlock(selected)}</p>
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
                      {selected.history.map((entry) => (
                        <li key={entry.id} className="text-body-sm">
                          <p className="text-ash">
                            {entry.date} · {entry.source === entry.audience ? entry.source : `${entry.source} · ${entry.audience}`}
                          </p>
                          <p className="text-bone">{entry.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h2 id="claim-comment" className="text-body-sm text-bone">Comment</h2>
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
              <ClaimComposer
                prompt={prompt}
                disabled={!selected}
                onPromptChange={setPrompt}
                onSubmit={askAssistant}
                onAttach={
                  selected?.actions.includes("Attach record")
                    ? () => recordAction("Attach record")
                    : undefined
                }
                onComment={() => document.getElementById("claim-comment")?.scrollIntoView({ block: "nearest" })}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
