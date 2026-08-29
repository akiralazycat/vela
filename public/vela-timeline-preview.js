(() => {
  const wrapSelector = ".vela-timeline-wrap";

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function markerEntries(wrap) {
    return Array.from(wrap.querySelectorAll(".vela-chapter-marker"))
      .map((marker) => ({
        ratio: Number.parseFloat(marker.style.left || "0") / 100,
        title: marker.dataset.velaChapterTitle || "",
      }))
      .filter((entry) => Number.isFinite(entry.ratio))
      .sort((a, b) => a.ratio - b.ratio);
  }

  function intervalAt(ratio, entries) {
    if (!entries.length) return 0;
    let index = 0;
    entries.forEach((entry, entryIndex) => {
      if (ratio >= entry.ratio) index = entryIndex;
    });
    return index;
  }

  function sync(wrap) {
    if (!(wrap instanceof HTMLElement)) return;
    const preview = wrap.querySelector(".vela-preview");
    if (!(preview instanceof HTMLElement)) {
      wrap.style.setProperty("--vela-preview-anchor-opacity", "0");
      return;
    }

    const ratio = clamp(Number.parseFloat(preview.style.left || "0") / 100, 0, 1);
    const width = wrap.clientWidth;
    const previewWidth = preview.offsetWidth;
    const margin = 6;
    const idealCenter = ratio * width;
    const minCenter = Math.min(previewWidth / 2 + margin, width / 2);
    const maxCenter = Math.max(width - previewWidth / 2 - margin, width / 2);
    const clampedCenter = clamp(idealCenter, minCenter, maxCenter);
    const shift = clampedCenter - idealCenter;

    preview.style.setProperty("--vela-preview-edge-shift", `${shift}px`);
    preview.classList.toggle("is-edge-adjusted", Math.abs(shift) > 0.5);
    wrap.style.setProperty("--vela-preview-anchor", `${idealCenter}px`);
    wrap.style.setProperty("--vela-preview-anchor-opacity", "1");

    const player = wrap.closest(".vela-player");
    const currentChapter = player?.querySelector(".vela-current-chapter")?.textContent?.trim();
    let chapterNode = preview.querySelector(".vela-preview-chapter");
    const seek = wrap.querySelector(".vela-seek-input");
    const entries = markerEntries(wrap);
    const hoverIndex = intervalAt(ratio, entries);
    let chapterTitle = entries[hoverIndex]?.title || "";

    if (!chapterTitle && currentChapter && seek instanceof HTMLInputElement && entries.length) {
      const min = Number.parseFloat(seek.min || "0");
      const max = Number.parseFloat(seek.max || "0");
      const value = Number.parseFloat(seek.value || "0");
      const span = max - min;
      const currentRatio = span > 0 ? clamp((value - min) / span, 0, 1) : 0;
      if (intervalAt(currentRatio, entries) === hoverIndex) chapterTitle = currentChapter;
    }

    if (chapterTitle) {
      if (!(chapterNode instanceof HTMLElement)) {
        chapterNode = document.createElement("span");
        chapterNode.className = "vela-preview-chapter";
        preview.append(chapterNode);
      }
      chapterNode.textContent = chapterTitle;
    } else if (chapterNode) {
      chapterNode.remove();
    }
  }

  function enhance(wrap) {
    if (!(wrap instanceof HTMLElement) || wrap.dataset.velaPreviewEnhanced === "true") return;
    wrap.dataset.velaPreviewEnhanced = "true";

    let touchPointerId = null;
    const schedule = () => requestAnimationFrame(() => sync(wrap));
    const finishTouchScrub = (event) => {
      if (touchPointerId === null || event.pointerId !== touchPointerId) return;
      touchPointerId = null;
      wrap.classList.remove("is-touch-scrubbing");
      wrap.style.setProperty("--vela-preview-anchor-opacity", "0");
    };

    wrap.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      touchPointerId = event.pointerId;
      wrap.classList.add("is-touch-scrubbing");
      schedule();
    }, { passive: true });

    wrap.addEventListener("pointermove", schedule, { passive: true });
    wrap.addEventListener("pointerenter", schedule, { passive: true });
    wrap.addEventListener("pointerup", finishTouchScrub, { passive: true });
    wrap.addEventListener("pointercancel", finishTouchScrub, { passive: true });
    wrap.addEventListener("lostpointercapture", finishTouchScrub, { passive: true });
    wrap.addEventListener("pointerleave", () => {
      if (!wrap.classList.contains("is-touch-scrubbing")) {
        wrap.style.setProperty("--vela-preview-anchor-opacity", "0");
      }
    }, { passive: true });

    const observer = new MutationObserver(schedule);
    observer.observe(wrap, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "data-vela-chapter-title"],
    });
    schedule();
  }

  const scan = () => document.querySelectorAll(wrapSelector).forEach(enhance);
  const rootObserver = new MutationObserver(scan);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scan();
      rootObserver.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  } else {
    scan();
    rootObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
