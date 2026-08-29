(() => {
  const playerSelector = ".vela-player";
  const nativeLanguageNames = {
    en: "English",
    ja: "日本語",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    it: "Italiano",
    pt: "Português",
    ko: "한국어",
    zh: "中文",
    ar: "العربية",
    hi: "हिन्दी",
  };

  function sectionTitle(section) {
    return section.querySelector(":scope > span")?.textContent?.trim().toUpperCase() || "";
  }

  function firstText(button) {
    const stored = button.dataset.velaSubtitleOriginalLabel;
    if (stored) return stored;
    const node = Array.from(button.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
    const value = node?.textContent?.trim() || button.textContent?.trim() || "Subtitle";
    button.dataset.velaSubtitleOriginalLabel = value;
    return value;
  }

  function languageName(code, fallback) {
    const clean = (code || "").toLowerCase().split("-")[0];
    if (nativeLanguageNames[clean]) return nativeLanguageNames[clean];
    if (!clean) return fallback || "Subtitle";
    try {
      return new Intl.DisplayNames([clean], { type: "language", languageDisplay: "standard" }).of(clean) || fallback || clean.toUpperCase();
    } catch {
      return fallback || clean.toUpperCase();
    }
  }

  function englishLanguageName(code) {
    const clean = (code || "").toLowerCase().split("-")[0];
    if (!clean) return "";
    try {
      return new Intl.DisplayNames(["en"], { type: "language", languageDisplay: "standard" }).of(clean) || "";
    } catch {
      return "";
    }
  }

  function classifyTrack(label) {
    const value = label.toLowerCase();
    if (/\bforced\b/.test(value)) return { kind: "forced", text: "Forced" };
    if (/\bsdh\b/.test(value)) return { kind: "sdh", text: "SDH" };
    if (/\bclosed captions?\b|\bcaptions?\b|\bcc\b/.test(value)) return { kind: "cc", text: "CC" };
    return { kind: "subtitle", text: "Subtitles" };
  }

  function parseOption(button) {
    const rawLabel = firstText(button);
    if (rawLabel.toLowerCase() === "off") {
      return { off: true, label: "Off", code: "", meta: [] };
    }

    const rawLanguage = button.querySelector(":scope > small")?.textContent?.trim() || "";
    const code = rawLanguage.toLowerCase().split("-")[0];
    const nativeName = languageName(code, rawLabel);
    const englishName = englishLanguageName(code);
    const normalized = rawLabel.trim().toLowerCase();
    const generic = [rawLanguage, code, nativeName, englishName]
      .filter(Boolean)
      .some((value) => value.toLowerCase() === normalized);
    const label = generic ? nativeName : rawLabel;
    const type = classifyTrack(rawLabel);
    const meta = [];
    if (rawLanguage) meta.push({ kind: "language", text: rawLanguage.toUpperCase() });
    meta.push(type);
    return { off: false, label, code: rawLanguage.toUpperCase() || "CC", meta };
  }

  function decorateOption(button) {
    const option = parseOption(button);
    button.dataset.velaSubtitleOption = "true";
    button.dataset.velaSubtitleLabel = option.label;
    button.dataset.velaSubtitleState = option.off ? "off" : "on";
    button.setAttribute(
      "aria-label",
      option.off ? "Turn subtitles off" : [option.label, ...option.meta.map((item) => item.text)].join(", "),
    );

    let row = button.querySelector(":scope > .vela-subtitle-meta-row");
    if (option.off) {
      row?.remove();
      return option;
    }

    const signature = option.meta.map((item) => `${item.kind}:${item.text}`).join("|");
    if (!(row instanceof HTMLElement)) {
      row = document.createElement("span");
      row.className = "vela-subtitle-meta-row";
      button.append(row);
    }
    if (row.dataset.signature !== signature) {
      row.dataset.signature = signature;
      row.replaceChildren(...option.meta.map((item) => {
        const token = document.createElement("span");
        token.className = "vela-subtitle-meta";
        token.dataset.kind = item.kind;
        token.textContent = item.text;
        return token;
      }));
    }
    return option;
  }

  function ensureSubtitleSummary(section, buttons) {
    let summary = section.querySelector(":scope > .vela-subtitle-summary");
    const options = buttons.map(parseOption).filter((option) => !option.off);
    const languages = new Set(options.map((option) => option.code).filter(Boolean));
    if (!(summary instanceof HTMLElement)) {
      summary = document.createElement("div");
      summary.className = "vela-subtitle-summary";
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      summary.append(strong, span);
      const heading = section.querySelector(":scope > span");
      heading?.insertAdjacentElement("afterend", summary);
    }
    const strong = summary.querySelector("strong");
    const span = summary.querySelector("span");
    if (strong) strong.textContent = `${languages.size || options.length} ${languages.size === 1 ? "language" : "languages"}`;
    if (span) span.textContent = `${options.length} ${options.length === 1 ? "track" : "tracks"} · language · type`;
  }

  function findCaptionControl(player) {
    return player.querySelector('button[data-vela-caption-control="true"]')
      || Array.from(player.querySelectorAll("button")).find((button) => button.getAttribute("aria-label") === "Toggle captions")
      || null;
  }

  function updateCaptionControl(player, option) {
    const control = findCaptionControl(player);
    if (!(control instanceof HTMLButtonElement)) return;
    const active = control.classList.contains("is-active") && !option?.off;
    control.dataset.velaCaptionControl = "true";
    control.dataset.velaCaptionState = active ? "on" : "off";
    if (active) {
      const code = option?.code || "CC";
      control.dataset.velaCaptionCode = code;
      control.setAttribute("aria-label", `${option?.label || "Subtitles"} on. Toggle subtitles off.`);
    } else {
      control.removeAttribute("data-vela-caption-code");
      control.setAttribute("aria-label", "Subtitles off. Toggle subtitles on.");
    }
  }

  function settingsRow(player, label) {
    return Array.from(player.querySelectorAll(".vela-settings-nav-row")).find(
      (row) => row.querySelector(".vela-settings-nav-label")?.textContent?.trim() === label,
    ) || null;
  }

  function setSettingsRowValue(player, label, value) {
    const row = settingsRow(player, label);
    const node = row?.querySelector(".vela-settings-nav-value");
    if (node && value && node.textContent !== value) node.textContent = value;
  }

  function gridForLabel(section, label) {
    const labels = Array.from(section.querySelectorAll(":scope > .vela-setting-label"));
    const heading = labels.find((node) => node.textContent?.trim().toUpperCase() === label);
    const grid = heading?.nextElementSibling;
    return grid instanceof HTMLElement && grid.classList.contains("vela-speed-grid") ? grid : null;
  }

  function selectedGridValue(section, label) {
    return gridForLabel(section, label)?.querySelector("button.selected")?.textContent?.trim() || "";
  }

  function styleSummary(section) {
    const size = selectedGridValue(section, "SIZE") || "100%";
    const edge = selectedGridValue(section, "EDGE");
    return edge ? `${size} · ${edge.charAt(0).toUpperCase()}${edge.slice(1)}` : size;
  }

  function ensureCaptionPreview(section) {
    let card = section.querySelector(":scope > .vela-caption-preview-card");
    if (card instanceof HTMLElement) return card;
    card = document.createElement("div");
    card.className = "vela-caption-preview-card";
    card.setAttribute("aria-hidden", "true");
    const label = document.createElement("small");
    label.textContent = "Caption preview";
    const line = document.createElement("div");
    line.className = "vela-caption-preview-line";
    line.textContent = "Readable at a glance.";
    card.append(label, line);
    const heading = section.querySelector(":scope > span");
    heading?.insertAdjacentElement("afterend", card);
    return card;
  }

  const presets = {
    default: { label: "Default", values: { SIZE: "100%", EDGE: "shadow", BACKGROUND: "82%" } },
    contrast: { label: "Contrast", values: { SIZE: "120%", EDGE: "outline", BACKGROUND: "82%" } },
    large: { label: "Large", values: { SIZE: "140%", EDGE: "shadow", BACKGROUND: "82%" } },
  };

  function presetActive(section, preset) {
    return Object.entries(preset.values).every(([label, value]) => selectedGridValue(section, label).toLowerCase() === value.toLowerCase());
  }

  function applyPreset(player, key) {
    const preset = presets[key];
    if (!preset) return;
    Object.entries(preset.values).forEach(([label, value], index) => {
      window.setTimeout(() => {
        const currentSection = Array.from(player.querySelectorAll(".vela-settings-popover > section")).find(
          (section) => sectionTitle(section) === "SUBTITLE STYLE",
        );
        if (!(currentSection instanceof HTMLElement)) return;
        const button = Array.from(gridForLabel(currentSection, label)?.querySelectorAll("button") || []).find(
          (item) => item.textContent?.trim().toLowerCase() === value.toLowerCase(),
        );
        if (button instanceof HTMLButtonElement) button.click();
      }, index * 18);
    });
  }

  function ensurePresets(player, section) {
    let wrap = section.querySelector(":scope > .vela-caption-presets");
    if (!(wrap instanceof HTMLElement)) {
      wrap = document.createElement("div");
      wrap.className = "vela-caption-presets";
      Object.entries(presets).forEach(([key, preset]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.velaCaptionPreset = key;
        button.textContent = preset.label;
        button.setAttribute("aria-label", `Apply ${preset.label} caption style`);
        wrap.append(button);
      });
      const preview = ensureCaptionPreview(section);
      preview.insertAdjacentElement("afterend", wrap);
      wrap.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("[data-vela-caption-preset]") : null;
        if (!(button instanceof HTMLButtonElement)) return;
        applyPreset(player, button.dataset.velaCaptionPreset);
      });
    }

    Object.entries(presets).forEach(([key, preset]) => {
      wrap.querySelector(`[data-vela-caption-preset="${key}"]`)?.classList.toggle("is-active", presetActive(section, preset));
    });
  }

  function ensureConfirmation(player) {
    let notice = player.querySelector(".vela-subtitle-confirmation");
    if (notice instanceof HTMLElement) return notice;
    notice = document.createElement("div");
    notice.className = "vela-subtitle-confirmation";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    const eyebrow = document.createElement("small");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    notice.append(eyebrow, title, detail);
    player.append(notice);
    return notice;
  }

  function showConfirmation(player, option) {
    const notice = ensureConfirmation(player);
    const eyebrow = notice.querySelector("small");
    const title = notice.querySelector("strong");
    const detail = notice.querySelector("span");
    if (eyebrow) eyebrow.textContent = "SUBTITLES";
    if (title) title.textContent = option?.off ? "Off" : option?.label || "On";
    if (detail) detail.textContent = option?.off ? "Captions hidden" : option?.meta?.map((item) => item.text).join(" · ") || "Captions visible";
    notice.classList.remove("is-visible");
    requestAnimationFrame(() => notice.classList.add("is-visible"));
    const previous = Number.parseInt(notice.dataset.hideTimer || "0", 10);
    if (previous) window.clearTimeout(previous);
    const timer = window.setTimeout(() => notice.classList.remove("is-visible"), 1650);
    notice.dataset.hideTimer = String(timer);
  }

  function sync(player, state) {
    const popover = player.querySelector(".vela-settings-popover");
    const sections = popover ? Array.from(popover.querySelectorAll(":scope > section")) : [];
    const subtitleSection = sections.find((section) => sectionTitle(section) === "SUBTITLES");
    const styleSection = sections.find((section) => sectionTitle(section) === "SUBTITLE STYLE");
    let selectedOption = null;

    if (subtitleSection instanceof HTMLElement) {
      subtitleSection.dataset.velaSubtitleSection = "true";
      const buttons = Array.from(subtitleSection.querySelectorAll(":scope > button"));
      ensureSubtitleSummary(subtitleSection, buttons);
      buttons.forEach(decorateOption);
      const selected = buttons.find((button) => button.classList.contains("selected"));
      if (selected instanceof HTMLButtonElement) {
        selectedOption = decorateOption(selected);
        const signature = selectedOption.off
          ? "off"
          : `${selectedOption.label}|${selectedOption.meta.map((item) => item.text).join("|")}`;
        if (state.selectedSignature && state.selectedSignature !== signature) showConfirmation(player, selectedOption);
        state.selectedSignature = signature;
        setSettingsRowValue(player, "Subtitles", selectedOption.off ? "Off" : selectedOption.label);
      }
    }

    const control = findCaptionControl(player);
    const controlOn = control instanceof HTMLButtonElement && control.classList.contains("is-active");
    if (!(subtitleSection instanceof HTMLElement) && state.controlOn !== null && state.controlOn !== controlOn) {
      showConfirmation(player, controlOn
        ? { off: false, label: "On", meta: [] }
        : { off: true, label: "Off", meta: [] });
    }
    state.controlOn = controlOn;
    updateCaptionControl(player, selectedOption || (controlOn ? { off: false, label: "Subtitles", code: "CC" } : { off: true }));

    if (styleSection instanceof HTMLElement) {
      styleSection.dataset.velaAccessibilitySection = "true";
      ensureCaptionPreview(styleSection);
      ensurePresets(player, styleSection);
      setSettingsRowValue(player, "Accessibility", styleSummary(styleSection));
    }
  }

  function enhance(player) {
    if (!(player instanceof HTMLElement) || player.dataset.velaSubtitleUx === "true") return;
    player.dataset.velaSubtitleUx = "true";
    const state = { selectedSignature: "", controlOn: null, frame: 0 };
    const schedule = () => {
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        sync(player, state);
      });
    };

    player.addEventListener("click", () => window.setTimeout(schedule, 0));
    player.addEventListener("keydown", () => window.setTimeout(schedule, 0));

    const observer = new MutationObserver(schedule);
    observer.observe(player, {
      childList: true,
      subtree: true,
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
