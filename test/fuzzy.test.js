const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  RULE_DEFINITIONS,
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
  assert.equal(regularCase.criticidad, 'Criticidad_Baja');
  assert.ok(regularCase.activatedRules.some((rule) => rule.id === 'R3'));
  assert.ok(regularCase.activatedRules.some((rule) => rule.id === 'R15'));
  assert.ok(regularCase.activatedRules.some((rule) => rule.id === 'R23'));

  assert.equal(criticalCase.priority, 'Inmediata');
  assert.equal(criticalCase.criticidad, 'Criticidad_Critica');
  assert.ok(criticalCase.score > regularCase.score);
  assert.ok(criticalCase.activatedRules.some((rule) => rule.id === 'R1'));
  assert.ok(criticalCase.activatedRules.some((rule) => rule.id === 'R4'));
  assert.ok(criticalCase.activatedRules.some((rule) => rule.id === 'R8'));
  assert.ok(criticalCase.activatedRules.some((rule) => rule.id === 'R16'));

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
    puntoEnEntornoSensible: guamoContext.puntoEnEntornoSensible,
  });

  // Separación Bloque 1 (Criticidad Sanitaria) vs Bloque 2 (Restricción Vial / Volqueta)
  assert.equal(blockedRoadEvaluation.sanitaryPriority, 'Inmediata');
  assert.equal(blockedRoadEvaluation.sanitaryCriticidad, 'Criticidad_Critica');
  assert.equal(blockedRoadEvaluation.recommendedVehicleType, 'Volqueta');
  assert.ok(blockedRoadEvaluation.activatedRules.some((rule) => rule.id === 'R17'));
  assert.ok(blockedRoadEvaluation.activatedRules.some((rule) => rule.id === 'R28'));
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
  assert.ok(meta.classes.includes('NivelVolumenRAEE'), 'Debe incluir la clase #NivelVolumenRAEE');
  assert.ok(meta.individuals.includes('NivelVolumenRAEE_Alto'), 'Debe incluir el individuo #NivelVolumenRAEE_Alto');
  assert.ok(meta.datatypeProperties.includes('volumenRAEEkg'), 'Debe incluir la propiedad #volumenRAEEkg');
});

test('7. Bloque 1 completo (R1–R15): saturación, días sin servicio y entorno sensible', () => {
  assert.equal(RULE_DEFINITIONS.length, 32, 'El motor debe contener exactamente las 32 reglas (R1–R32)');

  const hasRule = (res, id) => res.activatedRules.some((r) => r.id === id);

  // Media + Entorno Sensible true -> R2 (Alta) vs Media + Entorno Sensible false -> R11 (Baja)
  const medSens = fuzzyPriority({ saturation: 52, daysWithoutService: 1, puntoEnEntornoSensible: true });
  const medNoSens = fuzzyPriority({ saturation: 52, daysWithoutService: 1, puntoEnEntornoSensible: false });
  assert.ok(hasRule(medSens, 'R2'));
  assert.ok(hasRule(medSens, 'R6'));
  assert.ok(hasRule(medNoSens, 'R11'));
  assert.ok(medSens.sanitaryScore > medNoSens.sanitaryScore);

  // Baja + Entorno Sensible true -> R7 (Media), Días Medio + Sensible -> R5 (Alta), Baja + Días Medio -> R13 (Media)
  const lowMedDaysSens = fuzzyPriority({ saturation: 15, daysWithoutService: 5, puntoEnEntornoSensible: true });
  assert.ok(hasRule(lowMedDaysSens, 'R5'));
  assert.ok(hasRule(lowMedDaysSens, 'R7'));
  assert.ok(hasRule(lowMedDaysSens, 'R13'));

  // Alta + Días Medio -> R9 (Alta), Media + Días Alto -> R10 (Alta), Alta + No Sensible -> R14 (Alta), Días Alto + No Sensible -> R12 (Media)
  const highMedNoSens = fuzzyPriority({ saturation: 90, daysWithoutService: 5, puntoEnEntornoSensible: false });
  assert.ok(hasRule(highMedNoSens, 'R9'));
  assert.ok(hasRule(highMedNoSens, 'R14'));

  const medHighDaysNoSens = fuzzyPriority({ saturation: 52, daysWithoutService: 11, puntoEnEntornoSensible: false });
  assert.ok(hasRule(medHighDaysNoSens, 'R10'));
  assert.ok(hasRule(medHighDaysNoSens, 'R12'));
});

