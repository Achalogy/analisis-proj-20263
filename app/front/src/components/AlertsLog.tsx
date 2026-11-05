import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  BellRing,
  ArrowUpRight,
} from "lucide-react";
import type { AlertaItem } from "./types";

interface AlertsLogProps {
  alertas: AlertaItem[];
}

export const AlertsLog: React.FC<AlertsLogProps> = ({ alertas }) => {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing className="w-4 h-4 text-blue-600 shrink-0" />
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide truncate">
            Historial de Alertas en Tiempo Real
          </h3>
        </div>
        <span className="inline-flex items-center text-xs font-mono px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 whitespace-nowrap shrink-0">
          {alertas.length} {alertas.length === 1 ? "evento" : "eventos"}
        </span>
      </div>

      <div className="overflow-y-auto max-h-80 space-y-2.5 pr-1">
        {alertas.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No se han registrado alertas todavía. Cuando la demanda estimada
            supere las 150 solicitudes por minuto, aparecerán los avisos
            preventivos aquí.
          </div>
        ) : (
          alertas
            .slice()
            .reverse()
            .map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  item.tipo === "INICIO"
                    ? "bg-red-50/70 border-red-200 text-slate-800"
                    : "bg-emerald-50/70 border-emerald-200 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    {item.tipo === "INICIO" ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span
                      className={
                        item.tipo === "INICIO"
                          ? "text-red-700"
                          : "text-emerald-700"
                      }
                    >
                      {item.tipo === "INICIO"
                        ? "ALERTA DE DESPACHO PREVENTIVO"
                        : "NORMALIZACIÓN DE DEMANDA"}
                    </span>
                  </div>

                  <span className="font-mono text-slate-600 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap shrink-0">
                    Emitida: {item.hora_emision}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed mb-2 text-xs">
                  {item.mensaje}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-600">
                  <span className="flex items-center gap-0.5 text-blue-700 font-semibold whitespace-nowrap">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Hora objetivo: {item.hora_objetivo}
                  </span>
                  <span>·</span>
                  <span className="whitespace-nowrap">
                    Proyectado:{" "}
                    <strong className="text-slate-900">
                      {item.y_proy} sol/min
                    </strong>
                  </span>
                  {item.exceso !== undefined && item.exceso > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-red-700 font-semibold whitespace-nowrap">
                        Exceso: +{item.exceso} sol/min
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
