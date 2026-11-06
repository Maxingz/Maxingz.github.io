const siteHeader = document.querySelector("#site-header");
const navLinks = document.querySelectorAll(".nav-link");
const aboutHero = document.querySelector(".hero");
const aboutSection = document.querySelector(".transition-about");
const aboutStage = document.querySelector(".about-transition-stage");
const scrollCue = document.querySelector(".scroll-cue");
const sectionIndex = document.querySelector(".section-index-sidebar");
const sectionIndexToggle = document.querySelector(".section-index-toggle");
const sectionIndexLinks = document.querySelectorAll(".section-index-nav a");
const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollUpdateScheduled = false;
let previousScrollY = window.scrollY;

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

  if (isVisible && window.scrollY > previousScrollY) {
    setSectionIndexCollapsed(true);
  } else if (!isVisible) {
    setSectionIndexCollapsed(false);
  }

  previousScrollY = window.scrollY;
}

function scrollToSection(sectionId) {
  const heading = document.getElementById(sectionId);
  if (!heading) return;

  let target;
  if (sectionId === "about-title" && !reducedMotionPreference.matches) {
    target = aboutStage.offsetTop + aboutStage.offsetHeight - window.innerHeight;
  } else {
    target =
      window.scrollY +
      heading.getBoundingClientRect().top -
      siteHeader.offsetHeight -
      24;
  }

  window.scrollTo({
    top: Math.max(0, target),
    behavior: reducedMotionPreference.matches ? "auto" : "smooth",
  });
}

sectionIndexToggle?.addEventListener("click", () => {
  setSectionIndexCollapsed(sectionIndexToggle.getAttribute("aria-expanded") === "true");
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
