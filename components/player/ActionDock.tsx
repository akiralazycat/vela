"use client";

type ActionDockProps = {
  onPictureInPicture: () => void | Promise<void>;
  onFullscreen: () => void | Promise<void>;
};

function ActionIcon({ name }: { name: "pip" | "fullscreen" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "pip") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

/**
 * Viewing-surface actions. This intentionally renders a Fragment so the existing
 * CSS direct-child selectors keep PiP and fullscreen in the top-right glass dock.
 */
export function ActionDock({ onPictureInPicture, onFullscreen }: ActionDockProps) {
  return (
    <>
      <button
        className="vela-icon-button desktop-only"
        type="button"
        onClick={() => void onPictureInPicture()}
        aria-label="Picture in picture"
        data-vela-action-dock-owner="react"
      >
        <ActionIcon name="pip" />
      </button>
      <button
        className="vela-icon-button"
        type="button"
        onClick={() => void onFullscreen()}
        aria-label="Fullscreen"
        data-vela-action-dock-owner="react"
      >
        <ActionIcon name="fullscreen" />
      </button>
    </>
  );
}
