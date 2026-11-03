# AutoMove City — Backend API de Simulación

API desarrollada con **FastAPI** para simular en tiempo real un ciclo de 24 horas (1440 minutos de demanda de taxis autónomos) comprimido en **1 minuto** (configurable).

Implementa la solución técnica del proyecto:
- Interpolación base con **Spline Cúbico Periódico** (`scipy.interpolate.CubicSpline`) sobre los datos de [data.csv](../../data/data.csv).
- **Filtro Predictivo de Corto Plazo** (Holt amortiguado, SES o WMA) proyectando a 30 minutos.
- Emisión automática de **alertas preventivas** cuando la demanda proyectada supera las 150 solicitudes/min.
- Streaming en vivo mediante **WebSocket** y **Server-Sent Events (SSE)**.

---

## Estructura

```text
app/back/
├── __init__.py       # Exporta la instancia de app
├── main.py           # Endpoints HTTP, SSE y WebSocket
├── core.py           # Matemática: splines, simulación de demanda y FiltroPredictivo
├── schemas.py        # Modelos de configuración y respuesta Pydantic
├── simulador.py      # Gestor asíncrono y streaming de la simulación
└── README.md         # Documentación de uso
```

---

## Cómo ejecutar el servidor

Desde la raíz del proyecto:

```bash
uv run uvicorn app.back.main:app --reload --port 8000
```

Acceso a la documentación interactiva:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Endpoints Principales

### 1. Iniciar Simulación
`POST /simulacion/iniciar`

- **Escenario predeterminado:**
  Simula 24 horas (1440 minutos) en **60 segundos** (1 minuto real), con el perfil periódico base, fluctuación estocástica y dos eventos no programados (aguacero a las 08:00 y concierto a las 19:00):
  ```bash
  curl -X POST http://localhost:8000/simulacion/iniciar
  ```

- **Configuración personalizada (opcional):**
  Puedes ajustar la duración en segundos, método (`holt`, `ses`, `wma`, `spline`), umbral, parámetros de suavizado o eventos:
  ```json
  {
    "duracion_real_segundos": 60.0,
    "metodo": "holt",
    "alpha": 0.2,
    "beta": 0.05,
    "phi": 0.9,
    "horizonte_min": 30,
    "umbral": 150.0,
    "histeresis": 8.0,
    "confirmacion": 3,
    "semilla": 2026
  }
  ```

### 2. Consultar Estado en Cualquier Momento
`GET /simulacion/estado`

Retorna el progreso actual, minuto/hora del día, tiempo transcurrido, último paso calculado y estado de alerta.

### 3. Bitácora de Alertas
`GET /simulacion/alertas`

Lista todas las alertas de inicio y fin emitidas durante la simulación activa.

### 4. Historial Completo
`GET /simulacion/historial`

Retorna todos los puntos minuto a minuto generados hasta el momento.

### 5. Detener Simulación
`POST /simulacion/detener`

Cancela la simulación en ejecución.

---

## Streaming en Tiempo Real

### Vía WebSocket (recomendado para Dashboards interactivos)
Conectarse a `ws://localhost:8000/ws/simulacion`.
Recibe un JSON en cada minuto simulado:
```json
{
  "tipo": "paso",
  "datos": {
    "minuto": 480,
    "hora": "08:00",
    "y_obs": 164.2,
    "base_spline": 92.99,
    "minuto_objetivo": 510,
    "hora_objetivo": "08:30",
    "y_proy": 172.5,
    "alerta_activa": true,
    "evento_alerta": { ... }
  }
}
```

### Vía Server-Sent Events (SSE)
`GET /simulacion/stream`
Apto para clientes web usando la API nativa de JavaScript `new EventSource('/simulacion/stream')`.
