import React, { useState } from 'react';
import { Play, Square, RotateCcw, Settings, Sliders, Zap, CloudRain, Music } from 'lucide-react';
import type { SimulacionConfig, SmoothingMethod } from './types';

interface ControlPanelProps {
  config: SimulacionConfig;
  onChangeConfig: (newConfig: SimulacionConfig) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  isRunning: boolean;
  progreso: number;
  duracionReal: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  onStart,
  onStop,
  onReset,
  isRunning,
  progreso,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [incluirLluvia, setIncluirLluvia] = useState(true);
  const [incluirConcierto, setIncluirConcierto] = useState(true);

  // Quick duration presets
  const duraciones = [
    { label: 'Turbo (15s)', val: 15 },
    { label: 'Rápida (30s)', val: 30 },
    { label: '1 Minuto (60s) ★', val: 60 },
    { label: 'Pausada (120s)', val: 120 },
  ];

  const updateConfig = (patch: Partial<SimulacionConfig>) => {
    onChangeConfig({ ...config, ...patch });
  };

  const toggleEventos = (lluvia: boolean, concierto: boolean) => {
    setIncluirLluvia(lluvia);
    setIncluirConcierto(concierto);

    const evs = [];
    if (lluvia) {
      evs.push({
        descripcion: 'Aguacero en hora pico matutina',
        centro_h: 8.0,
        ancho_h: 0.6,
        amplitud: 70.0,
      });
    }
    if (concierto) {
      evs.push({
        descripcion: 'Salida de concierto (Movistar Arena)',
        centro_h: 19.0,
        ancho_h: 0.5,
        amplitud: 90.0,
      });
    }
    updateConfig({ eventos: evs });
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md">
      {/* Top Banner with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-400/90">
            Panel de Despacho & Control
          </span>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            Simulador de Demanda 24 Horas
          </h2>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2.5">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              <span>Iniciar Simulación</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Detener</span>
            </button>
          )}

          <button
            onClick={onReset}
            disabled={isRunning}
            title="Reiniciar a valores iniciales"
            className="flex items-center justify-center p-2.5 rounded-xl border border-slate-700 hover:border-amber-500/50 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showAdvanced
                ? 'border-amber-400/70 bg-amber-400/10 text-amber-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuración</span>
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="mt-4 mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Progreso del Día (00:00 → 24:00)</span>
          <span className="font-mono text-amber-400 font-bold">{progreso.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300 shadow-sm shadow-amber-400/50"
            style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
          />
        </div>
      </div>

      {/* Quick Duration & Method Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Duración Real */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Duración Real de las 24 horas:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {duraciones.map((d) => (
              <button
                key={d.val}
                disabled={isRunning}
                onClick={() => updateConfig({ duracion_real_segundos: d.val })}
                className={`py-1.5 px-2 text-xs rounded-lg font-medium border transition-all cursor-pointer ${
                  config.duracion_real_segundos === d.val
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Método de Filtrado */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Método de Suavizado de la Desviación:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(
              [
                { id: 'holt', label: 'Holt (Doble)' },
                { id: 'ses', label: 'SES (Simple)' },
                { id: 'wma', label: 'WMA (Móvil)' },
                { id: 'spline', label: 'Solo Spline' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                disabled={isRunning}
                onClick={() => updateConfig({ metodo: m.id as SmoothingMethod })}
                className={`py-1.5 px-2 text-xs rounded-lg font-medium border transition-all cursor-pointer ${
                  config.metodo === m.id
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Drawer */}
      {showAdvanced && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 text-xs">
          {/* Parámetros de Suavizado */}
          <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Parámetros del Filtro
            </span>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Alpha (α):</span>
                <span className="font-mono text-amber-300">{config.alpha}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                disabled={isRunning}
                value={config.alpha}
                onChange={(e) => updateConfig({ alpha: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
            {config.metodo === 'holt' && (
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Beta (β):</span>
                  <span className="font-mono text-amber-300">{config.beta}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.3"
                  step="0.01"
                  disabled={isRunning}
                  value={config.beta}
                  onChange={(e) => updateConfig({ beta: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}
            {config.metodo === 'wma' && (
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Ventana N:</span>
                  <span className="font-mono text-amber-300">{config.ventana_wma}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="5"
                  disabled={isRunning}
                  value={config.ventana_wma}
                  onChange={(e) => updateConfig({ ventana_wma: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Umbral y Alertas */}
          <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-red-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Umbral y Alertas
            </span>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Umbral de Despacho:</span>
                <span className="font-mono text-red-400 font-bold">{config.umbral} sol/m</span>
              </div>
              <input
                type="number"
                min="50"
                max="200"
                disabled={isRunning}
                value={config.umbral}
                onChange={(e) => updateConfig({ umbral: parseFloat(e.target.value) || 150 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Horizonte Predictivo:</span>
                <span className="font-mono text-amber-300">{config.horizonte_min} min</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                disabled={isRunning}
                value={config.horizonte_min}
                onChange={(e) => updateConfig({ horizonte_min: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Eventos Imprevistos */}
          <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              Eventos Simulados
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                disabled={isRunning}
                checked={incluirLluvia}
                onChange={(e) => toggleEventos(e.target.checked, incluirConcierto)}
                className="rounded accent-amber-400"
              />
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              <span>Aguacero (08:00, +70 sol)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                disabled={isRunning}
                checked={incluirConcierto}
                onChange={(e) => toggleEventos(incluirLluvia, e.target.checked)}
                className="rounded accent-amber-400"
              />
              <Music className="w-3.5 h-3.5 text-purple-400" />
              <span>Concierto (19:00, +90 sol)</span>
            </label>
          </div>

          {/* Ruido Estocástico */}
          <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-slate-300">Fluctuación en Tiempo Real</span>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Ruido Rápido (σ):</span>
                <span className="font-mono text-amber-300">{config.sigma_rapido} sol/m</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                disabled={isRunning}
                value={config.sigma_rapido}
                onChange={(e) => updateConfig({ sigma_rapido: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Semilla RNG:</span>
                <span className="font-mono text-amber-300">{config.semilla}</span>
              </div>
              <input
                type="number"
                disabled={isRunning}
                value={config.semilla}
                onChange={(e) => updateConfig({ semilla: parseInt(e.target.value) || 2026 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
