const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  fuzzyPriority,
  deriveScenarioContext,
} = require('../src/fuzzy');
const {
  zones,
  points,
  vehicles,
  contextEvents,
  routes,
  resolveBarrioToNode,
} = require('../src/seed');
const {
  getMapData,
  loadOntologyMetadata,
  handleInferenceEvaluation,
  handleRouteCalculation,
  resetOperationalStore,
} = require('../src/server');

function invokeHandler(handler, body) {
  return new Promise((resolve, reject) => {
    const req = { body };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, data: payload });
        return this;
      },
    };
    handler(req, res, reject);
  });
}

test('1. Geolocalización de seed.js corresponde a Manizales, Caldas y sus veredas aledañas', () => {
  assert.ok(zones.length >= 12, 'Debe existir un alto volumen de zonas territoriales');
  assert.ok(points.length >= 16, 'Debe existir un alto volumen de nodos de acopio');
  assert.ok(vehicles.length >= 8, 'Debe existir una flota completa de vehículos');
  assert.ok(contextEvents.length >= 10, 'Deben existir quejas ciudadanas y eventos climáticos');
  assert.ok(routes.length >= 5, 'Deben existir rutas de camiones estructuradas');

  for (const zone of zones) {
    const [lon, lat] = zone.location.coordinates;
    assert.ok(lon >= -75.65 && lon <= -75.38, `Longitud fuera de Manizales en ${zone.nombre}: ${lon}`);
    assert.ok(lat >= 5.01 && lat <= 5.16, `Latitud fuera de Manizales en ${zone.nombre}: ${lat}`);
  }

  for (const point of points) {
    const [lon, lat] = point.location.coordinates;
    assert.ok(lon >= -75.65 && lon <= -75.38, `Longitud fuera de Manizales en ${point.nombre}: ${lon}`);
    assert.ok(lat >= 5.01 && lat <= 5.16, `Latitud fuera de Manizales en ${point.nombre}: ${lat}`);
  }

  const zoneNames = zones.map((z) => z.nombre);
  assert.ok(zoneNames.includes('Vereda La Cabaña'), 'Debe incluir Vereda La Cabaña');
  assert.ok(zoneNames.includes('Vereda El Rosario'), 'Debe incluir Vereda El Rosario');
  assert.ok(zoneNames.includes('Vereda Alto del Guamo'), 'Debe incluir Vereda Alto del Guamo');
});

test('2. Regla de Nodos de Referencia: La Carola se mapea a Mall Plaza y otros barrios a sus hitos', () => {
  const carolaNode = resolveBarrioToNode('La Carola');
  assert.ok(carolaNode, 'Debe resolver el barrio La Carola');
  assert.equal(carolaNode.nombre, 'Mall Plaza');

  const centroNode = resolveBarrioToNode('Los Agustinos');
  assert.ok(centroNode);
  assert.equal(centroNode.nombre, 'Plaza de Bolívar');

  const cableNode = resolveBarrioToNode('El Cable');
  assert.ok(cableNode);
  assert.equal(cableNode.nombre, 'Torre del Cable');

  const cabanaNode = resolveBarrioToNode('La Cabaña');
  assert.ok(cabanaNode);
  assert.equal(cabanaNode.nombre, 'Centro Poblado La Cabaña');
});

test('3. Regla de Oro de UI: Prohibido mostrar simulado, simulador o simulación en la interfaz', () => {
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'prueba.html'), 'utf8');
  const clientContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'client.js'), 'utf8');
  const forbiddenPattern = /\bsimulad[oa]s?\b|\bsimulador(?:es)?\b|\bsimulaci[oó]n(?:es)?\b/i;

  assert.equal(
    forbiddenPattern.test(htmlContent),
    false,
    'prueba.html no debe contener términos prohibidos (simulado/simulador/simulación)',
  );
  assert.equal(
    forbiddenPattern.test(clientContent),
    false,
    'src/client.js no debe contener términos prohibidos (simulado/simulador/simulación)',
  );
});

test('4. Motor difuso evalúa casos extremos: máxima urgencia vs. vía bloqueada por clima en Alto del Guamo', () => {
  const regularCase = fuzzyPriority({
    saturation: 15,
    sensitivity: 20,
    daysWithoutService: 0,
    accessibility: 'Buena',
  });
  const criticalCase = fuzzyPriority({
    saturation: 95,
    sensitivity: 92,
    daysWithoutService: 11,
    accessibility: 'Buena',
  });

  assert.equal(regularCase.priority, 'Baja');
  assert.equal(criticalCase.priority, 'Inmediata');
  assert.ok(criticalCase.score > regularCase.score);
  assert.ok(criticalCase.activatedRules.some((rule) => rule.id === 'R01'));
  assert.ok(criticalCase.activatedRules.some((rule) => rule.id === 'R10'));

  // Caso extremo: Vía bloqueada por derrumbe en Alto del Guamo + saturación alta
  const guamoEvents = contextEvents
    .filter((e) => e.nodo_referencia === 'Alto del Guamo')
    .map((e) => ({ tipo_evento: e.type, severidad: e.severity, estado_via: e.road, activo: true }));
  const guamoContext = deriveScenarioContext(guamoEvents, 75, 'Buena');
  assert.equal(guamoContext.accessibility, 'Mala', 'El evento climático de derrumbe debe forzar accesibilidad Mala');

  const blockedRoadEvaluation = fuzzyPriority({
    saturation: 88,
    sensitivity: guamoContext.sensitivity,
    daysWithoutService: 10,
    accessibility: guamoContext.accessibility,
  });

  assert.equal(blockedRoadEvaluation.priority, 'Inmediata');
  assert.equal(blockedRoadEvaluation.recommendedVehicleType, 'Volqueta');
  assert.ok(blockedRoadEvaluation.activatedRules.some((rule) => rule.id === 'R09'));
  assert.match(blockedRoadEvaluation.accessibilityAdvice, /no elimina la prioridad sanitaria/);
});

