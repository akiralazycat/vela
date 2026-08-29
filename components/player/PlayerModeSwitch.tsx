"use client";

import type { VelaDisplayMode } from "./presentation";

type PlayerModeSwitchProps = {
  value: VelaDisplayMode;
  onChange: (mode: VelaDisplayMode) => void;
};

export function PlayerModeSwitch({ value, onChange }: PlayerModeSwitchProps) {
  return (
    <div className="vela-display-switch-row">
      <div className="vela-display-switch" role="group" aria-label="Player display mode">
        {(["default", "minimal"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={value === mode ? "is-active" : ""}
            aria-pressed={value === mode}
            onClick={() => onChange(mode)}
          >
            {mode === "default" ? "Default" : "Minimal"}
          </button>
        ))}
      </div>
    </div>
  );
}
