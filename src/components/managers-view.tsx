"use client";

import { useMemo, useState } from "react";
import { useDesk } from "@/components/desk-provider";
import { queueDot, type Claim } from "@/lib/claims";
import { performancePeriod, performanceStats, weeklyVolume } from "@/lib/manager-analytics";

const DESKS = [
  "Charge review",
  "Call center",
  "Tracker leads",
  "Cloud Staff",
  "Medical records",
  "Appeals",
  "Billing",
] as const;

const TODAY = new Date("2026-09-24T12:00:00");

type Pile = "close" | "overdue" | "denied" | "held" | "records";

function parseDue(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

function finished(claim: Claim) {
  return ["Paid", "Adjusted off", "Fully denied"].includes(claim.statusLabel);
}

function overdue(claim: Claim) {
  const due = parseDue(claim.dueDate);
  return Boolean(due && due < TODAY && !finished(claim));
}

function closeToDeadline(claim: Claim) {
  const due = parseDue(claim.dueDate);
  if (!due || finished(claim) || overdue(claim)) return false;
  const days = (due.getTime() - TODAY.getTime()) / 86400000;
  return days <= 14;
}

function denied(claim: Claim) {
  return claim.flag === "Red" || claim.desk === "appeals";
}

function held(claim: Claim) {
  const text = `${claim.statusLabel} ${claim.note} ${claim.nextStep}`.toLowerCase();
  return (
    claim.statusLabel === "Held" ||
    claim.statusLabel === "Do not call" ||
    text.includes("credential") ||
    text.includes("do not call")
  );
}

function waitingOnRecords(claim: Claim) {
  return (
    (claim.flag === "Yellow" || claim.statusLabel === "Waiting for medical records") &&
    claim.files.length === 0
  );
}

function inPile(claim: Claim, pile: Pile) {
  if (pile === "close") return closeToDeadline(claim);
  if (pile === "overdue") return overdue(claim);
  if (pile === "denied") return denied(claim);
  if (pile === "held") return held(claim);
  return waitingOnRecords(claim);
}

const piles: { id: Pile; label: string; detail: string }[] = [
  { id: "close", label: "Close to a deadline", detail: "Due within 14 days" },
  { id: "overdue", label: "Overdue", detail: "Date passed, still open" },
  { id: "denied", label: "Denied", detail: "Red, or on appeals" },
  { id: "held", label: "Held", detail: "Credentialing or do not call" },
  { id: "records", label: "Waiting on records", detail: "Yellow, file not attached" },
];

export function ManagersView() {
  const { claims } = useDesk();
  const [tab, setTab] = useState<"today" | "results">("results");
  const [pile, setPile] = useState<Pile | null>("close");
  const [desk, setDesk] = useState<string | null>(null);
  const [column, setColumn] = useState<"open" | "waiting" | "overdue" | null>(null);

  const finishedToday = useMemo(
    () => claims.flatMap((claim) => claim.history.filter((entry) => entry.date === "Today" && entry.minutes)),
    [claims],
  );

  const rows = useMemo(() => {
    if (pile) return claims.filter((claim) => inPile(claim, pile));
    if (!desk) return claims;
    return claims.filter((claim) => {
      if (claim.owner !== desk) return false;
      if (column === "open") return claim.queue === "open";
      if (column === "waiting") return claim.queue === "waiting";
      if (column === "overdue") return overdue(claim);
      return true;
    });
  }, [claims, pile, desk, column]);

  const listTitle = pile
    ? piles.find((item) => item.id === pile)?.label
    : desk
      ? `${desk}${column ? ` · ${column}` : ""}`
      : "All claims";

  function choosePile(next: Pile) {
    setPile(next);
    setDesk(null);
    setColumn(null);
  }

  function chooseCell(nextDesk: string, nextColumn: "open" | "waiting" | "overdue") {
    setPile(null);
    setDesk(nextDesk);
    setColumn(nextColumn);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[12px] bg-graphite">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-1">
          {(
            [
              ["results", "Results"],
              ["today", "Today"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-[10px] px-2.5 py-1.5 text-sm leading-[normal] ${
                tab === id ? "bg-iron text-bone" : "text-mist"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm leading-[normal] text-mist">
          {tab === "today" ? "September 24, 2026" : performancePeriod}
        </p>
      </div>

      {tab === "results" ? (
        <Results claims={claims} />
      ) : (
        <>

      <div className="grid border-y border-iron sm:grid-cols-2 xl:grid-cols-5">
        {piles.map((item) => {
          const count = claims.filter((claim) => inPile(claim, item.id)).length;
          const active = pile === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => choosePile(item.id)}
              className={`px-6 py-5 text-left ${active ? "bg-iron" : ""}`}
            >
              <p className="text-sm leading-[normal] text-mist">{item.label}</p>
              <p className={`mt-2 text-heading leading-none ${item.id === "overdue" ? "text-[#EA4444]" : "text-bone"}`}>
                {count}
              </p>
              <p className="mt-2 text-sm leading-[normal] text-ash">{item.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="border-b border-iron px-6 py-5">
        <h2 className="eyebrow">By department</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm leading-[normal]">
            <thead className="text-mist">
              <tr>
                <th className="py-2 font-normal">Department</th>
                <th className="py-2 font-normal">Open</th>
                <th className="py-2 font-normal">Waiting</th>
                <th className="py-2 font-normal">Overdue</th>
                <th className="py-2 font-normal">Oldest</th>
                <th className="py-2 font-normal">Finished today</th>
                <th className="py-2 font-normal">Minutes</th>
              </tr>
            </thead>
            <tbody>
              {DESKS.map((name) => {
                const owned = claims.filter((claim) => claim.owner === name);
                const open = owned.filter((claim) => claim.queue === "open");
                const waiting = owned.filter((claim) => claim.queue === "waiting");
                const late = owned.filter(overdue);
                const oldest = [...owned].sort((a, b) => {
                  const left = parseDue(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
                  const right = parseDue(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
                  return left - right;
                })[0];
                const done = finishedToday.filter((entry) => entry.source === name);
                const minutes = done.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
                return (
                  <tr key={name} className="border-t border-iron text-bone">
                    <td className="py-3">{name}</td>
                    {(["open", "waiting", "overdue"] as const).map((kind) => {
                      const count = kind === "open" ? open.length : kind === "waiting" ? waiting.length : late.length;
                      const active = desk === name && column === kind;
                      return (
                        <td key={kind} className="py-3">
                          <button
                            type="button"
                            onClick={() => chooseCell(name, kind)}
                            className={`rounded-[10px] px-2.5 py-1 ${active ? "bg-iron text-bone" : "text-ash"}`}
                          >
                            {count}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 text-ash">{oldest ? `${oldest.patient} · ${oldest.dueDate}` : "—"}</td>
                    <td className="py-3">{done.length}</td>
                    <td className="py-3 text-ash">{minutes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-5">
        <h2 className="eyebrow">{listTitle}</h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-ash">Nothing here.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {rows.map((claim) => (
              <li key={claim.id} className="flex items-center justify-between gap-4 text-sm leading-[normal]">
                <span className="flex min-w-0 items-center gap-2">
                  <img src={queueDot(claim.queue)} alt="" width={8} height={8} />
                  <span className="text-bone">{claim.number}</span>
                  <span className="truncate text-ash">
                    {claim.patient} · {claim.owner}
                  </span>
                </span>
                <span className="shrink-0 text-mist">
                  {claim.flag} · {claim.dueDate}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
        </>
      )}
    </section>
  );
}

function Results({ claims }: { claims: Claim[] }) {
  const weekMax = Math.max(...weeklyVolume.flatMap((week) => [week.filed, week.paid]));
  const desks = DESKS.map((label) => ({
    label,
    count: claims.filter((claim) => claim.owner === label).length,
  }));
  const pipelineMax = Math.max(...desks.map((desk) => desk.count), 1);
  const queues = (["open", "waiting", "deadline"] as const).map((queue) => ({
    queue,
    label: queue === "open" ? "Open" : queue === "waiting" ? "Waiting" : "Deadline",
    count: claims.filter((claim) => claim.queue === queue).length,
  }));
  const payers = [...new Set(claims.map((claim) => claim.payer))].map((payer) => ({
    payer,
    claims: claims.filter((claim) => claim.payer === payer).length,
  }));

  return (
    <>
      <div className="grid grid-cols-4 border-y border-iron">
        {performanceStats.map((stat) => (
          <div key={stat.label} className="px-6 py-5">
            <p className="text-sm leading-[normal] text-mist">{stat.label}</p>
            <p className={`mt-2 text-heading leading-none ${"tone" in stat && stat.tone === "deadline" ? "text-[#EA4444]" : "text-bone"}`}>
              {stat.value}
            </p>
            <p className="mt-2 text-sm leading-[normal] text-ash">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid border-b border-iron lg:grid-cols-[1.4fr_0.8fr]">
        <div className="border-iron px-6 py-5 lg:border-r">
          <h2 className="eyebrow">Filed and paid</h2>
          <div className="mt-5 flex h-28 items-end gap-3">
            {weeklyVolume.map((week) => (
              <div key={week.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-24 w-full items-end justify-center gap-1">
                  <div
                    className="w-2 rounded-full bg-soft-indigo"
                    style={{ height: `${(week.filed / weekMax) * 100}%` }}
                    title={`${week.filed} filed`}
                  />
                  <div
                    className="w-2 rounded-full bg-ash"
                    style={{ height: `${(week.paid / weekMax) * 100}%` }}
                    title={`${week.paid} paid`}
                  />
                </div>
                <span className="text-caption leading-[normal] text-mist">{week.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-sm leading-[normal] text-mist">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-soft-indigo" />
              Filed
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-ash" />
              Paid
            </span>
          </div>

          <h2 className="eyebrow mt-8">Where claims sit</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {desks.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm leading-[normal] text-ash">{step.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-iron">
                  <span
                    className="block h-full rounded-full bg-soft-indigo"
                    style={{ width: `${(step.count / pipelineMax) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right text-sm leading-[normal] text-bone">{step.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 py-5">
          <h2 className="eyebrow">Queue</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {queues.map((item) => (
              <li key={item.queue} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm leading-[normal] text-bone">
                  <img src={queueDot(item.queue)} alt="" width={8} height={8} />
                  {item.label}
                </span>
                <span className="text-sm leading-[normal] text-ash">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-6 py-5">
        <h2 className="eyebrow">Payers</h2>
        <table className="mt-4 w-full text-left text-sm leading-[normal]">
          <thead className="text-mist">
            <tr>
              <th className="py-2 font-normal">Payer</th>
              <th className="py-2 font-normal">Claims</th>
            </tr>
          </thead>
          <tbody>
            {payers.map((payer) => (
              <tr key={payer.payer} className="border-t border-iron text-bone">
                <td className="py-3">{payer.payer}</td>
                <td className="py-3 text-ash">{payer.claims}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
