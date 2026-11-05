import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  Gauge,
  CloudRain,
  Music,
  Trophy,
  AlertOctagon,
} from "lucide-react";
import type { EstadoCiclo, EventoInyectado } from "./types";

interface ControlPanelProps {
  duracionReal: number;
  onChangeVelocidad: (nuevaDuracionSegundos: number) => void;
  onStart: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onInjectEvent: (
    descripcion: string,
    amplitud: number,
    duracionMinutos: number
  ) => Promise<void>;
  estado: EstadoCiclo;
  progreso: number;
  horaActual: string;
  eventosInyectados: EventoInyectado[];
}

const PRESETS_EVENTOS = [
  {
    id: "lluvia",
    nombre: "Lluvia fuerte",
    amplitud: 75,
    duracion: 60,
    icon: CloudRain,
  },
  {
    id: "concierto",
    nombre: "Salida de concierto",
    amplitud: 95,
    duracion: 60,
    icon: Music,
  },
  {
    id: "partido",
    nombre: "Partido de fútbol",
    amplitud: 85,
    duracion: 75,
    icon: Trophy,
  },
  {
    id: "cierre",
    nombre: "Cierre vial inesperado",
    amplitud: 55,
    duracion: 45,
    icon: AlertOctagon,
  },
];

const VELOCIDADES = [
  { label: "Muy rápida (15 s)", segundos: 15 },
  { label: "Rápida (30 s)", segundos: 30 },
  { label: "Normal (60 s)", segundos: 60 },
  { label: "Detallada (120 s)", segundos: 120 },
];

const DURACIONES_EVENTO = [30, 45, 60, 90, 120];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  duracionReal,
  onChangeVelocidad,
  onStart,
  onPauseToggle,
  onRestart,
  onInjectEvent,
  estado,
  progreso,
  horaActual,
  eventosInyectados,
}) => {
  const [nombreEvento, setNombreEvento] = useState<string>("Lluvia fuerte");
  const [amplitudEvento, setAmplitudEvento] = useState<number>(75);
  const [duracionEvento, setDuracionEvento] = useState<number>(60);
  const [enviandoEvento, setEnviandoEvento] = useState<boolean>(false);

  const enCursoOPausada = estado === "en_progreso" || estado === "pausada";
  const estaPausada = estado === "pausada";

  const seleccionarPreset = (preset: (typeof PRESETS_EVENTOS)[number]) => {
    setNombreEvento(preset.nombre);
    setAmplitudEvento(preset.amplitud);
    setDuracionEvento(preset.duracion);
  };

  const handleSendEvent = async () => {
    if (!enCursoOPausada || enviandoEvento) return;
    setEnviandoEvento(true);
    try {
      await onInjectEvent(
        nombreEvento.trim() || "Evento externo",
        amplitudEvento,
        duracionEvento
      );
    } finally {
      setEnviandoEvento(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 rounded-2xl bg-white border border-amber-300/80 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700">
                Paso 1 · Control General
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Simulación del Día (24 Horas)
              </h2>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                estado === "en_progreso"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : estado === "pausada"
                  ? "bg-slate-900 text-amber-300 border border-slate-800"
                  : estado === "completada"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {estado === "en_progreso"
                ? "En ejecución"
                : estado === "pausada"
                ? "En pausa"
                : estado === "completada"
                ? "Completada"
                : "Lista para iniciar"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            {!enCursoOPausada ? (
              <button
                onClick={onStart}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 border border-amber-500/40 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {estado === "completada"
                    ? "Volver a Simular"
                    : "Iniciar Simulación"}
                </span>
              </button>
            ) : (
              <button
                onClick={onPauseToggle}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm active:scale-[0.99] transition-all cursor-pointer ${
                  estaPausada
                    ? "bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 border border-amber-500/40"
                    : "bg-slate-900 hover:bg-slate-800 text-amber-400"
                }`}
              >
                {estaPausada ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Reanudar Simulación</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pausar</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onRestart}
              disabled={estado === "iniciada" && progreso === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm border border-slate-300 bg-white hover:bg-amber-50 hover:border-amber-400 text-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reiniciar</span>
            </button>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1.5">
              <span>
                Reloj actual:{" "}
                <strong className="font-mono text-slate-900">{horaActual}</strong>{" "}
                (00:00 a 24:00)
              </span>
              <span className="font-mono font-bold text-amber-700">
                {progreso.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
            <Gauge className="w-3.5 h-3.5 text-amber-600" />
            <span>Velocidad de la simulación (duración de las 24 horas):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VELOCIDADES.map((v) => (
              <button
                key={v.segundos}
                onClick={() => onChangeVelocidad(v.segundos)}
                className={`py-2 px-2.5 text-xs rounded-lg font-medium border transition-all cursor-pointer ${
                  duracionReal === v.segundos
                    ? "border-amber-500 bg-amber-400/25 text-slate-950 font-bold shadow-2xs"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 rounded-2xl bg-white border border-amber-300/80 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700">
                Paso 2 · Eventos Externos en Tiempo Real
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Configurar y Enviar un Evento a la Ciudad
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Aumenta la demanda de taxis en el momento actual ({horaActual})
            </span>
          </div>

          <div className="mt-3">
            <span className="block text-xs font-semibold text-slate-600 mb-2">
              Tipo de evento rápido (o personalízalo abajo):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS_EVENTOS.map((preset) => {
                const Icon = preset.icon;
                const activo = nombreEvento === preset.nombre;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => seleccionarPreset(preset)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                      activo
                        ? "border-amber-500 bg-amber-400/25 text-slate-950 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{preset.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del evento:
              </label>
              <input
                type="text"
                value={nombreEvento}
                onChange={(e) => setNombreEvento(e.target.value)}
                placeholder="Ej. Lluvia fuerte"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">
                  Demanda extra:
                </span>
                <span className="font-mono font-bold text-amber-700">
                  +{amplitudEvento} sol/min
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="140"
                step="5"
                value={amplitudEvento}
                onChange={(e) => setAmplitudEvento(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer mt-1"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Moderada (+25)</span>
                <span>Alta (+80)</span>
                <span>Masiva (+140)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duración estimada:
              </label>
              <div className="grid grid-cols-5 gap-1">
                {DURACIONES_EVENTO.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuracionEvento(min)}
                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
                      duracionEvento === min
                        ? "border-amber-500 bg-amber-400/25 text-slate-950 font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-amber-50/40"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            {eventosInyectados.length === 0 ? (
              <span>
                {enCursoOPausada
                  ? "Pulsa el botón para lanzar este evento ahora mismo en la gráfica."
                  : "Inicia la simulación para poder enviar eventos en vivo."}
              </span>
            ) : (
              <>
                <span className="font-semibold text-slate-700 mr-1">
                  Enviados hoy:
                </span>
                {eventosInyectados.slice(-3).map((ev) => (
                  <span
                    key={ev.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-semibold whitespace-nowrap"
                  >
                    {ev.descripcion} ({ev.hora_inicio}, +{ev.amplitud})
                  </span>
                ))}
              </>
            )}
          </div>

          <button
            type="button"
            disabled={!enCursoOPausada || enviandoEvento}
            onClick={handleSendEvent}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-amber-400 shadow-sm active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Enviar evento ahora ({horaActual})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
