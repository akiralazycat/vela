(() => {
  const popoverSelector = ".vela-settings-popover";

  function sectionTitle(section) {
    return section.querySelector(":scope > span")?.textContent?.trim().toUpperCase() ?? "";
  }

  function firstText(button) {
    if (!button) return "";
    const node = Array.from(button.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
    return node?.textContent?.trim() || button.textContent?.trim() || "";
  }

  function selectedValue(section) {
    if (!section) return "";
    const selected = section.querySelector("button.selected");
    return firstText(selected);
  }

  function makeRow(view, label, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vela-settings-nav-row";
    button.dataset.velaSettingsView = view;

    const labelNode = document.createElement("span");
    labelNode.className = "vela-settings-nav-label";
    labelNode.textContent = label;

    const trailing = document.createElement("span");
    trailing.className = "vela-settings-nav-trailing";

    if (value) {
      const valueNode = document.createElement("span");
      valueNode.className = "vela-settings-nav-value";
      valueNode.textContent = value;
      trailing.append(valueNode);
    }

    const arrow = document.createElement("span");
    arrow.className = "vela-settings-nav-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    trailing.append(arrow);

    button.append(labelNode, trailing);
    return button;
  }

  function makeActionRow(action, label, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vela-settings-nav-row vela-settings-nav-action";
    button.dataset.velaSettingsAction = action;

    const labelNode = document.createElement("span");
    labelNode.className = "vela-settings-nav-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "vela-settings-nav-value";
    valueNode.textContent = value;

    button.append(labelNode, valueNode);
    return button;
  }

  function enhance(popover) {
    if (!(popover instanceof HTMLElement) || popover.dataset.velaLayered === "true") return;
    popover.dataset.velaLayered = "true";

    const sections = Array.from(popover.querySelectorAll(":scope > section"));
    const byTitle = new Map(sections.map((section) => [sectionTitle(section), section]));
    const player = popover.closest(".vela-player");
    const loopButton = player?.querySelector('button[aria-label="Toggle loop"]');

    const shell = document.createElement("div");
    shell.className = "vela-settings-layer";
    popover.prepend(shell);

    const hideSections = () => {
      sections.forEach((section) => {
        section.style.display = "none";
      });
    };

    const renderHeader = (title, backView) => {
      const header = document.createElement("div");
      header.className = "vela-settings-layer-header";

      if (backView) {
        const back = document.createElement("button");
        back.type = "button";
        back.className = "vela-settings-back";
        back.dataset.velaSettingsView = backView;
        back.setAttribute("aria-label", "Back");
        back.textContent = "‹";
        header.append(back);
      }

      const heading = document.createElement("strong");
      heading.textContent = title;
      header.append(heading);
      return header;
    };

    const detailViews = {
      quality: "QUALITY",
      speed: "SPEED",
      audio: "AUDIO",
      subtitles: "SUBTITLES",
      accessibility: "SUBTITLE STYLE",
      chapters: "CHAPTERS",
      controls: "SHORTCUTS / GESTURES",
    };

    const render = (view = "root") => {
      hideSections();
      shell.replaceChildren();
      popover.dataset.velaSettingsView = view;

      if (view === "root") {
        const list = document.createElement("div");
        list.className = "vela-settings-nav-list";

        const quality = byTitle.get("QUALITY");
        const speed = byTitle.get("SPEED");
        if (quality) list.append(makeRow("quality", "Quality", selectedValue(quality) || "Auto"));
        if (speed) list.append(makeRow("speed", "Speed", selectedValue(speed) || "1×"));
        list.append(makeRow("more", "More settings", ""));
        shell.append(list);
        return;
      }

      if (view === "more") {
        shell.append(renderHeader("More settings", "root"));
        const list = document.createElement("div");
        list.className = "vela-settings-nav-list vela-settings-nav-list-secondary";

        const audio = byTitle.get("AUDIO");
        const subtitles = byTitle.get("SUBTITLES");
        const chapters = byTitle.get("CHAPTERS");
        const accessibility = byTitle.get("SUBTITLE STYLE");
        const controls = byTitle.get("SHORTCUTS / GESTURES");

        if (audio) list.append(makeRow("audio", "Audio", selectedValue(audio)));
        if (subtitles) list.append(makeRow("subtitles", "Subtitles", selectedValue(subtitles) || "Off"));
        if (chapters) list.append(makeRow("chapters", "Chapters", selectedValue(chapters)));
        if (accessibility) list.append(makeRow("accessibility", "Accessibility", "Captions"));
        if (loopButton instanceof HTMLElement) {
          list.append(makeActionRow("loop", "Loop", loopButton.classList.contains("is-active") ? "On" : "Off"));
        }
        if (controls) list.append(makeRow("controls", "Controls", "Shortcuts"));
        shell.append(list);
        return;
      }

      const section = byTitle.get(detailViews[view]);
      if (!section) {
        render("root");
        return;
      }

      const title = view === "accessibility"
        ? "Accessibility"
        : view.charAt(0).toUpperCase() + view.slice(1);
      shell.append(renderHeader(title, view === "quality" || view === "speed" ? "root" : "more"));
      section.style.display = "grid";
    };

    shell.addEventListener("click", (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("[data-vela-settings-view], [data-vela-settings-action]")
        : null;
      if (!(target instanceof HTMLElement)) return;

      const action = target.dataset.velaSettingsAction;
      if (action === "loop" && loopButton instanceof HTMLButtonElement) {
        loopButton.click();
        window.setTimeout(() => render("more"), 0);
        return;
      }

      const view = target.dataset.velaSettingsView;
      if (view) render(view);
    });

    popover.addEventListener("click", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest("section button")) return;
      const currentView = popover.dataset.velaSettingsView || "root";
      window.setTimeout(() => render(currentView), 0);
    });

    render("root");
  }

  const scan = () => document.querySelectorAll(popoverSelector).forEach(enhance);
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
