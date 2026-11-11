const siteHeader = document.querySelector("#site-header");
const navLinks = document.querySelectorAll(".nav-link");
const aboutHero = document.querySelector(".hero");
const aboutSection = document.querySelector(".transition-about");
const aboutStage = document.querySelector(".about-transition-stage");
const scrollCue = document.querySelector(".scroll-cue");
const desktopNotice = document.querySelector(".desktop-notice");
const sectionIndex = document.querySelector(".section-index-sidebar");
const sectionIndexToggle = document.querySelector(".section-index-toggle");
const sectionIndexLinks = document.querySelectorAll(".section-index-nav a");
const archiveSectionLink = document.querySelector(".archive-section-link");
const archivePreview = document.querySelector(".archive-preview");
const aiAssistanceTrigger = document.querySelector(".ai-assistance-trigger");
const aiAssistancePopover = document.querySelector(".ai-assistance-popover");
const aiAssistanceNote = document.querySelector(".ai-assistance-note");
const aiAssistanceClose = document.querySelector(".ai-assistance-close");
const aboutPortrait = document.querySelector(".about-portrait");
const aboutEyesOverlay = document.querySelector(".about-eyes-overlay");
// Roll once per page load; keep the original photo for the other 90%.
const aboutEyeTrackingEnabled = Boolean(aboutPortrait) && Math.random() < 1 / 10;
if (aboutEyeTrackingEnabled) {
  aboutPortrait.querySelector(".about-portrait-front")?.setAttribute("mask", "url(#portrait-face-mask)");
}
const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollUpdateScheduled = false;
let previousScrollY = window.scrollY;
let sectionIndexWasVisible = false;
let aiAssistancePinned = false;
let aiAssistanceDismissedOnScroll = false;
const finePointerPreference = window.matchMedia("(hover: hover) and (pointer: fine)");
let eyeAnimationFrame = null;
let eyePointer = null;

for (const entry of document.querySelectorAll(".work-experience-entry")) {
  const toggle = entry.querySelector(".work-experience-header");
  const panel = entry.querySelector(".work-experience-details-inner");
  if (!toggle || !panel) continue;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    panel.setAttribute("aria-hidden", String(!expanded));
    panel.inert = !expanded;
    entry.classList.toggle("is-expanded", expanded);
  });
}

function updateAboutEyePosition() {
  eyeAnimationFrame = null;
  if (!eyePointer || !aboutPortrait || !aboutEyesOverlay) return;

  const portraitSvg = aboutPortrait.querySelector("svg.graduation-photo");
  const screenTransform = portraitSvg?.getScreenCTM();
  if (!screenTransform) return;
  // Convert the cursor to the same coordinates as the iris centers. This accounts
  // for SVG scaling, letterboxing, and the portrait's animated page position.
  const cursor = new DOMPoint(eyePointer.x, eyePointer.y).matrixTransform(screenTransform.inverse());
  const dx = cursor.x - (278.9 + 324.1) / 2;
  const dy = cursor.y - (289.8 + 290) / 2;
  const distance = Math.hypot(dx, dy, 210);
  aboutEyesOverlay.style.setProperty("--eye-x", `${2.5 * dx / distance}px`);
  aboutEyesOverlay.style.setProperty("--eye-y", `${2 * dy / distance}px`);
}

function scheduleAboutEyePosition() {
  if (eyePointer && eyeAnimationFrame === null) {
    eyeAnimationFrame = requestAnimationFrame(updateAboutEyePosition);
  }
}

function resetAboutEyePosition() {
  eyePointer = null;
  if (eyeAnimationFrame !== null) cancelAnimationFrame(eyeAnimationFrame);
  eyeAnimationFrame = null;
  aboutEyesOverlay?.style.setProperty("--eye-x", "0px");
  aboutEyesOverlay?.style.setProperty("--eye-y", "0px");
}

document.addEventListener("pointermove", (event) => {
  if (
    !aboutEyeTrackingEnabled ||
    !aboutPortrait ||
    !aboutEyesOverlay ||
    event.pointerType !== "mouse" ||
    reducedMotionPreference.matches ||
    !finePointerPreference.matches
  ) {
    return;
  }

  eyePointer = { x: event.clientX, y: event.clientY };
  scheduleAboutEyePosition();
});
window.addEventListener("scroll", scheduleAboutEyePosition, { passive: true });
window.addEventListener("resize", scheduleAboutEyePosition);
finePointerPreference.addEventListener("change", resetAboutEyePosition);
document.documentElement.addEventListener("pointerleave", resetAboutEyePosition);
window.addEventListener("blur", resetAboutEyePosition);
reducedMotionPreference.addEventListener("change", () => {
  if (reducedMotionPreference.matches) resetAboutEyePosition();
});

