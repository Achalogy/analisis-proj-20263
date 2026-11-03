"""Gestor asíncrono de la simulación de 24 horas en tiempo real."""

import asyncio
import time
import uuid
from typing import Dict, List, Optional

from .core import (
    MIN_DIA,
    FiltroPredictivo,
    cargar_nodos,
    construir_spline,
    hhmm,
    simular_flujo_demanda,
)
from .schemas import SimulacionConfig


class SimuladorRunner:
    """Ejecuta y emite el progreso de una simulación a lo largo de un tiempo real."""

    def __init__(self, config: SimulacionConfig):
        self.id = str(uuid.uuid4())[:8]
        self.config = config
        self.estado = (
            "iniciada"  # iniciada | en_progreso | completada | detenida | error
        )
        self.minuto_actual = 0
        self.inicio_tiempo: Optional[float] = None
        self.fin_tiempo: Optional[float] = None

        # Suscriptores WebSockets/SSE
        self.listeners: List[asyncio.Queue] = []

        # Historial de pasos y alertas
        self.historial: List[dict] = []
        self.alertas: List[dict] = []
        self.ultimo_paso: Optional[dict] = None

        self._task: Optional[asyncio.Task] = None
        self._cancel_flag = False

    async def arrancar(self):
        """Inicia la tarea en segundo plano."""
        self._task = asyncio.create_task(self._ejecutar())

    async def detener(self):
        """Cancela la simulación en curso."""
        self._cancel_flag = True
        if self._task and not self._task.done():
            self._task.cancel()
        self.estado = "detenida"

    async def suscribir(self) -> asyncio.Queue:
        """Crea una cola para recibir eventos en streaming."""
        q: asyncio.Queue = asyncio.Queue()
        self.listeners.append(q)
        return q

    def desuscribir(self, q: asyncio.Queue):
        if q in self.listeners:
            self.listeners.remove(q)

    async def _broadcast(self, msg: dict):
        """Envía el mensaje a todos los escuchas conectados."""
        for q in list(self.listeners):
            try:
                q.put_nowait(msg)
            except Exception:
                pass

    async def _ejecutar(self):
        try:
            self.estado = "en_progreso"
            self.inicio_tiempo = time.time()

            # 1. Cargar datos y construir spline
            t_nodos, y_nodos = cargar_nodos()
            spline = construir_spline(t_nodos, y_nodos, bc_type="periodic")

            # 2. Generar el flujo sintético completo según la configuración
            eventos_dicts = (
                [ev.model_dump() for ev in self.config.eventos]
                if self.config.eventos is not None
                else None
            )
            y_obs, _ = simular_flujo_demanda(
                spline=spline,
                sigma_rapido=self.config.sigma_rapido,
                sigma_lento=self.config.sigma_lento,
                phi=self.config.phi_ar1,
                eventos=eventos_dicts,
                semilla=self.config.semilla,
            )

            # 3. Inicializar filtro predictivo
            filtro = FiltroPredictivo(
                spline=spline,
                metodo=self.config.metodo,
                alpha=self.config.alpha,
                beta=self.config.beta,
                phi=self.config.phi,
                ventana=self.config.ventana_wma,
                horizonte=self.config.horizonte_min,
                umbral=self.config.umbral,
                histeresis=self.config.histeresis,
                confirmacion=self.config.confirmacion,
            )

            # Intervalo por minuto simulado para cumplir la duración total
            # 1440 minutos divididos en `duracion_real_segundos`
            dt_segundos = max(0.001, self.config.duracion_real_segundos / MIN_DIA)

            t_proximo = time.time()

            for k in range(MIN_DIA):
                if self._cancel_flag:
                    self.estado = "detenida"
                    break

                self.minuto_actual = k
                paso = filtro.actualizar(k, float(y_obs[k]))
                self.ultimo_paso = paso
                self.historial.append(paso)

                if paso.get("evento_alerta"):
                    self.alertas.append(paso["evento_alerta"])

                # Transmitir a WebSockets / SSE
                await self._broadcast({"tipo": "paso", "datos": paso})

                # Control temporal de alta fidelidad sin desfase acumulado
                t_proximo += dt_segundos
                espera = t_proximo - time.time()
                if espera > 0:
                    await asyncio.sleep(espera)
                else:
                    # Si va retrasado, ceder el loop
                    await asyncio.sleep(0)

            if not self._cancel_flag:
                self.estado = "completada"

        except asyncio.CancelledError:
            self.estado = "detenida"
        except Exception as e:
            self.estado = "error"
            self.ultimo_paso = {"error": str(e)}
        finally:
            self.fin_tiempo = time.time()
            resumen = {
                "tipo": "fin",
                "estado": self.estado,
                "minuto_final": self.minuto_actual,
                "duracion_real": round(
                    self.fin_tiempo - (self.inicio_tiempo or self.fin_tiempo), 2
                ),
                "total_alertas": len(self.alertas),
            }
            await self._broadcast(resumen)

    def obtener_estado(self) -> dict:
        t_actual = time.time()
        t_inicio = self.inicio_tiempo or t_actual
        t_fin = self.fin_tiempo or t_actual
        transcurrido = round(t_fin - t_inicio, 2)
        progreso = (
            round((self.minuto_actual + 1) / MIN_DIA * 100, 2)
            if self.estado != "iniciada"
            else 0.0
        )

        return {
            "id": self.id,
            "estado": self.estado,
            "progreso_porcentaje": progreso,
            "minuto_actual": self.minuto_actual,
            "hora_actual": hhmm(self.minuto_actual / 60.0),
            "duracion_real_segundos": self.config.duracion_real_segundos,
            "tiempo_transcurrido_segundos": transcurrido,
            "ultimo_paso": self.ultimo_paso,
            "total_alertas_emitidas": len(self.alertas),
            "en_alerta": self.ultimo_paso.get("alerta_activa", False)
            if self.ultimo_paso
            else False,
            "config": self.config.model_dump(),
        }