test('8. Bloque 2 Logístico (R16–R19, R22–R25, R28–R29, R31): accesibilidad vial y capacidad de flota', () => {
  const hasRule = (res, id) => res.activatedRules.some((r) => r.id === id);

  // R18: Días Alto + Buena + Capacidad Alta -> Criticidad_Alta
  const eqHighCap = fuzzyPriority({
    saturation: 20,
    daysWithoutService: 12,
    accessibility: 'Buena',
    capacidadRestantePct: 90,
    puntoEnEntornoSensible: false,
  });
  assert.ok(hasRule(eqHighCap, 'R18'));
  assert.ok(hasRule(eqHighCap, 'R23'));

  // R19 y R22: Saturación Media + Regular + Capacidad Baja -> aplazamiento por capacidad
  const lowCapMed = fuzzyPriority({
    saturation: 52,
    daysWithoutService: 2,
    accessibility: 'Regular',
    capacidadRestantePct: 15,
    puntoEnEntornoSensible: false,
  });
  assert.ok(hasRule(lowCapMed, 'R19'));
  assert.ok(hasRule(lowCapMed, 'R22'));
  assert.ok(lowCapMed.operationalActions.some((a) => a.tag === 'aplazar_capacidad_camion'));

  // R24: Saturación Alta + Regular
  const highRegular = fuzzyPriority({ saturation: 88, daysWithoutService: 2, accessibility: 'Regular' });
  assert.ok(hasRule(highRegular, 'R24'));

  // R25, R29, R31: Vía Mala + Capacidad Baja + Saturación baja/media -> regreso a base por seguridad y capacidad
  const badRoadLowCap = fuzzyPriority({
    saturation: 35,
    daysWithoutService: 2,
    accessibility: 'Mala',
    capacidadRestantePct: 15,
    puntoEnEntornoSensible: false,
  });
  assert.ok(hasRule(badRoadLowCap, 'R25'));
  assert.ok(hasRule(badRoadLowCap, 'R29'));
  assert.ok(hasRule(badRoadLowCap, 'R31'));
  assert.ok(badRoadLowCap.operationalActions.some((a) => a.tag === 'regreso_base_seguridad_capacidad'));
});

test('9. Bloque 2 RAEE (R20–R21, R26–R27, R30, R32): gestor disponible y residuos peligrosos', () => {
  const hasRule = (res, id) => res.activatedRules.some((r) => r.id === id);

  // R20 y R32: Volumen RAEE Alto + Peligroso + Gestor disponible -> jornada especial crítica
  const raeeEmergency = fuzzyPriority({
    saturation: 50,
    daysWithoutService: 2,
    accessibility: 'Buena',
    volumenRaee: 90,
    gestorDisponible: true,
    tipoRaeeEsPeligroso: true,
    puntoEnEntornoSensible: true,
  });
  assert.ok(hasRule(raeeEmergency, 'R20'));
  assert.ok(hasRule(raeeEmergency, 'R32'));
  assert.equal(raeeEmergency.recommendedVehicleType, 'RAEE_Especial');
  assert.ok(raeeEmergency.operationalActions.some((a) => a.tag === 'prioridad_maxima_raee_peligroso'));

  // R26: Volumen RAEE Alto + Gestor NO disponible -> almacenamiento temporal
  const raeeNoManagerHigh = fuzzyPriority({
    saturation: 40,
    daysWithoutService: 2,
    accessibility: 'Buena',
    volumenRaee: 90,
    gestorDisponible: false,
    tipoRaeeEsPeligroso: true,
  });
  assert.ok(hasRule(raeeNoManagerHigh, 'R26'));
  assert.ok(raeeNoManagerHigh.operationalActions.some((a) => a.tag === 'almacenamiento_temporal_punto_fijo'));

  // R21 vs R27: Volumen RAEE Medio con/sin gestor
  const raeeMedNoManager = fuzzyPriority({ saturation: 30, daysWithoutService: 1, volumenRaee: 50, gestorDisponible: false });
  const raeeMedManager = fuzzyPriority({ saturation: 30, daysWithoutService: 1, volumenRaee: 50, gestorDisponible: true });
  assert.ok(hasRule(raeeMedNoManager, 'R21'));
  assert.ok(hasRule(raeeMedManager, 'R27'));

  // R30: Volumen RAEE Bajo + Gestor disponible
  const raeeLow = fuzzyPriority({ saturation: 20, daysWithoutService: 1, volumenRaee: 15, gestorDisponible: true });
  assert.ok(hasRule(raeeLow, 'R30'));
});

