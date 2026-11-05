export type SmoothingMethod = "holt" | "ses" | "wma" | "spline";

export interface EventoConfig {
  descripcion: string;
  centro_h: number;
  ancho_h: number;
  amplitud: number;
}

export interface EventoInyectado {
  id: string;
  descripcion: string;
  minuto_inicio: number;
  hora_inicio: string;
  amplitud: number;
  duracion_minutos: number;
}

export interface SimulacionConfig {
  duracion_real_segundos: number;
  metodo: SmoothingMethod;
  alpha: number;
  beta: number;
  phi: number;
  ventana_wma: number;
  horizonte_min: number;
  umbral: number;
  histeresis: number;
  confirmacion: number;
  semilla: number;
  sigma_rapido: number;
  sigma_lento: number;
  phi_ar1: number;
  eventos?: EventoConfig[] | null;
}

export interface PuntoPaso {
  minuto: number;
  hora: string;
  t_horas: number;
  y_obs: number;
  base_spline: number;
  residuo: number;
  residuo_suav: number;
  minuto_objetivo: number;
  hora_objetivo: string;
  y_proy: number;
  alerta_activa: boolean;
  evento_alerta?: {
    tipo: "INICIO" | "FIN";
    minuto_emision: number;
    hora_emision: string;
    minuto_objetivo: number;
    hora_objetivo: string;
    y_proy: number;
    exceso?: number;
    mensaje: string;
  } | null;
}

export interface AlertaItem {
  id: string;
  tipo: "INICIO" | "FIN";
  minuto_emision: number;
  hora_emision: string;
  minuto_objetivo: number;
  hora_objetivo: string;
  y_proy: number;
  exceso?: number;
  mensaje: string;
  timestamp: string;
}

export type EstadoCiclo =
  "iniciada" | "en_progreso" | "pausada" | "completada" | "detenida" | "error";

export interface EstadoSimulacion {
  id: string;
  estado: EstadoCiclo;
  progreso_porcentaje: number;
  minuto_actual: number;
  hora_actual: string;
  duracion_real_segundos: number;
  tiempo_transcurrido_segundos: number;
  ultimo_paso?: PuntoPaso | null;
  total_alertas_emitidas: number;
  en_alerta: boolean;
  eventos_inyectados?: EventoInyectado[];
  config: SimulacionConfig;
}
