require('dotenv').config();

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const mongoose = require('mongoose');
const {
  Zona,
  PuntoAcopio,
  Vehiculo,
  EventoContexto,
  Ruta,
} = require('./models');
const {
  fuzzyPriority,
  deriveScenarioContext,
  prioritizeRouteStops,
  isRaeeDangerous,
} = require('./fuzzy');
const seedData = require('./seed');

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.resolve(__dirname, '..');

app.use(express.json({ limit: '32kb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.get('/', (req, res) => res.sendFile(path.join(publicDirectory, 'prueba.html')));
app.get('/src/fuzzy.js', (req, res) => res.sendFile(path.join(__dirname, 'fuzzy.js')));
app.get('/src/client.js', (req, res) => res.sendFile(path.join(__dirname, 'client.js')));
app.get('/ontology/villa_verde_v3.owl', (req, res) => {
  res.type('application/rdf+xml');
  res.sendFile(path.join(publicDirectory, 'ontology', 'villa_verde_v3.owl'));
});

function loadOntologyMetadata() {
  const owlPath = path.join(publicDirectory, 'ontology', 'villa_verde_v3.owl');
  const xml = fs.readFileSync(owlPath, 'utf8');
  const extractIds = (tag) => [...xml.matchAll(new RegExp(`<${tag}\\s+rdf:about="#([^"]+)"`, 'g'))].map((m) => m[1]);
  return {
    file: 'ontology/villa_verde_v3.owl',
    iri: 'http://www.semanticweb.org/ontologies/2026/villa_verde',
    classes: extractIds('owl:Class'),
    objectProperties: extractIds('owl:ObjectProperty'),
    datatypeProperties: extractIds('owl:DatatypeProperty'),
    individuals: extractIds('owl:NamedIndividual'),
  };
}

app.get('/api/ontologia/resumen', (req, res, next) => {
  try {
    res.json(loadOntologyMetadata());
  } catch (error) {
    next(error);
  }
});

app.get('/api/ontologia/grafo', (req, res, next) => {
  try {
    const grafoPath = path.join(publicDirectory, 'grafo_villa_verde.json');
    if (!fs.existsSync(grafoPath)) {
      return apiError(res, 404, 'No se encontró el archivo del grafo ontológico.');
    }
    res.type('application/json');
    res.sendFile(grafoPath);
  } catch (error) {
    next(error);
  }
});

app.get('/api/ontologia/grafo/descargar', (req, res, next) => {
  try {
    const grafoPath = path.join(publicDirectory, 'grafo_villa_verde.json');
    if (!fs.existsSync(grafoPath)) {
      return apiError(res, 404, 'No se encontró el archivo del grafo ontológico.');
    }
    res.download(grafoPath, 'grafo_villa_verde.json');
  } catch (error) {
    next(error);
  }
});

function apiError(res, status, message) {
  return res.status(status).json({ error: message });
}

/**
 * Estado operativo en memoria hidratado desde seed.js (Manizales, Caldas),
 * garantizando operación continua incluso sin instancia activa de MongoDB
 * y sincronización bidireccional cuando MongoDB está conectado.
 */
function buildOperationalStore() {
  const zonas = seedData.zones.map((zone, index) => ({
    _id: String(new mongoose.Types.ObjectId(String(index + 1).padStart(24, '0'))),
    codigo: zone.codigo,
    nombre: zone.nombre,
    tipo: zone.tipo,
    hito_referencia: zone.hito_referencia,
    barrios_agrupados: zone.barrios_agrupados,
    ubicacion: zone.location,
    sensibilidad_entorno: zone.sensibilidad,
    dias_sin_servicio: zone.days,
    demanda_esperada: zone.demand,
  }));
  const zoneByName = new Map(zonas.map((z) => [z.nombre, z]));

  const puntos = seedData.points.map((point, index) => {
    const zone = zoneByName.get(point.zona);
    return {
      _id: String(new mongoose.Types.ObjectId(String(index + 101).padStart(24, '0'))),
      codigo: point.codigo,
      nombre: point.nombre,
      zona_id: zone,
      barrios_cobertura: point.barrios_cobertura,
      direccion_referencia: point.direccion_referencia,
      ubicacion: point.location,
      saturacion_ordinarios: point.ordinary,
      saturacion_raee: point.raee,
      accesibilidad_actual: point.accessibility || 'Buena',
      tipos_raee_acumulados: point.raeeTypes,
    };
  });

  const vehiculos = seedData.vehicles.map((vehicle, index) => ({
    _id: String(new mongoose.Types.ObjectId(String(index + 201).padStart(24, '0'))),
    identificador: vehicle.identificador,
    tipo: vehicle.tipo,
    placa: vehicle.placa,
    base_operativa: vehicle.base_operativa,
    capacidad_restante: vehicle.capacity,
    ubicacion_actual: vehicle.location,
    disponible: vehicle.available !== false,
  }));

  const eventos = seedData.contextEvents.map((event, index) => {
    const zone = zoneByName.get(event.zone);
    return {
      _id: String(new mongoose.Types.ObjectId(String(index + 301).padStart(24, '0'))),
      codigo: event.codigo,
      zona_id: zone ? zone._id : null,
      zona_nombre: event.zone,
      nodo_referencia: event.nodo_referencia,
      barrio_origen: event.barrio_origen,
      tipo_evento: event.type,
      severidad: event.severity,
      descripcion: event.description,
      estado_via: event.road,
      activo: true,
    };
  });

  const rutas = seedData.routes.map((route, index) => ({
    _id: String(new mongoose.Types.ObjectId(String(index + 401).padStart(24, '0'))),
    ...route,
  }));

  return { zonas, puntos, vehiculos, eventos, rutas };
}

let operationalStore = buildOperationalStore();

function resetOperationalStore() {
  operationalStore = buildOperationalStore();
  return operationalStore;
}

function haversineMeters([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEventsByZoneMap(eventos) {
  const map = new Map();
  eventos.filter((e) => e.activo !== false).forEach((event) => {
    const zoneId = String(event.zona_id?._id || event.zona_id);
    map.set(zoneId, [...(map.get(zoneId) || []), event]);
  });
  return map;
}

function hasAvailableRaeeManager(vehiculos = []) {
  return vehiculos.some(
    (v) => v.tipo === 'RAEE_Especial' && v.disponible !== false && Number(v.capacidad_restante) > 0,
  );
}

function enrichPointsForMap(puntos, eventos, vehiculos, stringifyIds = false) {
  const eventsByZone = getEventsByZoneMap(eventos);
  const gestorDisponible = hasAvailableRaeeManager(vehiculos);

  return puntos.map((punto) => {
    const zId = punto.zona_id ? String(punto.zona_id._id || punto.zona_id) : '';
    const ctx = deriveScenarioContext(
      eventsByZone.get(zId) || [],
      punto.zona_id?.sensibilidad_entorno ?? 50,
      punto.accesibilidad_actual || 'Buena',
    );
    const puntoSensible = typeof punto.entorno_sensible === 'boolean'
      ? punto.entorno_sensible
      : ctx.puntoEnEntornoSensible;
    const raeePeligroso = isRaeeDangerous(punto.tipos_raee_acumulados);
    const evalOrd = fuzzyPriority({
      saturation: punto.saturacion_ordinarios,
      sensitivity: ctx.sensitivity,
      daysWithoutService: punto.zona_id?.dias_sin_servicio ?? 1,
      accessibility: ctx.accessibility,
      puntoEnEntornoSensible: puntoSensible,
      capacidadRestantePct: 80,
      volumenRaee: punto.saturacion_raee,
      gestorDisponible,
      tipoRaeeEsPeligroso: raeePeligroso,
    });

    const base = {
      ...punto,
      _id: String(punto._id),
      entorno_sensible: puntoSensible,
      raee_peligroso: raeePeligroso,
      prioridad_calculada: evalOrd.priority,
      criticidad_calculada: evalOrd.criticidad,
      score_calculado: evalOrd.score,
    };

    if (stringifyIds && punto.zona_id) {
      base.zona_id = {
        _id: String(punto.zona_id._id),
        codigo: punto.zona_id.codigo,
        nombre: punto.zona_id.nombre,
        hito_referencia: punto.zona_id.hito_referencia,
        barrios_agrupados: punto.zona_id.barrios_agrupados,
        sensibilidad_entorno: punto.zona_id.sensibilidad_entorno,
        dias_sin_servicio: punto.zona_id.dias_sin_servicio,
      };
    }

    return base;
  });
}

async function getMapData() {
  if (mongoose.connection.readyState === 1) {
    const [zonas, puntos, vehiculos, eventos, rutas] = await Promise.all([
      Zona.find().lean(),
      PuntoAcopio.find().populate('zona_id').lean(),
      Vehiculo.find().lean(),
      EventoContexto.find({ activo: true }).lean(),
      Ruta.find({ activa: true }).lean(),
    ]);
    if (zonas.length && puntos.length && vehiculos.length) {
      return {
        zonas: zonas.map((z) => ({ ...z, _id: String(z._id) })),
        puntos: enrichPointsForMap(puntos, eventos, vehiculos, true),
        vehiculos: vehiculos.map((v) => ({ ...v, _id: String(v._id) })),
        eventos: eventos.map((e) => ({ ...e, _id: String(e._id), zona_id: String(e.zona_id) })),
        rutas: rutas.map((r) => ({ ...r, _id: String(r._id) })),
      };
    }
  }

  return {
    zonas: operationalStore.zonas,
    puntos: enrichPointsForMap(
      operationalStore.puntos,
      operationalStore.eventos,
      operationalStore.vehiculos,
      false,
    ),
    vehiculos: operationalStore.vehiculos,
    eventos: operationalStore.eventos,
    rutas: operationalStore.rutas,
  };
}

app.get('/api/health', (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    storage: mongoConnected ? 'mongodb' : 'operational_memory_manizales',
    territory: 'Manizales, Caldas',
  });
});

app.get('/api/config/mapbox', (req, res) => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN;
  const isValidToken = Boolean(token && token.startsWith('pk.') && token !== 'pk.your_public_mapbox_token');
  return res.json({
    publicToken: isValidToken ? token : null,
    center: [-75.5012, 5.0689],
    city: 'Manizales, Caldas',
  });
});

app.get('/api/territorio/mapa', async (req, res, next) => {
  try {
    res.json(await getMapData());
  } catch (error) {
    next(error);
  }
});

app.get('/api/nodos/resolver-barrio', (req, res) => {
  const barrio = String(req.query.barrio || '').trim();
  if (!barrio) {
    return apiError(res, 400, 'Debe indicar el nombre del barrio o sector en Manizales.');
  }
  const node = seedData.resolveBarrioToNode(barrio);
  if (!node) {
    return apiError(res, 404, `No se encontró un nodo de referencia para el sector "${barrio}".`);
  }
  return res.json({
    barrioConsultado: barrio,
    nodoReferencia: node.nombre,
    codigoNodo: node.codigo,
    zona: node.zona,
    direccionReferencia: node.direccion_referencia,
    coordenadas: node.location.coordinates,
    barriosCobertura: node.barrios_cobertura,
    tiposRaeeAceptados: node.raeeTypes,
  });
});

async function handleInferenceEvaluation(req, res, next) {
  try {
    const {
      puntoAcopioId,
      saturacion: saturation,
      accesibilidad,
      diasSinServicio,
      vehiculoId,
      capacidadRestantePct,
      volumenRaee,
      puntoEnEntornoSensible,
      gestorDisponible,
      tipoRaeeEsPeligroso,
    } = req.body || {};

    if (!puntoAcopioId || !mongoose.isValidObjectId(puntoAcopioId)) {
      return apiError(res, 400, 'puntoAcopioId debe ser un identificador válido.');
    }
    if (!Number.isFinite(saturation) || saturation < 0 || saturation > 100) {
      return apiError(res, 400, 'saturacion debe ser un número entre 0 y 100.');
    }
    if (!['Buena', 'Regular', 'Mala'].includes(accesibilidad)) {
      return apiError(res, 400, 'accesibilidad debe ser Buena, Regular o Mala.');
    }
    if (!Number.isFinite(diasSinServicio) || diasSinServicio < 0 || diasSinServicio > 15) {
      return apiError(res, 400, 'diasSinServicio debe ser un número entre 0 y 15.');
    }
    if (capacidadRestantePct !== undefined && (!Number.isFinite(capacidadRestantePct) || capacidadRestantePct < 0 || capacidadRestantePct > 100)) {
      return apiError(res, 400, 'capacidadRestantePct debe ser un número entre 0 y 100.');
    }
    if (volumenRaee !== undefined && (!Number.isFinite(volumenRaee) || volumenRaee < 0 || volumenRaee > 100)) {
      return apiError(res, 400, 'volumenRaee debe ser un número entre 0 y 100.');
    }

    let punto;
    let zona;
    let allPoints;
    let allEvents;
    let allVehicles = operationalStore.vehiculos;
    let selectedVehicle = null;

    if (mongoose.connection.readyState === 1) {
      const dbPoint = await PuntoAcopio.findById(puntoAcopioId).populate('zona_id');
      if (dbPoint && dbPoint.zona_id) {
        dbPoint.saturacion_ordinarios = saturation;
        dbPoint.accesibilidad_actual = accesibilidad;
        if (volumenRaee !== undefined) dbPoint.saturacion_raee = volumenRaee;
        if (typeof puntoEnEntornoSensible === 'boolean') dbPoint.entorno_sensible = puntoEnEntornoSensible;
        if (typeof gestorDisponible === 'boolean') dbPoint.gestor_disponible = gestorDisponible;
        await dbPoint.save();
        await Zona.updateOne({ _id: dbPoint.zona_id._id }, { $set: { dias_sin_servicio: diasSinServicio } });
        punto = await PuntoAcopio.findById(puntoAcopioId).populate('zona_id').lean();
        zona = punto.zona_id;
        allPoints = await PuntoAcopio.find().populate('zona_id').lean();
        allEvents = await EventoContexto.find({ activo: true }).lean();
        allVehicles = await Vehiculo.find().lean();
        if (vehiculoId && mongoose.isValidObjectId(vehiculoId)) {
          selectedVehicle = allVehicles.find((veh) => String(veh._id) === String(vehiculoId)) || null;
        }
      }
    }

    if (!punto) {
      const memPoint = operationalStore.puntos.find((p) => String(p._id) === String(puntoAcopioId));
      if (!memPoint) return apiError(res, 404, 'No se encontró el nodo de acopio.');
      zona = memPoint.zona_id;
      if (!zona) return apiError(res, 409, 'El nodo de acopio no tiene una zona válida asociada.');

      // Actualizar estado operativo del nodo y recalcular orden de ruta
      memPoint.saturacion_ordinarios = saturation;
      memPoint.accesibilidad_actual = accesibilidad;
      if (volumenRaee !== undefined) memPoint.saturacion_raee = volumenRaee;
      if (typeof puntoEnEntornoSensible === 'boolean') memPoint.entorno_sensible = puntoEnEntornoSensible;
      if (typeof gestorDisponible === 'boolean') memPoint.gestor_disponible = gestorDisponible;
      if (typeof tipoRaeeEsPeligroso === 'boolean') memPoint.raee_peligroso = tipoRaeeEsPeligroso;
      zona.dias_sin_servicio = diasSinServicio;
      punto = memPoint;
      allPoints = operationalStore.puntos;
      allEvents = operationalStore.eventos;
      allVehicles = operationalStore.vehiculos;
      if (vehiculoId) {
        selectedVehicle = allVehicles.find((veh) => String(veh._id) === String(vehiculoId)) || null;
      }
    }

    const selectedVehicleType = selectedVehicle?.tipo || 'Compactador';
    const effectiveCapacityPct = capacidadRestantePct !== undefined
      ? capacidadRestantePct
      : (selectedVehicle?.capacidad_restante ?? 80);
    const effectiveVolumenRaee = volumenRaee !== undefined
      ? volumenRaee
      : (punto.saturacion_raee ?? 0);
    const effectiveGestorDisponible = typeof gestorDisponible === 'boolean'
      ? gestorDisponible
      : hasAvailableRaeeManager(allVehicles);
    const effectiveTipoPeligroso = typeof tipoRaeeEsPeligroso === 'boolean'
      ? tipoRaeeEsPeligroso
      : isRaeeDangerous(punto.tipos_raee_acumulados);

    const eventsByZone = getEventsByZoneMap(allEvents);
    const zoneEvents = eventsByZone.get(String(zona._id)) || [];
    const context = deriveScenarioContext(zoneEvents, zona.sensibilidad_entorno, accesibilidad);
    const effectiveEntornoSensible = typeof puntoEnEntornoSensible === 'boolean'
      ? puntoEnEntornoSensible
      : (typeof punto.entorno_sensible === 'boolean' ? punto.entorno_sensible : context.puntoEnEntornoSensible);

    const result = fuzzyPriority({
      saturation,
      sensitivity: context.sensitivity,
      daysWithoutService: diasSinServicio,
      accessibility: context.accessibility,
      puntoEnEntornoSensible: effectiveEntornoSensible,
      capacidadRestantePct: effectiveCapacityPct,
      volumenRaee: effectiveVolumenRaee,
      gestorDisponible: effectiveGestorDisponible,
      tipoRaeeEsPeligroso: effectiveTipoPeligroso,
    });

    const orderedStops = prioritizeRouteStops(
      allPoints,
      eventsByZone,
      { tipo: selectedVehicleType, capacidad_restante: effectiveCapacityPct },
      { gestorDisponible: effectiveGestorDisponible },
    );
    const stopIndex = orderedStops.findIndex((stop) => String(stop.id) === String(punto._id));

    res.json({
      puntoAcopio: {
        id: String(punto._id),
        codigo: punto.codigo,
        nombre: punto.nombre,
        barrios_cobertura: punto.barrios_cobertura || [],
        direccion_referencia: punto.direccion_referencia || '',
      },
      zona: {
        id: String(zona._id),
        nombre: zona.nombre,
        hito_referencia: zona.hito_referencia || punto.nombre,
      },
      inputs: {
        saturation,
        sensitivity: context.sensitivity,
        daysWithoutService: diasSinServicio,
        accessibility: result.accessibility,
        puntoEnEntornoSensible: effectiveEntornoSensible,
        capacidadRestantePct: effectiveCapacityPct,
        volumenRaee: effectiveVolumenRaee,
        gestorDisponible: effectiveGestorDisponible,
        tipoRaeeEsPeligroso: effectiveTipoPeligroso,
      },
      context: {
        ...context,
        baseSensitivity: zona.sensibilidad_entorno,
      },
      routeOrderPosition: stopIndex >= 0 ? stopIndex + 1 : null,
      updatedRouteStops: orderedStops,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

app.post('/api/simulacion/ejecutar', handleInferenceEvaluation);
app.post('/api/inferencia/evaluar', handleInferenceEvaluation);

async function handleRouteCalculation(req, res, next) {
  try {
    const {
      vehiculoId,
      capacidadRestantePct,
      gestorDisponible: gestorOverride,
    } = req.body || {};
    if (!vehiculoId || !mongoose.isValidObjectId(vehiculoId)) {
      return apiError(res, 400, 'vehiculoId debe ser un identificador válido.');
    }

    let vehicle;
    let pointsList;
    let eventsList;
    let vehiclesList = operationalStore.vehiculos;

    if (mongoose.connection.readyState === 1) {
      vehicle = await Vehiculo.findOne({ _id: vehiculoId, disponible: true }).lean();
      if (vehicle) {
        pointsList = await PuntoAcopio.find({
          ubicacion: {
            $near: {
              $geometry: vehicle.ubicacion_actual,
            },
          },
        }).limit(50).populate('zona_id').lean();
        eventsList = await EventoContexto.find({ activo: true }).lean();
        vehiclesList = await Vehiculo.find().lean();
      }
    }

    if (!vehicle) {
      vehicle = operationalStore.vehiculos.find(
        (v) => String(v._id) === String(vehiculoId) && v.disponible,
      );
      if (!vehicle) return apiError(res, 404, 'No se encontró un vehículo operativo disponible.');
      pointsList = [...operationalStore.puntos].sort(
        (a, b) => haversineMeters(vehicle.ubicacion_actual.coordinates, a.ubicacion.coordinates)
          - haversineMeters(vehicle.ubicacion_actual.coordinates, b.ubicacion.coordinates),
      );
      eventsList = operationalStore.eventos;
      vehiclesList = operationalStore.vehiculos;
    }

    if (vehicle.capacidad_restante <= 0) {
      return apiError(res, 409, 'El vehículo seleccionado no tiene capacidad remanente.');
    }

    const eventsByZone = getEventsByZoneMap(eventsList);
    const gestorDisponible = typeof gestorOverride === 'boolean'
      ? gestorOverride
      : hasAvailableRaeeManager(vehiclesList);
    const effectiveVehicle = Number.isFinite(capacidadRestantePct)
      ? { ...vehicle, capacidad_restante: capacidadRestantePct }
      : vehicle;
    const rankedStops = prioritizeRouteStops(pointsList, eventsByZone, effectiveVehicle, { gestorDisponible });

    if (rankedStops.length === 0) {
      return res.json({
        vehicle: {
          id: String(vehicle._id),
          identificador: vehicle.identificador,
          tipo: vehicle.tipo,
        },
        routes: [],
      });
    }

    const selectedStops = rankedStops.slice(0, 12);
    const routeCoords = [
      vehicle.ubicacion_actual.coordinates,
      ...selectedStops.map((stop) => stop.coordinates),
    ];

    const serverToken = process.env.MAPBOX_SERVER_TOKEN;
    const hasValidMapboxToken = Boolean(
      serverToken
      && serverToken.startsWith('pk.')
      && serverToken !== 'pk.your_server_mapbox_token',
    );

    if (hasValidMapboxToken) {
      try {
        const coordinatesParam = routeCoords
          .map(([longitude, latitude]) => `${longitude},${latitude}`)
          .join(';');
        const mapboxUrl = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesParam}`);
        mapboxUrl.searchParams.set('access_token', serverToken);
        mapboxUrl.searchParams.set('geometries', 'geojson');
        mapboxUrl.searchParams.set('overview', 'full');
        mapboxUrl.searchParams.set('steps', 'false');
        const mapboxResponse = await fetch(mapboxUrl, { signal: AbortSignal.timeout(8000) });
        if (mapboxResponse.ok) {
          const directions = await mapboxResponse.json();
          if (directions.routes?.length) {
            return res.json({
              vehicle: {
                id: String(vehicle._id),
                identificador: vehicle.identificador,
                tipo: vehicle.tipo,
              },
              routes: [{
                geometry: directions.routes[0].geometry,
                distanceMeters: Math.round(directions.routes[0].distance),
                durationSeconds: Math.round(directions.routes[0].duration),
                stops: selectedStops,
              }],
            });
          }
        }
      } catch (_err) {
        // Continúa con trazado geodésico operativo sobre la red de nodos de Manizales
      }
    }

    let totalLinearMeters = 0;
    for (let i = 1; i < routeCoords.length; i += 1) {
      totalLinearMeters += haversineMeters(routeCoords[i - 1], routeCoords[i]);
    }
    // Factor de sinuosidad vial topográfica de Manizales (1.38x) y velocidad media urbana/veredal (26 km/h)
    const roadDistanceMeters = Math.round(totalLinearMeters * 1.38);
    const durationSeconds = Math.round(roadDistanceMeters / (26000 / 3600));

    return res.json({
      vehicle: {
        id: String(vehicle._id),
        identificador: vehicle.identificador,
        tipo: vehicle.tipo,
      },
      routes: [{
        geometry: {
          type: 'LineString',
          coordinates: routeCoords,
        },
        distanceMeters: roadDistanceMeters,
        durationSeconds,
        stops: selectedStops,
      }],
    });
  } catch (error) {
    next(error);
  }
}

app.post('/api/rutas/calcular', handleRouteCalculation);

app.use('/api', (req, res) => apiError(res, 404, 'Endpoint no encontrado.'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);
  return apiError(res, 500, 'Ocurrió un error interno al procesar la operación.');
});

let server;

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
    } catch (_error) {
      console.warn('MongoDB no disponible localmente; operando con motor en memoria cargado desde seed.js (Manizales).');
    }
  }
  server = app.listen(port, () => {
    console.log(`Sistema Experto de Gestión de Residuos Manizales activo en http://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('No fue posible iniciar el servidor:', error);
    process.exitCode = 1;
  });
}

async function stop() {
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  app,
  start,
  stop,
  getMapData,
  loadOntologyMetadata,
  handleInferenceEvaluation,
  handleRouteCalculation,
  resetOperationalStore,
};
