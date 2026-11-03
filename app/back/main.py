"""Servidor FastAPI para simulación en tiempo real de AutoMove City."""

import json
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .core import EVENTOS_PREDETERMINADOS, UMBRAL
from .schemas import AlertaLog, EstadoSimulacion, PuntoPaso, SimulacionConfig
from .simulador import SimuladorRunner

app = FastAPI(
    title="AutoMove City — API de Simulación y Alertas Predictivas",
    description=(
        "API para ejecutar simulaciones de demanda diaria (24 horas = 1440 minutos) "
        "comprimidas en un tiempo configurable (por defecto 1 minuto = 60 segundos), "
        "con alertas predictivas a 30 minutos basadas en Splines Cúbicos y Filtros Exponenciales."
    ),
    version="1.0.0",
)

# Permitir CORS para cualquier cliente frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Almacén de simulaciones en memoria
simulaciones: Dict[str, SimuladorRunner] = {}
simulacion_activa: Optional[SimuladorRunner] = None


@app.get("/", tags=["Info"])
def root():
    return {
        "sistema": "AutoMove City - Dispatch Engine",
        "descripcion": "API de simulación de demanda 24h con filtro predictivo",
        "documentacion": "/docs",
        "escenario_predeterminado": {
            "duracion_real_segundos": 60.0,
            "horizonte_proyeccion": "30 minutos",
            "umbral_critico": UMBRAL,
            "metodo_default": "holt (suavizado exponencial doble amortiguado)",
            "eventos_configurados": EVENTOS_PREDETERMINADOS,
        },
    }


@app.post("/simulacion/iniciar", response_model=EstadoSimulacion, tags=["Simulación"])
async def iniciar_simulacion(config: Optional[SimulacionConfig] = None):
    """Inicia una nueva simulación de 24 horas (1440 min) que dura 1 minuto (60s) por defecto.

    Si no se envía cuerpo, utiliza el escenario predeterminado (60s, Holt amortiguado, 2 eventos).
    """
    global simulacion_activa

    # Si hay una simulación en curso, se cancela para arrancar la nueva
    if simulacion_activa and simulacion_activa.estado == "en_progreso":
        await simulacion_activa.detener()

    conf = config or SimulacionConfig()
    runner = SimuladorRunner(conf)
    simulaciones[runner.id] = runner
    simulacion_activa = runner

    await runner.arrancar()
    return runner.obtener_estado()


@app.get("/simulacion/estado", response_model=EstadoSimulacion, tags=["Simulación"])
def consultar_estado_actual():
    """Consulta el estado, minuto actual y último paso de la simulación activa."""
    if not simulacion_activa:
        raise HTTPException(
            status_code=404,
            detail="No hay ninguna simulación activa. Inicia una con POST /simulacion/iniciar",
        )
    return simulacion_activa.obtener_estado()


@app.post("/simulacion/detener", response_model=EstadoSimulacion, tags=["Simulación"])
async def detener_simulacion():
    """Detiene la simulación activa si está corriendo."""
    if not simulacion_activa:
        raise HTTPException(status_code=404, detail="No hay ninguna simulación activa.")
    await simulacion_activa.detener()
    return simulacion_activa.obtener_estado()


@app.get("/simulacion/alertas", response_model=List[AlertaLog], tags=["Alertas"])
def obtener_alertas():
    """Retorna la bitácora de todas las alertas emitidas en la simulación activa."""
    if not simulacion_activa:
        raise HTTPException(status_code=404, detail="No hay simulación activa.")
    return simulacion_activa.alertas


@app.get("/simulacion/historial", response_model=List[PuntoPaso], tags=["Datos"])
def obtener_historial_acumulado():
    """Retorna los puntos de demanda observados y proyectados generados hasta el momento."""
    if not simulacion_activa:
        raise HTTPException(status_code=404, detail="No hay simulación activa.")
    return simulacion_activa.historial


@app.websocket("/ws/simulacion")
async def websocket_stream(websocket: WebSocket):
    """Canal WebSocket para recibir en tiempo real cada minuto simulado y alertas instantáneas."""
    await websocket.accept()
    if not simulacion_activa:
        await websocket.send_json(
            {
                "tipo": "error",
                "mensaje": "No hay simulación activa. Inicia una en POST /simulacion/iniciar",
            }
        )
        await websocket.close()
        return

    q = await simulacion_activa.suscribir()
    try:
        # Enviar estado actual primero
        await websocket.send_json(
            {"tipo": "estado_inicial", "estado": simulacion_activa.obtener_estado()}
        )
        while True:
            msg = await q.get()
            await websocket.send_json(msg)
            if msg.get("tipo") == "fin":
                break
    except WebSocketDisconnect:
        pass
    finally:
        simulacion_activa.desuscribir(q)


@app.get("/simulacion/stream", tags=["Streaming"])
async def sse_stream():
    """Endpoint Server-Sent Events (SSE) para clientes web que prefieran EventSource."""
    if not simulacion_activa:
        raise HTTPException(status_code=404, detail="No hay simulación activa.")

    q = await simulacion_activa.suscribir()

    async def event_generator():
        try:
            while True:
                msg = await q.get()
                yield f"data: {json.dumps(msg)}\n\n"
                if msg.get("tipo") == "fin":
                    break
        finally:
            simulacion_activa.desuscribir(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
