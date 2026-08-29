(() => {
  const playerSelector = ".vela-player";
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function firstText(button) {
    if (!button) return "";
    const node = Array.from(button.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
    return node?.textContent?.trim() || button.textContent?.trim() || "";
  }

  function sectionByTitle(player, title) {
    const sections = player.querySelectorAll(".vela-settings-popover > section");
    return Array.from(sections).find((section) => {
      const heading = section.querySelector(":scope > span")?.textContent?.trim().toUpperCase();
      return heading === title;
    }) || null;
  }

  function formatOffset(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function markerEntries(player) {
    return Array.from(player.querySelectorAll(".vela-chapter-marker"))
      .map((marker) => ({
        marker,
        ratio: Number.parseFloat(marker.style.left || "0") / 100,
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

  function cacheChapterLabels(player) {
    const entries = markerEntries(player);
    if (!entries.length) return;

    const chapterSection = sectionByTitle(player, "CHAPTERS");
    if (chapterSection) {
      const buttons = Array.from(chapterSection.querySelectorAll(":scope > button"));
      entries.forEach((entry, index) => {
        const title = firstText(buttons[index]);
        if (title) entry.marker.dataset.velaChapterTitle = title;
      });
    }

    const currentTitle = player.querySelector(".vela-current-chapter")?.textContent?.trim();
    const seek = player.querySelector(".vela-seek-input");
    if (!currentTitle || !(seek instanceof HTMLInputElement)) return;

    const min = Number.parseFloat(seek.min || "0");
    const max = Number.parseFloat(seek.max || "0");
    const value = Number.parseFloat(seek.value || "0");
    const span = max - min;
    if (!(span > 0)) return;

    const ratio = clamp((value - min) / span, 0, 1);
    const index = intervalAt(ratio, entries);
    const marker = entries[index]?.marker;
    if (marker instanceof HTMLElement) marker.dataset.velaChapterTitle = currentTitle;
  }

  function qualitySignal(player, video) {
    const sourceType = player.dataset.sourceType || "";
    const mode = player.querySelector(".vela-settings-button > span")?.textContent?.trim().toUpperCase() || "";
    const height = video?.videoHeight || 0;

    if (sourceType === "mp4") return height ? `${height}P` : "";
    if (mode === "AUTO") return height ? `AUTO · ${height}P` : "AUTO";
    if (mode) return mode;
    return height ? `${height}P` : "";
  }

  function cacheAudioSignal(player, video) {
    const audioSection = sectionByTitle(player, "AUDIO");
    if (audioSection) {
      const buttons = Array.from(audioSection.querySelectorAll(":scope > button"));
      const selected = buttons.find((button) => button.classList.contains("selected"));
      if (buttons.length > 1 && selected) {
        const detail = selected.querySelector("small")?.textContent?.trim();
        const label = selected.dataset.velaAudioLabel || firstText(selected);
        const concise = detail || label;
        if (concise) player.dataset.velaAudioSignal = concise.toUpperCase();
      }
    }

    if (player.dataset.velaAudioSignal) return player.dataset.velaAudioSignal;

    const tracks = video?.audioTracks;
    if (tracks && tracks.length > 1) {
      const active = Array.from(tracks).find((track) => track.enabled) || tracks[0];
      const language = active?.language || active?.label || "AUDIO";
      return String(language).toUpperCase();
    }

    return "";
  }

  function currentChapterSignal(player) {
    const title = player.querySelector(".vela-current-chapter")?.textContent?.trim();
    if (!title) return "";

    const entries = markerEntries(player);
    const seek = player.querySelector(".vela-seek-input");
    if (!(seek instanceof HTMLInputElement) || !entries.length) return title;

    const min = Number.parseFloat(seek.min || "0");
    const max = Number.parseFloat(seek.max || "0");
    const value = Number.parseFloat(seek.value || "0");
    const span = max - min;
    if (!(span > 0)) return title;

    const index = intervalAt(clamp((value - min) / span, 0, 1), entries);
    return `CH ${String(index + 1).padStart(2, "0")} · ${title}`;
  }

  function liveSignal(player, video) {
    if (!player.classList.contains("is-live") || !video) return "";
    let edge = Number.NaN;
    if (video.seekable?.length) edge = video.seekable.end(video.seekable.length - 1);
    const delay = Number.isFinite(edge) ? Math.max(edge - video.currentTime, 0) : Number.NaN;
    if (!Number.isFinite(delay)) return "LIVE";
    if (delay <= 2.5) return `LIVE · ${delay.toFixed(delay < 10 ? 1 : 0)}S`;
    return `DVR · −${formatOffset(delay)}`;
  }

  function mediaSignals(player) {
    return Array.from(player.querySelectorAll(".vela-media-badges span"))
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  function updateQualityRow(player, quality) {
    if (!quality) return;
    const display = quality.replace(/P$/, "p").replace("AUTO", "Auto");
    const rows = player.querySelectorAll(".vela-settings-nav-row");
    for (const row of rows) {
      const label = row.querySelector(".vela-settings-nav-label")?.textContent?.trim();
      if (label !== "Quality") continue;
      row.dataset.velaSignalRow = "quality";
      const value = row.querySelector(".vela-settings-nav-value");
      if (value && value.textContent !== display) value.textContent = display;
    }
  }

  function openAudioSettings(player) {
    const settings = player.querySelector(".vela-settings-button");
    if (!(settings instanceof HTMLButtonElement)) return;
    if (!player.querySelector(".vela-settings-popover")) settings.click();

    window.setTimeout(() => {
      const rows = Array.from(player.querySelectorAll(".vela-settings-nav-row"));
      const findRow = (label) => rows.find(
        (row) => row.querySelector(".vela-settings-nav-label")?.textContent?.trim() === label,
      );
      const more = findRow("More settings");
      if (more instanceof HTMLButtonElement) more.click();

      window.setTimeout(() => {
        const audio = Array.from(player.querySelectorAll(".vela-settings-nav-row")).find(
          (row) => row.querySelector(".vela-settings-nav-label")?.textContent?.trim() === "Audio",
        );
        if (audio instanceof HTMLButtonElement) audio.click();
      }, 0);
    }, 0);
  }

  function chip(kind, text) {
    const audioQuick = kind === "audio";
    const liveReturn = kind === "live" && text.startsWith("DVR");
    const node = document.createElement(audioQuick || liveReturn ? "button" : "span");
    node.className = "vela-signal-chip";
    node.dataset.kind = kind;
    node.textContent = text;

    if (node instanceof HTMLButtonElement) {
      node.type = "button";
      if (audioQuick) {
        node.dataset.velaAudioQuick = "true";
        node.setAttribute("aria-label", `Audio: ${text}. Open audio settings.`);
      } else if (liveReturn) {
        node.dataset.velaLiveAction = "return";
        node.setAttribute("aria-label", `${text}. Return to live edge.`);
      }
    }

    return node;
  }

  function sync(player) {
    if (!(player instanceof HTMLElement)) return;
    const video = player.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) return;

    cacheChapterLabels(player);
    const quality = qualitySignal(player, video);
    const audio = cacheAudioSignal(player, video);
    const chapter = currentChapterSignal(player);
    const live = liveSignal(player, video);
    const media = mediaSignals(player);

    const values = [];
    if (live) values.push(["live", live]);
    if (quality) values.push(["quality", quality]);
    if (audio) values.push(["audio", audio]);
    if (chapter && !player.classList.contains("is-live")) values.push(["chapter", chapter]);
    media.forEach((value) => values.push(["media", value]));

    let rail = player.querySelector(".vela-signal-rail");
    if (!(rail instanceof HTMLElement)) {
      rail = document.createElement("div");
      rail.className = "vela-signal-rail";
      rail.setAttribute("role", "group");
      rail.setAttribute("aria-label", "Playback information");
      player.append(rail);
    }

    const signature = values.map(([kind, value]) => `${kind}:${value}`).join("|");
    if (rail.dataset.signature !== signature) {
      rail.dataset.signature = signature;
      rail.replaceChildren(...values.map(([kind, value]) => chip(kind, value)));
    }

    updateQualityRow(player, quality);
    player.dataset.velaSignals = "ready";
  }

  function enhance(player) {
    if (!(player instanceof HTMLElement) || player.dataset.velaSignalsInstalled === "true") return;
    player.dataset.velaSignalsInstalled = "true";

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync(player);
      });
    };

    const video = player.querySelector("video");
    if (video instanceof HTMLVideoElement) {
      ["loadedmetadata", "loadeddata", "resize", "timeupdate", "progress", "durationchange"].forEach((type) => {
        video.addEventListener(type, schedule, { passive: true });
      });
    }

    player.addEventListener("click", (event) => {
      if (event.target instanceof Element) {
        const audioChip = event.target.closest('.vela-signal-chip[data-kind="audio"][data-vela-audio-quick="true"]');
        if (audioChip) {
          openAudioSettings(player);
          return;
        }

        const liveChip = event.target.closest('.vela-signal-chip[data-kind="live"][data-vela-live-action="return"]');
        if (liveChip) {
          const liveButton = player.querySelector(".vela-live-button");
          if (liveButton instanceof HTMLButtonElement) liveButton.click();
          return;
        }
      }
      window.setTimeout(schedule, 0);
    });

    const observer = new MutationObserver(schedule);
    observer.observe(player, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
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
