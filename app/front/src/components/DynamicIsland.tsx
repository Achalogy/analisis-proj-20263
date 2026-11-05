import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
  Play,
  Pause,
  Car,
  X,
} from "lucide-react";

export type IslandNotificationType =
  | "alerta_inicio"
  | "alerta_fin"
  | "evento"
  | "info";

export interface IslandNotification {
  id: string;
  tipo: IslandNotificationType;
  titulo: string;
  subtitulo: string;
  etiqueta?: string;
}

// Web Audio API synthesizer for Apple-like Dynamic Island chimes
class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    startOffset: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.14
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public play(tipo: IslandNotificationType, enabled: boolean) {
    if (!enabled) return;
    try {
      if (tipo === "alerta_inicio") {
        // Urgent two-pulse harmonic dispatch chime
        this.playTone(587.33, 0.0, 0.18, "triangle", 0.18); // D5
        this.playTone(880.0, 0.12, 0.22, "triangle", 0.2); // A5
        this.playTone(1174.66, 0.26, 0.35, "sine", 0.18); // D6
      } else if (tipo === "alerta_fin") {
        // Pleasant ascending resolution chord
        this.playTone(523.25, 0.0, 0.18, "sine", 0.12); // C5
        this.playTone(659.25, 0.1, 0.2, "sine", 0.12); // E5
        this.playTone(783.99, 0.2, 0.32, "sine", 0.14); // G5
      } else if (tipo === "evento") {
        // Crisp Dynamic Island pop + taxi confirmation tone
        this.playTone(440.0, 0.0, 0.12, "sine", 0.14); // A4
        this.playTone(659.25, 0.08, 0.24, "triangle", 0.16); // E5
      } else {
        // Subtle soft tap chime
        this.playTone(587.33, 0.0, 0.14, "sine", 0.09);
      }
    } catch (_) {}
  }
}

export const soundEngine = new SoundEngine();

interface DynamicIslandProps {
  notification: IslandNotification | null;
  onDismiss: () => void;
  horaActual: string;
  enAlerta: boolean;
  activo: boolean;
  pausado: boolean;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  notification,
  onDismiss,
  horaActual,
  enAlerta,
  activo,
  pausado,
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (notification) {
      setExpanded(true);
      const timer = setTimeout(() => {
        setExpanded(false);
        setTimeout(onDismiss, 250);
      }, 4200);
      return () => clearTimeout(timer);
    } else {
      setExpanded(false);
    }
  }, [notification, onDismiss]);

  // If neither active simulation nor notification, keep a minimal sleek pill
  const showExpanded = expanded && notification !== null;

  return (
    <div className="fixed top-3.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full max-w-xl px-4">
      <div
        onClick={() => {
          if (showExpanded) {
            setExpanded(false);
            setTimeout(onDismiss, 200);
          }
        }}
        className={`pointer-events-auto bg-slate-950 text-white border border-white/15 shadow-2xl shadow-slate-950/35 backdrop-blur-xl transition-all duration-300 ease-out overflow-hidden cursor-pointer ${
          showExpanded
            ? "w-full max-w-lg rounded-[28px] px-4 py-3.5 scale-100"
            : "w-auto rounded-full px-3.5 py-1.5 scale-95 hover:scale-100"
        }`}
      >
        {showExpanded && notification ? (
          <div className="flex items-center justify-between gap-3.5">
            {/* Left Icon Badge */}
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-2xl shrink-0 ${
                notification.tipo === "alerta_inicio"
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : notification.tipo === "alerta_fin"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : notification.tipo === "evento"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
              }`}
            >
              {notification.tipo === "alerta_inicio" ? (
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              ) : notification.tipo === "alerta_fin" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : notification.tipo === "evento" ? (
                <Zap className="w-5 h-5 fill-current" />
              ) : (
                <Car className="w-5 h-5" />
              )}
            </div>

            {/* Center Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
                    notification.tipo === "alerta_inicio"
                      ? "bg-red-500/25 text-red-300"
                      : notification.tipo === "alerta_fin"
                      ? "bg-emerald-500/25 text-emerald-300"
                      : "bg-amber-400/20 text-amber-300"
                  }`}
                >
                  {notification.etiqueta || horaActual}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {notification.titulo}
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-snug">
                {notification.subtitulo}
              </p>
            </div>

            {/* Right Close / Waveform */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
                setTimeout(onDismiss, 200);
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Compact Dynamic Island Pill */
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  enAlerta
                    ? "bg-red-500 animate-ping"
                    : activo
                    ? "bg-amber-400 animate-pulse"
                    : pausado
                    ? "bg-amber-500"
                    : "bg-slate-500"
                }`}
              />
              <span className="font-bold text-amber-400 tracking-tight">
                AutoMove
              </span>
            </span>

            <span className="h-3 w-px bg-white/15" />

            <span className="font-mono font-semibold text-white">
              {horaActual}
            </span>

            {enAlerta ? (
              <span className="px-2 py-0.5 rounded-full bg-red-500/25 text-red-300 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                Alerta Activa
              </span>
            ) : activo ? (
              <span className="flex items-center gap-1 text-[11px] text-slate-300 whitespace-nowrap">
                <Play className="w-3 h-3 text-amber-400 fill-current" />
                En vivo
              </span>
            ) : pausado ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-300 whitespace-nowrap">
                <Pause className="w-3 h-3 fill-current" />
                Pausado
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                Listo
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
