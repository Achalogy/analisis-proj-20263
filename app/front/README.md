# AutoMove City — Frontend Dashboard de Taxis Autónomos

Aplicación web interactiva construida con **Astro**, **React** y **Tailwind CSS**, diseñada con estética y paleta de colores de taxis (amarillo taxi `#f59e0b` / `#fbbf24`, asfalto oscuro `#090d16` y alertas en carmesí `#ef4444`).

Se conecta a la API FastAPI en `http://localhost:8000` mediante **WebSocket en vivo** (`ws://localhost:8000/ws/simulacion`) y llamadas REST para controlar y visualizar la simulación de demanda de 24 horas en tiempo real.

---

## Características

1. **Gráfica de Alta Fidelidad en Canvas (24 Horas = 1440 minutos):**
   - Curva de demanda observada en amarillo taxi vibrante con sombreado de área.
   - Perfil base de la **Spline Cúbica Periódica** en línea punteada azul/cian.
   - Proyección a 30 minutos $\hat{y}_{t+30}$ en línea ámbar/naranja.
   - Línea de umbral crítico a **150 solicitudes/min** con sombreados rojos translúcidos en los intervalos de alerta.
   - Cabezal de reproducción vertical interactivo y tooltip con valores exactos en cada minuto.

2. **Panel de Control:**
   - Botones principales: **Iniciar Simulación**, **Detener** y **Reiniciar**.
   - Selector de velocidad/duración: **60 segundos (1 minuto predeterminado)**, 15s (turbo), 30s (rápida) o 120s (pausada).
   - Selector de método de filtrado: **Holt amortiguado**, **SES**, **WMA** o **Solo Spline**.
   - Menú de configuración avanzada: ajuste de $\alpha$, $\beta$, ventana $N$, umbral, horizonte y activación de eventos imprevistos (Aguacero 08:00 y Concierto 19:00).
   - Barra de progreso del ciclo diario (00:00 → 24:00).

3. **Tarjetas de KPIs en Tiempo Real:**
   - Reloj simulado de Bogotá ($HH:MM$).
   - Demanda observada actual $y(t)$ y valor base de la spline.
   - Demanda proyectada a 30 minutos $\hat{y}_{t+30}$.
   - Desviación / residuo $r(t) = y(t) - S(t)$.
   - Estado de despacho (Normal o 🚨 Reasignar Flota).
   - Contador de alertas críticas emitidas.

4. **Bitácora de Alertas:**
   - Feed en tiempo real con los mensajes de activación y desactivación de alertas emitidos por el backend.

5. **Pestaña de Rigor Numérico:**
   - Justificación matemática de la continuidad $C^2$ de los trazadores periódicos frente a Lagrange e interpolación lineal, y métricas del filtro predictivo.

---

## Cómo ejecutar

### 1. Iniciar el Backend (FastAPI)

En una terminal:

```bash
uv run uvicorn app.back.main:app --reload --port 8000
```

### 2. Iniciar el Frontend (Astro)

En otra terminal:

```bash
cd app/front
bun run dev
# o con pnpm/npm:
# pnpm dev
# npm run dev
```

Abre en tu navegador: **`http://localhost:4321`** (o el puerto indicado por Astro).
