import React, { useState, useEffect, useRef, useCallback } from "react";
import { SimulationChart } from "./SimulationChart";
import { ControlPanel } from "./ControlPanel";
import { KpiCards } from "./KpiCards";
import { AlertsLog } from "./AlertsLog";
import {
  DynamicIsland,
  soundEngine,
  type IslandNotification,
} from "./DynamicIsland";
import type {
  SimulacionConfig,
  PuntoPaso,
  AlertaItem,
  EstadoCiclo,
  EventoInyectado,
} from "./types";
import { Car, Radio, Shield, Volume2, VolumeX } from "lucide-react";

const DEFAULT_CONFIG: SimulacionConfig = {
  duracion_real_segundos: 60.0,
  metodo: "holt",
  alpha: 0.2,
  beta: 0.05,
  phi: 0.9,
  ventana_wma: 15,
  horizonte_min: 30,
  umbral: 150.0,
  histeresis: 8.0,
  confirmacion: 3,
  semilla: 2026,
  sigma_rapido: 4.0,
  sigma_lento: 1.2,
  phi_ar1: 0.985,
  eventos: [],
};

const API_BASE = "http://localhost:8000";
const WS_URL = "ws://localhost:8000/ws/simulacion";

export const Dashboard: React.FC = () => {
  const [config, setConfig] = useState<SimulacionConfig>(DEFAULT_CONFIG);
  const [baseSpline, setBaseSpline] = useState<number[]>([]);
  const [historial, setHistorial] = useState<PuntoPaso[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [eventosInyectados, setEventosInyectados] = useState<EventoInyectado[]>(
    []
  );
  const [ultimoPaso, setUltimoPaso] = useState<PuntoPaso | null>(null);
  const [estado, setEstado] = useState<EstadoCiclo>("iniciada");
  const [progreso, setProgreso] = useState<number>(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"simulador" | "teoria">(
    "simulador"
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [islandNotif, setIslandNotif] = useState<IslandNotification | null>(
    null
  );

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pasosBufferRef = useRef<PuntoPaso[]>([]);
  const alertasBufferRef = useRef<AlertaItem[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const notifyIsland = useCallback((notif: Omit<IslandNotification, "id">) => {
    const fullNotif: IslandNotification = {
      ...notif,
      id: `${notif.tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setIslandNotif(fullNotif);
    soundEngine.play(notif.tipo, soundEnabledRef.current);
  }, []);

  const flushBuffers = useCallback(() => {
    rafIdRef.current = null;
    if (pasosBufferRef.current.length > 0) {
      const nuevosPasos = pasosBufferRef.current;
      pasosBufferRef.current = [];
      const ultimo = nuevosPasos[nuevosPasos.length - 1];
      setUltimoPaso(ultimo);
      setHistorial((prev) => [...prev, ...nuevosPasos]);
      setProgreso(((ultimo.minuto + 1) / 1440) * 100);
    }
    if (alertasBufferRef.current.length > 0) {
      const nuevasAlertas = alertasBufferRef.current;
      alertasBufferRef.current = [];
      setAlertas((prev) => [...prev, ...nuevasAlertas]);

      const ultimaAlerta = nuevasAlertas[nuevasAlertas.length - 1];
      if (ultimaAlerta.tipo === "INICIO") {
        notifyIsland({
          tipo: "alerta_inicio",
          etiqueta: `Emitida ${ultimaAlerta.hora_emision}`,
          titulo: "Alerta de Despacho Preventivo",
          subtitulo: `Proyección de ${ultimaAlerta.y_proy} sol/min para las ${ultimaAlerta.hora_objetivo}. Reasignar flota.`,
        });
      } else {
        notifyIsland({
          tipo: "alerta_fin",
          etiqueta: `Normalizada ${ultimaAlerta.hora_emision}`,
          titulo: "Demanda Normalizada",
          subtitulo: `Proyección en ${ultimaAlerta.y_proy} sol/min bajo el umbral crítico.`,
        });
      }
    }
  }, [notifyIsland]);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushBuffers);
    }
  }, [flushBuffers]);

  useEffect(() => {
    fetch(`${API_BASE}/simulacion/base`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.base_spline)) {
          setBaseSpline(data.base_spline);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (estado === "en_progreso") {
      let lastTick = performance.now();
      timerRef.current = setInterval(() => {
        const now = performance.now();
        const dt = (now - lastTick) / 1000;
        lastTick = now;
        setTiempoTranscurrido((prev) => prev + dt);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [estado]);

  const disconnectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const connectWs = useCallback(() => {
    disconnectWs();

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.tipo === "estado_inicial") {
            if (Array.isArray(msg.base_spline) && msg.base_spline.length > 0) {
              setBaseSpline(msg.base_spline);
            }
            if (Array.isArray(msg.historial) && msg.historial.length > 0) {
              setHistorial(msg.historial);
              const ult = msg.historial[msg.historial.length - 1];
              setUltimoPaso(ult);
              setProgreso(((ult.minuto + 1) / 1440) * 100);
            }
            if (Array.isArray(msg.eventos_inyectados)) {
              setEventosInyectados(msg.eventos_inyectados);
            }
          } else if (msg.tipo === "paso" && msg.datos) {
            const paso: PuntoPaso = msg.datos;
            pasosBufferRef.current.push(paso);

            if (paso.evento_alerta) {
              const alerta = paso.evento_alerta;
              alertasBufferRef.current.push({
                id: `${alerta.tipo}-${alerta.minuto_emision}-${Math.random()
                  .toString(36)
                  .slice(2, 7)}`,
                tipo: alerta.tipo,
                minuto_emision: alerta.minuto_emision,
                hora_emision: alerta.hora_emision,
                minuto_objetivo: alerta.minuto_objetivo,
                hora_objetivo: alerta.hora_objetivo,
                y_proy: alerta.y_proy,
                exceso: alerta.exceso,
                mensaje: alerta.mensaje,
                timestamp: new Date().toLocaleTimeString(),
              });
            }
            scheduleFlush();
          } else if (msg.tipo === "evento_inyectado" && msg.evento) {
            setEventosInyectados((prev) => {
              if (prev.some((e) => e.id === msg.evento.id)) return prev;
              return [...prev, msg.evento];
            });
          } else if (msg.tipo === "estado_cambio" && msg.estado) {
            setEstado(msg.estado);
          } else if (msg.tipo === "fin") {
            flushBuffers();
            setEstado(msg.estado === "detenida" ? "detenida" : "completada");
            if (msg.estado !== "detenida") {
              setProgreso(100);
              notifyIsland({
                tipo: "info",
                etiqueta: "24:00",
                titulo: "Simulación de 24 Horas Completada",
                subtitulo: `Ciclo finalizado con ${msg.total_alertas ?? 0} eventos de alerta registrados.`,
              });
            }
            disconnectWs();
          }
        } catch (e) {
          console.error("Error procesando mensaje WebSocket", e);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch (err) {
      console.warn("No se pudo conectar WebSocket al backend:", err);
    }
  }, [disconnectWs, flushBuffers, notifyIsland, scheduleFlush]);

  const handleStart = async () => {
    try {
      pasosBufferRef.current = [];
      alertasBufferRef.current = [];
      setHistorial([]);
      setAlertas([]);
      setEventosInyectados([]);
      setUltimoPaso(null);
      setProgreso(0);
      setTiempoTranscurrido(0);

      const payload: SimulacionConfig = {
        ...config,
        metodo: "holt",
        eventos: [],
      };

      const resp = await fetch(`${API_BASE}/simulacion/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error(`Error en API: ${resp.statusText}`);
      }

      setEstado("en_progreso");
      connectWs();
      notifyIsland({
        tipo: "info",
        etiqueta: "00:00",
        titulo: "Simulación Iniciada",
        subtitulo: `Monitoreando las 24 horas en ${config.duracion_real_segundos} segundos.`,
      });
    } catch (err) {
      alert(
        `No se pudo iniciar la simulación. Verifica que el servidor backend esté activo en ${API_BASE}.\n\nComando: uv run uvicorn app.back.main:app --reload --port 8000`
      );
      console.error(err);
      setEstado("iniciada");
    }
  };

  const handlePauseToggle = async () => {
    try {
      if (estado === "en_progreso") {
        const r = await fetch(`${API_BASE}/simulacion/pausar`, {
          method: "POST",
        });
        if (r.ok) {
          setEstado("pausada");
          notifyIsland({
            tipo: "info",
            etiqueta: ultimoPaso?.hora || "00:00",
            titulo: "Simulación en Pausa",
            subtitulo:
              "Puedes inspeccionar la curva o enviar un evento externo antes de reanudar.",
          });
        }
      } else if (estado === "pausada") {
        const r = await fetch(`${API_BASE}/simulacion/reanudar`, {
          method: "POST",
        });
        if (r.ok) {
          setEstado("en_progreso");
          notifyIsland({
            tipo: "info",
            etiqueta: ultimoPaso?.hora || "00:00",
            titulo: "Simulación Reanudada",
            subtitulo: "Continuando el monitoreo predictivo de la flota.",
          });
        }
      }
    } catch (err) {
      console.warn("Error al pausar/reanudar:", err);
    }
  };

  const handleRestart = async () => {
    try {
      await fetch(`${API_BASE}/simulacion/detener`, { method: "POST" });
    } catch (_) {}
    disconnectWs();
    pasosBufferRef.current = [];
    alertasBufferRef.current = [];
    setHistorial([]);
    setAlertas([]);
    setEventosInyectados([]);
    setUltimoPaso(null);
    setProgreso(0);
    setTiempoTranscurrido(0);
    setEstado("iniciada");
    setIslandNotif(null);
  };

  const handleChangeVelocidad = async (nuevaDuracionSegundos: number) => {
    setConfig((prev) => ({
      ...prev,
      duracion_real_segundos: nuevaDuracionSegundos,
    }));
    if (estado === "en_progreso" || estado === "pausada") {
      try {
        await fetch(`${API_BASE}/simulacion/velocidad`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duracion_real_segundos: nuevaDuracionSegundos,
          }),
        });
        notifyIsland({
          tipo: "info",
          etiqueta: `${nuevaDuracionSegundos}s`,
          titulo: "Velocidad Actualizada",
          subtitulo: `Duración total del ciclo ajustada a ${nuevaDuracionSegundos} segundos.`,
        });
      } catch (err) {
        console.warn("No se pudo actualizar velocidad en vivo:", err);
      }
    }
  };

  const handleInjectEvent = async (
    descripcion: string,
    amplitud: number,
    duracionMinutos: number
  ) => {
    try {
      const resp = await fetch(`${API_BASE}/simulacion/evento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion,
          amplitud,
          duracion_minutos: duracionMinutos,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.evento) {
          const ev: EventoInyectado = data.evento;
          setEventosInyectados((prev) => {
            if (prev.some((e) => e.id === ev.id)) return prev;
            return [...prev, ev];
          });
          notifyIsland({
            tipo: "evento",
            etiqueta: `Hora ${ev.hora_inicio}`,
            titulo: `Evento Enviado: ${ev.descripcion}`,
            subtitulo: `Aumento de +${ev.amplitud} sol/min durante ${ev.duracion_minutos} minutos en la ciudad.`,
          });
        }
      }
    } catch (err) {
      console.error("Error enviando evento en vivo:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      disconnectWs();
    };
  }, [disconnectWs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      <DynamicIsland
        notification={islandNotif}
        onDismiss={() => setIslandNotif(null)}
        horaActual={ultimoPaso?.hora || "00:00"}
        enAlerta={ultimoPaso?.alerta_activa ?? false}
        activo={estado === "en_progreso"}
        pausado={estado === "pausada"}
      />

      <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#facc15,#facc15_12px,#0f172a_12px,#0f172a_24px)]" />

      <header className="border-b border-amber-300/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 text-slate-950 border border-amber-500/40 shadow-sm">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  AutoMove <span className="text-amber-500">City</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 uppercase tracking-wider">
                  Despacho Inteligente
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoreo y predicción de demanda para flota de 200 taxis autónomos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) {
                  soundEngine.play("info", true);
                }
              }}
              title={
                soundEnabled ? "Silenciar notificaciones" : "Activar sonido"
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                  : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Sonido activo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Silenciado</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>{connected ? "Conectado en vivo" : "En espera"}</span>
            </div>

            <nav className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("simulador")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "simulador"
                    ? "bg-amber-400 text-slate-950 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Simulador en Vivo
              </button>
              <button
                onClick={() => setActiveTab("teoria")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "teoria"
                    ? "bg-amber-400 text-slate-950 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Detalles del Modelo
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === "simulador" ? (
          <>
            <ControlPanel
              duracionReal={config.duracion_real_segundos}
              onChangeVelocidad={handleChangeVelocidad}
              onStart={handleStart}
              onPauseToggle={handlePauseToggle}
              onRestart={handleRestart}
              onInjectEvent={handleInjectEvent}
              estado={estado}
              progreso={progreso}
              horaActual={ultimoPaso?.hora || "00:00"}
              eventosInyectados={eventosInyectados}
            />

            <KpiCards
              ultimoPaso={ultimoPaso}
              enAlerta={ultimoPaso?.alerta_activa ?? false}
              totalAlertas={alertas.length}
              umbral={config.umbral}
              duracionSegundos={config.duracion_real_segundos}
              tiempoTranscurrido={tiempoTranscurrido}
            />

            <SimulationChart
              historial={historial}
              baseSpline={baseSpline}
              eventosInyectados={eventosInyectados}
              umbral={config.umbral}
              minutoActual={ultimoPaso?.minuto ?? 0}
              alertaActiva={ultimoPaso?.alerta_activa ?? false}
            />

            <AlertsLog alertas={alertas} />
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-amber-300/70 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" /> Curva Base: Spline
                Cúbico Periódico
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Para representar el comportamiento habitual de la demanda a lo
                largo de las 24 horas a partir de los 10 puntos horarios, se
                utiliza un <strong>Spline Cúbico Periódico</strong> que asegura
                transiciones suaves sin cambios bruscos ni oscilaciones
                artificiales.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-slate-900">
                    Continuidad suave:
                  </strong>{" "}
                  la curva y su tasa de cambio son continuas en todo momento.
                </li>
                <li>
                  <strong className="text-slate-900">Ciclo de 24 horas:</strong>{" "}
                  el inicio (00:00) y el cierre del día (24:00) empalman con el
                  mismo nivel y pendiente.
                </li>
                <li>
                  <strong className="text-slate-900">
                    Detección de horas críticas:
                  </strong>{" "}
                  en un día habitual, el umbral de 150 sol/min se supera entre
                  las <strong>10:08</strong> y las <strong>15:00</strong>, con
                  un máximo de 180.9 sol/min a las <strong>12:21</strong>.
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-amber-300/70 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-500" /> Predicción
                Automática a 30 Minutos
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                El sistema combina la curva base del día con el método óptimo de
                suavizado exponencial con tendencia amortiguada (Holt) para
                anticipar la demanda con <strong>30 minutos de ventaja</strong>:
              </p>
              <div className="p-3 bg-amber-50/70 rounded-xl font-mono text-xs text-amber-950 border border-amber-200">
                Demanda estimada (t + 30 min) = Curva Base (t + 30 min) +
                Tendencia reciente suavizada
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-slate-900">
                    Filtro automático sin ajustes manuales:
                  </strong>{" "}
                  filtra el ruido normal minuto a minuto y detecta aumentos
                  sostenidos causados por lluvias o eventos masivos.
                </li>
                <li>
                  <strong className="text-slate-900">
                    Reducción del 28.6% en el error de predicción:
                  </strong>{" "}
                  comparado con usar únicamente la curva histórica.
                </li>
                <li>
                  <strong className="text-slate-900">
                    Despacho anticipado:
                  </strong>{" "}
                  emite alertas antes de que la demanda supere las 150
                  solicitudes por minuto para reubicar la flota a tiempo.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">AutoMove City</span>
            <span>· Análisis Numérico para Ingeniería</span>
          </div>
          <p className="text-slate-500">
            Pontificia Universidad Javeriana · Simulador de Despacho Preventivo
          </p>
        </div>
      </footer>
    </div>
  );
};