function setAiAssistanceVisible(visible) {
  if (!aiAssistanceTrigger || !aiAssistancePopover) return;
  aiAssistancePopover.hidden = !visible;
  aiAssistanceTrigger.setAttribute("aria-expanded", String(visible));
  if (visible) positionAiAssistancePopover();
}

function positionAiAssistancePopover() {
  if (!aiAssistanceTrigger || !aiAssistancePopover) return;

  const triggerBounds = aiAssistanceTrigger.getBoundingClientRect();
  aiAssistancePopover.hidden = false;
  const popoverBounds = aiAssistancePopover.getBoundingClientRect();
  const edgeGap = 12;
  const arrowSize = 8;
  const availableBelow = window.innerHeight - triggerBounds.bottom;
  const availableAbove = triggerBounds.top;
  const placement =
    availableBelow >= popoverBounds.height + arrowSize ||
    availableBelow >= availableAbove
      ? "below"
      : "above";
  const desiredTop =
    placement === "below"
      ? triggerBounds.bottom
      : triggerBounds.top - popoverBounds.height;
  const top = Math.min(
    Math.max(edgeGap, desiredTop),
    window.innerHeight - popoverBounds.height - edgeGap
  );
  const left = Math.min(
    Math.max(edgeGap, triggerBounds.left),
    window.innerWidth - popoverBounds.width - edgeGap
  );
  const arrowLeft = Math.min(
    Math.max(8, triggerBounds.left + triggerBounds.width / 2 - left - arrowSize),
    popoverBounds.width - arrowSize * 2 - 8
  );

  aiAssistancePopover.dataset.placement = placement;
  aiAssistancePopover.style.left = `${left}px`;
  aiAssistancePopover.style.top = `${top}px`;
  aiAssistancePopover.style.setProperty("--popover-arrow-left", `${arrowLeft}px`);
}

function dismissAiAssistanceOnPointerLeave() {
  window.setTimeout(() => {
    const pointerOverNote = aiAssistanceNote?.matches(":hover") ?? false;
    const pointerOverPopover = aiAssistancePopover?.matches(":hover") ?? false;
    if (!aiAssistancePinned && !pointerOverNote && !pointerOverPopover) {
      setAiAssistanceVisible(false);
    }
  });
}

desktopNotice?.addEventListener("click", () => {
  if (reducedMotionPreference.matches) {
    desktopNotice.remove();
    return;
  }

  desktopNotice.classList.add("is-dismissing");
  desktopNotice.addEventListener("animationend", () => desktopNotice.remove(), { once: true });
});

const labEquipmentTrigger = document.querySelector(".lab-equipment-trigger");
const labEquipmentPopover = document.querySelector(".lab-equipment-popover");

function positionLabEquipmentPopover(clientX, clientY) {
  if (!labEquipmentTrigger || !labEquipmentPopover) return;

  labEquipmentPopover.hidden = false;
  const bounds = labEquipmentPopover.getBoundingClientRect();
  const gap = 12;
  const left = Math.min(
    Math.max(gap, clientX + gap + bounds.width <= window.innerWidth - gap
      ? clientX + gap
      : clientX - bounds.width - gap),
    window.innerWidth - bounds.width - gap
  );
  const top = Math.min(
    Math.max(gap, clientY + gap + bounds.height <= window.innerHeight - gap
      ? clientY + gap
      : clientY - bounds.height - gap),
    window.innerHeight - bounds.height - gap
  );

  labEquipmentPopover.style.left = `${left}px`;
  labEquipmentPopover.style.top = `${top}px`;
}

labEquipmentTrigger?.addEventListener("pointerenter", (event) => {
  positionLabEquipmentPopover(event.clientX, event.clientY);
});
labEquipmentTrigger?.addEventListener("pointermove", (event) => {
  positionLabEquipmentPopover(event.clientX, event.clientY);
});
labEquipmentTrigger?.addEventListener("pointerleave", () => {
  if (labEquipmentPopover) labEquipmentPopover.hidden = true;
});

aiAssistanceNote?.addEventListener("pointerenter", () => {
  if (!aiAssistanceDismissedOnScroll) setAiAssistanceVisible(true);
});
aiAssistanceNote?.addEventListener("pointermove", () => {
  aiAssistanceDismissedOnScroll = false;
  setAiAssistanceVisible(true);
});
aiAssistanceNote?.addEventListener("pointerleave", dismissAiAssistanceOnPointerLeave);
aiAssistancePopover?.addEventListener("pointerleave", dismissAiAssistanceOnPointerLeave);
aiAssistanceTrigger?.addEventListener("click", () => {
  aiAssistancePinned = !aiAssistancePinned;
  setAiAssistanceVisible(true);
});
aiAssistanceClose?.addEventListener("click", (event) => {
  event.stopPropagation();
  aiAssistancePinned = false;
  setAiAssistanceVisible(false);
});

