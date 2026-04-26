'use client';

import { useEffect, useRef } from 'react';

// Helper: draw rounded rectangle (cross-browser compatible)
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface SmokeParticle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  opacity: number;
  maxOpacity: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function SmokyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const smokeParticles: SmokeParticle[] = [];
    const MAX_SMOKE = 20;

    function createSmokeParticle(): SmokeParticle {
      const spawnFromRight = Math.random() > 0.3;
      return {
        x: spawnFromRight ? canvas.width + Math.random() * 200 : canvas.width * (0.5 + Math.random() * 0.5),
        y: canvas.height * (0.1 + Math.random() * 0.8),
        radius: 80 + Math.random() * 200,
        vx: -(0.2 + Math.random() * 0.5),
        vy: (Math.random() - 0.5) * 0.3,
        opacity: 0,
        maxOpacity: 0.04 + Math.random() * 0.06,
        life: 0,
        maxLife: 300 + Math.random() * 400,
        hue: 210 + Math.random() * 30,
      };
    }

    // Initialize smoke particles with staggered lifetimes
    for (let i = 0; i < MAX_SMOKE; i++) {
      const p = createSmokeParticle();
      p.life = Math.random() * p.maxLife;
      smokeParticles.push(p);
    }

    function drawSmoke() {
      for (let i = 0; i < smokeParticles.length; i++) {
        const p = smokeParticles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Smooth fade in/out
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.15) {
          p.opacity = (lifeRatio / 0.15) * p.maxOpacity;
        } else if (lifeRatio > 0.7) {
          p.opacity = ((1 - lifeRatio) / 0.3) * p.maxOpacity;
        } else {
          p.opacity = p.maxOpacity;
        }

        if (p.life >= p.maxLife || p.x < -p.radius * 2) {
          smokeParticles[i] = createSmokeParticle();
          continue;
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, `hsla(${p.hue}, 70%, 70%, ${p.opacity})`);
        gradient.addColorStop(0.4, `hsla(${p.hue}, 60%, 50%, ${p.opacity * 0.6})`);
        gradient.addColorStop(0.7, `hsla(${p.hue}, 50%, 40%, ${p.opacity * 0.3})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawLogoWatermark() {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const logoSize = Math.min(canvas.width, canvas.height) * 0.35;

      // === Rotating blue-white glow orbiting around the E shape ===
      const glowAngle = time * 0.008;
      const glowRadius = logoSize * 0.55;

      // 3 glow spots rotating in an elliptical orbit
      for (let i = 0; i < 3; i++) {
        const angle = glowAngle + (i * Math.PI * 2) / 3;
        const gx = cx + Math.cos(angle) * glowRadius * 0.8;
        const gy = cy + Math.sin(angle) * glowRadius * 0.6;

        const glowGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, logoSize * 0.4);
        glowGrad.addColorStop(0, 'rgba(100, 170, 255, 0.08)');
        glowGrad.addColorStop(0.3, 'rgba(80, 140, 255, 0.04)');
        glowGrad.addColorStop(0.6, 'rgba(60, 120, 255, 0.02)');
        glowGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, logoSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Larger slow-moving trailing glow
      const trailAngle = glowAngle * 0.6;
      const tx = cx + Math.cos(trailAngle) * glowRadius * 1.2;
      const ty = cy + Math.sin(trailAngle) * glowRadius * 0.9;

      const trailGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, logoSize * 0.6);
      trailGrad.addColorStop(0, 'rgba(150, 200, 255, 0.05)');
      trailGrad.addColorStop(0.5, 'rgba(100, 160, 255, 0.02)');
      trailGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, logoSize * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // === Draw the "E" watermark shape ===
      const eLeft = cx - logoSize * 0.22;
      const eTop = cy - logoSize * 0.3;
      const eWidth = logoSize * 0.44;
      const eHeight = logoSize * 0.6;
      const barHeight = eHeight * 0.16;
      const gap = (eHeight - barHeight * 3) / 2;
      const stemWidth = eWidth * 0.2;
      const midBarWidth = eWidth * 0.7;
      const r = barHeight / 2;

      ctx.save();
      ctx.globalAlpha = 0.06 + Math.sin(time * 0.01) * 0.01; // subtle breathing

      // Metallic silver for the E bars
      ctx.fillStyle = 'rgba(180, 185, 210, 1)';

      // Top bar
      drawRoundedRect(ctx, eLeft, eTop, eWidth, barHeight, r);
      ctx.fill();

      // Middle bar
      drawRoundedRect(ctx, eLeft, eTop + barHeight + gap, midBarWidth, barHeight, r);
      ctx.fill();

      // Bottom bar
      drawRoundedRect(ctx, eLeft, eTop + (barHeight + gap) * 2, eWidth, barHeight, r);
      ctx.fill();

      // Vertical stem
      drawRoundedRect(ctx, eLeft, eTop, stemWidth, eHeight, r);
      ctx.fill();

      // Blue accent lines on inner edges
      ctx.strokeStyle = 'rgba(100, 170, 255, 0.5)';
      ctx.lineWidth = 1.5;

      // Inner edge of top bar
      ctx.beginPath();
      ctx.moveTo(eLeft + stemWidth, eTop + barHeight);
      ctx.lineTo(eLeft + stemWidth, eTop + barHeight + gap);
      ctx.stroke();

      // Inner edge of bottom bar
      ctx.beginPath();
      ctx.moveTo(eLeft + stemWidth, eTop + barHeight + gap + barHeight);
      ctx.lineTo(eLeft + stemWidth, eTop + (barHeight + gap) * 2);
      ctx.stroke();

      // "eesha" text
      ctx.fillStyle = 'rgba(200, 205, 225, 1)';
      ctx.font = `300 ${logoSize * 0.1}px 'Inter', 'Helvetica Neue', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('eesha', cx - logoSize * 0.02, eTop + eHeight + logoSize * 0.12);

      // "AI" text in blue
      ctx.fillStyle = 'rgba(100, 170, 255, 0.8)';
      ctx.font = `600 ${logoSize * 0.065}px 'Inter', 'Helvetica Neue', sans-serif`;
      ctx.fillText('AI', cx + logoSize * 0.18, eTop + eHeight + logoSize * 0.12);

      ctx.restore();
    }

    // x.ai-style smoky light from right side
    function drawLightSweep() {
      const pulsePhase = Math.sin(time * 0.005) * 0.3 + 0.7;

      // Main light cone from top-right
      const lightX = canvas.width * 0.85;
      const lightY = canvas.height * 0.15;
      const lightRadius = Math.min(canvas.width, canvas.height) * 0.6;

      const lightGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightRadius);
      lightGrad.addColorStop(0, `rgba(180, 210, 255, ${0.04 * pulsePhase})`);
      lightGrad.addColorStop(0.2, `rgba(140, 180, 255, ${0.03 * pulsePhase})`);
      lightGrad.addColorStop(0.5, `rgba(100, 150, 255, ${0.015 * pulsePhase})`);
      lightGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
      ctx.fill();

      // Secondary light from mid-right
      const light2X = canvas.width * 0.9;
      const light2Y = canvas.height * 0.55;
      const light2Radius = Math.min(canvas.width, canvas.height) * 0.4;

      const light2Grad = ctx.createRadialGradient(light2X, light2Y, 0, light2X, light2Y, light2Radius);
      light2Grad.addColorStop(0, `rgba(120, 170, 255, ${0.025 * pulsePhase})`);
      light2Grad.addColorStop(0.4, `rgba(80, 130, 255, ${0.012 * pulsePhase})`);
      light2Grad.addColorStop(1, 'transparent');

      ctx.fillStyle = light2Grad;
      ctx.beginPath();
      ctx.arc(light2X, light2Y, light2Radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function animate() {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Layer 1: x.ai-style light from right
      drawLightSweep();

      // Layer 2: Smoke particles drifting left
      drawSmoke();

      // Layer 3: Logo watermark with rotating glow
      drawLogoWatermark();

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
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
