"use client";

import { useHeroContext } from "@/context/HeroContext";
import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function BrownianParticles() {
  const { isHeroShortened } = useHeroContext();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let lastWidth = typeof window !== "undefined" ? window.innerWidth : 0;

    const getParticleCount = () => {
      if (typeof window === "undefined") return 100;
      return window.innerWidth < 768 ? 40 : 100;
    };

    class Particle {
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      radius: number = 0;
      alpha: number = 0;
      targetAlpha: number = 0;
      wobbleX: number = 0;
      wobbleY: number = 0;
      wobbleSpeed: number = 0;

      constructor() {
        this.init();
      }

      init() {
        if (!canvas) return;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.radius = Math.random() * 1.2 + 0.4;
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.2 + 0.1;
        this.wobbleX = Math.random() * Math.PI * 2;
        this.wobbleY = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.008 + Math.random() * 0.015;
      }

      update() {
        if (!canvas) return;
        this.x += this.vx + Math.sin(this.wobbleX) * 0.08;
        this.y += this.vy + Math.cos(this.wobbleY) * 0.08;
        this.wobbleX += this.wobbleSpeed;
        this.wobbleY += this.wobbleSpeed;

        if (this.alpha < this.targetAlpha) {
          this.alpha += 0.005;
        }

        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = canvas.height + 10;
        if (this.y > canvas.height + 10) this.y = -10;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 245, 1)";
        ctx.fill();
        ctx.restore();
      }
    }

    function createParticles() {
      const count = getParticleCount();
      particles = Array.from({ length: count }, () => new Particle());
    }

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // On mobile, height changes when address bar hides/shows.
      // We only recreate particles if the width changes.
      if (width === lastWidth && particles.length > 0) {
        canvas.height = height;
        return;
      }

      lastWidth = width;
      canvas.width = width;
      canvas.height = height;
      createParticles();
    };

    window.addEventListener("resize", resize);
    resize();

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(ctx);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed top-0 left-0 w-full h-full z-0 transition-opacity duration-1000 pointer-events-none ${
        isHeroShortened || isAuthPage ? "opacity-80" : "opacity-0"
      }`}
    />
  );
}