document.addEventListener("click", (event) => {
  if (
    aiAssistanceTrigger &&
    aiAssistancePopover &&
    !aiAssistanceNote?.contains(event.target)
  ) {
    aiAssistancePinned = false;
    setAiAssistanceVisible(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && aiAssistanceTrigger && aiAssistancePopover) {
    aiAssistancePinned = false;
    setAiAssistanceVisible(false);
  }
});

window.addEventListener("resize", () => {
  if (aiAssistanceTrigger?.getAttribute("aria-expanded") === "true") {
    positionAiAssistancePopover();
  }
});
function dismissAiAssistanceOnScroll() {
  if (aiAssistanceTrigger?.getAttribute("aria-expanded") === "true") {
    aiAssistanceDismissedOnScroll = true;
    aiAssistancePinned = false;
    setAiAssistanceVisible(false);
  }
}
window.addEventListener("scroll", dismissAiAssistanceOnScroll, { passive: true });
document.addEventListener("scroll", dismissAiAssistanceOnScroll, {
  capture: true,
  passive: true,
});

archivePreview?.addEventListener("click", (event) => {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    reducedMotionPreference.matches ||
    typeof archivePreview.animate !== "function"
  ) {
    return;
  }

  event.preventDefault();

  const bounds = archivePreview.getBoundingClientRect();
  const iframe = archivePreview.querySelector("iframe");
  if (!iframe) {
    window.location.assign(archivePreview.href);
    return;
  }

  const previewStyle = window.getComputedStyle(archivePreview);
  archivePreview.style.position = "fixed";
  archivePreview.style.inset = "auto";
  archivePreview.style.left = `${bounds.left}px`;
  archivePreview.style.top = `${bounds.top}px`;
  archivePreview.style.width = `${bounds.width}px`;
  archivePreview.style.height = `${bounds.height}px`;
  archivePreview.style.margin = "0";
  archivePreview.style.aspectRatio = "auto";
  archivePreview.style.zIndex = "9999";
  archivePreview.style.borderRadius = previewStyle.borderRadius;
  document.body.append(archivePreview);

  const expansion = archivePreview.animate(
    [
      {
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        borderRadius: previewStyle.borderRadius,
      },
      {
        left: "0px",
        top: "0px",
        width: `${window.innerWidth}px`,
        height: `${window.innerHeight}px`,
        borderRadius: "0px",
      },
    ],
    { duration: 700, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)", fill: "forwards" }
  );
  const iframeExpansion = iframe.animate(
    [
      { width: "200%", height: "200%", transform: "scale(0.5)" },
      { width: "100%", height: "100%", transform: "scale(1)" },
    ],
    { duration: 700, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)", fill: "forwards" }
  );

  Promise.all([expansion.finished, iframeExpansion.finished]).then(() => {
    archivePreview.style.left = "0";
    archivePreview.style.top = "0";
    archivePreview.style.width = "100vw";
    archivePreview.style.height = "100vh";
    archivePreview.style.borderRadius = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.transform = "scale(1)";
    expansion.cancel();
    iframeExpansion.cancel();
    window.location.assign(archivePreview.href);
  });
});

function positionDescription(link) {
  const description = link.querySelector(".nav-description");
  if (!description || window.innerWidth > 760) return;

  const linkBounds = link.getBoundingClientRect();
  const descriptionWidth = description.getBoundingClientRect().width;
  const halfDescriptionWidth = descriptionWidth / 2;
  const left = Math.min(
    Math.max(linkBounds.left + linkBounds.width / 2, halfDescriptionWidth + 16),
    window.innerWidth - halfDescriptionWidth - 16
  );

  description.style.setProperty("--description-left", `${left}px`);
  description.style.setProperty("--description-top", `${linkBounds.bottom}px`);
}

for (const link of navLinks) {
  link.addEventListener("pointerenter", () => positionDescription(link));
  link.addEventListener("focus", () => positionDescription(link));
}

function repositionVisibleDescriptions() {
  for (const link of navLinks) {
    if (link.matches(":hover, :focus-visible")) positionDescription(link);
  }
}

window.addEventListener("resize", repositionVisibleDescriptions);
document.querySelector(".site-nav").addEventListener("scroll", repositionVisibleDescriptions);

