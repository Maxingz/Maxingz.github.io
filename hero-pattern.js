const hero = document.querySelector(".hero");
const canvas = hero?.querySelector(".hero-pattern");
const context = canvas?.getContext("2d");

if (hero && canvas && context) {
  const pointer = { x: -1000, y: -1000, active: false };
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const spacing = 62;
  const diagonalSlope = 0.55;
  const repeatingWaveCount = 4;
  const horizontalPeriod = (spacing * repeatingWaveCount) / diagonalSlope;
  const waveFrequency = (Math.PI * 2) / horizontalPeriod;
  let animationFrame = 0;
  let waveOffset = 0;
  let previousFrameTime = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;

  function variationFor(index, offset) {
    const value = Math.sin((index + 1) * 127.1 + offset * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function resizeCanvas() {
    const bounds = hero.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawPattern();
  }

  function drawPattern() {
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(255, 255, 255, 0.62)";
    context.lineWidth = 1.25;

    const influenceRadius = 560;

    const firstWave = -diagonalSlope * width - spacing;
    const lastWave = height + spacing;

    for (let rowIndex = 0, row = firstWave; row < lastWave; rowIndex += 1, row += spacing) {
      const variationIndex = rowIndex % repeatingWaveCount;
      const waveAmplitude = 7 + variationFor(variationIndex, 1) * 6;
      const detailAmplitude = 1.5 + variationFor(variationIndex, 2) * 3.5;
      const detailPhase = variationFor(variationIndex, 3) * Math.PI * 2;
      context.beginPath();

      for (let x = -12; x <= width + 12; x += 8) {
        const shiftedX = x + waveOffset;
        const baseY =
          row +
          shiftedX * diagonalSlope +
          Math.sin(shiftedX * waveFrequency) * waveAmplitude +
          Math.sin(shiftedX * waveFrequency * 2 + detailPhase) * detailAmplitude;
        const dx = x - pointer.x;
        const dy = baseY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const influence = pointer.active
          ? Math.max(0, 1 - distance / influenceRadius) ** 2
          : 0;
        const displacement = influence * 32;
        const pointX = x + (distance ? (dx / distance) * displacement : 0);
        const pointY = baseY + (distance ? (dy / distance) * displacement : 0);

        if (x === -12) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      }

      context.stroke();
    }
  }

  function animate(timestamp) {
    if (motionPreference.matches) {
      animationFrame = 0;
      previousFrameTime = 0;
      return;
    }

    if (previousFrameTime) {
      const elapsedSeconds = Math.min((timestamp - previousFrameTime) / 1000, 0.05);
      waveOffset = (waveOffset + elapsedSeconds * 85) % horizontalPeriod;
    }

    previousFrameTime = timestamp;
    drawPattern();
    animationFrame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (!motionPreference.matches && !animationFrame) {
      animationFrame = window.requestAnimationFrame(animate);
    } else {
      drawPattern();
    }
  }

  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = event.pointerType === "mouse" || event.pointerType === "pen";
    if (motionPreference.matches) drawPattern();
  });

  hero.addEventListener("pointerleave", () => {
    pointer.active = false;
    if (motionPreference.matches) drawPattern();
  });

  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches && animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrameTime = 0;
      drawPattern();
    } else {
      startAnimation();
    }
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  startAnimation();
}
