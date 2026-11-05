import React from "react";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Target,
} from "lucide-react";
import type { PuntoPaso } from "./types";

interface KpiCardsProps {
  ultimoPaso: PuntoPaso | null;
  enAlerta: boolean;
  totalAlertas: number;
  umbral: number;
  duracionSegundos: number;
  tiempoTranscurrido: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  ultimoPaso,
  enAlerta,
  totalAlertas,
  umbral,
  tiempoTranscurrido,
}) => {
  const horaActual = ultimoPaso?.hora || "00:00";
  const yObs = ultimoPaso?.y_obs ?? 0;
  const baseSpline = ultimoPaso?.base_spline ?? 0;
  const yProy = ultimoPaso?.y_proy ?? 0;
  const horaProy = ultimoPaso?.hora_objetivo || "00:30";
  const residuo = ultimoPaso?.residuo ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Reloj de Simulación */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Hora Bogotá
          </span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="font-mono text-2xl font-black text-amber-300 tracking-tight">
            {horaActual}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Real: {tiempoTranscurrido.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* 2. Demanda Observada */}
      <div className="rounded-xl bg-slate-900/90 border border-amber-500/20 p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Demanda y(t)
          </span>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="font-mono text-2xl font-black text-white tracking-tight">
            {yObs.toFixed(1)}{" "}
            <span className="text-xs font-normal text-amber-400/80">sol/m</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Spline base:{" "}
            <span className="font-mono text-slate-300">
              {baseSpline.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Proyección a 30m */}
      <div
        className={`rounded-xl border p-3.5 shadow-md flex flex-col justify-between transition-all ${
          yProy >= umbral
            ? "bg-red-950/40 border-red-500/40"
            : "bg-slate-900/90 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Proy. a 30 min
          </span>
          <Target
            className={`w-4 h-4 ${yProy >= umbral ? "text-red-400" : "text-orange-400"}`}
          />
        </div>
        <div>
          <div
            className={`font-mono text-2xl font-black tracking-tight ${
              yProy >= umbral ? "text-red-300" : "text-orange-300"
            }`}
          >
            {yProy.toFixed(1)}{" "}
            <span className="text-xs font-normal opacity-80">sol/m</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Para las{" "}
            <span className="font-mono text-slate-200">{horaProy}</span>
          </div>
        </div>
      </div>

      {/* 4. Desviación Instantánea */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Residuo r(t)
          </span>
          <TrendingUp className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div
            className={`font-mono text-2xl font-black tracking-tight ${
              residuo > 0 ? "text-amber-400" : "text-slate-300"
            }`}
          >
            {residuo > 0 ? `+${residuo.toFixed(1)}` : residuo.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Desvío de la spline
          </div>
        </div>
      </div>

      {/* 5. Estado de Despacho (Alerta) */}
      <div
        className={`rounded-xl border p-3.5 shadow-md flex flex-col justify-between transition-all ${
          enAlerta
            ? "bg-red-950/60 border-red-500/80 animate-pulse"
            : "bg-slate-900/90 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Alerta Despacho
          </span>
          {enAlerta ? (
            <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <div>
          <div
            className={`text-sm font-black uppercase tracking-wide ${
              enAlerta ? "text-red-300" : "text-emerald-400"
            }`}
          >
            {enAlerta ? "🚨 REASIGNAR FLOTA" : "OPERACIÓN NORMAL"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {enAlerta ? "Proyección > 150 sol/m" : "Demanda bajo umbral"}
          </div>
        </div>
      </div>

      {/* 6. Episodios de Alerta Emitidos */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Alertas Hoy
          </span>
          <span className="flex h-2 w-2 rounded-full bg-amber-400" />
        </div>
        <div>
          <div className="font-mono text-2xl font-black text-amber-400 tracking-tight">
            {totalAlertas}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Eventos críticos emitidos
          </div>
        </div>
      </div>
    </div>
  );
};
