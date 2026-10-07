import { Tabs } from "radix-ui";
import { Pin, PinOff } from "lucide-react";
import { formatParam, labelFor, modelForPhase, PHASE_COLOURS, PHASE_LABELS } from "../format";
import { useStore, type Explain, type InspectorTab } from "../store";
import type { Encyclopedia, Run, Sample, SpeciesDetail } from "../types";
import { Badge, cx, Panel, Segmented } from "../ui";

const MODEL_TABS = [
  { value: "imbibition", label: "Wetting" },
  { value: "hydrothermal", label: "Dose" },
  { value: "seedling", label: "Growth" },
  { value: "respiration", label: "Breathing" },
];

type Props = {
  run: Run | null;
  sample: Sample | null;
  comparison: string | null;
  encyclopedia: Encyclopedia | null;
  detail: SpeciesDetail | null;
};

export function Inspector({ run, sample, comparison, encyclopedia, detail }: Props) {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const explain = useStore((s) => s.explain);
  const setExplain = useStore((s) => s.setExplain);

  return (
    <Panel className="flex max-h-full w-[320px] flex-col overflow-hidden">
      <Tabs.Root value={tab} onValueChange={(value) => setTab(value as InspectorTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-10 flex-none items-center justify-between border-b border-line px-2">
          <Tabs.List className="flex gap-0.5" aria-label="Inspector">
            {(
              [
                ["now", "Now"],
                ["model", "Model"],
                ["numbers", "Numbers"],
              ] as const
            ).map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="h-6 rounded-md px-2 text-[11px] font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:bg-white/8 data-[state=active]:text-fg"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Segmented<Explain>
            label="Explanation style"
            size="xs"
            value={explain}
            onChange={setExplain}
            options={[
              { value: "plain", label: "Plain", title: "Everyday language" },
              { value: "physics", label: "Physics", title: "Equations and quantities" },
            ]}
          />
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
          <Tabs.Content value="now" className="outline-none">
            <NowTab run={run} sample={sample} comparison={comparison} encyclopedia={encyclopedia} explain={explain} />
          </Tabs.Content>
          <Tabs.Content value="model" className="outline-none">
            <ModelTab sample={sample} encyclopedia={encyclopedia} explain={explain} />
          </Tabs.Content>
          <Tabs.Content value="numbers" className="outline-none">
            <NumbersTab detail={detail} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Panel>
  );
}

function NowTab({
  run,
  sample,
  comparison,
  encyclopedia,
  explain,
}: {
  run: Run | null;
  sample: Sample | null;
  comparison: string | null;
  encyclopedia: Encyclopedia | null;
  explain: Explain;
}) {
  const setTab = useStore((s) => s.setTab);
  const pinModel = useStore((s) => s.pinModel);
  if (!run || !sample) return <p className="p-3 text-fg-subtle">Waiting for the simulator…</p>;
  const phase = encyclopedia?.phases.find((item) => item.id === sample.phase);
  const model = encyclopedia?.models.find((item) => item.id === modelForPhase(sample.phase));
  const colour = PHASE_COLOURS[sample.phase];

  return (
    <div className="space-y-3 p-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-fg">{run.common_name}</h3>
          <span className="truncate text-[10.5px] italic text-fg-subtle">{run.scientific_name}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: colour }} />
          <span className="text-[11px] font-medium" style={{ color: colour }}>
            {PHASE_LABELS[sample.phase]}
          </span>
        </div>
      </div>

      {phase && (
        <div className="rounded-lg border border-line bg-white/[0.025] p-2.5">
          <p className="text-[11px] font-semibold text-fg">{phase.title}</p>
          <p className="mt-1 text-[11.5px] leading-[1.55] text-fg-muted">{explain === "plain" ? phase.plain : phase.physics}</p>
          {model && (
            <button
              type="button"
              className="mt-2 text-[10.5px] font-medium text-leaf hover:underline"
              onClick={() => {
                pinModel(null);
                setTab("model");
              }}
            >
              Modelled with {model.name} ({model.year}) →
            </button>
          )}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
        <Readout label="Germinated" value={`${(sample.germination_fraction * 100).toFixed(0)}%`} />
        <Readout label="Water content" value={`${(sample.moisture * 100).toFixed(0)}%`} />
        <Readout label="Breathing" value={`${sample.respiration_index.toFixed(2)}×`} />
        <Readout label="Root" value={`${sample.root_mm.toFixed(1)} mm`} />
        <Readout label="Shoot" value={`${sample.hypocotyl_mm.toFixed(1)} mm`} />
        <Readout label="Half sprouted" value={run.t50_h === null ? "never" : `${run.t50_h.toFixed(0)} h`} />
      </dl>

      <p className="text-[11.5px] leading-[1.55] text-fg-muted">
        {explain === "plain" ? (comparison ?? run.narrative.plain) : run.narrative.physics}
      </p>
      <p className="rounded-md bg-warn/[0.07] px-2.5 py-2 text-[11px] leading-[1.5] text-warn/90">{run.narrative.limit}</p>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900 px-2 py-1.5">
      <dt className="text-[10px] text-fg-subtle">{label}</dt>
      <dd className="font-mono text-[12px] text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function ModelTab({
  sample,
  encyclopedia,
  explain,
}: {
  sample: Sample | null;
  encyclopedia: Encyclopedia | null;
  explain: Explain;
}) {
  const pinned = useStore((s) => s.pinnedModel);
  const pinModel = useStore((s) => s.pinModel);
  const auto = sample ? modelForPhase(sample.phase) : "hydrothermal";
  const activeId = pinned ?? auto;
  const model = encyclopedia?.models.find((item) => item.id === activeId);

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <Segmented
          label="Model"
          size="xs"
          value={activeId}
          onChange={(value) => pinModel(value)}
          options={MODEL_TABS.map((item) => ({
            value: item.value,
            label: (
              <span className="flex items-center gap-1">
                {item.label}
                {!pinned && item.value === auto && <span className="size-1 rounded-full bg-leaf" />}
              </span>
            ),
          }))}
        />
        <button
          type="button"
          onClick={() => pinModel(pinned ? null : activeId)}
          className="flex items-center gap-1 text-[10.5px] text-fg-subtle hover:text-fg"
          title={pinned ? "Follow the current phase" : "Keep this model while time runs"}
        >
          {pinned ? <PinOff size={11} /> : <Pin size={11} />}
          {pinned ? "Pinned" : "Auto"}
        </button>
      </div>
      {model ? (
        <>
          <div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-semibold text-fg">{model.name}</h3>
              <span className="font-mono text-[10.5px] text-fg-subtle">{model.year}</span>
            </div>
            <p className="mt-0.5 text-[10.5px] leading-[1.45] text-fg-subtle">{model.developed_from}</p>
          </div>
          <pre className="scroll-quiet overflow-x-auto rounded-lg border border-line bg-black/30 px-2.5 py-2 font-mono text-[11px] leading-[1.5] whitespace-pre-wrap text-leaf">
            {model.equation}
          </pre>
          <p className="text-[11px] leading-[1.5] text-fg-muted">{model.equation_note}</p>
          <p className="text-[11.5px] leading-[1.55] text-fg-muted">{explain === "plain" ? model.plain : model.physics}</p>
          <ListBlock title="Assumes" items={model.assumptions} tone="muted" />
          <ListBlock title="Where it breaks" items={model.limitations} tone="warn" />
        </>
      ) : (
        <p className="text-fg-subtle">Loading the model library…</p>
      )}
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: "muted" | "warn" }) {
  return (
    <div>
      <h4 className="mb-1 text-[10.5px] font-semibold tracking-[0.04em] text-fg-subtle uppercase">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[11px] leading-[1.5] text-fg-muted">
            <span className={cx("mt-[7px] size-1 flex-none rounded-full", tone === "warn" ? "bg-warn" : "bg-fg-subtle")} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumbersTab({ detail }: { detail: SpeciesDetail | null }) {
  if (!detail) return <p className="p-3 text-fg-subtle">Loading the species pack…</p>;
  const germination = detail.provenance.filter((item) => item.parameter.startsWith("germination."));
  const other = detail.provenance.filter((item) => !item.parameter.startsWith("germination."));
  return (
    <div className="space-y-3 p-3">
      <div>
        <h3 className="text-[13px] font-semibold text-fg">{detail.common_name}</h3>
        <p className="text-[10.5px] text-fg-subtle">
          <i>{detail.scientific_name}</i> · {detail.family}
        </p>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-fg-muted">{detail.summary}</p>
      <dl className="space-y-2 text-[11px] leading-[1.5]">
        <div>
          <dt className="font-medium text-fg">Food reserves</dt>
          <dd className="text-fg-muted">{detail.reserves}</dd>
        </div>
        <div>
          <dt className="font-medium text-fg">Dormancy</dt>
          <dd className="text-fg-muted">{detail.dormancy_note}</dd>
        </div>
      </dl>
      <div>
        <h4 className="mb-1.5 text-[10.5px] font-semibold tracking-[0.04em] text-fg-subtle uppercase">Germination parameters</h4>
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {germination.map((item) => (
            <li key={item.parameter} className="px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-fg">{labelFor(item.parameter)}</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-fg tabular-nums">{formatParam(item.parameter, detail.germination)}</span>
                  <Badge tone={item.confidence}>{item.confidence}</Badge>
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] leading-[1.45] text-fg-subtle">
                {item.source}
                {item.year ? `, ${item.year}` : ""}. {item.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <details className="group">
        <summary className="cursor-pointer text-[10.5px] font-semibold tracking-[0.04em] text-fg-subtle uppercase select-none hover:text-fg">
          Other parameters ({other.length})
        </summary>
        <ul className="mt-1.5 space-y-1.5">
          {other.map((item) => (
            <li key={item.parameter} className="text-[10.5px] leading-[1.45] text-fg-subtle">
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-fg-muted">{item.parameter}</span>
                <Badge tone={item.confidence}>{item.confidence}</Badge>
              </span>
              {item.source}. {item.note}
            </li>
          ))}
        </ul>
      </details>
      <div>
        <h4 className="mb-1 text-[10.5px] font-semibold tracking-[0.04em] text-fg-subtle uppercase">References</h4>
        <ol className="space-y-1">
          {detail.references.map((ref) => (
            <li key={ref.id} className="text-[10.5px] leading-[1.45] text-fg-subtle">
              {ref.citation}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
