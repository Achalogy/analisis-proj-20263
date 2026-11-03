#import "@preview/simple-plot:1.1.0": data, plot
#import "@preview/charged-ieee:0.1.4": ieee

#let taxi_data = csv("../data/data.csv")

#set page(paper: "a4", margin: 2.5cm)
#set text(font: "Times New Roman", size: 12pt, lang: "es")
#set par(justify: true)

// #align(center)[
//   #v(2cm)
//   #image("../assets/logo.png", width: 25%)
//   #v(1cm)
//
//   #text(size: 18pt, weight: "bold")[
//     Proyecto final: \
//     Aplicación de Splines Cúbicos en Problemas de Ingeniería
//   ]
//   #v(0.5cm)
//   #text(size: 10pt)[
//     https://github.com/Achalogy/dba-proj-20263
//   ]
//
//   #v(1.5cm)
//
//   Miguel Francisco Vargas Contreras \
//   Adam Kalel Ordoñez Herrera \
//   Julian Andres Espinosa Caipe
//
//   #v(1cm)
//
//   Análisis numérico
//
//   #v(1cm)
//
//   Profesor: Maria Perez Camacho
//
//   #v(3cm)
//
//   Pontificia Universidad Javeriana \
//   Bogotá D.C. \
//   2026
// ]

#show: ieee.with(
  title: [Aplicación de Splines Cúbicos en Problemas de Ingenieria],
  authors: (
    (
      name: "Miguel Francisco Vargas Contreras",
      organization: "Pontificia Universidad Javeriana",
      email: "vargas_mf@javeriana.edu.co",
    ),
    (
      name: "Adam Kalel Ordoñez Herrera", 
      organization: "Pontificia Universidad Javeriana", 
      email: "adordonez@javeriana.edu.co"
    ),
    (
      name: "Julian Andres Espinosa Caipe", 
      organization: "Pontificia Universidad Javeriana", 
      email: ""),
  ),
  abstract: [
    En este trabajo se aplica la interpolación mediante splines cúbicos al problema de estimación de demanda en una flota de taxis autónomos. Se construyó un spline cúbico periódico para modelar un ciclo diario de 24 horas, y su desempeño se comparó con interpolación lineal y polinomios globales de Lagrange mediante validación hold-out. Los resultados muestran que el spline periódico presentó el menor error en los puntos evaluados.
  ],
  index-terms: ("Análisis numérico", "Taxi"),
  bibliography: bibliography("refs.bib"),
)

= Introducción

La estimación de la demanda en sistemas de transporte inteligente es un problema relevante en análisis numérico y optimización, ya que permite anticipar comportamientos operativos y apoyar la toma de decisiones. En este proyecto se estudia el caso de una flota de taxis autónomos en la ciudad de Bogotá, para la cual se cuenta con diez mediciones discretas de demanda distribuidas a lo largo de un día.

Con el fin de aproximar la demanda en instantes no observados, se emplean técnicas de interpolación, con énfasis en el uso de splines cúbicos. En particular, se analiza un spline cúbico con condición de frontera periódica, adecuado para representar fenómenos cíclicos de 24 horas. Posteriormente, el modelo se valida retirando dos mediciones intermedias y comparando su desempeño con interpolación lineal y polinomios globales de Lagrange.

#figure(
  plot(
    tick-label-size: 6pt,
    xmin: 0,
    xmax: 25,
    ymin: 0,
    ymax: 200,
    data(
      (
        (0.0,  15),
        (1.5,  18),
        (3.0,  12),
        (6.0,  45),
        (9.0,  120),
        (12.0, 180),
        (15.0, 150),
        (18.0, 98),
        (19.5, 75),
        (21.0, 55)
      ),
      connect: true,
      stroke: blue + 1pt,
    ),
  ),
  caption: [Demanda registrada de solicitudes por minuto en función de la hora del día.]
)


= Modelado matemático y validación

== Planteamiento del modelo matemático

El problema consiste en estimar la demanda de solicitudes de taxis autónomos a lo largo de un ciclo de 24 horas a partir de diez mediciones discretas. Para ello, se define $t$ como el tiempo transcurrido en horas y $D(t)$ como la demanda de solicitudes por minuto. El objetivo es construir una función de interpolación que permita aproximar la demanda entre los instantes registrados, conservando la continuidad y suavidad de la curva.

Se seleccionó el método de interpolación mediante splines cúbicos, el cual construye una función polinómica de tercer grado en cada intervalo comprendido entre dos nodos consecutivos. La expresión general de cada tramo es:

$ S_i(t) = a_i + b_i (t - t_i) + c_i (t - t_i)^2 + d_i (t - t_i)^3 $

Donde $a_i$, $b_i$, $c_i$ y $d_i$ representan los coeficientes de cada polinomio, mientras que $t_i$ corresponde al nodo inicial del intervalo.

Los coeficientes se determinan de manera que la función interpole las mediciones conocidas y mantenga la continuidad de su valor, primera derivada y segunda derivada en los nodos interiores. Esto permite obtener una representación suave de los cambios de demanda a lo largo del día.

== Selección de la condición de frontera

Debido a que la demanda se modela como un fenómeno que se repite diariamente, se seleccionó un spline cúbico con condición de frontera periódica.

Esta condición establece que el valor de la función y sus dos primeras derivadas deben coincidir al inicio y al final del ciclo:

$ S(0) = S(24) = 15 $

$ S'(0) = S'(24) $

$ S''(0) = S''(24) $

Para satisfacer estas condiciones, se incorporó el nodo adicional $(24, 15)$, que representa el cierre del ciclo diario y coincide con la demanda registrada al inicio.

