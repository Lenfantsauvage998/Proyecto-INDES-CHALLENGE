import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

function getDeviceTier(): "low" | "mid" | "high" {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const cores = navigator.hardwareConcurrency ?? 2;
  if (mobile || cores <= 2) return "low";
  if (cores <= 4) return "mid";
  return "high";
}

const TIERS = {
  low:  { PARTICLE_COUNT: 18, CONNECTION_DISTANCE: 80,  TARGET_FPS: 20 },
  mid:  { PARTICLE_COUNT: 25, CONNECTION_DISTANCE: 95,  TARGET_FPS: 25 },
  high: { PARTICLE_COUNT: 35, CONNECTION_DISTANCE: 110, TARGET_FPS: 30 },
};

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let W = 0;
    let H = 0;

    const tier = getDeviceTier();
    const { PARTICLE_COUNT, CONNECTION_DISTANCE, TARGET_FPS } = TIERS[tier];

    const MAX_LINE_OPACITY = 0.18;
    const FRICTION = 0.94;
    const BUCKETS = 4;

    const particles: Particle[] = [];

    function init() {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, tier === "low" ? 1 : 2);

      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;

      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);

      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 1 + 0.8,
        });
      }
    }

    init();

    const maxDistSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
    const bucketBase = MAX_LINE_OPACITY / BUCKETS;
    const FRAME_MS = 1000 / TARGET_FPS;

    function update() {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        else if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        else if (p.y > H) p.y = 0;

        p.vx *= FRICTION;
        p.vy *= FRICTION;

        if (Math.abs(p.vx) < 0.04)
          p.vx += (Math.random() - 0.5) * 0.018;
        if (Math.abs(p.vy) < 0.04)
          p.vy += (Math.random() - 0.5) * 0.018;
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const opacity = (1 - dist / CONNECTION_DISTANCE) * MAX_LINE_OPACITY;
            const b = Math.min(Math.floor(opacity / bucketBase), BUCKETS - 1);
            const path = paths[b];
            path.moveTo(p1.x, p1.y);
            path.lineTo(p2.x, p2.y);
          }
        }
      }

      ctx.lineWidth = 0.8;
      for (let b = 0; b < BUCKETS; b++) {
        const alpha = (b + 0.5) * bucketBase;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.stroke(paths[b]);
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let lastTime = 0;

    function tick(now: number) {
      if (document.hidden) {
        animFrameId = requestAnimationFrame(tick);
        return;
      }
      if (now - lastTime < FRAME_MS) {
        animFrameId = requestAnimationFrame(tick);
        return;
      }
      lastTime = now;
      update();
      draw();
      animFrameId = requestAnimationFrame(tick);
    }

    function onResize() {
      init();
    }

    window.addEventListener("resize", onResize);
    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
