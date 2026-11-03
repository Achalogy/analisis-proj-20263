"""Modelos Pydantic para configuración y respuestas de la API."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from .core import EVENTOS_PREDETERMINADOS, UMBRAL


class EventoConfig(BaseModel):
    descripcion: str
    centro_h: float = Field(
        ..., ge=0.0, le=24.0, description="Hora central del evento (decimal)"
    )
    ancho_h: float = Field(
        0.5, gt=0.0, description="Desviación típica del pulso en horas"
    )
    amplitud: float = Field(..., description="Amplitud en sol/min añadida")


class SimulacionConfig(BaseModel):
    duracion_real_segundos: float = Field(
        60.0,
        gt=0.0,
        description="Duración en segundos de la simulación completa de 24h (predeterminado: 60s)",
    )
    metodo: Literal["holt", "ses", "wma", "spline"] = Field(
        "holt", description="Método de suavizado de la desviación"
    )
    alpha: float = Field(0.2, ge=0.01, le=1.0, description="Parámetro alpha (SES/Holt)")
    beta: float = Field(0.05, ge=0.0, le=1.0, description="Parámetro beta (Holt)")
    phi: float = Field(
        0.9, ge=0.1, le=1.0, description="Amortiguamiento de tendencia (Holt)"
    )
    ventana_wma: int = Field(15, ge=2, le=60, description="Tamaño de ventana para WMA")
    horizonte_min: int = Field(
        30, ge=1, le=120, description="Horizonte de predicción en minutos"
    )
    umbral: float = Field(
        UMBRAL, gt=0.0, description="Umbral crítico de solicitudes/min"
    )
    histeresis: float = Field(
        8.0, ge=0.0, description="Margen de histéresis para apagar alerta"
    )
    confirmacion: int = Field(
        3, ge=1, le=10, description="Minutos consecutivos para activar alerta"
    )
    semilla: int = Field(2026, description="Semilla generadora de ruido")
    sigma_rapido: float = Field(4.0, ge=0.0, description="Ruido minuto a minuto")
    sigma_lento: float = Field(1.2, ge=0.0, description="Fluctuación AR(1) lenta")
    phi_ar1: float = Field(
        0.985, ge=0.0, lt=1.0, description="Persistencia de la fluctuación lenta"
    )
    eventos: Optional[List[EventoConfig]] = Field(
        default=None,
        description="Lista de eventos Gaussianos. Si es null, usa el escenario predeterminado.",
    )


class PuntoPaso(BaseModel):
    minuto: int
    hora: str
    t_horas: float
    y_obs: float
    base_spline: float
    residuo: float
    residuo_suav: float
    minuto_objetivo: int
    hora_objetivo: str
    y_proy: float
    alerta_activa: bool
    evento_alerta: Optional[dict] = None


class AlertaLog(BaseModel):
    tipo: str
    minuto_emision: int
    hora_emision: str
    minuto_objetivo: int
    hora_objetivo: str
    y_proy: float
    exceso: Optional[float] = None
    mensaje: str


class EstadoSimulacion(BaseModel):
    id: str
    estado: Literal["iniciada", "en_progreso", "completada", "detenida", "error"]
    progreso_porcentaje: float
    minuto_actual: int
    hora_actual: str
    duracion_real_segundos: float
    tiempo_transcurrido_segundos: float
    ultimo_paso: Optional[PuntoPaso] = None
    total_alertas_emitidas: int
    en_alerta: bool
    config: SimulacionConfig
