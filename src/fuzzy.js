const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function trapezoid(value, [a, b, c, d]) {
  if (value < a || value > d) return 0;
  if (value >= b && value <= c) return 1;
  if (value < b) return b === a ? 1 : (value - a) / (b - a);
  return d === c ? 1 : (d - value) / (d - c);
}

function triangle(value, [a, b, c]) {
  if (value < a || value > c) return 0;
  if (value === b) return 1;
  if (value < b) return b === a ? 1 : (value - a) / (b - a);
  return c === b ? 1 : (c - value) / (c - b);
}

const sets = {
  saturation: {
    baja: (value) => trapezoid(value, [0, 0, 25, 45]),
    media: (value) => triangle(value, [25, 52, 76]),
    alta: (value) => trapezoid(value, [62, 88, 100, 100]),
    critica: (value) => trapezoid(value, [82, 92, 100, 100]),
  },
  sensitivity: {
    baja: (value) => trapezoid(value, [0, 0, 25, 45]),
    media: (value) => triangle(value, [25, 50, 75]),
    alta: (value) => trapezoid(value, [60, 80, 100, 100]),
  },
  days: {
    pocos: (value) => trapezoid(value, [0, 0, 2, 5]),
    varios: (value) => triangle(value, [2, 5, 8]),
    muchos: (value) => trapezoid(value, [6, 10, 15, 15]),
  },
};

const outputSets = {
  baja: (value) => trapezoid(value, [0, 0, 20, 38]),
  media: (value) => triangle(value, [25, 48, 68]),
  alta: (value) => triangle(value, [54, 70, 84]),
  inmediata: (value) => trapezoid(value, [78, 90, 100, 100]),
};

function deriveScenarioContext(events = [], baseSensitivity = 50, requestedAccessibility = 'Buena') {
  const activeEvents = events.filter((event) => event.activo !== false);
  const complaints = activeEvents.filter((event) => event.tipo_evento === 'QuejaCiudadana');
  const climateEvents = activeEvents.filter((event) => event.tipo_evento === 'EventoClimatico');
  const complaintSeverity = complaints.reduce((highest, event) => Math.max(highest, Number(event.severidad) || 0), 0);
  const hasBlockedRoad = climateEvents.some((event) => event.estado_via === 'Mala');
  const hasRegularRoad = climateEvents.some((event) => event.estado_via === 'Regular');

  let effectiveAccessibility = requestedAccessibility;
  if (hasBlockedRoad || requestedAccessibility === 'Mala') {
    effectiveAccessibility = 'Mala';
  } else if (hasRegularRoad && requestedAccessibility === 'Buena') {
    effectiveAccessibility = 'Regular';
  }

  return {
    sensitivity: Math.min(100, Number(baseSensitivity) + complaintSeverity * 5),
    accessibility: effectiveAccessibility,
    activeComplaints: complaints.length,
    activeClimateEvents: climateEvents.length,
    complaintSeverity,
  };
}

