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
//     Aplicación de Splines Cúbicos en Problemas de Ingenieria
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
    (name: "Adam Kalel Ordoñez Herrera", organization: "Pontificia Universidad Javeriana", email: ""),
    (name: "Julian Andres Espinosa Caipe", organization: "Pontificia Universidad Javeriana", email: ""),
  ),
  abstract: [VACIO],
  index-terms: ("Análisis numérico", "Taxi"),
  bibliography: bibliography("refs.bib"),
)

= Introducción

Contenido

#plot(
  tick-label-size: 6pt,
  xmin: 0,
  xmax: 24,
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
      (21.0, 55),
      (24.0, 15)
    ),
    connect: true,
    stroke: blue + 1pt,
    // label: "Demanda",
    // label-pos: 0,
  ),
)
