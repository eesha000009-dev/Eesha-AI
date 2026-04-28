'use client';

import { useEffect, useRef } from 'react';

export function SmokyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const draw = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const w = canvas.width;
      const h = canvas.height;
      time += 0.008;

      // ─── Background gradient ───
      if (isDark) {
        const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, '#0d0d1a');
        bgGrad.addColorStop(0.5, '#0a0a14');
        bgGrad.addColorStop(1, '#050510');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      } else {
        const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, '#f8f8ff');
        bgGrad.addColorStop(1, '#f0f0f8');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ─── Top-right light source ───
      if (isDark) {
        const pulse = 0.6 + Math.sin(time * 0.6) * 0.4;
        const lightX = w * 0.82;
        const lightY = h * 0.08;
        const lightR = Math.max(w, h) * 0.9;
        const lGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightR);
        lGrad.addColorStop(0, `rgba(180, 210, 255, ${0.35 * pulse})`);
        lGrad.addColorStop(0.05, `rgba(150, 190, 255, ${0.28 * pulse})`);
        lGrad.addColorStop(0.12, `rgba(120, 170, 255, ${0.18 * pulse})`);
        lGrad.addColorStop(0.25, `rgba(90, 140, 255, ${0.10 * pulse})`);
        lGrad.addColorStop(0.45, `rgba(60, 110, 230, ${0.04 * pulse})`);
        lGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lGrad;
        ctx.fillRect(0, 0, w, h);

        // Lens flare
        const flareR = Math.min(w, h) * 0.08;
        const flareGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, flareR);
        flareGrad.addColorStop(0, `rgba(220, 235, 255, ${0.25 * pulse})`);
        flareGrad.addColorStop(0.3, `rgba(180, 210, 255, ${0.12 * pulse})`);
        flareGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(lightX - flareR, lightY - flareR, flareR * 2, flareR * 2);

        // Secondary mid-right glow
        const l2X = w * 0.9;
        const l2Y = h * 0.5;
        const l2R = Math.min(w, h) * 0.6;
        const l2Grad = ctx.createRadialGradient(l2X, l2Y, 0, l2X, l2Y, l2R);
        l2Grad.addColorStop(0, `rgba(100, 150, 255, ${0.15 * pulse})`);
        l2Grad.addColorStop(0.2, `rgba(80, 130, 255, ${0.08 * pulse})`);
        l2Grad.addColorStop(0.5, `rgba(60, 100, 220, ${0.03 * pulse})`);
        l2Grad.addColorStop(1, 'transparent');
        ctx.fillStyle = l2Grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        const pulse = 0.6 + Math.sin(time * 0.6) * 0.4;
        const lightX = w * 0.82;
        const lightY = h * 0.08;
        const lightR = Math.max(w, h) * 0.6;
        const lGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightR);
        lGrad.addColorStop(0, `rgba(124, 58, 237, ${0.10 * pulse})`);
        lGrad.addColorStop(0.2, `rgba(124, 58, 237, ${0.05 * pulse})`);
        lGrad.addColorStop(0.5, `rgba(6, 182, 212, ${0.02 * pulse})`);
        lGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ─── Diagonal light sweep ───
      const sweepProgress = (time * 0.12) % 3.5;
      const sweepX = w * (1.5 - sweepProgress);
      const sweepY = h * (1.5 - sweepProgress);
      const sweepWidth = Math.max(w, h) * 0.4;
      const sweepGrad = ctx.createLinearGradient(
        sweepX + sweepWidth, sweepY + sweepWidth,
        sweepX - sweepWidth, sweepY - sweepWidth
      );
      const sweepPulse = 0.5 + Math.sin(time * 1.5) * 0.5;
      if (isDark) {
        sweepGrad.addColorStop(0, 'transparent');
        sweepGrad.addColorStop(0.3, `rgba(120, 160, 255, ${0.08 * sweepPulse})`);
        sweepGrad.addColorStop(0.5, `rgba(100, 150, 255, ${0.15 * sweepPulse})`);
        sweepGrad.addColorStop(0.7, `rgba(120, 160, 255, ${0.08 * sweepPulse})`);
        sweepGrad.addColorStop(1, 'transparent');
      } else {
        sweepGrad.addColorStop(0, 'transparent');
        sweepGrad.addColorStop(0.3, `rgba(124, 58, 237, ${0.04 * sweepPulse})`);
        sweepGrad.addColorStop(0.5, `rgba(109, 40, 217, ${0.08 * sweepPulse})`);
        sweepGrad.addColorStop(0.7, `rgba(6, 182, 212, ${0.04 * sweepPulse})`);
        sweepGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, w, h);

      // ─── Bottom-left ambient glow ───
      const breathe1 = 0.5 + Math.sin(time * 0.7 + 1) * 0.5;
      const blGrad = ctx.createRadialGradient(w * 0.08, h * 0.92, 0, w * 0.08, h * 0.92, w * 0.45);
      if (isDark) {
        blGrad.addColorStop(0, `rgba(139, 92, 246, ${0.20 * breathe1})`);
        blGrad.addColorStop(0.2, `rgba(120, 80, 220, ${0.12 * breathe1})`);
        blGrad.addColorStop(0.5, `rgba(100, 70, 200, ${0.05 * breathe1})`);
        blGrad.addColorStop(1, 'transparent');
      } else {
        blGrad.addColorStop(0, `rgba(139, 92, 246, ${0.08 * breathe1})`);
        blGrad.addColorStop(0.4, `rgba(6, 182, 212, ${0.03 * breathe1})`);
        blGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = blGrad;
      ctx.fillRect(0, 0, w, h);

      // ─── LOGO WATERMARK — the ONLY logo, clearly visible ───
      const cx = w / 2;
      const cy = h / 2;

      if (logoImg) {
        const logoSize = Math.max(w, h) * 0.5;
        const logoX = cx - logoSize / 2;
        const logoY = cy - logoSize / 2;

        ctx.save();
        const baseAlpha = isDark ? 0.40 : 0.18;
        const breatheAmount = isDark ? 0.08 : 0.04;
        ctx.globalAlpha = baseAlpha + Math.sin(time * 0.4) * breatheAmount;
        ctx.filter = 'brightness(1.5) saturate(1.4)';
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Light mode center glow
      if (!isDark) {
        const breathe2 = 0.5 + Math.sin(time * 0.5) * 0.5;
        const cR = Math.min(w, h) * 0.4;
        const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
        cGrad.addColorStop(0, `rgba(139, 92, 246, ${0.06 * breathe2})`);
        cGrad.addColorStop(0.5, `rgba(6, 182, 212, ${0.03 * breathe2})`);
        cGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // ─── Vignette (dark mode) ───
      if (isDark) {
        const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
        vigGrad.addColorStop(0, 'transparent');
        vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = vigGrad;
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
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
