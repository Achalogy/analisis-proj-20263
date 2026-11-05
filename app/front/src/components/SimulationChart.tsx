import React, { useEffect, useRef, useState } from "react";
import type { PuntoPaso } from "./types";

interface SimulationChartProps {
  historial: PuntoPaso[];
  baseSpline: number[]; // 1440 points if available or extracted
  umbral: number;
  minutoActual: number;
  alertaActiva: boolean;
}

export const SimulationChart: React.FC<SimulationChartProps> = ({
  historial,
  baseSpline,
  umbral = 150,
  minutoActual,
  alertaActiva,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    punto: PuntoPaso;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = Math.max(340, container.clientHeight || 380);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Layout margins
    const padding = { top: 28, right: 30, bottom: 40, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Y Range
    const maxY = 220;
    const minY = 0;

    const getX = (minuto: number) => padding.left + (minuto / 1440) * chartW;
    const getY = (val: number) =>
      padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;

    // Background
    ctx.fillStyle = "#0f1422";
    ctx.fillRect(0, 0, width, height);

    // Grid lines (Y)
    const ySteps = [0, 50, 100, 150, 200];
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "11px ui-monospace, SFMono-Regular, monospace";

    ySteps.forEach((yVal) => {
      const yPos = getY(yVal);
      ctx.beginPath();
      ctx.strokeStyle =
        yVal === umbral
          ? "rgba(239, 68, 68, 0.35)"
          : "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = yVal === umbral ? 1.5 : 1;
      if (yVal === umbral) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = yVal === umbral ? "#ef4444" : "#64748b";
      ctx.fillText(`${yVal}`, padding.left - 8, yPos);
    });

    // Grid lines (X - Hours 00:00 to 24:00 every 3h)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let h = 0; h <= 24; h += 3) {
      const m = h * 60;
      const xPos = getX(m);

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, padding.top + chartH);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      const label = `${String(h).padStart(2, "0")}:00`;
      ctx.fillText(label, xPos, padding.top + chartH + 8);
    }

    // Shaded Alert Areas in history
    if (historial.length > 0) {
      let alertStart: number | null = null;
      for (let i = 0; i < historial.length; i++) {
        const p = historial[i];
        if (p.alerta_activa && alertStart === null) {
          alertStart = p.minuto;
        } else if (!p.alerta_activa && alertStart !== null) {
          const x0 = getX(alertStart);
          const x1 = getX(p.minuto);
          ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
          ctx.fillRect(x0, padding.top, x1 - x0, chartH);
          alertStart = null;
        }
      }
      if (alertStart !== null) {
        const x0 = getX(alertStart);
        const x1 = getX(historial[historial.length - 1].minuto);
        ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
        ctx.fillRect(x0, padding.top, Math.max(2, x1 - x0), chartH);
      }
    }

    // Critical Threshold Line (Red)
    const yUmbral = getY(umbral);
    ctx.beginPath();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.moveTo(padding.left, yUmbral);
    ctx.lineTo(padding.left + chartW, yUmbral);
    ctx.stroke();
    ctx.setLineDash([]);

    // Umbral Tag
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      `UMBRAL CRÍTICO: ${umbral} sol/min`,
      padding.left + chartW - 6,
      yUmbral - 8,
    );

    // 1. Draw Base Spline Curve
    // Either from full baseSpline array or from historial.base_spline
    const splinePoints =
      baseSpline.length > 0 ? baseSpline : historial.map((p) => p.base_spline);
    if (splinePoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)"; // Cyan/Sky blue dashed
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      splinePoints.forEach((val, m) => {
        const x = getX(m);
        const y = getY(val);
        if (m === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Draw 30-min Projected Line (Orange)
    if (historial.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#fb923c"; // Vibrant Orange
      ctx.lineWidth = 2.2;
      historial.forEach((p, idx) => {
        // Plot projected demand at its target minute
        const targetMin = Math.min(1440, p.minuto_objetivo);
        const x = getX(targetMin);
        const y = getY(p.y_proy);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // 3. Draw Observed Demand (Taxi Yellow Solid Line with Area Glow)
    if (historial.length > 0) {
      // Shaded area under curve
      const gradient = ctx.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartH,
      );
      gradient.addColorStop(0, "rgba(245, 158, 11, 0.35)"); // Taxi Amber
      gradient.addColorStop(1, "rgba(245, 158, 11, 0.01)");

      ctx.beginPath();
      ctx.moveTo(getX(0), getY(historial[0].y_obs));
      historial.forEach((p) => {
        ctx.lineTo(getX(p.minuto), getY(p.y_obs));
      });
      const lastP = historial[historial.length - 1];
      ctx.lineTo(getX(lastP.minuto), padding.top + chartH);
      ctx.lineTo(getX(0), padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.strokeStyle = "#f59e0b"; // Taxi Yellow / Amber 500
      ctx.lineWidth = 2.4;
      historial.forEach((p, idx) => {
        const x = getX(p.minuto);
        const y = getY(p.y_obs);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Current playhead position
      const curX = getX(minutoActual);
      const curY = getY(lastP.y_obs);

      // Playhead vertical line
      ctx.beginPath();
      ctx.strokeStyle = alertaActiva ? "#ef4444" : "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(curX, padding.top);
      ctx.lineTo(curX, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Playhead beacon point
      ctx.beginPath();
      ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = alertaActiva ? "#ef4444" : "#facc15";
      ctx.shadowColor = alertaActiva ? "#ef4444" : "#f59e0b";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [historial, baseSpline, umbral, minutoActual, alertaActiva]);

  // Handle canvas mouse move for interactive inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || historial.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const paddingLeft = 55;
    const paddingRight = 30;
    const chartW = rect.width - paddingLeft - paddingRight;

    const relX = mouseX - paddingLeft;
    if (relX < 0 || relX > chartW) {
      setHoverData(null);
      return;
    }

    const hoveredMin = Math.round((relX / chartW) * 1440);
    const closestP = historial.reduce((prev, curr) =>
      Math.abs(curr.minuto - hoveredMin) < Math.abs(prev.minuto - hoveredMin)
        ? curr
        : prev,
    );

    if (closestP && Math.abs(closestP.minuto - hoveredMin) <= 30) {
      setHoverData({
        x: mouseX,
        y: e.clientY - rect.top,
        punto: closestP,
      });
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => setHoverData(null);

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/90 border border-amber-500/20 p-4 shadow-xl backdrop-blur-md">
      {/* Chart Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
            Curva de Demanda 24 Horas & Proyección Predictiva
          </h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-1 rounded bg-amber-400" />
            <span className="text-slate-300">Observada (y_t)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 border-t border-dashed border-sky-400" />
            <span className="text-slate-300">Base Spline (S(t))</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-1 rounded bg-orange-400" />
            <span className="text-slate-300">
              {"Proyección a 30m (ŷ[t+30])"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 border-t border-dashed border-red-500" />
            <span className="text-red-400 font-semibold">
              Umbral (150 sol/min)
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full h-80 sm:h-96">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair w-full h-full block rounded-xl"
        />

        {/* Hover Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-3 rounded-lg bg-slate-950/95 border border-amber-500/40 p-2.5 shadow-2xl text-xs backdrop-blur-sm min-w-44"
            style={{
              left: `${hoverData.x}px`,
              top: `${Math.max(10, hoverData.y - 12)}px`,
            }}
          >
            <div className="font-mono font-bold text-amber-400 border-b border-slate-800 pb-1 mb-1.5 flex justify-between">
              <span>Hora: {hoverData.punto.hora}</span>
              <span className="text-slate-400 text-[10px]">
                min {hoverData.punto.minuto}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Demanda Obs:</span>
                <span className="font-bold text-amber-300">
                  {hoverData.punto.y_obs} sol/m
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Base Spline:</span>
                <span className="font-mono">
                  {hoverData.punto.base_spline} sol/m
                </span>
              </div>
              <div className="flex justify-between text-orange-300">
                <span>Proy @ {hoverData.punto.hora_objetivo}:</span>
                <span className="font-bold">
                  {hoverData.punto.y_proy} sol/m
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Residuo suav:</span>
                <span className="font-mono">
                  {hoverData.punto.residuo_suav > 0
                    ? `+${hoverData.punto.residuo_suav}`
                    : hoverData.punto.residuo_suav}
                </span>
              </div>
              {hoverData.punto.alerta_activa && (
                <div className="mt-1.5 pt-1 border-t border-red-500/30 text-red-400 font-semibold flex items-center gap-1">
                  <span>🚨</span> Alerta Activa (&gt; 150 sol/min)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
