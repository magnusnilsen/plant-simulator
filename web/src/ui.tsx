import { Slider, Tooltip, ToggleGroup, Toggle } from "radix-ui";
import type { CSSProperties, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("panel", className)}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between px-3">
      <h2 className="text-[11px] font-semibold tracking-[0.01em] text-fg">{children}</h2>
      {aside}
    </div>
  );
}

export function Divider() {
  return <div className="my-1 h-px bg-line" />;
}

export function Tip({ label, children, side = "bottom" }: { label: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-md border border-line-strong bg-ink-800 px-2 py-1 text-[11px] text-fg shadow-lg"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function IconToggle({
  pressed,
  onPressedChange,
  label,
  shortcut,
  children,
}: {
  pressed: boolean;
  onPressedChange: (value: boolean) => void;
  label: string;
  shortcut?: string;
  children: ReactNode;
}) {
  return (
    <Tip
      label={
        <span className="flex items-center gap-2">
          {label}
          {shortcut && <kbd className="font-mono text-[10px] text-fg-subtle">{shortcut}</kbd>}
        </span>
      }
    >
      <Toggle.Root
        pressed={pressed}
        onPressedChange={onPressedChange}
        aria-label={label}
        className="grid size-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-white/6 hover:text-fg data-[state=on]:bg-white/10 data-[state=on]:text-fg"
      >
        {children}
      </Toggle.Root>
    </Tip>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cx(
          "grid size-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-white/6 hover:text-fg",
          active && "text-fg",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}

export type Mark = { value: number; label: string; tone?: "accent" | "muted" };

export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  track,
  marks = [],
  valueText,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  track?: string;
  marks?: Mark[];
  valueText?: string;
}) {
  const percent = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className="relative pt-3.5">
      {marks.map((mark) => (
        <div
          key={`${mark.label}-${mark.value}`}
          className="pointer-events-none absolute top-0 -translate-x-1/2 text-center"
          style={{ left: `${percent(mark.value)}%` }}
        >
          <span
            className={cx(
              "block font-mono text-[9.5px] leading-none",
              mark.tone === "accent" ? "text-leaf" : "text-fg-subtle",
            )}
          >
            {mark.label}
          </span>
          <span
            className={cx(
              "mx-auto mt-[3px] block h-[7px] w-px",
              mark.tone === "accent" ? "bg-leaf" : "bg-white/25",
            )}
          />
        </div>
      ))}
      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      >
        <Slider.Track
          className="relative h-[3px] grow overflow-hidden rounded-full bg-white/10"
          style={track ? ({ background: track } as CSSProperties) : undefined}
        >
          <Slider.Range className={cx("absolute h-full", track ? "bg-transparent" : "bg-fg/70")} />
        </Slider.Track>
        <Slider.Thumb
          aria-valuetext={valueText}
          className="block size-3 rounded-full border border-black/40 bg-white shadow-[0_1px_4px_rgb(0_0_0/0.5)] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-leaf/60"
        />
      </Slider.Root>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  size?: "sm" | "xs";
  label: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="inline-flex rounded-md bg-white/[0.045] p-0.5"
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          title={option.title}
          className={cx(
            "rounded-[5px] font-medium text-fg-muted transition-colors hover:text-fg data-[state=on]:bg-white/10 data-[state=on]:text-fg data-[state=on]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]",
            size === "sm" ? "h-6 px-2 text-[11px]" : "h-5 px-1.5 text-[10.5px]",
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export function Badge({ tone, children }: { tone: "high" | "medium" | "low" | "illustrative"; children: ReactNode }) {
  const tones = {
    high: "bg-leaf/15 text-leaf",
    medium: "bg-water/15 text-water",
    low: "bg-warn/15 text-warn",
    illustrative: "bg-white/8 text-fg-muted",
  } as const;
  return (
    <span className={cx("rounded px-1.5 py-px text-[10px] font-medium", tones[tone])}>{children}</span>
  );
}
