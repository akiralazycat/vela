(() => {
  const wrapSelector = ".vela-timeline-wrap";

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function markerRatios(wrap) {
    return Array.from(wrap.querySelectorAll(".vela-chapter-marker"))
      .map((marker) => Number.parseFloat(marker.style.left || "0") / 100)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }

  function intervalAt(ratio, markers) {
    if (!markers.length) return 0;
    let index = 0;
    markers.forEach((marker, markerIndex) => {
      if (ratio >= marker) index = markerIndex;
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

    const currentChapter = wrap.closest(".vela-player")?.querySelector(".vela-current-chapter")?.textContent?.trim();
    let chapterNode = preview.querySelector(".vela-preview-chapter");
    const seek = wrap.querySelector(".vela-seek-input");
    const markers = markerRatios(wrap);
    let canShowChapter = Boolean(currentChapter);

    if (currentChapter && seek instanceof HTMLInputElement && markers.length) {
      const min = Number.parseFloat(seek.min || "0");
      const max = Number.parseFloat(seek.max || "0");
      const value = Number.parseFloat(seek.value || "0");
      const span = max - min;
      const currentRatio = span > 0 ? clamp((value - min) / span, 0, 1) : 0;
      canShowChapter = intervalAt(currentRatio, markers) === intervalAt(ratio, markers);
    }

    if (canShowChapter && currentChapter) {
      if (!(chapterNode instanceof HTMLElement)) {
        chapterNode = document.createElement("span");
        chapterNode.className = "vela-preview-chapter";
        preview.append(chapterNode);
      }
      chapterNode.textContent = currentChapter;
    } else if (chapterNode) {
      chapterNode.remove();
    }
  }

  function enhance(wrap) {
    if (!(wrap instanceof HTMLElement) || wrap.dataset.velaPreviewEnhanced === "true") return;
    wrap.dataset.velaPreviewEnhanced = "true";

    const schedule = () => requestAnimationFrame(() => sync(wrap));
    wrap.addEventListener("pointermove", schedule, { passive: true });
    wrap.addEventListener("pointerenter", schedule, { passive: true });
    wrap.addEventListener("pointerleave", () => {
      wrap.style.setProperty("--vela-preview-anchor-opacity", "0");
    }, { passive: true });

    const observer = new MutationObserver(schedule);
    observer.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
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
