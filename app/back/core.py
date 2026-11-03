"""Módulo matemático de interpolación y filtro predictivo.

Extraído y reutilizable directamente del análisis en algorithm/1-main.ipynb.
"""
from collections import deque
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.interpolate import CubicSpline

# Rutas estándar
ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_CSV = ROOT_DIR / "data" / "data.csv"

# Constantes del problema
UMBRAL = 150.0
MIN_DIA = 1440
T_CIERRE = 24.0

# Escenario predeterminado de eventos (mismo de 1-main.ipynb)
EVENTOS_PREDETERMINADOS = [
    {"descripcion": "Aguacero en hora pico matutina", "centro_h": 8.00, "ancho_h": 0.60, "amplitud": 70.0},
    {"descripcion": "Salida de concierto (Movistar Arena)", "centro_h": 19.00, "ancho_h": 0.50, "amplitud": 90.0},
]


def hhmm(t_horas: float, segundos: bool = False) -> str:
    """Convierte horas decimales a HH:MM o HH:MM:SS."""
    total_s = int(round(float(t_horas) * 3600))
    h, rem = divmod(total_s, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if segundos else f"{h:02d}:{m:02d}"


def cargar_nodos(ruta_csv: Optional[Path] = None) -> Tuple[np.ndarray, np.ndarray]:
    """Carga data.csv y agrega el nodo de cierre (24.0, 15.0)."""
    ruta = ruta_csv or DATA_CSV
    df = pd.read_csv(ruta, skipinitialspace=True)
    df.columns = df.columns.str.strip()
    t = np.append(df["hora"].to_numpy(dtype=float), T_CIERRE)
    y = np.append(df["demanda"].to_numpy(dtype=float), df["demanda"].iloc[0])
    return t, y


def construir_spline(t_nodos: np.ndarray, y_nodos: np.ndarray, bc_type: str = "periodic") -> CubicSpline:
    """Construye la spline cúbica con scipy.interpolate."""
    return CubicSpline(t_nodos, y_nodos, bc_type=bc_type)


def simular_flujo_demanda(
    spline: CubicSpline,
    sigma_rapido: float = 4.0,
    sigma_lento: float = 1.2,
    phi: float = 0.985,
    eventos: Optional[List[dict]] = None,
    semilla: int = 2026,
) -> Tuple[np.ndarray, np.ndarray]:
    """Simula los 1440 minutos de demanda en tiempo real."""
    if eventos is None:
        eventos = EVENTOS_PREDETERMINADOS

    rng = np.random.default_rng(semilla)
    t_min = np.arange(MIN_DIA) / 60.0
    base = spline(t_min)

    lento = np.zeros(MIN_DIA)
    for k in range(1, MIN_DIA):
        lento[k] = phi * lento[k - 1] + rng.normal(0, sigma_lento)
    ruido = lento + rng.normal(0, sigma_rapido, MIN_DIA)

    pulsos = np.zeros(MIN_DIA)
    for ev in eventos:
        c = ev["centro_h"]
        w = ev["ancho_h"]
        a = ev["amplitud"]
        pulsos += a * np.exp(-0.5 * ((t_min - c) / w) ** 2)

    senal = base + pulsos
    y_obs = np.clip(senal + ruido, 0, None)
    return y_obs, senal


class FiltroPredictivo:
    """Filtro de corto plazo: spline base + suavizado de la desviación + alertas."""

    def __init__(
        self,
        spline: CubicSpline,
        metodo: str = "holt",
        alpha: float = 0.2,
        beta: float = 0.05,
        phi: float = 0.9,
        ventana: int = 15,
        horizonte: int = 30,
        umbral: float = UMBRAL,
        histeresis: float = 8.0,
        confirmacion: int = 3,
        periodo: float = 24.0,
    ):
        assert metodo in {"ses", "holt", "wma", "spline"}
        self.S = spline
        self.metodo = metodo
        self.alpha = alpha
        self.beta = beta
        self.phi = phi
        self.H = horizonte
        self.umbral = umbral
        self.hist = histeresis
        self.confirmacion = confirmacion
        self.periodo = periodo

        self.buffer = deque(maxlen=ventana)
        self.pesos = np.arange(1, ventana + 1, dtype=float)
        self.nivel: Optional[float] = None
        self.tend: float = 0.0
        self.factor_holt = sum(phi ** i for i in range(1, horizonte + 1))

        self.en_alerta: bool = False
        self.racha: int = 0
        self.eventos: List[dict] = []

    def _base(self, minuto: float) -> float:
        return float(self.S((minuto / 60.0) % self.periodo))

    def _suavizar(self, r: float) -> float:
        if self.metodo == "spline":
            return 0.0
        if self.metodo == "wma":
            self.buffer.append(r)
            w = self.pesos[-len(self.buffer):]
            return float(np.dot(w, self.buffer) / w.sum())
        if self.nivel is None:
            self.nivel = r
            return r
        if self.metodo == "ses":
            self.nivel = self.alpha * r + (1 - self.alpha) * self.nivel
            return self.nivel
        # Holt amortiguado
        previo = self.nivel
        self.nivel = self.alpha * r + (1 - self.alpha) * (previo + self.phi * self.tend)
        self.tend = self.beta * (self.nivel - previo) + (1 - self.beta) * self.phi * self.tend
        return self.nivel + self.factor_holt * self.tend

    def actualizar(self, minuto: int, y: float) -> dict:
        base_t = self._base(minuto)
        r = y - base_t
        r_proy = self._suavizar(r)
        objetivo = minuto + self.H
        base_proy = self._base(objetivo)
        y_proy = max(0.0, base_proy + r_proy)

        evento_emitido: Optional[dict] = None
        if y_proy > self.umbral:
            self.racha += 1
        else:
            self.racha = 0

        if not self.en_alerta and self.racha >= self.confirmacion:
            self.en_alerta = True
            evento_emitido = {
                "tipo": "INICIO",
                "minuto_emision": minuto,
                "hora_emision": hhmm(minuto / 60.0),
                "minuto_objetivo": objetivo,
                "hora_objetivo": hhmm((objetivo % MIN_DIA) / 60.0),
                "y_proy": round(y_proy, 2),
                "exceso": round(y_proy - self.umbral, 2),
                "mensaje": (
                    f"🚨 ALERTA: demanda proyectada para las {hhmm((objetivo % MIN_DIA) / 60.0)} = "
                    f"{y_proy:.1f} sol/min (> {self.umbral:.0f}). Reasignar flota preventivamente."
                ),
            }
            self.eventos.append(evento_emitido)
        elif self.en_alerta and y_proy < (self.umbral - self.hist):
            self.en_alerta = False
            evento_emitido = {
                "tipo": "FIN",
                "minuto_emision": minuto,
                "hora_emision": hhmm(minuto / 60.0),
                "minuto_objetivo": objetivo,
                "hora_objetivo": hhmm((objetivo % MIN_DIA) / 60.0),
                "y_proy": round(y_proy, 2),
                "mensaje": f"✅ FIN DE ALERTA: proyección normalizada ({y_proy:.1f} sol/min).",
            }
            self.eventos.append(evento_emitido)

        return {
            "minuto": minuto,
            "hora": hhmm(minuto / 60.0),
            "t_horas": round(minuto / 60.0, 4),
            "y_obs": round(float(y), 2),
            "base_spline": round(base_t, 2),
            "residuo": round(r, 2),
            "residuo_suav": round(r_proy, 2),
            "minuto_objetivo": objetivo,
            "hora_objetivo": hhmm((objetivo % MIN_DIA) / 60.0),
            "y_proy": round(y_proy, 2),
            "alerta_activa": self.en_alerta,
            "evento_alerta": evento_emitido,
        }
