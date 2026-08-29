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
    const node = Array.from(button.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
    return node?.textContent?.trim() || button.textContent?.trim() || "Audio";
  }

  function parseOption(button) {
    const rawLabel = firstText(button);
    const rawSmall = button.querySelector(":scope > small")?.textContent?.trim() || "";
    const [rawLanguage = "", ...detailParts] = rawSmall.split("·").map((value) => value.trim()).filter(Boolean);
    const language = rawLanguage.toLowerCase();
    const nativeName = nativeLanguageNames[language] || (() => {
      try {
        return new Intl.DisplayNames([language || "en"], { type: "language" }).of(language) || rawLanguage || rawLabel;
      } catch {
        return rawLanguage || rawLabel;
      }
    })();

    const generic = rawLabel.toLowerCase() === language
      || rawLabel.toLowerCase() === rawLanguage.toLowerCase()
      || /^audio\s+\d+$/i.test(rawLabel)
      || ["japanese", "日本語"].includes(rawLabel.toLowerCase()) && language === "ja";
    const label = generic ? nativeName : rawLabel;
    const detail = detailParts.join(" · ");
    const tokens = detailParts.flatMap((part) => part.split(/\s*\/\s*|\s*,\s*/)).filter(Boolean);
    const meta = [];
    if (rawLanguage) meta.push({ kind: "language", text: rawLanguage.toUpperCase() });
    tokens.forEach((token) => {
      const lower = token.toLowerCase();
      let text = token;
      let kind = "format";
      if (lower === "spatial") { text = "Spatial"; kind = "spatial"; }
      else if (lower === "commentary") { text = "Commentary"; kind = "commentary"; }
      else if (lower === "primary") { text = "Primary"; kind = "primary"; }
      else if (lower === "audio") return;
      meta.push({ kind, text });
    });

    return { label, detail, meta };
  }

  function makeSummary(count) {
    const node = document.createElement("div");
    node.className = "vela-audio-summary";
    node.dataset.velaAudioSummary = "true";
    const strong = document.createElement("strong");
    strong.textContent = `${count} ${count === 1 ? "track" : "tracks"}`;
    const span = document.createElement("span");
    span.textContent = "Language · mix · role";
    node.append(strong, span);
    return node;
  }

  function decorateButton(button) {
    const option = parseOption(button);
    button.dataset.velaAudioOption = "true";
    button.dataset.velaAudioLabel = option.label;
    button.setAttribute("aria-label", [option.label, ...option.meta.map((item) => item.text)].filter(Boolean).join(", "));

    let row = button.querySelector(":scope > .vela-audio-meta-row");
    const signature = option.meta.map((item) => `${item.kind}:${item.text}`).join("|");
    if (!(row instanceof HTMLElement)) {
      row = document.createElement("span");
      row.className = "vela-audio-meta-row";
      button.append(row);
    }
    if (row.dataset.signature !== signature) {
      row.dataset.signature = signature;
      row.replaceChildren(...option.meta.map((item) => {
        const token = document.createElement("span");
        token.className = "vela-audio-meta";
        token.dataset.kind = item.kind;
        token.textContent = item.text;
        return token;
      }));
    }
    return option;
  }

  function showConfirmation(player, option) {
    let notice = player.querySelector(".vela-audio-confirmation");
    if (!(notice instanceof HTMLElement)) {
      notice = document.createElement("div");
      notice.className = "vela-audio-confirmation";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      const eyebrow = document.createElement("small");
      eyebrow.textContent = "AUDIO SWITCHED";
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      notice.append(eyebrow, title, detail);
      player.append(notice);
    }

    const title = notice.querySelector("strong");
    const detail = notice.querySelector("span");
    if (title) title.textContent = option.label;
    if (detail) detail.textContent = option.meta.map((item) => item.text).join(" · ");
    notice.classList.remove("is-visible");
    requestAnimationFrame(() => notice.classList.add("is-visible"));

    const previous = Number.parseInt(notice.dataset.hideTimer || "0", 10);
    if (previous) window.clearTimeout(previous);
    const timer = window.setTimeout(() => notice.classList.remove("is-visible"), 1800);
    notice.dataset.hideTimer = String(timer);
  }

  function openAudioSettings(player) {
    const settings = player.querySelector(".vela-settings-button");
    if (!(settings instanceof HTMLButtonElement)) return;
    if (!player.querySelector(".vela-settings-popover")) settings.click();

    window.setTimeout(() => {
      const rows = Array.from(player.querySelectorAll(".vela-settings-nav-row"));
      const findRow = (label) => rows.find((row) => row.querySelector(".vela-settings-nav-label")?.textContent?.trim() === label);
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

  function enhanceQuickChip(player) {
    const chip = player.querySelector('.vela-signal-chip[data-kind="audio"]');
    if (!(chip instanceof HTMLElement) || chip.dataset.velaAudioQuick === "true") return;
    chip.dataset.velaAudioQuick = "true";
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-label", `Audio: ${chip.textContent?.trim() || "current track"}. Open audio settings.`);
    chip.addEventListener("click", () => openAudioSettings(player));
    chip.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openAudioSettings(player);
    });
  }

  function sync(player, state) {
    const popover = player.querySelector(".vela-settings-popover");
    const audioSection = popover
      ? Array.from(popover.querySelectorAll(":scope > section")).find((section) => sectionTitle(section) === "AUDIO")
      : null;

    if (audioSection instanceof HTMLElement) {
      audioSection.dataset.velaAudioSection = "true";
      const buttons = Array.from(audioSection.querySelectorAll(":scope > button"));
      let summary = audioSection.querySelector(":scope > .vela-audio-summary");
      if (!(summary instanceof HTMLElement)) {
        summary = makeSummary(buttons.length);
        const heading = audioSection.querySelector(":scope > span");
        heading?.insertAdjacentElement("afterend", summary);
      } else {
        summary.querySelector("strong").textContent = `${buttons.length} ${buttons.length === 1 ? "track" : "tracks"}`;
      }

      buttons.forEach(decorateButton);
      const selected = buttons.find((button) => button.classList.contains("selected"));
      if (selected instanceof HTMLButtonElement) {
        const option = decorateButton(selected);
        const signature = `${option.label}|${option.meta.map((item) => item.text).join("|")}`;
        player.dataset.velaAudioSignal = [option.label, ...option.meta.filter((item) => item.kind !== "language").map((item) => item.text)].join(" · ").toUpperCase();
        if (state.selectedSignature && state.selectedSignature !== signature) showConfirmation(player, option);
        state.selectedSignature = signature;
      }
    }

    enhanceQuickChip(player);
  }

  function enhance(player) {
    if (!(player instanceof HTMLElement) || player.dataset.velaAudioUx === "true") return;
    player.dataset.velaAudioUx = "true";
    const state = { selectedSignature: "", frame: 0 };
    const schedule = () => {
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        sync(player, state);
      });
    };

    player.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-vela-audio-option="true"]')) return;
      window.setTimeout(schedule, 0);
    });

    const observer = new MutationObserver(schedule);
    observer.observe(player, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
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
