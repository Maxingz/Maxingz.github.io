const siteHeader = document.querySelector("#site-header");
const navLinks = document.querySelectorAll(".nav-link");
const aboutHero = document.querySelector(".hero");
const aboutSection = document.querySelector(".transition-about");
const aboutStage = document.querySelector(".about-transition-stage");
const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollUpdateScheduled = false;

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
    scrollUpdateScheduled = false;
  });
}

window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });
window.addEventListener("resize", updateAboutCrossfade);
reducedMotionPreference.addEventListener("change", updateAboutCrossfade);
updateHeaderOnScroll();
