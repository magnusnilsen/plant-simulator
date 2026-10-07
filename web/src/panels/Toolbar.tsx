import {
  Box,
  Droplets,
  Focus,
  Layers,
  Rotate3d,
  Ruler,
  ScanEye,
  Scissors,
  Tag,
  View,
} from "lucide-react";
import { useStore, type ViewKey } from "../store";
import { IconButton, IconToggle, Panel } from "../ui";

const TOGGLES: { key: ViewKey; label: string; shortcut: string; Icon: typeof Box }[] = [
  { key: "section", label: "Cut the soil open", shortcut: "S", Icon: Scissors },
  { key: "soil", label: "Show soil", shortcut: "G", Icon: Layers },
  { key: "water", label: "Water flow", shortcut: "W", Icon: Droplets },
  { key: "labels", label: "Labels", shortcut: "L", Icon: Tag },
  { key: "xray", label: "See through the seed coat", shortcut: "X", Icon: ScanEye },
  { key: "scale", label: "Scale bars", shortcut: "M", Icon: Ruler },
  { key: "orbit", label: "Slow orbit", shortcut: "R", Icon: Rotate3d },
];

export const VIEW_SHORTCUTS: Record<string, ViewKey> = Object.fromEntries(
  TOGGLES.map((toggle) => [toggle.shortcut.toLowerCase(), toggle.key]),
);

export function Toolbar() {
  const view = useStore((s) => s.view);
  const toggleView = useStore((s) => s.toggleView);
  const camera = useStore((s) => s.camera);
  const setCamera = useStore((s) => s.setCamera);

  return (
    <Panel className="flex h-10 items-center gap-0.5 px-1.5">
      {TOGGLES.map(({ key, label, shortcut, Icon }) => (
        <IconToggle
          key={key}
          pressed={view[key]}
          onPressedChange={() => toggleView(key)}
          label={label}
          shortcut={shortcut}
        >
          <Icon size={15} strokeWidth={1.6} />
        </IconToggle>
      ))}
      <div className="mx-1 h-4 w-px bg-line-strong" />
      <IconButton label="Overview" onClick={() => setCamera("overview")} active={camera.preset === "overview"}>
        <Box size={15} strokeWidth={1.6} />
      </IconButton>
      <IconButton label="Straight-on section" onClick={() => setCamera("section")} active={camera.preset === "section"}>
        <View size={15} strokeWidth={1.6} />
      </IconButton>
      <IconButton label="Close-up on the selected seed" onClick={() => setCamera("seed")} active={camera.preset === "seed"}>
        <Focus size={15} strokeWidth={1.6} />
      </IconButton>
    </Panel>
  );
}
