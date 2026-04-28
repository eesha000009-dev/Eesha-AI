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

    // ─── Smoke particles — drift from right to left (x.ai style) ───
    const particles: {
      x: number; y: number; vx: number; vy: number;
      radius: number; opacity: number; maxOpacity: number;
      hue: number; life: number; maxLife: number;
    }[] = [];

    const createParticle = () => {
      const w = canvas.width;
      const h = canvas.height;
      const fromRight = Math.random() > 0.2;
      return {
        x: fromRight ? w + Math.random() * 300 : w * (0.6 + Math.random() * 0.4),
        y: h * (0.05 + Math.random() * 0.9),
        vx: -(0.3 + Math.random() * 0.6),
        vy: (Math.random() - 0.5) * 0.3,
        radius: 100 + Math.random() * 250,
        opacity: 0,
        maxOpacity: 0.08 + Math.random() * 0.07,
        hue: 210 + Math.random() * 50,
        life: 0,
        maxLife: 500 + Math.random() * 600,
      };
    };

    // More particles — 24 for dense, visible smoke
    for (let i = 0; i < 24; i++) {
      const p = createParticle();
      p.life = Math.random() * p.maxLife;
      const ratio = p.life / p.maxLife;
      if (ratio < 0.15) p.opacity = (ratio / 0.15) * p.maxOpacity;
      else if (ratio > 0.7) p.opacity = ((1 - ratio) / 0.3) * p.maxOpacity;
      else p.opacity = p.maxOpacity;
      particles.push(p);
    }

    const draw = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const w = canvas.width;
      const h = canvas.height;
      time += 0.006;

      ctx.clearRect(0, 0, w, h);

      // ═══════════════════════════════════════════════════════════
      // 1. x.ai-STYLE DRAMATIC LIGHTING — top-right light source
      // ═══════════════════════════════════════════════════════════
      if (isDark) {
        const pulse = 0.55 + Math.sin(time * 0.7) * 0.45;

        // MAIN light cone from top-right — INTENSE, cinematic
        const lightX = w * 0.88;
        const lightY = h * 0.08;
        const lightR = Math.min(w, h) * 0.8;
        const lGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightR);
        lGrad.addColorStop(0, `rgba(140, 180, 255, ${0.22 * pulse})`);
        lGrad.addColorStop(0.1, `rgba(120, 160, 255, ${0.16 * pulse})`);
        lGrad.addColorStop(0.25, `rgba(100, 140, 255, ${0.09 * pulse})`);
        lGrad.addColorStop(0.5, `rgba(80, 120, 255, ${0.04 * pulse})`);
        lGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lGrad;
        ctx.fillRect(0, 0, w, h);

        // SECONDARY mid-right glow — softer, complementary
        const l2X = w * 0.92;
        const l2Y = h * 0.5;
        const l2R = Math.min(w, h) * 0.5;
        const l2Grad = ctx.createRadialGradient(l2X, l2Y, 0, l2X, l2Y, l2R);
        l2Grad.addColorStop(0, `rgba(100, 150, 255, ${0.10 * pulse})`);
        l2Grad.addColorStop(0.3, `rgba(80, 130, 255, ${0.05 * pulse})`);
        l2Grad.addColorStop(0.6, `rgba(60, 100, 220, ${0.02 * pulse})`);
        l2Grad.addColorStop(1, 'transparent');
        ctx.fillStyle = l2Grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        // Light mode — softer but still visible
        const pulse = 0.6 + Math.sin(time * 0.7) * 0.4;
        const lightX = w * 0.88;
        const lightY = h * 0.08;
        const lightR = Math.min(w, h) * 0.7;
        const lGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightR);
        lGrad.addColorStop(0, `rgba(124, 58, 237, ${0.06 * pulse})`);
        lGrad.addColorStop(0.3, `rgba(124, 58, 237, ${0.03 * pulse})`);
        lGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ═══════════════════════════════════════════════════════════
      // 2. SMOKE PARTICLES — right → left, blue/purple, VISIBLE
      // ═══════════════════════════════════════════════════════════
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life >= p.maxLife || p.x < -p.radius * 2) {
          Object.assign(p, createParticle());
        }

        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.15) p.opacity = (lifeRatio / 0.15) * p.maxOpacity;
        else if (lifeRatio > 0.7) p.opacity = ((1 - lifeRatio) / 0.3) * p.maxOpacity;
        else p.opacity = p.maxOpacity;

        const alpha = p.opacity * (isDark ? 2.2 : 1.0);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `hsla(${p.hue}, 75%, ${isDark ? 65 : 55}%, ${alpha})`);
        grad.addColorStop(0.35, `hsla(${p.hue}, 65%, ${isDark ? 50 : 45}%, ${alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      }

      // ═══════════════════════════════════════════════════════════
      // 3. DIAGONAL LIGHT SWEEP — bottom-right → top-left, STRONG
      // ═══════════════════════════════════════════════════════════
      const sweepProgress = (time * 0.15) % 3.0;
      const sweepX = w * (1.4 - sweepProgress);
      const sweepY = h * (1.4 - sweepProgress);
      const sweepWidth = Math.max(w, h) * 0.35;
      const sweepGrad = ctx.createLinearGradient(
        sweepX + sweepWidth, sweepY + sweepWidth,
        sweepX - sweepWidth, sweepY - sweepWidth
      );
      const sweepIntensity = Math.sin(time * 1.5) * 0.5 + 0.5;
      if (isDark) {
        sweepGrad.addColorStop(0, 'transparent');
        sweepGrad.addColorStop(0.2, `rgba(140, 180, 255, ${0.01 * sweepIntensity})`);
        sweepGrad.addColorStop(0.35, `rgba(120, 160, 255, ${0.06 * sweepIntensity})`);
        sweepGrad.addColorStop(0.5, `rgba(100, 150, 255, ${0.10 * sweepIntensity})`);
        sweepGrad.addColorStop(0.65, `rgba(120, 160, 255, ${0.06 * sweepIntensity})`);
        sweepGrad.addColorStop(0.8, `rgba(140, 180, 255, ${0.01 * sweepIntensity})`);
        sweepGrad.addColorStop(1, 'transparent');
      } else {
        sweepGrad.addColorStop(0, 'transparent');
        sweepGrad.addColorStop(0.2, `rgba(124, 58, 237, ${0.005 * sweepIntensity})`);
        sweepGrad.addColorStop(0.35, `rgba(124, 58, 237, ${0.025 * sweepIntensity})`);
        sweepGrad.addColorStop(0.5, `rgba(109, 40, 217, ${0.05 * sweepIntensity})`);
        sweepGrad.addColorStop(0.65, `rgba(6, 182, 212, ${0.025 * sweepIntensity})`);
        sweepGrad.addColorStop(0.8, `rgba(6, 182, 212, ${0.005 * sweepIntensity})`);
        sweepGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, w, h);

      // ═══════════════════════════════════════════════════════════
      // 4. BOTTOM-LEFT AMBIENT GLOW — breathing purple/indigo
      // ═══════════════════════════════════════════════════════════
      const breathe1 = 0.5 + Math.sin(time * 0.8 + 1) * 0.5;
      const blGrad = ctx.createRadialGradient(w * 0.1, h * 0.9, 0, w * 0.1, h * 0.9, w * 0.4);
      if (isDark) {
        blGrad.addColorStop(0, `rgba(139, 92, 246, ${0.14 * breathe1})`);
        blGrad.addColorStop(0.3, `rgba(120, 80, 220, ${0.07 * breathe1})`);
        blGrad.addColorStop(0.6, `rgba(100, 70, 200, ${0.03 * breathe1})`);
        blGrad.addColorStop(1, 'transparent');
      } else {
        blGrad.addColorStop(0, `rgba(139, 92, 246, ${0.05 * breathe1})`);
        blGrad.addColorStop(0.4, `rgba(6, 182, 212, ${0.02 * breathe1})`);
        blGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = blGrad;
      ctx.fillRect(0, 0, w, h);

      // ═══════════════════════════════════════════════════════════
      // 5. HUGE LOGO WATERMARK + ROTATING GLOW RINGS
      // ═══════════════════════════════════════════════════════════
      const cx = w / 2;
      const cy = h / 2;

      // Rotate glow ring — ALWAYS visible in both modes
      const ringRadius = Math.min(w, h) * 0.24;
      const rotationSpeed = time * 0.25;

      const spots = [
        { angle: rotationSpeed, size: 0.6, alpha: 0.22, hue: 220 },
        { angle: rotationSpeed + Math.PI * 0.5, size: 0.5, alpha: 0.17, hue: 245 },
        { angle: rotationSpeed + Math.PI, size: 0.55, alpha: 0.20, hue: 265 },
        { angle: rotationSpeed + Math.PI * 1.5, size: 0.48, alpha: 0.18, hue: 235 },
      ];

      for (const spot of spots) {
        const sx = cx + Math.cos(spot.angle) * ringRadius;
        const sy = cy + Math.sin(spot.angle) * ringRadius;
        const spotR = ringRadius * spot.size;
        const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, spotR);
        const alphaMultiplier = isDark ? 1.0 : 0.5;
        spotGrad.addColorStop(0, `hsla(${spot.hue}, 75%, 70%, ${spot.alpha * alphaMultiplier})`);
        spotGrad.addColorStop(0.35, `hsla(${spot.hue}, 65%, 55%, ${spot.alpha * 0.4 * alphaMultiplier})`);
        spotGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(sx - spotR, sy - spotR, spotR * 2, spotR * 2);
      }

      // THE LOGO — HUGE, semi-transparent, centered, DRAMATIC
      if (logoImg) {
        const logoSize = Math.min(w, h) * 0.55;
        const logoX = cx - logoSize / 2;
        const logoY = cy - logoSize / 2;

        ctx.save();
        // Dark mode: much more opaque (0.18), light mode: lower but still visible (0.10)
        const baseAlpha = isDark ? 0.18 : 0.10;
        const breatheAmount = isDark ? 0.04 : 0.025;
        ctx.globalAlpha = baseAlpha + Math.sin(time * 0.4) * breatheAmount;
        ctx.filter = 'brightness(1.4) saturate(1.3)';
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Light mode center glow
      if (!isDark) {
        const breathe2 = 0.5 + Math.sin(time * 0.5) * 0.5;
        const cR = Math.min(w, h) * 0.35;
        const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
        cGrad.addColorStop(0, `rgba(139, 92, 246, ${0.04 * breathe2})`);
        cGrad.addColorStop(0.5, `rgba(6, 182, 212, ${0.02 * breathe2})`);
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
