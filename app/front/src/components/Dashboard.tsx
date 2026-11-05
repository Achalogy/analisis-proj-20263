import React, { useState, useEffect, useRef, useCallback } from "react";
import { SimulationChart } from "./SimulationChart";
import { ControlPanel } from "./ControlPanel";
import { KpiCards } from "./KpiCards";
import { AlertsLog } from "./AlertsLog";
import type {
  SimulacionConfig,
  PuntoPaso,
  AlertaItem,
  EstadoCiclo,
  EventoInyectado,
} from "./types";
import { Car, Radio, Shield } from "lucide-react";

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
    [],
  );
  const [ultimoPaso, setUltimoPaso] = useState<PuntoPaso | null>(null);
  const [estado, setEstado] = useState<EstadoCiclo>("iniciada");
  const [progreso, setProgreso] = useState<number>(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"simulador" | "teoria">(
    "simulador",
  );

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pasosBufferRef = useRef<PuntoPaso[]>([]);
  const alertasBufferRef = useRef<AlertaItem[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // Flush buffered WebSocket steps on animation frame so UI never lags behind the backend
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
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushBuffers);
    }
  }, [flushBuffers]);

  // Load 24h base spline on initial mount
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

  // Manage elapsed real-time clock while estado === 'en_progreso'
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

  // Close WS helper
  const disconnectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Connect to live WebSocket stream
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
  }, [disconnectWs, flushBuffers, scheduleFlush]);

  // Start Simulation
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
    } catch (err) {
      alert(
        `No se pudo iniciar la simulación. Verifica que el servidor backend esté activo en ${API_BASE}.\n\nComando: uv run uvicorn app.back.main:app --reload --port 8000`,
      );
      console.error(err);
      setEstado("iniciada");
    }
  };

  // Pause / Resume Simulation
  const handlePauseToggle = async () => {
    try {
      if (estado === "en_progreso") {
        const r = await fetch(`${API_BASE}/simulacion/pausar`, {
          method: "POST",
        });
        if (r.ok) {
          setEstado("pausada");
        }
      } else if (estado === "pausada") {
        const r = await fetch(`${API_BASE}/simulacion/reanudar`, {
          method: "POST",
        });
        if (r.ok) {
          setEstado("en_progreso");
        }
      }
    } catch (err) {
      console.warn("Error al pausar/reanudar:", err);
    }
  };

  // Restart Simulation (resets and starts fresh from 00:00)
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
  };

  // Change Simulation Speed
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
      } catch (err) {
        console.warn("No se pudo actualizar velocidad en vivo:", err);
      }
    }
  };

  // Inject Live External Event right at the current simulation minute
  const handleInjectEvent = async (
    descripcion: string,
    amplitud: number,
    duracionMinutos: number,
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
          setEventosInyectados((prev) => {
            if (prev.some((e) => e.id === data.evento.id)) return prev;
            return [...prev, data.evento];
          });
        }
      }
    } catch (err) {
      console.error("Error enviando evento en vivo:", err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      disconnectWs();
    };
  }, [disconnectWs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />

      {/* Main Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-xs">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  AutoMove <span className="text-blue-600">City</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  Despacho Preventivo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoreo y predicción de demanda para flota de 200 taxis
                autónomos
              </p>
            </div>
          </div>

          {/* Connection Status & View Tabs */}
          <div className="flex items-center gap-3">
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
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Simulador en Vivo
              </button>
              <button
                onClick={() => setActiveTab("teoria")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "teoria"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Detalles del Modelo
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === "simulador" ? (
          <>
            {/* Control Panel: Speed, Start/Pause/Restart, and Live Event Injection */}
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

            {/* KPI Summary Cards */}
            <KpiCards
              ultimoPaso={ultimoPaso}
              enAlerta={ultimoPaso?.alerta_activa ?? false}
              totalAlertas={alertas.length}
              umbral={config.umbral}
              duracionSegundos={config.duracion_real_segundos}
              tiempoTranscurrido={tiempoTranscurrido}
            />

            {/* Full-Width 24-Hour Simulation Chart */}
            <SimulationChart
              historial={historial}
              baseSpline={baseSpline}
              eventosInyectados={eventosInyectados}
              umbral={config.umbral}
              minutoActual={ultimoPaso?.minuto ?? 0}
              alertaActiva={ultimoPaso?.alerta_activa ?? false}
            />

            {/* Real-Time Alerts Log */}
            <AlertsLog alertas={alertas} />
          </>
        ) : (
          /* Tab: Detalles del Modelo */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Curva Base: Spline
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
                  <strong className="text-slate-900">Continuidad suave:</strong>{" "}
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

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-600" /> Predicción
                Automática a 30 Minutos
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                El sistema combina la curva base del día con el método óptimo de
                suavizado exponencial con tendencia amortiguada (Holt) para
                anticipar la demanda con <strong>30 minutos de ventaja</strong>:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-800 border border-slate-200">
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">AutoMove City</span>
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
