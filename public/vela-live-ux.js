(() => {
  const playerSelector = ".vela-player";
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function formatOffset(seconds, precise = false) {
    const safe = Math.max(0, seconds);
    if (precise && safe < 10) return `${safe.toFixed(1)}s`;
    const total = Math.round(safe);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function liveMetrics(player) {
    if (!player.classList.contains("is-live")) return null;
    const video = player.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) return null;

    let start = Number.NaN;
    let end = Number.NaN;
    if (video.seekable?.length) {
      start = video.seekable.start(0);
      end = video.seekable.end(video.seekable.length - 1);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      const seek = player.querySelector(".vela-seek-input");
      if (seek instanceof HTMLInputElement) {
        start = Number.parseFloat(seek.min || "0");
        end = Number.parseFloat(seek.max || "0");
      }
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const current = clamp(video.currentTime || start, start, end);
    const delay = Math.max(end - current, 0);
    const windowLength = Math.max(end - start, 0);
    return { video, start, end, current, delay, windowLength, atEdge: delay <= 2.5 };
  }

  function ensureTimelineContext(player) {
    const wrap = player.querySelector(".vela-timeline-wrap");
    if (!(wrap instanceof HTMLElement)) return null;

    let context = wrap.querySelector(":scope > .vela-live-timeline-context");
    if (!(context instanceof HTMLElement)) {
      context = document.createElement("div");
      context.className = "vela-live-timeline-context";
      context.setAttribute("aria-hidden", "true");

      const windowNode = document.createElement("span");
      windowNode.dataset.part = "window";
      const edgeNode = document.createElement("span");
      edgeNode.dataset.part = "edge";
      context.append(windowNode, edgeNode);
      wrap.append(context);
    }
    return context;
  }

  function updatePreview(player, metrics) {
    const preview = player.querySelector(".vela-preview");
    if (!(preview instanceof HTMLElement)) return;
    const left = Number.parseFloat(preview.style.left || "0");
    if (!Number.isFinite(left)) return;

    const ratio = clamp(left / 100, 0, 1);
    const target = metrics.start + ratio * metrics.windowLength;
    const delay = Math.max(metrics.end - target, 0);
    const atEdge = delay <= 2.5;
    preview.dataset.velaLivePreviewState = atEdge ? "edge" : "dvr";
    preview.dataset.velaLivePreviewKicker = atEdge ? "EDGE" : "DVR";
    preview.dataset.velaLivePreviewLabel = atEdge ? "LIVE" : `−${formatOffset(delay)}`;
  }

  function ensureConfirmation(player) {
    let notice = player.querySelector(".vela-live-confirmation");
    if (notice instanceof HTMLElement) return notice;

    notice = document.createElement("div");
    notice.className = "vela-live-confirmation";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    const eyebrow = document.createElement("small");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    notice.append(eyebrow, title, detail);
    player.append(notice);
    return notice;
  }

  function showConfirmation(player, metrics) {
    const notice = ensureConfirmation(player);
    const eyebrow = notice.querySelector("small");
    const title = notice.querySelector("strong");
    const detail = notice.querySelector("span");
    if (eyebrow) eyebrow.textContent = "LIVE";
    if (title) title.textContent = "Back at live edge";
    if (detail) detail.textContent = `${formatOffset(metrics.windowLength)} DVR window`;

    notice.classList.remove("is-visible");
    requestAnimationFrame(() => notice.classList.add("is-visible"));
    const previous = Number.parseInt(notice.dataset.hideTimer || "0", 10);
    if (previous) window.clearTimeout(previous);
    const timer = window.setTimeout(() => notice.classList.remove("is-visible"), 1500);
    notice.dataset.hideTimer = String(timer);
  }

  function sync(player, state) {
    if (!(player instanceof HTMLElement)) return;
    const metrics = liveMetrics(player);
    if (!metrics) {
      player.removeAttribute("data-vela-live-ux");
      player.removeAttribute("data-vela-live-state");
      return;
    }

    player.dataset.velaLiveUx = "ready";
    player.dataset.velaLiveState = metrics.atEdge ? "edge" : "behind";

    const liveButton = player.querySelector(".vela-live-button");
    if (liveButton instanceof HTMLButtonElement) {
      liveButton.dataset.velaLiveEnhanced = "true";
      liveButton.dataset.velaLiveState = metrics.atEdge ? "edge" : "behind";
      liveButton.dataset.velaLiveLabel = metrics.atEdge
        ? `LIVE · ${formatOffset(metrics.delay, true).toUpperCase()}`
        : `GO LIVE · −${formatOffset(metrics.delay)}`;
      liveButton.setAttribute(
        "aria-label",
        metrics.atEdge
          ? `At live edge, ${formatOffset(metrics.delay, true)} behind edge`
          : `Return to live edge, ${formatOffset(metrics.delay)} behind`,
      );
    }

    const context = ensureTimelineContext(player);
    if (context) {
      const windowNode = context.querySelector('[data-part="window"]');
      const edgeNode = context.querySelector('[data-part="edge"]');
      if (windowNode) windowNode.textContent = `DVR · ${formatOffset(metrics.windowLength)}`;
      if (edgeNode instanceof HTMLElement) {
        edgeNode.dataset.state = metrics.atEdge ? "edge" : "behind";
        edgeNode.textContent = metrics.atEdge ? "LIVE EDGE" : `−${formatOffset(metrics.delay)} TO LIVE`;
      }
    }

    const signal = player.querySelector('.vela-signal-chip[data-kind="live"]');
    if (signal instanceof HTMLElement) {
      if (metrics.atEdge) {
        delete signal.dataset.velaLiveAction;
        signal.removeAttribute("role");
        signal.removeAttribute("tabindex");
        signal.setAttribute("aria-label", `At live edge, ${formatOffset(metrics.delay, true)} behind edge`);
      } else {
        signal.dataset.velaLiveAction = "return";
        signal.setAttribute("role", "button");
        signal.setAttribute("tabindex", "0");
        signal.setAttribute("aria-label", `Return to live edge, ${formatOffset(metrics.delay)} behind`);
      }
    }

    updatePreview(player, metrics);

    if (state.pendingReturn && metrics.atEdge) {
      state.pendingReturn = false;
      showConfirmation(player, metrics);
    }
  }

  function enhance(player) {
    if (!(player instanceof HTMLElement) || player.dataset.velaLiveUxInstalled === "true") return;
    player.dataset.velaLiveUxInstalled = "true";
    const state = { frame: 0, pendingReturn: false, pendingTimer: 0 };

    const schedule = () => {
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        sync(player, state);
      });
    };

    const video = player.querySelector("video");
    if (video instanceof HTMLVideoElement) {
      ["loadedmetadata", "loadeddata", "timeupdate", "progress", "durationchange", "seeking", "seeked"].forEach((type) => {
        video.addEventListener(type, schedule, { passive: true });
      });
    }

    const timeline = player.querySelector(".vela-timeline-wrap");
    if (timeline instanceof HTMLElement) {
      timeline.addEventListener("pointermove", schedule, { passive: true });
      timeline.addEventListener("pointerdown", schedule, { passive: true });
    }

    player.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const signal = event.target.closest('.vela-signal-chip[data-kind="live"][data-vela-live-action="return"]');
      if (signal) {
        const button = player.querySelector(".vela-live-button");
        if (button instanceof HTMLButtonElement) button.click();
        return;
      }

      const button = event.target.closest(".vela-live-button");
      if (!(button instanceof HTMLButtonElement)) return;
      const metrics = liveMetrics(player);
      if (metrics && !metrics.atEdge) {
        state.pendingReturn = true;
        if (state.pendingTimer) window.clearTimeout(state.pendingTimer);
        state.pendingTimer = window.setTimeout(() => {
          state.pendingReturn = false;
          state.pendingTimer = 0;
        }, 4000);
      }
      window.setTimeout(schedule, 0);
    });

    player.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!(event.target instanceof Element)) return;
      const signal = event.target.closest('.vela-signal-chip[data-kind="live"][data-vela-live-action="return"]');
      if (!signal) return;
      event.preventDefault();
      const button = player.querySelector(".vela-live-button");
      if (button instanceof HTMLButtonElement) button.click();
    });

    const observer = new MutationObserver(schedule);
    observer.observe(player, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    schedule();
  }

  const scan = () => document.querySelectorAll(playerSelector).forEach(enhance);
  const observer = new MutationObserver(scan);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scan();
      observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  } else {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
