# Villa Verde Smart: gestión inteligente de residuos

Proyecto académico de Ingeniería del Conocimiento que propone una ontología y un sistema de inferencia difusa para apoyar la gestión de residuos en el municipio ficticio de Villa Verde. El sistema busca priorizar rutas de recolección y jornadas de residuos de aparatos eléctricos y electrónicos (RAEE), además de ofrecer recomendaciones ciudadanas, explicando los criterios detrás de cada decisión.

> **Estado actual:** el sistema incluye una API Node.js/Express, modelos Mongoose, base de datos georreferenciada en **Manizales, Caldas** y sus veredas aledañas (`La Cabaña`, `El Rosario`, `Alto del Guamo`, `Río Blanco`), ontología OWL en `ontology/villa_verde_v3.owl`, priorización difusa Mamdani en JavaScript y cálculo de rutas.

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

1. **Mapa territorial:** mapa Mapbox con zonas, puntos de acopio y vehículos leídos desde MongoDB. Permite filtrar los marcadores y consultar puntos urgentes próximos a un vehículo.
2. **Simulador difuso:** envía saturación, accesibilidad y días sin servicio al backend; muestra la prioridad calculada, los grados de activación de las reglas y una explicación.
3. **Criterios y ciudadanía:** presenta ejemplos de criterios formalizados o excluidos por sesgo, junto con recomendaciones de separación y manejo de RAEE.

Las cifras y coordenadas del dataset son datos sintéticos. La inferencia usa conjuntos difusos y reglas Mamdani con agregación y centroide discretizado; las rutas usan la consulta geoespacial `$near` de MongoDB y Mapbox Directions.

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

## Ejecución local

Requisitos: Node.js 20 o posterior, Docker Desktop iniciado y un token de Mapbox. El frontend debe servirse desde Express (no abrir `prueba.html` como archivo local). El archivo `docker-compose.yml` inicia una instancia local de MongoDB 8; el puerto solo se publica en `127.0.0.1` y los datos permanecen en un volumen de Docker.

1. Instale dependencias: `npm install`.
2. Copie `.env.example` a `.env` y configure `MONGODB_URI`, `MAPBOX_PUBLIC_TOKEN` y `MAPBOX_SERVER_TOKEN`.
3. Inicie Docker Desktop y arranque MongoDB con `npm run db:up`.
4. Cargue los datos de demostración con `npm run seed`.
5. Inicie el backend con `npm start` y visite `http://localhost:3000`.

Use un token público de Mapbox para el mapa y mantenga el token usado por el backend fuera del repositorio. La página también carga Tailwind CSS, Font Awesome, Inter y Mapbox GL JS desde servicios externos; requiere conexión a Internet.

Para detener MongoDB sin borrar sus datos: `npm run db:down`. No ejecute `docker compose down -v` salvo que quiera borrar permanentemente el volumen local de la base de datos.

El seed es idempotente y actualiza las entidades de demostración sin vaciar la base. Para borrar y volver a insertar **solo** estas colecciones en la base indicada por `MONGODB_URI`, configure `ALLOW_SEED_RESET=true` y ejecute `npm run seed -- --reset`. No habilite esa opción en una base con datos que quiera conservar.

## API

- `GET /api/health`: estado de conexión a MongoDB.
- `GET /api/config/mapbox`: token público necesario para iniciar Mapbox GL JS.
- `GET /api/territorio/mapa`: zonas, puntos de acopio y vehículos.
- `POST /api/simulacion/ejecutar`: recibe `{ "puntoAcopioId": "...", "saturacion": 0, "accesibilidad": "Buena|Regular|Mala", "diasSinServicio": 0 }` y devuelve prioridad, pertenencias y reglas activadas.
- `POST /api/rutas/calcular`: recibe `{ "vehiculoId": "..." }`, busca puntos de alta prioridad cercanos con MongoDB y solicita el trazado vial a Mapbox Directions.

La priorización es una demostración académica, no una recomendación operativa. La accesibilidad difícil no elimina la prioridad sanitaria: se devuelve una indicación de planificar un vehículo apto y reevaluar el acceso.

## Estructura del repositorio

```text
.
├── README.md
├── prueba.html          # Interfaz del prototipo
├── src/
│   ├── client.js        # Mapa Mapbox y comunicación con la API
│   ├── fuzzy.js         # Inferencia difusa y reglas explicables
│   ├── models.js        # Modelos Mongoose e índices geoespaciales
│   ├── seed.js          # Dataset sintético E1–E3
│   └── server.js        # API REST y conexión a MongoDB
└── test/
    └── fuzzy.test.js    # Pruebas del motor difuso
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

## Validación y próximos pasos

- Ejecutar las pruebas unitarias con `npm test`.
- Sustituir las coordenadas sintéticas por coordenadas del escenario cuando estén definidas.
- Implementar la ontología en OWL o documentar formalmente la red semántica.
- Justificar y validar las funciones de pertenencia y las reglas con adquisición de conocimiento.
- Añadir persistencia y trazabilidad para las salidas y métricas de las simulaciones.
- Validar consistencia ontológica y documentar la comparación de rutas y la precisión de priorización.

El modelo de MongoDB cubre zonas, puntos de acopio, vehículos y eventos de contexto. Protégé, HermiT o Pellet siguen siendo alternativas para el componente ontológico, que todavía no está implementado.
