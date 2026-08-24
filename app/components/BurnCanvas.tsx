"use client";

import { useEffect, useRef } from "react";

interface BurnCanvasProps {
  burning: boolean;
  name: string;
  onFinished?: () => void;
}

export default function BurnCanvas({
  burning,
  name,
  onFinished,
}: BurnCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paper = new Image();
    paper.src = "/assets/scene-01/paper.png";

    paper.onload = () => {
      canvas.width = 1672;
      canvas.height = 941;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the original paper
      ctx.drawImage(
        paper,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Draw user's name
      ctx.save();

      ctx.font = '40px "Segoe Print", cursive';
      ctx.fillStyle = "rgba(55, 38, 24, 0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        name,
        canvas.width * 0.48,
        canvas.height * 0.68
      );

      ctx.restore();
    };
  }, [name]);

  return (
    <canvas
      ref={canvasRef}
      className="burn-canvas"
    />
  );
}