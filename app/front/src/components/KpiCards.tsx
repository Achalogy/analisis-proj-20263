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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Reloj de Simulación */}
      <div className="rounded-xl bg-white border border-amber-300/70 p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Hora Ciudad
          </span>
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
        </div>
        <div>
          <div className="font-mono text-2xl font-black text-slate-900 tracking-tight">
            {horaActual}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Tiempo real: {tiempoTranscurrido.toFixed(1)} s
          </div>
        </div>
      </div>

      {/* 2. Demanda Observada */}
      <div className="rounded-xl bg-amber-50/50 border border-amber-300/80 p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-600 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Demanda Actual
          </span>
          <Activity className="w-4 h-4 text-amber-600 shrink-0" />
        </div>
        <div>
          <div className="font-mono text-2xl font-black text-amber-700 tracking-tight">
            {yObs.toFixed(1)}{" "}
            <span className="text-xs font-medium text-slate-500">sol/min</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Habitual:{" "}
            <span className="font-mono text-slate-700 font-semibold">
              {baseSpline.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Proyección a 30m */}
      <div
        className={`rounded-xl border p-3.5 shadow-2xs flex flex-col justify-between transition-all ${
          yProy >= umbral
            ? "bg-red-50 border-red-300"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            En 30 Minutos
          </span>
          <Target
            className={`w-4 h-4 shrink-0 ${
              yProy >= umbral ? "text-red-600" : "text-blue-600"
            }`}
          />
        </div>
        <div>
          <div
            className={`font-mono text-2xl font-black tracking-tight ${
              yProy >= umbral ? "text-red-700" : "text-blue-700"
            }`}
          >
            {yProy.toFixed(1)}{" "}
            <span className="text-xs font-medium opacity-80">sol/min</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Estimada a las{" "}
            <span className="font-mono text-slate-800 font-semibold">
              {horaProy}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Diferencia frente a lo habitual */}
      <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Variación
          </span>
          <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
        </div>
        <div>
          <div
            className={`font-mono text-2xl font-black tracking-tight ${
              residuo > 5 ? "text-amber-700" : "text-slate-800"
            }`}
          >
            {residuo > 0 ? `+${residuo.toFixed(1)}` : residuo.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Frente a curva base
          </div>
        </div>
      </div>

      {/* 5. Estado de Despacho (Alerta) */}
      <div
        className={`rounded-xl border p-3.5 shadow-2xs flex flex-col justify-between transition-all ${
          enAlerta ? "bg-red-50 border-red-400" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Estado Flota
          </span>
          {enAlerta ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
        </div>
        <div>
          <div
            className={`text-sm font-black uppercase tracking-wide ${
              enAlerta ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {enAlerta ? "REASIGNAR FLOTA" : "OPERACIÓN NORMAL"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {enAlerta ? `Supera ${umbral} sol/min` : "Demanda bajo umbral"}
          </div>
        </div>
      </div>

      {/* 6. Episodios de Alerta Emitidos */}
      <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Avisos del Día
          </span>
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 border border-amber-600/30 shrink-0" />
        </div>
        <div>
          <div className="font-mono text-2xl font-black text-slate-900 tracking-tight">
            {totalAlertas}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Alertas registradas
          </div>
        </div>
      </div>
    </div>
  );
};
