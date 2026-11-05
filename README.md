# Villa Verde Smart: gestión inteligente de residuos

Proyecto académico de Ingeniería del Conocimiento que propone una ontología y un sistema de inferencia difusa para apoyar la gestión de residuos en el municipio ficticio de Villa Verde. El sistema busca priorizar rutas de recolección y jornadas de residuos de aparatos eléctricos y electrónicos (RAEE), además de ofrecer recomendaciones ciudadanas, explicando los criterios detrás de cada decisión.

> **Estado actual:** el repositorio contiene un prototipo visual de demostración en `prueba.html`. El mapa, sus ubicaciones y recorridos son esquemáticos; los datos son ficticios y la pantalla del simulador presenta un ejemplo ilustrativo, no un motor difuso conectado a datos reales.

## Problema y objetivos

En el escenario académico, los puntos de acopio pueden saturarse, los RAEE pueden mezclarse con residuos ordinarios y algunas zonas rurales pueden tener menor frecuencia de recolección. Además, los criterios informales de priorización pueden producir decisiones inconsistentes o inequitativas.

El proyecto busca:

- Representar los conceptos y relaciones del dominio mediante una ontología y un grafo de conocimiento.
- Formalizar criterios operativos con variables y reglas de lógica difusa.
- Proponer prioridades explicables para rutas y jornadas de RAEE.
- Recomendar prácticas de separación y puntos de acopio a la ciudadanía.
- Evaluar el prototipo con datos sintéticos, métricas y escenarios de prueba.

## Prototipo disponible

La página de demostración ofrece tres secciones:

1. **Mapa ontológico:** mapa esquemático con comunas, veredas, puntos de acopio y camiones. Permite filtrar los marcadores, consultar sus detalles y mostrar u ocultar rutas sugeridas.
2. **Simulador difuso:** muestra variables de ejemplo —saturación, accesibilidad y días sin servicio—, reglas ilustrativas y una salida de prioridad con una traza explicativa.
3. **Criterios y ciudadanía:** presenta ejemplos de criterios formalizados o excluidos por sesgo, junto con recomendaciones de separación y manejo de RAEE.

Las cifras, estados, prioridades y explicaciones que aparecen en la interfaz son datos de demostración. En particular, los controles visibles no ejecutan todavía un cálculo difuso dinámico.

## Modelo de conocimiento propuesto

### Conceptos de la ontología

El dominio contempla, como mínimo, las clases `Residuo`, `TipoRAEE`, `Zona`, `PuntoAcopio`, `Ruta`, `Gestor`, `Criticidad`, `EventoClimático` y `QuejaCiudadana`. La ontología debe describir sus propiedades, relaciones y restricciones, y podrá poblarse con instancias sintéticas para formar un grafo de conocimiento.

### Variables difusas

La propuesta inicial incluye:

| Variable | Términos lingüísticos |
|---|---|
| Saturación | Baja, media, alta |
| Accesibilidad | Buena, regular, mala |
| Volumen de RAEE | Bajo, medio, alto |
| Criticidad | Baja, media, alta, crítica |
| Prioridad de atención | Baja, media, alta, urgente o inmediata |

Una alternativa de diseño es agrupar las entradas en dos niveles: calcular primero la criticidad a partir de la saturación, la sensibilidad del entorno y los días sin servicio; luego estimar la prioridad considerando también la accesibilidad y las restricciones operativas. Los rangos, las funciones de pertenencia y las reglas definitivas deben justificarse con la adquisición de conocimiento.

### Criterios éticos

Se consideran pertinentes los factores relacionados con riesgos y operación, como la saturación, la cercanía a población o entornos sensibles, la accesibilidad, la capacidad disponible y la disponibilidad de un gestor autorizado. Se excluyen criterios basados en favoritismos o visibilidad política. La equidad territorial también debe contemplarse, por ejemplo, considerando los días sin servicio y evitando aplazamientos indefinidos de las veredas.

## Ejecución

No se requiere instalar dependencias ni iniciar un servidor para ver la maqueta:

1. Descargue o clone este repositorio.
2. Abra `prueba.html` directamente en un navegador moderno.

La página carga Tailwind CSS, Font Awesome y la fuente Inter desde servicios externos; se necesita conexión a Internet para que esos recursos se vean correctamente. No hay backend ni persistencia de datos.

## Estructura del repositorio

```text
.
├── README.md
└── prueba.html   # Prototipo visual autocontenido
```

## Metodología y validación previstas

El plan de trabajo organiza el desarrollo en seis etapas: adquisición del conocimiento; modelado conceptual; construcción de la ontología, reglas y datos sintéticos; integración y simulación; validación; y cierre con documentación y demostración.

La adquisición puede documentarse en una matriz con actores como operarios, gestores de RAEE y ciudadanía, usando entrevistas, encuestas simuladas o reales y análisis documental. Los datos personales reales no deben incorporarse al prototipo; se deben usar datos sintéticos o anonimizados y gestionar el aval ético que corresponda.

La evaluación prevista incluye:

- Cobertura de los conceptos del escenario y consistencia de la ontología, comprobada con un razonador.
- Precisión de la priorización frente a casos de referencia.
- Reducción estimada de recorridos al comparar escenarios simulados.
- Satisfacción simulada y transparencia de las recomendaciones.
- Explicación de cada decisión mediante las reglas activadas o los grados de pertenencia relevantes.

## Próximos pasos

- Implementar la ontología en OWL o documentar formalmente la red semántica y poblarla con instancias sintéticas.
- Definir y justificar las funciones de pertenencia y completar la base de reglas.
- Conectar los controles del prototipo a un motor difuso y a datos de prueba.
- Integrar la explicación de cada prioridad y las recomendaciones ciudadanas.
- Ejecutar la validación ontológica y las simulaciones de rutas, y documentar sus métricas.

Las tecnologías para implementar esos componentes quedan por decidir; Protégé, HermiT o Pellet, y scikit-fuzzy son alternativas mencionadas durante la planificación, no dependencias de la página actual.
