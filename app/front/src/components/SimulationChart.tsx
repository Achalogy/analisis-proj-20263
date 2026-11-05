import React, { useEffect, useRef, useState } from "react";
import type { EventoInyectado, PuntoPaso } from "./types";

interface SimulationChartProps {
  historial: PuntoPaso[];
  baseSpline: number[];
  eventosInyectados: EventoInyectado[];
  umbral: number;
  minutoActual: number;
  alertaActiva: boolean;
}

export const SimulationChart: React.FC<SimulationChartProps> = ({
  historial,
  baseSpline,
  eventosInyectados = [],
  umbral = 150,
  minutoActual,
  alertaActiva,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 400,
  });
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    containerWidth: number;
    punto: PuntoPaso;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setCanvasSize({
          width: Math.floor(rect.width),
          height: Math.max(380, Math.floor(rect.height || 400)),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvasSize;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const padding = { top: 42, right: 36, bottom: 54, left: 64 };
    const chartW = Math.max(100, width - padding.left - padding.right);
    const chartH = Math.max(100, height - padding.top - padding.bottom);

    let peakVal = Math.max(200, umbral + 40);
    for (let i = 0; i < historial.length; i++) {
      const p = historial[i];
      if (p.y_obs > peakVal) peakVal = p.y_obs;
      if (p.y_proy > peakVal) peakVal = p.y_proy;
    }
    for (let i = 0; i < baseSpline.length; i++) {
      if (baseSpline[i] > peakVal) peakVal = baseSpline[i];
    }
    const maxY = Math.ceil((peakVal + 20) / 50) * 50;
    const minY = 0;

    const MAX_MIN = 1439;
    const getX = (minuto: number) =>
      padding.left + (Math.min(MAX_MIN, Math.max(0, minuto)) / MAX_MIN) * chartW;
    const getY = (val: number) =>
      padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#fcfcfd";
    ctx.fillRect(padding.left, padding.top, chartW, chartH);

    if (historial.length > 0) {
      let alertStart: number | null = null;
      for (let i = 0; i < historial.length; i++) {
        const p = historial[i];
        if (p.alerta_activa && alertStart === null) {
          alertStart = p.minuto;
        } else if (!p.alerta_activa && alertStart !== null) {
          const x0 = getX(alertStart);
          const x1 = getX(p.minuto);
          ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
          ctx.fillRect(x0, padding.top, Math.max(2, x1 - x0), chartH);
          alertStart = null;
        }
      }
      if (alertStart !== null) {
        const x0 = getX(alertStart);
        const x1 = getX(historial[historial.length - 1].minuto);
        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.fillRect(x0, padding.top, Math.max(2, x1 - x0), chartH);
      }
    }

    ctx.fillStyle = "#475569";
    ctx.font = "600 11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Demanda (solicitudes / min)", padding.left, 18);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "500 11px ui-monospace, SFMono-Regular, monospace";

    for (let yVal = 0; yVal <= maxY; yVal += 50) {
      const yPos = getY(yVal);
      const isThreshold = Math.abs(yVal - umbral) < 1;

      ctx.beginPath();
      ctx.strokeStyle = isThreshold ? "rgba(220, 38, 38, 0.25)" : "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();

      ctx.fillStyle = isThreshold ? "#dc2626" : "#475569";
      ctx.font = isThreshold
        ? "700 11px ui-monospace, SFMono-Regular, monospace"
        : "500 11px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(`${yVal}`, padding.left - 10, yPos);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "500 11px ui-monospace, SFMono-Regular, monospace";

    for (let h = 0; h <= 24; h += 3) {
      const m = h === 24 ? MAX_MIN : h * 60;
      const xPos = getX(m);

      ctx.beginPath();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, padding.top + chartH);
      ctx.stroke();

      ctx.fillStyle = "#475569";
      const label = `${String(h).padStart(2, "0")}:00`;
      ctx.fillText(label, xPos, padding.top + chartH + 10);
    }

    ctx.fillStyle = "#64748b";
    ctx.font = "600 11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Hora del día (ciclo completo de 24 horas)",
      padding.left + chartW / 2,
      padding.top + chartH + 32
    );

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, chartW, chartH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartW, chartH);
    ctx.clip();

    if (baseSpline.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      baseSpline.forEach((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (historial.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      historial.forEach((p, idx) => {
        const x = getX(p.minuto);
        const y = getY(p.base_spline);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (historial.length > 0) {
      const gradient = ctx.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartH
      );
      gradient.addColorStop(0, "rgba(245, 158, 11, 0.28)");
      gradient.addColorStop(1, "rgba(250, 204, 21, 0.02)");

      ctx.beginPath();
      ctx.moveTo(getX(historial[0].minuto), getY(historial[0].y_obs));
      historial.forEach((p) => {
        ctx.lineTo(getX(p.minuto), getY(p.y_obs));
      });
      const lastP = historial[historial.length - 1];
      ctx.lineTo(getX(lastP.minuto), padding.top + chartH);
      ctx.lineTo(getX(historial[0].minuto), padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2.6;
      historial.forEach((p, idx) => {
        const x = getX(p.minuto);
        const y = getY(p.y_obs);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (historial.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2.1;
      let started = false;
      historial.forEach((p) => {
        if (p.minuto_objetivo <= MAX_MIN) {
          const x = getX(p.minuto_objetivo);
          const y = getY(p.y_proy);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }

    eventosInyectados.forEach((ev, idx) => {
      const xEv = getX(ev.minuto_inicio);
      ctx.beginPath();
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(xEv, padding.top);
      ctx.lineTo(xEv, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      const labelText = `${ev.descripcion} (${ev.hora_inicio})`;
      ctx.font = "700 10px system-ui, -apple-system, sans-serif";
      const textW = ctx.measureText(labelText).width;
      const pillW = textW + 12;
      const pillH = 20;
      const rowOffset = (idx % 3) * 24;
      const pillX = Math.min(
        padding.left + chartW - pillW - 6,
        Math.max(padding.left + 6, xEv - pillW / 2)
      );
      const pillY = padding.top + 8 + rowOffset;

      ctx.fillStyle = "#fef3c7";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#78350f";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, pillX + 6, pillY + pillH / 2);
    });

    const yUmbral = getY(umbral);
    ctx.beginPath();
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.moveTo(padding.left, yUmbral);
    ctx.lineTo(padding.left + chartW, yUmbral);
    ctx.stroke();
    ctx.setLineDash([]);

    const umbralText = `Umbral crítico: ${umbral} sol/min`;
    ctx.font = "700 11px system-ui, -apple-system, sans-serif";
    const uTextW = ctx.measureText(umbralText).width;
    const uBoxW = uTextW + 16;
    const uBoxH = 22;
    const uBoxX = padding.left + 10;
    const uBoxY = Math.max(padding.top + 6, yUmbral - uBoxH - 6);

    ctx.fillStyle = "#fef2f2";
    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(uBoxX, uBoxY, uBoxW, uBoxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#b91c1c";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(umbralText, uBoxX + 8, uBoxY + uBoxH / 2);

    if (historial.length > 0) {
      const lastP = historial[historial.length - 1];
      const curX = getX(minutoActual);
      const curY = getY(lastP.y_obs);

      ctx.beginPath();
      ctx.strokeStyle = alertaActiva ? "#dc2626" : "#d97706";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(curX, padding.top);
      ctx.lineTo(curX, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(curX, curY, 6, 0, Math.PI * 2);
      ctx.fillStyle = alertaActiva ? "#dc2626" : "#facc15";
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }, [
    historial,
    baseSpline,
    eventosInyectados,
    umbral,
    minutoActual,
    alertaActiva,
    canvasSize,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || historial.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const paddingLeft = 64;
    const paddingRight = 36;
    const chartW = rect.width - paddingLeft - paddingRight;

    const relX = mouseX - paddingLeft;
    if (relX < 0 || relX > chartW) {
      setHoverData(null);
      return;
    }

    const hoveredMin = Math.round((relX / chartW) * 1439);
    const closestP = historial.reduce((prev, curr) =>
      Math.abs(curr.minuto - hoveredMin) < Math.abs(prev.minuto - hoveredMin)
        ? curr
        : prev
    );

    if (closestP && Math.abs(closestP.minuto - hoveredMin) <= 30) {
      setHoverData({
        x: mouseX,
        y: e.clientY - rect.top,
        containerWidth: rect.width,
        punto: closestP,
      });
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => setHoverData(null);

  return (
    <div className="relative w-full rounded-2xl bg-white border border-amber-300/70 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-3 w-3 rounded-full shrink-0 border border-slate-900/20 ${
              alertaActiva ? "bg-red-600 animate-ping" : "bg-amber-400"
            }`}
          />
          <h3 className="font-bold text-slate-900 text-base">
            Evolución de la Demanda (00:00 a 24:00) y Predicción a 30 Minutos
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-4 h-1.5 rounded bg-amber-500 border border-amber-700/30" />
            <span>Demanda real observada</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-slate-500" />
            <span>Curva base esperada</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-4 h-1 rounded bg-blue-600" />
            <span>Predicción (+30 min)</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-red-600" />
            <span className="text-red-700 font-semibold">
              Umbral crítico ({umbral} sol/min)
            </span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full h-96 sm:h-[420px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair w-full h-full block rounded-xl"
        />

        {hoverData && (
          <div
            className="pointer-events-none absolute z-30 transform -translate-y-full mb-3 rounded-xl bg-white/95 border border-amber-400 p-3 shadow-lg text-xs backdrop-blur-sm min-w-52"
            style={{
              left: `${Math.min(
                Math.max(110, hoverData.x),
                hoverData.containerWidth - 110
              )}px`,
              top: `${Math.max(16, hoverData.y - 12)}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-mono font-bold text-slate-900 border-b border-amber-200 pb-1.5 mb-2 flex justify-between items-center">
              <span>Hora: {hoverData.punto.hora}</span>
              <span className="text-slate-500 text-[11px]">
                Minuto {hoverData.punto.minuto}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span>Demanda actual:</span>
                <span className="font-bold text-amber-700">
                  {hoverData.punto.y_obs} sol/min
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Demanda habitual:</span>
                <span className="font-mono font-medium">
                  {hoverData.punto.base_spline} sol/min
                </span>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>Estimada a las {hoverData.punto.hora_objetivo}:</span>
                <span className="font-bold">
                  {hoverData.punto.y_proy} sol/min
                </span>
              </div>
              {hoverData.punto.alerta_activa && (
                <div className="mt-1.5 pt-1.5 border-t border-red-200 text-red-700 font-semibold">
                  Alerta activa (supera {umbral} sol/min)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
