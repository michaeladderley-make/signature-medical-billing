"use client";

import { useMemo, useState } from "react";
import { ClaimChatSheet, ClaimComposer } from "@/components/claim-assistant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mockClaimReply, type ChatMessage } from "@/lib/claim-assistant";
import {
  advanceSteps,
  DESK_VIEWS,
  initialClaims,
  queueDot,
  type Claim,
  type DeskView,
  type Queue,
} from "@/lib/claims";

type QueueFilter = Queue | "all";

const queueFilters: { id: Queue; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "waiting", label: "waiting" },
  { id: "deadline", label: "deadline" },
];

export function WorkHub() {
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [view, setView] = useState<DeskView>("work-hub");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialClaims[0]?.id ?? "");
  const [comment, setComment] = useState("");
  const [prompt, setPrompt] = useState("");
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);

  const viewClaims = useMemo(() => {
    if (view === "my-work") {
      return claims.filter((claim) => claim.owner === "Morgan Hale");
    }
    if (view === "tracker-leads") {
      return claims.filter((claim) => claim.queue === "deadline");
    }
    return claims;
  }, [claims, view]);

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return viewClaims;
    return viewClaims.filter((claim) =>
      [claim.number, claim.patient, claim.practice, claim.payer]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, viewClaims]);

  const counts = useMemo(
    () => ({
      open: searched.filter((claim) => claim.queue === "open").length,
      waiting: searched.filter((claim) => claim.queue === "waiting").length,
      deadline: searched.filter((claim) => claim.queue === "deadline").length,
    }),
    [searched],
  );

  const visible = useMemo(
    () =>
      queueFilter === "all"
        ? searched
        : searched.filter((claim) => claim.queue === queueFilter),
    [queueFilter, searched],
  );

  const selected =
    visible.find((claim) => claim.id === selectedId) ?? visible[0] ?? null;

  const viewLabel = DESK_VIEWS.find((item) => item.id === view)?.label ?? "Work Hub";

  function updateClaim(id: string, updater: (claim: Claim) => Claim) {
    setClaims((current) =>
      current.map((claim) => (claim.id === id ? updater(claim) : claim)),
    );
  }

  function markStepDone() {
    if (!selected) return;
    updateClaim(selected.id, (claim) => ({
      ...claim,
      steps: advanceSteps(claim.steps),
    }));
  }

  function recordAction(action: string) {
    if (!selected) return;
    updateClaim(selected.id, (claim) => ({
      ...claim,
      history: [
        ...claim.history,
        {
          id: `${claim.id}-${claim.history.length + 1}`,
          date: "Today",
          source: "Morgan Hale",
          audience: "Internal",
          text: `${action} recorded on this claim.`,
        },
      ],
    }));
  }

  function addComment() {
    const text = comment.trim();
    if (!selected || !text) return;
    updateClaim(selected.id, (claim) => ({
      ...claim,
      history: [
        ...claim.history,
        {
          id: `${claim.id}-comment-${claim.history.length + 1}`,
          date: "Today",
          source: "Morgan Hale",
          audience: "Internal",
          text,
        },
      ],
    }));
    setComment("");
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
      <header className="relative flex h-20 shrink-0 items-center px-5">
        <div className="flex items-center gap-1">
          <img src="/figma/logo.svg" alt="" width={24} height={24} />
          <p className="text-[20px] leading-[normal] whitespace-nowrap text-bone">
            <span className="font-semibold">Work</span>
            <span className="font-normal">Hub</span>
          </p>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-bone outline-none">
              {viewLabel}
              <img src="/figma/chevron.svg" alt="" width={16} height={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {DESK_VIEWS.map((item) => (
                <DropdownMenuItem key={item.id} onSelect={() => setView(item.id)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm font-medium text-mist">morgan@smb.org</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="grid size-5 place-items-center outline-none"
            >
              <img src="/figma/more.svg" alt="" width={20} height={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>morgan@smb.org</DropdownMenuLabel>
              <DropdownMenuItem disabled>Sample claims. Not a live desk.</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

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

          <div className="mt-4 flex items-center justify-between gap-1">
            {queueFilters.map((filter) => {
              const active =
                queueFilter === filter.id ||
                (queueFilter === "all" && filter.id === "open");
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() =>
                    setQueueFilter((current) =>
                      current === filter.id ? "all" : filter.id,
                    )
                  }
                  className={`flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-sm leading-[normal] whitespace-nowrap ${
                    active ? "bg-iron text-bone" : "text-mist"
                  }`}
                >
                  {filter.id === "open" && active ? (
                    <img src="/figma/dot-open.svg" alt="" width={8} height={8} />
                  ) : null}
                  <span className="font-semibold">{counts[filter.id]}</span>
                  <span className="font-normal">{filter.label}</span>
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
                    className="flex w-full items-center justify-between text-left text-sm leading-[normal] text-ash transition-colors hover:text-bone focus-visible:text-bone focus-visible:outline-none aria-[current=true]:text-bone"
                  >
                    <span className="flex items-center gap-0.5">
                      <img src="/figma/hash.svg" alt="" width={16} height={16} />
                      <span>{claim.number}</span>
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
                <div key={step.label} className="flex items-center justify-between">
                  <p
                    className={`text-[15px] leading-[normal] ${
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
              last updated by Sam at 9:41pm
            </p>
          </div>

          <div className="w-px self-stretch bg-iron" />

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex justify-end px-4 pt-4">
              <Button
                type="button"
                onClick={markStepDone}
                disabled={!selected || !currentStep}
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
                  <p className="text-body-sm text-ash">{selected.practice}</p>
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

                <p className="max-w-[640px] text-body text-bone">
                  <span className="text-ash">Next step: </span>
                  {selected.nextStep}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selected.actions.map((action) => (
                    <Button
                      key={action}
                      type="button"
                      variant="outline"
                      className="h-10 rounded-[10px] px-3.5"
                      onClick={() => recordAction(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>

                <section className="space-y-3">
                  <h2 className="eyebrow">History</h2>
                  {selected.history.length === 0 ? (
                    <p className="text-body-sm text-ash">No history yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {selected.history.map((entry) => (
                        <li key={entry.id} className="text-body-sm">
                          <p className="text-ash">
                            {entry.date} · {entry.source} · {entry.audience}
                          </p>
                          <p className="text-bone">{entry.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addComment();
                  }}
                >
                  <label htmlFor="claim-comment" className="text-body-sm text-bone">
                    Comment
                  </label>
                  <p className="text-caption text-ash">
                    Internal note. This is not written to the clinic tracker.
                  </p>
                  <Textarea
                    id="claim-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add comment"
                    className="rounded-[10px] border-slate-edge bg-graphite text-sm"
                  />
                  <Button type="submit" variant="outline" className="h-10 rounded-[10px] px-3.5">
                    Add comment
                  </Button>
                </form>
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
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
