
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.interpolate import CubicSpline, BarycentricInterpolator
from pathlib import Path


def ejecutar_validacion():

    # 1. DATOS Y PLANTEAMIENTO MATEMATICO

    # Ubicacion de la raiz del proyecto
    ruta_raiz = Path(__file__).resolve().parents[2]

    # Ruta del archivo CSV
    ruta_csv = ruta_raiz / "data" / "data.csv"

    # Leer los datos desde el CSV
    datos = pd.read_csv(ruta_csv)

    # Verificar que existan las columnas necesarias
    columnas = {"nodo", "hora", "demanda"}

    if not columnas.issubset(datos.columns):
        raise ValueError(
            "El CSV debe contener nodo, hora y demanda"
        )

    # Convertir las columnas a arreglos numericos
    horas = datos["hora"].to_numpy(dtype=float)
    demanda = datos["demanda"].to_numpy(dtype=float)

    # Mostrar los datos originales
    print("\n=== DATOS ORIGINALES ===")
    print(datos.to_string(index=False))

    print("\nTotal de mediciones:", len(datos))

    # 2. VALIDACION CRUZADA (HOLD-OUT)

    # Reservamos las horas 9 y 18 para validar
    prueba = np.isin(horas, [9, 18])

    x_prueba = horas[prueba]
    y_prueba = demanda[prueba]

    x_entrenamiento = horas[~prueba]
    y_entrenamiento = demanda[~prueba]

    # Cierre del ciclo a las 24 horas
    x_cerrado = np.append(x_entrenamiento, 24)
    y_cerrado = np.append(y_entrenamiento, demanda[0])

    # 3. CONSTRUCCION DE MODELOS

    # Spline cubico periodico
    spline = CubicSpline(
        x_cerrado,
        y_cerrado,
        bc_type="periodic"
    )

    # Interpolacion lineal
    def lineal(t):
        return np.interp(t, x_cerrado, y_cerrado)

    # Polinomio de Lagrange global
    lagrange = BarycentricInterpolator(
        x_cerrado,
        y_cerrado
    )

    # 4. PREDICCIONES

    predicciones = {
        "Spline periodico": spline(x_prueba),
        "Lineal": lineal(x_prueba),
        "Lagrange": lagrange(x_prueba)
    }

    # 5. CALCULO DE ERRORES

    resultados = []
    detalles = []

    for nombre, predicho in predicciones.items():

        errores = y_prueba - predicho

        rmse = np.sqrt(np.mean(errores ** 2))
        error_max = np.max(np.abs(errores))

        resultados.append({
            "Modelo": nombre,
            "RMSE": rmse,
            "Error maximo absoluto": error_max
        })

        for hora, real, pred in zip(
            x_prueba, y_prueba, predicho
        ):
            detalles.append({
                "Modelo": nombre,
                "Hora": hora,
                "Real": real,
                "Predicho": pred,
                "Error absoluto": abs(real - pred)
            })

    tabla = pd.DataFrame(resultados)
    tabla_detalle = pd.DataFrame(detalles)

    print("\n=== RESULTADOS DE VALIDACION ===")
    print(tabla.round(4).to_string(index=False))

    print("\n=== PREDICCIONES EN HORAS 9 Y 18 ===")
    print(tabla_detalle.round(4).to_string(index=False))

    # 6. GRAFICA COMPARATIVA

    tiempo = np.linspace(0, 24, 500)

    plt.figure(figsize=(11, 6))

    plt.plot(
        tiempo, spline(tiempo),
        label="Spline cubico periodico",
        linewidth=2.5
    )

    plt.plot(
        tiempo, lineal(tiempo),
        "--", label="Interpolacion lineal"
    )

    plt.plot(
        tiempo, lagrange(tiempo),
        ":", label="Lagrange"
    )

    plt.scatter(
        x_entrenamiento, y_entrenamiento,
        color="black",
        label="Datos de entrenamiento",
        zorder=5
    )

    plt.scatter(
        x_prueba, y_prueba,
        color="red", marker="X", s=100,
        label="Datos de validacion",
        zorder=6
    )

    plt.xlabel("Hora del dia")
    plt.ylabel("Solicitudes por minuto")
    plt.title("Validacion de modelos de interpolacion")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()

    # Guardar resultados en assets
    ruta_raiz = Path(__file__).resolve().parents[2]
    ruta_assets = ruta_raiz / "assets"
    ruta_assets.mkdir(exist_ok=True)

    plt.savefig(
        ruta_assets / "validacion_modelado.png",
        dpi=180
    )
    plt.show()

    tabla.to_csv(
        ruta_assets / "resumen_errores.csv",
        index=False
    )

    tabla_detalle.to_csv(
        ruta_assets / "validacion_detallada.csv",
        index=False
    )

    # 7. MODELO FINAL PARA EL EQUIPO

    # Se construye usando los 10 datos originales
    # y el nodo de cierre periodico (24, 15).

    x_final = np.append(horas, 24)
    y_final = np.append(demanda, demanda[0])

    spline_final = CubicSpline(
        x_final,
        y_final,
        bc_type="periodic"
    )

    print("\nModelo final construido correctamente.")
    print("Resultados guardados en la carpeta assets.")

    return tabla, spline_final


if __name__ == "__main__":
    ejecutar_validacion()

