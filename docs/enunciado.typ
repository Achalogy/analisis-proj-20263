#set page(
  paper: "a4",
  margin: (x: 1.8cm, top: 1.6cm, bottom: 1.6cm),
)

#set text(
  font: ("Helvetica Neue", "Helvetica", "Arial"),
  size: 9.5pt,
  lang: "es",
)

#set par(
  justify: true,
  leading: 0.58em,
)

// Encabezado
#text(size: 8pt, weight: "bold", fill: luma(60))[
  ANÁLISIS NUMÉRICO PARA INGENIERÍA — GUÍA DE LABORATORIO TIPO HACKATHON (3 HORAS)
]

#v(1pt)

#text(size: 15pt, weight: "bold")[
  Aplicación de Splines Cúbicos en Problemas de Ingeniería
]

#v(0.5pt)

#text(size: 9pt, fill: luma(80))[
  Modelado numérico, validación cruzada, prototipado rápido y defensa comercial estilo Shark Tank
]

#v(-3pt)
#line(length: 100%, stroke: 0.6pt + black)
#v(3pt)

== 1. Objetivo General

Aplicar métodos de interpolación mediante trazadores cúbicos (_splines cúbicos_) a problemas reales de ingeniería y negocio, trabajando en equipos de tres estudiantes con roles técnicos equilibrados. Cada equipo procesará un conjunto de 10 puntos discretos, implementará un prototipo computacional con una mejora tecnológica integrada y defenderá su propuesta en una simulación estilo _Shark Tank_ dentro de una sesión práctica de 3 horas.

#v(2pt)
== 2. Estructura General y Distribución de Roles

Para garantizar que los tres integrantes apliquen conceptos de Análisis Numérico y trabajen en paralelo sin cuellos de botella durante la sesión, los roles se estructuran de la siguiente manera:

- *1. Ingeniero de Modelado y Validación:* Formula el problema matemático, selecciona y justifica las condiciones de frontera de la spline (natural, sujeta o periódica) frente a interpolación lineal o polinómica de Lagrange. Programa el esquema de validación cruzada (_hold-out_ o _leave-one-out_) y calcula las métricas de error (RMSE y error máximo absoluto).
- *2. Ingeniero de Algoritmos y Simulación:* Implementa la interpolación en Python (usando `scipy.interpolate`), realiza las operaciones de cálculo numérico adicionales (derivación numérica, integración o detección de umbrales), genera las gráficas comparativas y programa la simulación de la mejora tecnológica en el cuaderno interactivo.
- *3. Ingeniero de Integración y Estrategia (Shark Tank):* Diseña la arquitectura de la mejora tecnológica (diagrama de bloques del sistema), traduce las métricas numéricas (continuidad $C^2$, reducción de RMSE) en indicadores clave de negocio (KPIs, ahorro energético o retorno de inversión), estructura el reporte técnico ejecutivo y lidera el _pitch_ comercial de 3 minutos.

#v(2pt)
== 3. Cronograma de la Sesión (3 Horas) y Evaluación

#v(2pt)

#align(center)[
  #table(
    columns: (1.2fr, 1.8fr, 2fr),
    align: (left + top, left + top, left + top),
    inset: (x: 5pt, y: 4.5pt),
    stroke: none,
    table.hline(stroke: 0.75pt),
    table.header(
      [*Fase / Tiempo*],
      [*Actividades Clave del Equipo*],
      [*Entregable y Ponderación*],
    ),
    table.hline(stroke: 0.5pt),
    [
      *Fase 1: Modelado y Código*\
      (0:00 - 1:15 h)
    ],
    [
      Planteamiento de ecuaciones y condiciones de borde, programación de `CubicSpline`, cálculo de errores de validación y gráficas.
    ],
    table.cell(rowspan: 2)[
      *Trabajo Técnico Ejecutivo (50%):*\
      Cuaderno ejecutable (Jupyter Notebook / Google Colab) o informe breve (formato IEEE de 2--3 páginas) con resumen, ecuaciones de la spline, código comentado, tabla de validación, gráficas, diagrama de bloques de la mejora y 3 referencias.
    ],
    table.hline(stroke: 0.3pt, end: 2),
    [
      *Fase 2: Mejora y Pitch*\
      (1:15 - 2:15 h)
    ],
    [
      Simulación de la mejora tecnológica en Python, diseño del diagrama de bloques, cálculo de KPIs y armado de diapositivas.
    ],
    table.hline(stroke: 0.5pt),
    [
      *Fase 3: Shark Tank*\
      (2:15 - 3:00 h)
    ],
    [
      Defensa oral por equipo: 3 minutos de pitch + 2 minutos de preguntas del jurado sobre el rigor numérico y viabilidad.
    ],
    [
      *Presentación Shark Tank (50%):*\
      Diapositivas con identidad visual (nombre y logo), demostración del prototipo en vivo, ventaja competitiva del spline cúbico, modelo de negocio y llamado a la acción.
    ],
    table.hline(stroke: 0.75pt),
  )
]

