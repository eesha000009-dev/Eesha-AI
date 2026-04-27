'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat-store';

export function SmokyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { themeMode } = useChatStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let logoImg: HTMLImageElement | null = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Preload logo
    const img = new Image();
    img.src = '/logo-transparent.png';
    img.onload = () => { logoImg = img; };
    if (img.complete) logoImg = img;

    // Smoke particles — larger, more ambient
    const particles: {
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number; hue: number;
      life: number; maxLife: number;
    }[] = [];

    const createParticle = () => {
      const w = canvas.width;
      const h = canvas.height;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15 - 0.05,
        radius: Math.random() * 300 + 150,
        opacity: Math.random() * 0.025 + 0.008,
        hue: Math.random() > 0.5 ? 220 + Math.random() * 30 : 260 + Math.random() * 20,
        life: 0,
        maxLife: Math.random() * 800 + 500,
      };
    };

    for (let i = 0; i < 10; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    const draw = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const w = canvas.width;
      const h = canvas.height;
      time += 0.004;

      ctx.clearRect(0, 0, w, h);

      // ─── 1. Smoke particles (subtle ambient) ───
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.x < -400 || p.x > w + 400 || p.y < -400 || p.y > h + 400) {
          Object.assign(p, createParticle());
        }

        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio < 0.1 ? lifeRatio / 0.1
                   : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2
                   : 1;

        const alpha = p.opacity * fade * (isDark ? 1.8 : 0.4);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `hsla(${p.hue}, 60%, ${isDark ? 55 : 45}%, ${alpha})`);
        grad.addColorStop(0.5, `hsla(${p.hue}, 50%, ${isDark ? 35 : 35}%, ${alpha * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      }

      // ─── 2. Diagonal light sweep — right to left ───
      const sweepX = w * (1.3 - (time * 0.12) % 2.6);
      const sweepGrad = ctx.createLinearGradient(sweepX - w * 0.35, 0, sweepX + w * 0.15, h);
      if (isDark) {
        sweepGrad.addColorStop(0, 'transparent');
        sweepGrad.addColorStop(0.3, `rgba(160, 200, 255, ${0.02 + Math.sin(time * 2) * 0.008})`);
        sweepGrad.addColorStop(0.5, `rgba(130, 180, 255, ${0.04 + Math.sin(time * 2) * 0.015})`);
        sweepGrad.addColorStop(0.7, `rgba(160, 200, 255, ${0.02 + Math.sin(time * 2) * 0.008})`);
        sweepGrad.addColorStop(1, 'transparent');
      } else {
        sweepGrad.addColorStop(0, 'transparent');
        sweepGrad.addColorStop(0.3, `rgba(139, 92, 246, ${0.01 + Math.sin(time * 2) * 0.004})`);
        sweepGrad.addColorStop(0.5, `rgba(124, 58, 237, ${0.02 + Math.sin(time * 2) * 0.006})`);
        sweepGrad.addColorStop(0.7, `rgba(139, 92, 246, ${0.01 + Math.sin(time * 2) * 0.004})`);
        sweepGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, w, h);

      // ─── 3. RIGHT-SIDE BLUE SPOTLIGHT — x.ai signature effect ───
      if (isDark) {
        const breathe = 0.6 + Math.sin(time * 0.7) * 0.4;
        const spotX = w * 0.85;
        const spotY = h * 0.25;
        const spotRadius = Math.min(w, h) * 0.6;

        const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
        spotGrad.addColorStop(0, `rgba(100, 160, 255, ${0.08 * breathe})`);
        spotGrad.addColorStop(0.3, `rgba(80, 140, 240, ${0.05 * breathe})`);
        spotGrad.addColorStop(0.6, `rgba(60, 120, 220, ${0.02 * breathe})`);
        spotGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, w, h);

        // Secondary smaller glow slightly offset
        const spot2X = w * 0.75;
        const spot2Y = h * 0.35;
        const spot2Radius = Math.min(w, h) * 0.3;

        const spot2Grad = ctx.createRadialGradient(spot2X, spot2Y, 0, spot2X, spot2Y, spot2Radius);
        spot2Grad.addColorStop(0, `rgba(139, 92, 246, ${0.06 * breathe})`);
        spot2Grad.addColorStop(0.5, `rgba(120, 80, 220, ${0.03 * breathe})`);
        spot2Grad.addColorStop(1, 'transparent');
        ctx.fillStyle = spot2Grad;
        ctx.fillRect(0, 0, w, h);
      }

      // ─── 4. Bottom-left ambient glow (purple, breathing) ───
      const breathe2 = 0.5 + Math.sin(time * 0.6 + 1.5) * 0.5;
      const blGrad = ctx.createRadialGradient(w * 0.12, h * 0.88, 0, w * 0.12, h * 0.88, w * 0.35);
      if (isDark) {
        blGrad.addColorStop(0, `rgba(139, 92, 246, ${0.05 * breathe2})`);
        blGrad.addColorStop(0.5, `rgba(100, 80, 200, ${0.02 * breathe2})`);
        blGrad.addColorStop(1, 'transparent');
      } else {
        blGrad.addColorStop(0, `rgba(139, 92, 246, ${0.025 * breathe2})`);
        blGrad.addColorStop(0.5, `rgba(6, 182, 212, ${0.01 * breathe2})`);
        blGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = blGrad;
      ctx.fillRect(0, 0, w, h);

      // ─── 5. Rotating glow ring — 4 orbiting spots (dark mode only) ───
      if (isDark) {
        const cx = w / 2;
        const cy = h / 2;
        const ringRadius = Math.min(w, h) * 0.25;
        const rotationSpeed = time * 0.2;

        const spots = [
          { angle: rotationSpeed, size: 0.5, alpha: 0.1, hue: 220 },
          { angle: rotationSpeed + Math.PI * 0.5, size: 0.4, alpha: 0.08, hue: 245 },
          { angle: rotationSpeed + Math.PI, size: 0.45, alpha: 0.09, hue: 260 },
          { angle: rotationSpeed + Math.PI * 1.5, size: 0.42, alpha: 0.085, hue: 230 },
        ];

        for (const spot of spots) {
          const sx = cx + Math.cos(spot.angle) * ringRadius;
          const sy = cy + Math.sin(spot.angle) * ringRadius;
          const spotR = ringRadius * spot.size;

          const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, spotR);
          spotGrad.addColorStop(0, `hsla(${spot.hue}, 70%, 65%, ${spot.alpha})`);
          spotGrad.addColorStop(0.4, `hsla(${spot.hue}, 60%, 45%, ${spot.alpha * 0.35})`);
          spotGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = spotGrad;
          ctx.fillRect(sx - spotR, sy - spotR, spotR * 2, spotR * 2);
        }

        // Semi-transparent logo watermark in center
        if (logoImg) {
          const logoSize = Math.min(w, h) * 0.4;
          const logoX = cx - logoSize / 2;
          const logoY = cy - logoSize / 2;

          ctx.save();
          ctx.globalAlpha = 0.04 + Math.sin(time * 0.4) * 0.01;
          ctx.filter = 'brightness(1.2) saturate(1.1)';
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
          ctx.restore();
        }
      }

      // ─── 6. Light mode: subtle center violet glow ───
      if (!isDark) {
        const cx = w / 2;
        const cy = h / 2;
        const breathe3 = 0.6 + Math.sin(time * 0.5) * 0.4;
        const centerR = Math.min(w, h) * 0.35;

        const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerR);
        cGrad.addColorStop(0, `rgba(139, 92, 246, ${0.02 * breathe3})`);
        cGrad.addColorStop(0.5, `rgba(6, 182, 212, ${0.008 * breathe3})`);
        cGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cGrad;
        ctx.fillRect(0, 0, w, h);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