function fuzzyPriority({ saturation, sensitivity, daysWithoutService, accessibility }) {
  const saturationValue = clamp(Number(saturation), 0, 100);
  const sensitivityValue = clamp(Number(sensitivity), 0, 100);
  const daysValue = clamp(Number(daysWithoutService), 0, 15);
  const access = ['Buena', 'Regular', 'Mala'].includes(accessibility) ? accessibility : 'Regular';
  const memberships = {
    saturation: Object.fromEntries(Object.entries(sets.saturation).map(([name, fn]) => [name, fn(saturationValue)])),
    sensitivity: Object.fromEntries(Object.entries(sets.sensitivity).map(([name, fn]) => [name, fn(sensitivityValue)])),
    days: Object.fromEntries(Object.entries(sets.days).map(([name, fn]) => [name, fn(daysValue)])),
  };
  const rules = [];
  const addRule = (id, description, activation, output) => {
    if (activation > 0) rules.push({ id, description, activation, output });
  };
  const sat = memberships.saturation;
  const sens = memberships.sensitivity;
  const days = memberships.days;

  addRule('R01', 'SI la saturación es alta ENTONCES la prioridad de atención es inmediata.', sat.alta, 'inmediata');
  addRule('R02', 'SI la saturación es alta Y la sensibilidad del entorno es alta ENTONCES la atención es inmediata.', Math.min(sat.alta, sens.alta), 'inmediata');
  addRule('R03', 'SI hay muchos días sin servicio Y la saturación es media o alta ENTONCES la atención es inmediata.', Math.min(days.muchos, Math.max(sat.media, sat.alta)), 'inmediata');
  addRule('R04', 'SI hay muchos días sin servicio ENTONCES se eleva la prioridad a alta para proteger la equidad territorial.', days.muchos * (1 - sat.alta), 'alta');
  addRule('R05', 'SI la sensibilidad del entorno y la saturación son medias ENTONCES se prioriza la zona en nivel alto.', Math.min(Math.max(sens.media, sens.alta), sat.media), 'alta');
  addRule('R06', 'SI la saturación es media ENTONCES la atención es preferente (media).', sat.media * (1 - sens.alta * 0.5), 'media');
  addRule('R07', 'SI la sensibilidad del entorno es alta Y la saturación no es crítica ENTONCES se eleva la atención preventiva.', sens.alta * (1 - sat.critica), 'alta');
  addRule('R08', 'SI la saturación es baja Y los días sin servicio son pocos ENTONCES se mantiene la atención regular (baja).', Math.min(sat.baja, days.pocos), 'baja');
  addRule('R09', 'SI la accesibilidad vial es mala por evento climático Y hay saturación alta ENTONCES se mantiene prioridad inmediata con despacho de volqueta.', access === 'Mala' ? Math.max(sat.alta, days.muchos * 0.8) : 0, 'inmediata');
  addRule('R10', 'SI la saturación supera el umbral crítico (>=85%) ENTONCES se activa despacho prioritario en cabecera de ruta.', sat.critica, 'inmediata');

  const aggregated = new Array(101).fill(0);
  for (let score = 0; score <= 100; score += 1) {
    for (const rule of rules) {
      aggregated[score] = Math.max(
        aggregated[score],
        Math.min(rule.activation, outputSets[rule.output](score)),
      );
    }
  }
  const denominator = aggregated.reduce((sum, membership) => sum + membership, 0);
  const centroid = denominator === 0
    ? 0
    : aggregated.reduce((sum, membership, index) => sum + membership * index, 0) / denominator;

  // Ajuste continuo fino dentro de la banda difusa para desempatar nodos con distinta presión operativa
  const operationalPressure = (saturationValue * 0.06) + (daysValue * 0.25) + (sensitivityValue * 0.02);
  const blendedScore = denominator === 0 ? 0 : clamp(centroid * 0.92 + operationalPressure, 0, 99.5);
  const score = Math.round(blendedScore * 10) / 10;
  const priority = score >= 78 ? 'Inmediata' : score >= 55 ? 'Alta' : score >= 30 ? 'Media' : 'Baja';

  return {
    score,
    priority,
    accessibility: access,
    recommendedVehicleType: access === 'Mala' ? 'Volqueta' : 'Compactador / Estándar',
    accessibilityAdvice: access === 'Mala'
      ? 'Vía afectada o de difícil acceso: asignar unidad tipo Volqueta Veredal y reevaluar corredor; la restricción vial no elimina la prioridad sanitaria.'
      : access === 'Regular'
        ? 'Tránsito con precaución por pendiente o humedad en calzada; mantener monitoreo operativo.'
        : 'Acceso vial despejado y compatible con despacho ordinario de flota.',
    memberships: {
      saturation: memberships.saturation,
      sensitivity: memberships.sensitivity,
      daysWithoutService: memberships.days,
    },
    activatedRules: rules
      .sort((left, right) => right.activation - left.activation)
      .map(({ id, description, activation, output }) => ({
        id,
        description,
        activation: Math.round(activation * 1000) / 1000,
        output,
      })),
  };
}

/**
 * Calcula y ordena las paradas de ruta para un vehículo según la inferencia difusa
 * de cada nodo de acopio en Manizales.
 */
function prioritizeRouteStops(points, eventsByZone, vehicleType = 'Compactador') {
  const evaluated = points
    .filter((point) => point.zona_id && (
      vehicleType === 'RAEE_Especial'
        ? point.saturacion_raee > 0
        : point.saturacion_ordinarios > 0
    ))
    .map((point) => {
      const zoneId = String(point.zona_id._id || point.zona_id);
      const zoneEvents = eventsByZone.get(zoneId) || [];
      const context = deriveScenarioContext(
        zoneEvents,
        point.zona_id.sensibilidad_entorno ?? 50,
        point.accesibilidad_actual || 'Buena',
      );
      const saturationInput = vehicleType === 'RAEE_Especial'
        ? point.saturacion_raee
        : point.saturacion_ordinarios;
      const evaluation = fuzzyPriority({
        saturation: saturationInput,
        sensitivity: context.sensitivity,
        daysWithoutService: point.zona_id.dias_sin_servicio ?? 1,
        accessibility: context.accessibility,
      });
      return {
        point,
        context,
        priority: evaluation,
      };
    });

  return evaluated
    .filter(({ priority }) => priority.priority === 'Inmediata' || priority.priority === 'Alta')
    .sort((a, b) => b.priority.score - a.priority.score)
    .map((item, index) => ({
      orden: index + 1,
      id: String(item.point._id),
      codigo: item.point.codigo || `NAC-${index + 1}`,
      nombre: item.point.nombre,
      zona: item.point.zona_id?.nombre || '',
      barrios_cobertura: item.point.barrios_cobertura || [],
      saturacion: vehicleType === 'RAEE_Especial'
        ? item.point.saturacion_raee
        : item.point.saturacion_ordinarios,
      dias_sin_servicio: item.point.zona_id?.dias_sin_servicio ?? 1,
      accesibilidad: item.priority.accessibility,
      vehiculo_recomendado: item.priority.recommendedVehicleType,
      prioridad: item.priority.priority,
      score: item.priority.score,
      regla_principal: item.priority.activatedRules[0]?.id || 'R01',
      coordinates: item.point.ubicacion.coordinates,
    }));
}

module.exports = {
  fuzzyPriority,
  deriveScenarioContext,
  prioritizeRouteStops,
};