#pagebreak()

// Página 2
#text(size: 14pt, weight: "bold")[
  Estudio de Caso 1: Optimización de Rutas en Flota de Taxis Autónomos
]

#v(-3pt)
#line(length: 100%, stroke: 0.6pt + black)
#v(4pt)

*Contexto empresarial (AutoMove City):* Opera una flota de 200 taxis autónomos en Bogotá. El sistema central recibe reportes consolidados de demanda de pasajeros en 10 instantes clave a lo largo del día (con mayor frecuencia de muestreo en horas de transición), pero el algoritmo de despacho necesita estimar la demanda cada minuto para reasignar vehículos de forma dinámica y reducir los tiempos de espera de los usuarios.

#v(3pt)
#text(size: 10.5pt, weight: "bold")[Problema numérico]

Se tienen 10 mediciones discretas de demanda (solicitudes por minuto) distribuidas durante un ciclo de 24 horas. Se requiere interpolar la curva para estimar la demanda en cada minuto del día (1440 minutos, desde $t = 0.0$ hasta $t = 23.983$ horas).

#v(2pt)

#align(center)[
  #table(
    columns: (1.2fr, 2fr, 2.2fr),
    align: (center, center, center),
    inset: (x: 6pt, y: 3.2pt),
    stroke: none,
    table.hline(stroke: 0.75pt),
    table.header(
      [*Nodo ($i$)*],
      [*Hora del día (decimal, h)*],
      [*Demanda (solicitudes/min)*],
    ),
    table.hline(stroke: 0.5pt),
    [1], [0.0], [15],
    [2], [1.5], [18],
    [3], [3.0], [12],
    [4], [6.0], [45],
    [5], [9.0], [120],
    [6], [12.0], [180],
    [7], [15.0], [150],
    [8], [18.0], [98],
    [9], [19.5], [75],
    [10], [21.0], [55],
    table.hline(stroke: 0.75pt),
  )
]

#v(1pt)

#text(size: 8pt)[
  _Nota técnica sobre periodicidad:_ El ciclo diario se cierra a las 24.0 h, instante que equivale a las 0.0 h del día siguiente (15 solicitudes/min). Para evitar extrapolación polinómica entre las 21.0 h y las 24.0 h y garantizar continuidad periódica en Python (`bc_type='periodic'`), el equipo debe agregar el nodo de cierre $(24.0, 15)$ al arreglo de datos antes de construir la spline.
]

#v(4pt)
#text(size: 10.5pt, weight: "bold")[Roles y tareas específicas]

- *Ingeniero de Modelado y Validación:* Justificar el uso de splines cúbicos con condición de frontera periódica frente a un polinomio global de Lagrange o interpolación lineal a trozos. Evaluar la precisión mediante validación cruzada dejando dos puntos intermedios fuera (ej. $t = 9.0$ y $t = 18.0$), calculando el RMSE de la spline frente a la interpolación lineal.

- *Ingeniero de Algoritmos y Simulación:* Implementar la interpolación con `scipy.interpolate.CubicSpline` usando condición periódica y comparar gráficamente contra la condición natural. Generar la curva de 1440 minutos e identificar exactamente en qué minutos del día la demanda supera el umbral crítico de 150 solicitudes/min.

- *Ingeniero de Integración y Estrategia:* Crear la identidad comercial (ej. _MovePredict_). Estructurar el sistema de reasignación dinámica preventiva ligado a la meta operativa (KPI: reducir el tiempo de espera un 20% y ahorrar combustible). Presentar en el _pitch_ la tabla comparativa de errores (RMSE) y el diagrama de bloques.

#v(5pt)

#rect(width: 100%, stroke: 0.75pt, inset: (x: 8pt, y: 7pt), radius: 0pt)[
  *Mejora tecnológica obligatoria (Filtro Predictivo de Corto Plazo):* Como los datos base no son equidistantes, en lugar de un modelo ARIMA clásico, implementar en Python un módulo de *Suavizado Exponencial / Media Móvil Ponderada con alertas predictivas* que combine la curva base de la spline con fluctuaciones simuladas en tiempo real a 30 minutos, emitiendo alertas automáticas en consola o gráfico cuando la demanda proyectada supere las 150 solicitudes/min.
]