La implementación se realizó mediante la función `CubicSpline` de la biblioteca SciPy, utilizando el parámetro `bc_type="periodic"`.

Se eligió este método frente a la interpolación lineal porque esta última produce cambios bruscos de pendiente entre intervalos. Asimismo, se consideró el polinomio global de Lagrange, que puede presentar oscilaciones al ajustar simultáneamente todos los nodos mediante un único polinomio de grado elevado.

Por lo tanto, el spline periódico permite representar la demanda mediante una curva suave y mantener la coherencia matemática entre el inicio y el final del día.

== Metodología de validación

Para evaluar la precisión de la interpolación, se implementó un procedimiento de validación *hold-out*, retirando temporalmente dos mediciones intermedias del conjunto original de datos.

Los puntos seleccionados fueron:

- Hora 9.0, con una demanda real de 120 solicitudes por minuto.
- Hora 18.0, con una demanda real de 98 solicitudes por minuto.

Los modelos se construyeron utilizando las ocho mediciones restantes y el nodo de cierre periódico. Posteriormente, se estimó la demanda en las dos horas retiradas y se compararon las predicciones con los valores reales.

Este procedimiento permite evaluar la capacidad de interpolación en puntos que no fueron utilizados durante la construcción de los modelos.

Para garantizar una comparación consistente, se aplicó el mismo conjunto de entrenamiento a los tres métodos: spline cúbico periódico, interpolación lineal y polinomio global de Lagrange.

== Métricas de evaluación

La precisión de los modelos se evaluó mediante el error cuadrático medio de la raíz (RMSE) y el error máximo absoluto.

El RMSE se define como:

$ "RMSE" = sqrt((1/n) sum_(i=1)^n (D_i - hat(D)_i)^2) $

Donde $D_i$ representa la demanda real, $hat(D)_i$ la demanda estimada por el modelo y $n$ el número de puntos utilizados para la validación.

Esta métrica penaliza los errores elevados debido a que las diferencias entre los valores reales y estimados se elevan al cuadrado.

Por otra parte, el error máximo absoluto se define como:

$ E_(max) = max_(i=1)^n |D_i - hat(D)_i| $

Esta medida permite identificar la mayor desviación individual de las predicciones respecto a los datos reales.

Ambas métricas se expresan en solicitudes por minuto. Un valor menor indica una mayor precisión del modelo en los puntos evaluados.

== Resultados de la validación

Al evaluar el spline cúbico periódico en las dos mediciones retiradas, se obtuvieron los siguientes resultados:

#figure(
  table(
    columns: (0.8fr, 1fr, 1fr),
    inset: 4pt,
    align: center,
    table.header(
      [*Hora*],
      [*Demanda real*],
      [*Predicción*],
    ),
    [9.0], [120], [126.8275],
    [18.0], [98], [97.5958],
  ),
  caption: [Predicciones del spline cúbico periódico en los puntos de validación.],
)

A partir de estas predicciones, el RMSE obtenido para el spline periódico fue de aproximadamente 4.8362 solicitudes por minuto.

Los resultados de la comparación entre los tres modelos se presentan en la siguiente tabla.

#figure(
  table(
    columns: (1.5fr, 0.8fr, 0.8fr),
    inset: 4pt,
    align: center,
    table.header(
      [*Modelo*],
      [*RMSE*],
      [*Error máx.*],
    ),
    [Spline periódico], [4.8362], [6.8275],
    [Interpolación lineal], [5.4886], [7.5000],
    [Lagrange global], [8.6184], [11.9566],
  ),
  caption: [Comparación de errores obtenidos mediante la validación con dos mediciones retiradas.],
)

Los resultados muestran que el spline cúbico periódico presentó el menor RMSE y el menor error máximo absoluto de los tres métodos evaluados.

La interpolación lineal obtuvo un RMSE de 5.4886, mientras que el polinomio global de Lagrange presentó un RMSE de 8.6184. Esto evidencia un mejor desempeño del spline periódico para las dos mediciones utilizadas en la validación.

Es importante señalar que esta evaluación se realizó únicamente sobre dos puntos, por lo que los resultados describen el comportamiento de los modelos en este experimento y no garantizan que el spline periódico sea superior en cualquier conjunto de datos.

== Representación gráfica de la validación

La comparación gráfica permite observar las diferencias entre las curvas generadas por los tres métodos, así como la ubicación de los puntos de entrenamiento y las mediciones reservadas para la validación.

#figure(
  image("../assets/validacion_modelado.png", width: 100%),
  caption: [Comparación de la interpolación mediante spline cúbico periódico, interpolación lineal y polinomio global de Lagrange.],
) <fig:validacion-modelado>

== Conclusiones del modelado y validación

A partir del análisis realizado, se determinó que el spline cúbico periódico constituye una alternativa adecuada para representar la demanda diaria de solicitudes de taxis autónomos, dado que permite construir una curva suave y satisfacer las condiciones de continuidad entre el inicio y el final del ciclo de 24 horas.

La validación con dos mediciones retiradas permitió comparar objetivamente las estimaciones obtenidas por los diferentes métodos de interpolación. El spline periódico registró el menor RMSE, con un valor de 4.8362 solicitudes por minuto, seguido por la interpolación lineal y el polinomio global de Lagrange.

Finalmente, una vez concluida la validación, se construyó el modelo definitivo utilizando las diez mediciones originales y el nodo de cierre periódico. Este modelo constituye la base numérica que puede ser utilizada posteriormente por el componente de algoritmos y simulación para estimar la demanda en los distintos minutos del día.



