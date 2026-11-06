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
const archivePreview = document.querySelector(".archive-preview");
const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollUpdateScheduled = false;
let previousScrollY = window.scrollY;
let sectionIndexWasVisible = false;

desktopNotice?.addEventListener("click", () => {
  if (reducedMotionPreference.matches) {
    desktopNotice.remove();
    return;
  }

  desktopNotice.classList.add("is-dismissing");
  desktopNotice.addEventListener("animationend", () => desktopNotice.remove(), { once: true });
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
    return;
  }

  const stageTop = aboutStage.getBoundingClientRect().top;
  const transitionDistance = aboutStage.offsetHeight - window.innerHeight;
  const progress = Math.min(Math.max(-stageTop / transitionDistance, 0), 1);
  aboutHero.style.opacity = String(1 - progress);
  aboutSection.style.opacity = String(progress);
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