function updateAboutCrossfade() {
  if (!aboutHero || !aboutSection) return;

  if (reducedMotionPreference.matches) {
    aboutHero.style.opacity = "1";
    aboutSection.style.opacity = "1";
    aboutSection.style.pointerEvents = "auto";
    return;
  }

  const stageTop = aboutStage.getBoundingClientRect().top;
  const transitionDistance = aboutStage.offsetHeight - window.innerHeight;
  const progress = Math.min(Math.max(-stageTop / transitionDistance, 0), 1);
  aboutHero.style.opacity = String(1 - progress);
  aboutSection.style.opacity = String(progress);
  aboutSection.style.pointerEvents = progress > 0.5 ? "auto" : "none";
}

function updateHeaderOnScroll() {
  if (scrollUpdateScheduled) return;
  scrollUpdateScheduled = true;

  window.requestAnimationFrame(() => {
    siteHeader.classList.toggle("is-compact", window.scrollY > 24);
    updateAboutCrossfade();
    updateSectionIndex();
    scrollUpdateScheduled = false;
  });
}

function getSectionIndexEntryPoint() {
  if (!aboutHero || !aboutStage) return Number.POSITIVE_INFINITY;
  if (reducedMotionPreference.matches) {
    return aboutStage.offsetTop + aboutHero.offsetHeight - siteHeader.offsetHeight;
  }

  const transitionEnd = aboutStage.offsetTop + aboutStage.offsetHeight - window.innerHeight;
  const earlyRevealDistance = Math.min(96, window.innerHeight * 0.12);
  return transitionEnd - earlyRevealDistance;
}

function setSectionIndexCollapsed(collapsed) {
  if (!sectionIndex || !sectionIndexToggle) return;
  sectionIndex.classList.toggle("is-collapsed", collapsed);
  sectionIndexToggle.setAttribute("aria-expanded", String(!collapsed));
  sectionIndexToggle.setAttribute(
    "aria-label",
    collapsed ? "Expand section index" : "Collapse section index"
  );
}

function updateSectionIndex() {
  if (!sectionIndex) return;

  const entryPoint = getSectionIndexEntryPoint();
  const isVisible = window.scrollY >= entryPoint;
  sectionIndex.classList.toggle("is-visible", isVisible);
  sectionIndex.setAttribute("aria-hidden", String(!isVisible));
  sectionIndex.inert = !isVisible;

  const isHovered = sectionIndex.matches(":hover");
  const isFocused = sectionIndex.contains(document.activeElement);
  if (!isVisible) {
    setSectionIndexCollapsed(false);
  } else if (!sectionIndexWasVisible) {
    setSectionIndexCollapsed(false);
  } else if (window.scrollY !== previousScrollY && !isHovered && !isFocused) {
    setSectionIndexCollapsed(true);
  }

  sectionIndexWasVisible = isVisible;
  previousScrollY = window.scrollY;
}

function scrollToSection(sectionId) {
  const heading = document.getElementById(sectionId);
  if (!heading) return;

  const section = heading.closest(".about-section");
  if (!section) return;

  let target;
  if (sectionId === "about-title" && !reducedMotionPreference.matches) {
    target = aboutStage.offsetTop + aboutStage.offsetHeight - window.innerHeight;
  } else {
    target =
      window.scrollY +
      section.getBoundingClientRect().top -
      siteHeader.getBoundingClientRect().height;
  }

  window.scrollTo({
    top: Math.max(0, target),
    behavior: reducedMotionPreference.matches ? "auto" : "smooth",
  });
}

sectionIndex?.addEventListener("pointerenter", () => setSectionIndexCollapsed(false));
sectionIndex?.addEventListener("pointerleave", () => {
  if (!sectionIndex.contains(document.activeElement)) setSectionIndexCollapsed(true);
});
sectionIndex?.addEventListener("focusin", () => setSectionIndexCollapsed(false));
sectionIndex?.addEventListener("focusout", (event) => {
  if (!sectionIndex.contains(event.relatedTarget) && !sectionIndex.matches(":hover")) {
    setSectionIndexCollapsed(true);
  }
});
sectionIndexToggle?.addEventListener("click", () => setSectionIndexCollapsed(true));

archiveSectionLink?.addEventListener("click", (event) => {
  event.preventDefault();
  scrollToSection("archive-title");
});

for (const link of sectionIndexLinks) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const sectionId = link.getAttribute("href")?.slice(1);
    if (sectionId) scrollToSection(sectionId);
  });
}

window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });
window.addEventListener("resize", () => {
  updateAboutCrossfade();
  updateSectionIndex();
});
reducedMotionPreference.addEventListener("change", () => {
  updateAboutCrossfade();
  updateSectionIndex();
});

scrollCue?.addEventListener("click", (event) => {
  if (!aboutStage || !aboutSection) return;

  event.preventDefault();
  scrollToSection("about-title");
});

updateHeaderOnScroll();