test('5. Integración API: subir Saturación al 90% en Mall Plaza recalcula prioridad y modifica el orden de ruta del camión', async () => {
  resetOperationalStore();
  const territory = await getMapData();

  const mallPlaza = territory.puntos.find((p) => p.nombre === 'Mall Plaza');
  const compactador = territory.vehiculos.find((v) => v.identificador === 'Compactador EMAS-01');
  assert.ok(mallPlaza, 'Debe existir el nodo Mall Plaza');
  assert.ok(compactador, 'Debe existir el vehículo Compactador EMAS-01');

  // 1. Calcular orden inicial de la ruta antes del ajuste (Mall Plaza está en 64%)
  const initialRouteRes = await invokeHandler(handleRouteCalculation, { vehiculoId: compactador._id });
  assert.equal(initialRouteRes.status, 200);
  const initialStops = initialRouteRes.data.routes[0].stops;
  const initialMallPlazaStop = initialStops.find((s) => s.nombre === 'Mall Plaza');
  assert.ok(initialMallPlazaStop, 'Mall Plaza debe estar en la ruta inicial');
  assert.ok(
    initialMallPlazaStop.orden >= 4,
    `Posición inicial de Mall Plaza (${initialMallPlazaStop.orden}) debe ser posterior a los nodos más saturados`,
  );

  // 2. Mover Saturación al 90% en el nodo Mall Plaza
  const evalRes = await invokeHandler(handleInferenceEvaluation, {
    puntoAcopioId: mallPlaza._id,
    saturacion: 90,
    accesibilidad: 'Buena',
    diasSinServicio: 4,
    vehiculoId: compactador._id,
  });
  assert.equal(evalRes.status, 200);
  const evalData = evalRes.data;

  assert.equal(evalData.puntoAcopio.nombre, 'Mall Plaza');
  assert.equal(evalData.priority, 'Inmediata');
  assert.ok(evalData.score >= 82, `El puntaje difuso (${evalData.score}) debe reflejar prioridad Inmediata`);
  assert.ok(
    evalData.routeOrderPosition < initialMallPlazaStop.orden,
    `Mall Plaza debe ascender en la ruta del camión (antes #${initialMallPlazaStop.orden}, ahora #${evalData.routeOrderPosition})`,
  );

  console.log(
    `[LOG VALIDACIÓN RUTA] Nodo Mall Plaza (Cobertura La Carola): Saturación 64% -> Posición #${initialMallPlazaStop.orden} (${initialMallPlazaStop.score}%, ${initialMallPlazaStop.prioridad}) | Saturación 90% -> Nueva Posición #${evalData.routeOrderPosition} (${evalData.score}%, ${evalData.priority})`,
  );
});

test('6. Ontología ontology/villa_verde_v3.owl está poblada con Manizales y libre de coordenadas de Bogotá', () => {
  const owlContent = fs.readFileSync(path.join(__dirname, '..', 'ontology', 'villa_verde_v3.owl'), 'utf8');
  assert.equal(/bogot|-74\./i.test(owlContent), false, 'villa_verde_v3.owl no debe tener coordenadas ni menciones de Bogotá');

  const meta = loadOntologyMetadata();
  assert.equal(meta.file, 'ontology/villa_verde_v3.owl');
  assert.ok(meta.individuals.includes('Nodo_Mall_Plaza'), 'Debe incluir el individuo #Nodo_Mall_Plaza');
  assert.ok(meta.individuals.includes('Nodo_Plaza_De_Bolivar'), 'Debe incluir el individuo #Nodo_Plaza_De_Bolivar');
  assert.ok(meta.individuals.includes('Nodo_Torre_Del_Cable'), 'Debe incluir el individuo #Nodo_Torre_Del_Cable');
  assert.ok(meta.individuals.includes('Zona_Vereda_La_Cabana'), 'Debe incluir el individuo #Zona_Vereda_La_Cabana');
  assert.ok(meta.individuals.includes('Zona_Vereda_Alto_Del_Guamo'), 'Debe incluir el individuo #Zona_Vereda_Alto_Del_Guamo');
  assert.ok(meta.individuals.includes('Queja_La_Carola_Mall_Plaza'), 'Debe incluir la queja de La Carola consolidada en Mall Plaza');
});
