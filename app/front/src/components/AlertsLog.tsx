import React from 'react';
import { AlertCircle, CheckCircle2, BellRing, ArrowUpRight } from 'lucide-react';
import type { AlertaItem } from './types';

interface AlertsLogProps {
  alertas: AlertaItem[];
}

export const AlertsLog: React.FC<AlertsLogProps> = ({ alertas }) => {
  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">
            Bitácora de Alertas en Tiempo Real
          </h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-bold border border-amber-400/20">
          {alertas.length} eventos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
        {alertas.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No se han registrado alertas en este ciclo. Inicia la simulación para monitorear el umbral.
          </div>
        ) : (
          alertas
            .slice()
            .reverse()
            .map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  item.tipo === 'INICIO'
                    ? 'bg-red-950/40 border-red-500/30 text-red-200'
                    : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    {item.tipo === 'INICIO' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className={item.tipo === 'INICIO' ? 'text-red-400' : 'text-emerald-400'}>
                      {item.tipo === 'INICIO' ? 'ALERTA DE DESPACHO' : 'FIN DE ALERTA'}
                    </span>
                  </div>

                  <span className="font-mono text-slate-400 text-[11px] bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                    Emitida: {item.hora_emision}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed mb-1.5 text-[11px] font-sans">
                  {item.mensaje}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                  <span className="flex items-center gap-0.5 text-amber-400">
                    <ArrowUpRight className="w-3 h-3" />
                    Objetivo: {item.hora_objetivo}
                  </span>
                  <span>•</span>
                  <span>Proyectado: <strong className="text-slate-200">{item.y_proy} sol/min</strong></span>
                  {item.exceso !== undefined && item.exceso > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-red-400 font-semibold">
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
