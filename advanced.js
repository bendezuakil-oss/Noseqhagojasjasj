
import * as THREE from "three";

/* =========================================
   CONFIGURACIÓN DEL JARDÍN 3D
   ========================================= */

const container = document.querySelector("#three-background");
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (container) {
  let scene;
  let camera;
  let renderer;
  let starField;
  let material;
  let frameId = null;
  let isVisible = true;

  const pointer = { x: 0, y: 0 };
  const smoothPointer = { x: 0, y: 0 };

  const clock = new THREE.Clock();

  try {
    /* Escena y cámara */
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    camera.position.z = 17;

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.setClearColor(0x100b20, 0);

    container.appendChild(renderer.domElement);

    /* =====================================
       GEOMETRÍA DE PARTÍCULAS
       ===================================== */

    const mobile = window.matchMedia(
      "(max-width: 600px)"
    ).matches;

    const particleCount = reduceMotion
      ? 180
      : mobile ? 420 : 1000;

    const positions = new Float32Array(
      particleCount * 3
    );

    const randoms = new Float32Array(
      particleCount
    );

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 34;
      positions[i3 + 1] = (Math.random() - 0.5) * 23;
      positions[i3 + 2] = (Math.random() - 0.5) * 24;

      randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      "aRandom",
      new THREE.BufferAttribute(randoms, 1)
    );

    /* =====================================
       SHADER GLSL
       Cada punto pulsa con un brillo distinto.
       ===================================== */

    material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: {
          value: renderer.getPixelRatio()
        },
        uColorA: {
          value: new THREE.Color("#d8b5ff")
        },
        uColorB: {
          value: new THREE.Color("#8062d8")
        }
      },

      vertexShader: `
        attribute float aRandom;

        uniform float uTime;
        uniform float uPixelRatio;

        varying float vAlpha;
        varying float vMix;

        void main() {
          vec3 p = position;

          float drift = uTime * 0.12;

          p.y += sin(drift + aRandom * 12.0) * 0.22;
          p.x += cos(drift * 0.7 + aRandom * 8.0) * 0.16;

          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);

          gl_Position = projectionMatrix * viewPosition;

          float depthScale = 18.0 / max(1.0, -viewPosition.z);

          gl_PointSize = clamp(
            (1.0 + aRandom * 2.2) *
            uPixelRatio *
            depthScale,
            1.0,
            7.0
          );

          vAlpha = 0.25 + 0.65 *
            (0.5 + 0.5 * sin(uTime * 0.8 + aRandom * 20.0));

          vMix = aRandom;
        }
      `,

      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;

        varying float vAlpha;
        varying float vMix;

        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);

          float distanceFromCenter = length(centered);

          float glow = 1.0 - smoothstep(
            0.05,
            0.5,
            distanceFromCenter
          );

          vec3 color = mix(
            uColorA,
            uColorB,
            vMix
          );

          float alpha = glow * vAlpha;

          if (alpha < 0.025) discard;

          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    starField = new THREE.Points(
      geometry,
      material
    );

    scene.add(starField);

    /* =====================================
       RESIZE RESPONSIVO
       ===================================== */

    function resize() {
      if (!renderer || !camera) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.position.z = width < 600 ? 20 : 17;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);

      material.uniforms.uPixelRatio.value =
        renderer.getPixelRatio();

      renderStatic();
    }

    /* =====================================
       RENDERIZADO
       ===================================== */

    function renderStatic() {
      if (!renderer || !scene || !camera) return;

      renderer.render(scene, camera);
    }

    function animate() {
      frameId = null;

      if (
        reduceMotion ||
        !isVisible ||
        document.hidden
      ) {
        return;
      }

      const elapsed = clock.getElapsedTime();

      material.uniforms.uTime.value = elapsed;

      /* El movimiento del ratón desplaza suavemente
         la cámara, sin perseguir al puntero de golpe. */

      smoothPointer.x +=
        (pointer.x - smoothPointer.x) * 0.025;

      smoothPointer.y +=
        (pointer.y - smoothPointer.y) * 0.025;

      camera.position.x = smoothPointer.x * 0.65;
      camera.position.y = -smoothPointer.y * 0.45;

      if (starField) {
        starField.rotation.y = elapsed * 0.008;
        starField.rotation.x =
          Math.sin(elapsed * 0.08) * 0.018;
      }

      renderer.render(scene, camera);

      frameId = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (
        reduceMotion ||
        !isVisible ||
        document.hidden ||
        frameId !== null
      ) {
        return;
      }

      frameId = window.requestAnimationFrame(animate);
    }

    function stopAnimation() {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    window.addEventListener("resize", resize, {
      passive: true
    });

    /* Movimiento de cámara únicamente con ratón */
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", (event) => {
        pointer.x =
          (event.clientX / window.innerWidth) * 2 - 1;

        pointer.y =
          (event.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    /* Pausa cuando la pestaña no está visible */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
        renderStatic();
      }
    });

    /* Respeta los cambios de preferencia de movimiento */
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    motionPreference.addEventListener?.("change", (event) => {
      if (event.matches) {
        stopAnimation();
        material.uniforms.uTime.value = 0;
        renderStatic();
      } else {
        startAnimation();
      }
    });

    /* Entrada inicial */
    renderStatic();

    if (!reduceMotion) {
      startAnimation();
    }

    /* =====================================
       GSAP — ENTRADA CINEMATOGRÁFICA
       ===================================== */

    function startIntro() {
      const gsap = window.gsap;

      if (!gsap || reduceMotion) {
        document.querySelectorAll(".reveal").forEach((el) => {
          el.classList.add("visible");
        });
        return;
      }

      document.body.classList.add("enhanced-ready");

      const intro = gsap.timeline({
        defaults: {
          ease: "power3.out"
        }
      });

      intro
        .from(".topbar", {
          opacity: 0,
          y: -18,
          duration: 0.9
        })
        .from(".hero-copy > *", {
          opacity: 0,
          y: 24,
          duration: 0.85,
          stagger: 0.11
        }, "-=0.45")
        .from(".hero-art", {
          opacity: 0,
          scale: 0.92,
          rotation: -2,
          duration: 1.4
        }, "-=0.9")
        .from(".art-label", {
          opacity: 0,
          y: 8,
          duration: 0.6,
          stagger: 0.12
        }, "-=0.8");

      /* Balanceo sutil del ramo */
      gsap.to(".bouquet", {
        y: -7,
        rotation: 1,
        duration: 4.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "50% 60%"
      });

      /* Revelado escalonado de las tarjetas */
      gsap.utils.toArray(".flower-card").forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 35
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay: index * 0.12,
            ease: "power3.out",
            scrollTrigger: undefined,
            paused: false,
            onComplete: () => {
              card.style.transform = "";
            }
          }
        );
      });
    }

    if (document.readyState === "complete") {
      startIntro();
    } else {
      window.addEventListener("load", startIntro, {
        once: true
      });
    }

    console.info("Jardín 3D activo ✨");

  } catch (error) {
    console.error(
      "El fondo 3D no pudo iniciarse. El contenido principal sigue disponible.",
      error
    );

    container.style.display = "none";
  }
}
