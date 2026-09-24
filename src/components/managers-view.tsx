import { queueDot } from "@/lib/claims";
import {
  payerPerformance,
  performancePeriod,
  performanceStats,
  practicesAtRisk,
  queueMix,
  stepPipeline,
  weeklyVolume,
} from "@/lib/manager-analytics";

const pipelineMax = Math.max(...stepPipeline.map((step) => step.count));
const weekMax = Math.max(...weeklyVolume.flatMap((week) => [week.filed, week.paid]));

export function ManagersView() {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[12px] bg-graphite">
      <div className="flex items-end justify-between px-6 py-5">
        <div>
          <p className="eyebrow">Sample</p>
          <h1 className="mt-2 text-[20px] leading-[normal] font-medium text-bone">
            Claim performance
          </h1>
        </div>
        <p className="text-sm leading-[normal] text-mist">{performancePeriod}</p>
      </div>

      <div className="grid grid-cols-4 border-y border-iron">
        {performanceStats.map((stat) => (
          <div key={stat.label} className="px-6 py-5">
            <p className="text-sm leading-[normal] text-mist">{stat.label}</p>
            <p
              className={`mt-2 text-heading leading-none ${
                stat.tone === "deadline" ? "text-[#EA4444]" : "text-bone"
              }`}
            >
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
            {stepPipeline.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm leading-[normal] text-ash">
                  {step.label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-iron">
                  <span
                    className="block h-full rounded-full bg-soft-indigo"
                    style={{ width: `${(step.count / pipelineMax) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right text-sm leading-[normal] text-bone">
                  {step.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 py-5">
          <h2 className="eyebrow">Queue</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {queueMix.map((item) => (
              <li key={item.queue} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm leading-[normal] text-bone">
                  <img src={queueDot(item.queue)} alt="" width={8} height={8} />
                  {item.label}
                </span>
                <span className="text-sm leading-[normal] text-ash">
                  {item.count} · {item.balance}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="eyebrow mt-8">Practices near deadline</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {practicesAtRisk.map((practice) => (
              <li key={practice.practice} className="flex items-center justify-between gap-3">
                <span className="text-sm leading-[normal] text-bone">{practice.practice}</span>
                <span className="shrink-0 text-sm leading-[normal] text-ash">
                  {practice.claims} · {practice.balance}
                </span>
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
              <th className="py-2 font-normal">Collected</th>
              <th className="py-2 font-normal">Outstanding</th>
              <th className="py-2 font-normal">Denial</th>
            </tr>
          </thead>
          <tbody>
            {payerPerformance.map((payer) => (
              <tr key={payer.payer} className="border-t border-iron text-bone">
                <td className="py-3">{payer.payer}</td>
                <td className="py-3 text-ash">{payer.claims}</td>
                <td className="py-3">{payer.collected}</td>
                <td className="py-3">{payer.outstanding}</td>
                <td className="py-3 text-ash">{payer.denial}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