test('10. Integración API /api/inferencia/evaluar con variables operativas y RAEE de Bloque 2', async () => {
  resetOperationalStore();
  const territory = await getMapData();
  const malteria = territory.puntos.find((p) => p.nombre === 'Parque Industrial Maltería');
  const gestorRaee = territory.vehiculos.find((v) => v.identificador === 'Gestor RAEE EcoCaldas-08');
  assert.ok(malteria);
  assert.ok(gestorRaee);

  const res = await invokeHandler(handleInferenceEvaluation, {
    puntoAcopioId: malteria._id,
    saturacion: 63,
    accesibilidad: 'Buena',
    diasSinServicio: 3,
    vehiculoId: gestorRaee._id,
    capacidadRestantePct: 92,
    volumenRaee: 90,
    puntoEnEntornoSensible: true,
    gestorDisponible: true,
    tipoRaeeEsPeligroso: true,
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.inputs.volumenRaee, 90);
  assert.equal(res.data.inputs.capacidadRestantePct, 92);
  assert.equal(res.data.inputs.tipoRaeeEsPeligroso, true);
  assert.ok(res.data.activatedRules.some((r) => r.id === 'R20'));
  assert.ok(res.data.activatedRules.some((r) => r.id === 'R32'));
  assert.equal(res.data.operationalCriticidad, 'Criticidad_Critica');
  assert.equal(res.data.recommendedVehicleType, 'RAEE_Especial');
  assert.ok(res.data.score >= 70, `El puntaje global (${res.data.score}) debe reflejar urgencia Alta por jornada RAEE`);
});

test('11. Modo isomórfico navegador: src/fuzzy.js expone VillaVerdeFuzzy idéntico al motor Node.js', () => {
  const vm = require('node:vm');
  const fuzzyCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'fuzzy.js'), 'utf8');
  const sandbox = { window: {}, self: {} };
  sandbox.self = sandbox.window;
  vm.runInNewContext(fuzzyCode, sandbox);

  assert.ok(sandbox.window.VillaVerdeFuzzy, 'Debe exponer window.VillaVerdeFuzzy');
  assert.equal(sandbox.window.VillaVerdeFuzzy.RULE_DEFINITIONS.length, 32);

  const sampleInput = {
    saturation: 78,
    daysWithoutService: 8,
    accessibility: 'Regular',
    puntoEnEntornoSensible: true,
    capacidadRestantePct: 70,
    volumenRaee: 82,
    gestorDisponible: true,
    tipoRaeeEsPeligroso: true,
  };
  const nodeResult = fuzzyPriority(sampleInput);
  const browserResult = sandbox.window.VillaVerdeFuzzy.fuzzyPriority(sampleInput);
  assert.equal(browserResult.score, nodeResult.score);
  assert.equal(browserResult.criticidad, nodeResult.criticidad);
  assert.equal(browserResult.activatedRules.length, nodeResult.activatedRules.length);
});
