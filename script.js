
/* =========================================
   JARDÍN VIOLETA — INTERACCIONES
   ========================================= */

"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* =========================================
   1. ANIMACIÓN DE APARICIÓN
   ========================================= */

const revealElements = $$(".reveal");

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -35px 0px"
    }
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => {
    element.classList.add("visible");
  });
}

/* =========================================
   2. NAVEGACIÓN AL JARDÍN
   ========================================= */

const scrollGardenButton = $("#scrollGarden");
const gardenSection = $("#garden");

scrollGardenButton?.addEventListener("click", () => {
  gardenSection?.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start"
  });
});

/* =========================================
   3. CARTA DIGITAL
   ========================================= */

const overlay = $("#letterOverlay");
const openLetterButton = $("#openLetter");
const openLetterBottomButton = $("#openLetterBottom");
const closeLetterButton = $("#closeLetter");
const letterModal = $(".letter-modal");

let previousFocus = null;

function openLetter() {
  if (!overlay) return;

  previousFocus = document.activeElement;

  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    closeLetterButton?.focus();
  }, reduceMotion ? 0 : 200);
}

function closeLetter() {
  if (!overlay || !overlay.classList.contains("is-open")) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus();
  }
}

openLetterButton?.addEventListener("click", openLetter);
openLetterBottomButton?.addEventListener("click", openLetter);
closeLetterButton?.addEventListener("click", closeLetter);

overlay?.addEventListener("click", (event) => {
  if (event.target === overlay) {
    closeLetter();
  }
});

document.addEventListener("keydown", (event) => {
  if (!overlay?.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    closeLetter();
    return;
  }

  // Mantiene el foco dentro de la carta para facilitar
  // la navegación mediante teclado.
  if (event.key === "Tab" && letterModal) {
    const focusable = $$(
      'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      letterModal
    ).filter((element) => element.getClientRects().length > 0);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

/* =========================================
   4. CIELO DE PARTÍCULAS
   Canvas dibuja pequeños puntos luminosos.
   ========================================= */

const canvas = $("#particles");
const ctx = canvas?.getContext("2d");

let width = 0;
let height = 0;
let particles = [];
let animationFrame = null;

const particleColors = [
  "rgba(219, 187, 255, ",
  "rgba(178, 147, 238, ",
  "rgba(255, 239, 255, "
];

const random = (min, max) =>
  Math.random() * (max - min) + min;

function createParticle() {
  return {
    x: random(0, width),
    y: random(0, height),
    radius: random(0.5, 1.8),
    speedY: random(0.08, 0.3),
    speedX: random(-0.12, 0.12),
    alpha: random(0.15, 0.7),
    pulse: random(0.003, 0.012),
    phase: random(0, Math.PI * 2),
    color: particleColors[
      Math.floor(Math.random() * particleColors.length)
    ]
  };
}

function resizeCanvas() {
  if (!canvas || !ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Reducimos la cantidad de partículas en pantallas pequeñas.
  const count = Math.min(
    90,
    Math.max(25, Math.floor((width * height) / 15000))
  );

  particles = Array.from(
    { length: count },
    createParticle
  );

  if (reduceMotion) {
    drawStaticParticles();
  }
}

function drawStaticParticles() {
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  particles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(
      particle.x,
      particle.y,
      particle.radius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = `${particle.color}${particle.alpha})`;
    ctx.fill();
  });
}

function animateParticles() {
  if (!ctx || reduceMotion || document.hidden) {
    animationFrame = null;
    return;
  }

  ctx.clearRect(0, 0, width, height);

  const time = performance.now() * 0.001;

  particles.forEach((particle) => {
    particle.x += particle.speedX;
    particle.y -= particle.speedY;

    const shimmer =
      0.65 + Math.sin(time + particle.phase) * 0.35;

    ctx.beginPath();

    ctx.arc(
      particle.x,
      particle.y,
      particle.radius * shimmer,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      `${particle.color}${particle.alpha * shimmer})`;

    ctx.fill();

    // Reinicia la partícula cuando sale de la pantalla.
    if (particle.y < -5) {
      particle.y = height + 5;
      particle.x = random(0, width);
    }

    if (particle.x < -5) particle.x = width + 5;
    if (particle.x > width + 5) particle.x = -5;
  });

  animationFrame = window.requestAnimationFrame(
    animateParticles
  );
}

function startParticles() {
  if (reduceMotion || document.hidden || animationFrame !== null) {
    return;
  }

  animationFrame = window.requestAnimationFrame(
    animateParticles
  );
}

function stopParticles() {
  if (animationFrame !== null) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

if (canvas && ctx) {
  resizeCanvas();

  if (!reduceMotion) {
    startParticles();
  }

  window.addEventListener("resize", resizeCanvas, {
    passive: true
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopParticles();
    } else if (reduceMotion) {
      drawStaticParticles();
    } else {
      startParticles();
    }
  });
}

/* =========================================
   5. DETALLES AL PASAR EL PUNTERO
   Solo se activa en dispositivos con ratón.
   ========================================= */

const hasFinePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)"
).matches;

if (hasFinePointer && !reduceMotion) {
  $$(".flower-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();

      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      card.style.background = `
        radial-gradient(
          circle at ${x}px ${y}px,
          rgba(190, 151, 239, 0.12),
          rgba(255, 255, 255, 0.018) 70%
        )
      `;
    });

    card.addEventListener("pointerleave", () => {
      card.style.background = "";
    });
  });
}

/* =========================================
   6. INICIALIZACIÓN
   ========================================= */

document.documentElement.classList.add("js-ready");

console.info(
  "Jardín violeta iniciado correctamente. 💜"
);
