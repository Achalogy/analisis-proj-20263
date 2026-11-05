import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationChart } from './SimulationChart';
import { ControlPanel } from './ControlPanel';
import { KpiCards } from './KpiCards';
import { AlertsLog } from './AlertsLog';
import type {
  SimulacionConfig,
  PuntoPaso,
  AlertaItem,
  EstadoSimulacion,
} from './types';
import { Car, Radio, Shield, HelpCircle, RefreshCw } from 'lucide-react';

const DEFAULT_CONFIG: SimulacionConfig = {
  duracion_real_segundos: 60.0,
  metodo: 'holt',
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
  eventos: [
    {
      descripcion: 'Aguacero en hora pico matutina',
      centro_h: 8.0,
      ancho_h: 0.6,
      amplitud: 70.0,
    },
    {
      descripcion: 'Salida de concierto (Movistar Arena)',
      centro_h: 19.0,
      ancho_h: 0.5,
      amplitud: 90.0,
    },
  ],
};

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/simulacion';

export const Dashboard: React.FC = () => {
  const [config, setConfig] = useState<SimulacionConfig>(DEFAULT_CONFIG);
  const [historial, setHistorial] = useState<PuntoPaso[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [ultimoPaso, setUltimoPaso] = useState<PuntoPaso | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progreso, setProgreso] = useState<number>(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'simulador' | 'teoria'>('simulador');

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<any>(null);

  // Close WS helper
  const disconnectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
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
          if (msg.tipo === 'paso' && msg.datos) {
            const paso: PuntoPaso = msg.datos;
            setUltimoPaso(paso);
            setHistorial((prev) => [...prev, paso]);
            setProgreso(((paso.minuto + 1) / 1440) * 100);

            if (paso.evento_alerta) {
              const alerta = paso.evento_alerta;
              setAlertas((prev) => [
                ...prev,
                {
                  id: `${alerta.tipo}-${alerta.minuto_emision}-${Date.now()}`,
                  tipo: alerta.tipo,
                  minuto_emision: alerta.minuto_emision,
                  hora_emision: alerta.hora_emision,
                  minuto_objetivo: alerta.minuto_objetivo,
                  hora_objetivo: alerta.hora_objetivo,
                  y_proy: alerta.y_proy,
                  exceso: alerta.exceso,
                  mensaje: alerta.mensaje,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }
          } else if (msg.tipo === 'fin') {
            setIsRunning(false);
            setProgreso(100);
            disconnectWs();
          }
        } catch (e) {
          console.error('Error parseando websocket msg', e);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch (err) {
      console.warn('No se pudo conectar WebSocket al backend:', err);
    }
  }, [disconnectWs]);

  // Start Simulation
  const handleStart = async () => {
    try {
      setHistorial([]);
      setAlertas([]);
      setUltimoPaso(null);
      setProgreso(0);
      setTiempoTranscurrido(0);

      const resp = await fetch(`${API_BASE}/simulacion/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!resp.ok) {
        throw new Error(`Error en API: ${resp.statusText}`);
      }

      setIsRunning(true);
      connectWs();

      const startTime = Date.now();
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTiempoTranscurrido((Date.now() - startTime) / 1000);
      }, 100);
    } catch (err) {
      alert(`No se pudo iniciar la simulación. Asegúrate de que el backend esté corriendo en ${API_BASE}.\n\nComando: uv run uvicorn app.back.main:app --reload --port 8000`);
      console.error(err);
      setIsRunning(false);
    }
  };

  // Stop Simulation
  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/simulacion/detener`, { method: 'POST' });
    } catch (err) {
      console.warn('Error deteniendo simulación:', err);
    }
    setIsRunning(false);
    clearInterval(timerRef.current);
    disconnectWs();
  };

  // Reset
  const handleReset = () => {
    handleStop();
    setHistorial([]);
    setAlertas([]);
    setUltimoPaso(null);
    setProgreso(0);
    setTiempoTranscurrido(0);
  };

  // Poll status occasionally to keep in sync if WS disconnects
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/simulacion/estado`);
        if (r.ok) {
          const st: EstadoSimulacion = await r.json();
          if (st.estado === 'completada' || st.estado === 'detenida') {
            setIsRunning(false);
            clearInterval(timerRef.current);
            disconnectWs();
          }
        }
      } catch (_) {}
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning, disconnectWs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      disconnectWs();
    };
  }, [disconnectWs]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-amber-500 selection:text-black">
      {/* Top Taxi Checkered Ribbon */}
      <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_12px,#0f172a_12px,#0f172a_24px)] opacity-90" />

      {/* Main Navbar */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black text-xl">
              🚕
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  AutoMove <span className="text-amber-400">City</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                  Despacho Inteligente
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Flota de 200 taxis autónomos en Bogotá · Splines Cúbicos & Filtro Predictivo
              </p>
            </div>
          </div>

          {/* Connection Badge & Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300">
                {connected ? 'WS Conectado (8000)' : 'API Standby'}
              </span>
            </div>

            <nav className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('simulador')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'simulador'
                    ? 'bg-amber-400 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Simulador en Vivo
              </button>
              <button
                onClick={() => setActiveTab('teoria')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'teoria'
                    ? 'bg-amber-400 text-slate-950 shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rigor Numérico
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'simulador' ? (
          <>
            {/* KPI Cards */}
            <KpiCards
              ultimoPaso={ultimoPaso}
              enAlerta={ultimoPaso?.alerta_activa ?? false}
              totalAlertas={alertas.length}
              umbral={config.umbral}
              duracionSegundos={config.duracion_real_segundos}
              tiempoTranscurrido={tiempoTranscurrido}
            />

            {/* Control Panel */}
            <ControlPanel
              config={config}
              onChangeConfig={setConfig}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
              isRunning={isRunning}
              progreso={progreso}
              duracionReal={config.duracion_real_segundos}
            />

            {/* Chart & Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Canvas Chart (2 cols) */}
              <div className="lg:col-span-2">
                <SimulationChart
                  historial={historial}
                  baseSpline={[]}
                  umbral={config.umbral}
                  minutoActual={ultimoPaso?.minuto ?? 0}
                  alertaActiva={ultimoPaso?.alerta_activa ?? false}
                />
              </div>

              {/* Real-time Alerts Log (1 col) */}
              <div className="lg:col-span-1">
                <AlertsLog alertas={alertas} />
              </div>
            </div>
          </>
        ) : (
          /* Tab: Rigor Numérico / Shark Tank Details */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/20 space-y-4">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Modelo Numérico: Spline Cúbico Periódico
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                A diferencia de la interpolación lineal (que produce cambios bruscos en $S'(t)$ y
                desgaste en los taxis) o el polinomio de Lagrange (que sufre de oscilaciones de Runge
                severas en los extremos), el <strong>Spline Cúbico Periódico</strong> garantiza:
              </p>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-white">Continuidad $C^2$:</strong> la curva es dos veces
                  continuamente diferenciable en todos los nodos.
                </li>
                <li>
                  <strong className="text-white">Condición periódica:</strong> $S(0) = S(24)$, $S'(0) = S'(24)$ y $S''(0) = S''(24)$. Medianoche se empalma suavemente sin saltos de despacho.
                </li>
                <li>
                  <strong className="text-white">Detección de umbral exacta:</strong> Cruce de 150 sol/min exactamente a las <strong>10:08:21</strong> y <strong>15:00:00</strong> (291 minutos críticos, 5.729 solicitudes excedentes).
                </li>
                <li>
                  <strong className="text-white">Pico real de demanda:</strong> 180.89 sol/min a las <strong>12:21:34</strong> (no a las 12:00 exactas).
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/20 space-y-4">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Radio className="w-5 h-5" /> Mejora Técnica: Filtro Predictivo a 30 min
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Como los 10 nodos base no son equidistantes (pasos entre 1.5 h y 3.0 h), un modelo
                ARIMA clásico es inadecuado. El sistema aplica:
              </p>
              <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-amber-300 border border-slate-800">
                ŷ(t+30) = S(t+30) + r̂_t
                <br />
                r_t = y_t - S(t) &nbsp;&nbsp;(desviación en tiempo real)
              </div>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-white">Holt Amortiguado / SES / WMA:</strong> suaviza el
                  ruido estocástico minuto a minuto y captura la tendencia de desvío.
                </li>
                <li>
                  <strong className="text-white">28.6% de reducción en RMSE:</strong> frente a usar la
                  spline sola.
                </li>
                <li>
                  <strong className="text-white">Reacción preventiva:</strong> detecta aguaceros y
                  salidas de eventos imprevistos con <strong>hasta 15 a 30 minutos de anticipación</strong>, permitiendo reubicar los vehículos antes de que el pasajero espere.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">AutoMove City</span>
            <span>· Análisis Numérico para Ingeniería</span>
          </div>
          <p className="text-slate-500">
            Pontificia Universidad Javeriana · FastAPI + Astro + React + Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
};
