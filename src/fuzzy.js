(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VillaVerdeFuzzy = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
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

  const DANGEROUS_RAEE_KEYWORDS = [
    'batería',
    'bateria',
    'celular',
    'computador',
    'tarjeta',
    'bombilla',
    'luminaria',
    'transformador',
    'acumulador',
    'televisor',
  ];

  function isRaeeDangerous(raeeTypes = []) {
    return (raeeTypes || []).some((type) => {
      const normalized = String(type || '').toLowerCase();
      return DANGEROUS_RAEE_KEYWORDS.some((keyword) => normalized.includes(keyword));
    });
  }

  function resolveSensitiveEnvironment(sensitivityValue, explicitFlag) {
    if (typeof explicitFlag === 'boolean') return explicitFlag;
    return Number(sensitivityValue) >= 75;
  }

  const sets = {
    saturation: {
      Baja: (value) => trapezoid(value, [0, 0, 25, 45]),
      Media: (value) => triangle(value, [25, 52, 76]),
      Alta: (value) => trapezoid(value, [60, 80, 100, 100]),
    },
    days: {
      Bajo: (value) => trapezoid(value, [0, 0, 2, 5]),
      Medio: (value) => triangle(value, [2, 5, 8]),
      Alto: (value) => trapezoid(value, [6, 10, 15, 15]),
    },
    capacity: {
      Baja: (value) => trapezoid(value, [0, 0, 25, 45]),
      Alta: (value) => trapezoid(value, [55, 75, 100, 100]),
    },
    raeeVolume: {
      Bajo: (value) => trapezoid(value, [0, 0, 25, 45]),
      Medio: (value) => triangle(value, [25, 50, 75]),
      Alto: (value) => trapezoid(value, [60, 80, 100, 100]),
    },
    sensitivity: {
      baja: (value) => trapezoid(value, [0, 0, 25, 45]),
      media: (value) => triangle(value, [25, 50, 75]),
      alta: (value) => trapezoid(value, [60, 80, 100, 100]),
    },
  };

  const outputSets = {
    Criticidad_Baja: (value) => trapezoid(value, [0, 0, 20, 38]),
    Criticidad_Media: (value) => triangle(value, [25, 48, 68]),
    Criticidad_Alta: (value) => triangle(value, [54, 72, 86]),
    Criticidad_Critica: (value) => trapezoid(value, [78, 90, 100, 100]),
  };

  const RULE_DEFINITIONS = [
    // Bloque 1: Criterios de Saturación, Entorno y Servicio (Evaluación Directa de Criticidad)
    {
      id: 'R1',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Alta Y diasSinServicio es Alto ENTONCES tieneCriticidad es Criticidad_Critica.',
      output: 'Criticidad_Critica',
      actionTag: null,
      evaluate: ({ sat, days }) => Math.min(sat.Alta, days.Alto),
    },
    {
      id: 'R2',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Media Y PuntoEnEntornoSensible es true ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ sat, entornoSensible }) => (entornoSensible ? sat.Media : 0),
    },
    {
      id: 'R3',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Baja Y diasSinServicio es Bajo ENTONCES tieneCriticidad es Criticidad_Baja.',
      output: 'Criticidad_Baja',
      actionTag: null,
      evaluate: ({ sat, days }) => Math.min(sat.Baja, days.Bajo),
    },
    {
      id: 'R4',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Alta Y PuntoEnEntornoSensible es true ENTONCES tieneCriticidad es Criticidad_Critica.',
      output: 'Criticidad_Critica',
      actionTag: null,
      evaluate: ({ sat, entornoSensible }) => (entornoSensible ? sat.Alta : 0),
    },
    {
      id: 'R5',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI diasSinServicio es Medio Y PuntoEnEntornoSensible es true ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ days, entornoSensible }) => (entornoSensible ? days.Medio : 0),
    },
    {
      id: 'R6',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Media Y diasSinServicio es Bajo ENTONCES tieneCriticidad es Criticidad_Media.',
      output: 'Criticidad_Media',
      actionTag: null,
      evaluate: ({ sat, days }) => Math.min(sat.Media, days.Bajo),
    },
    {
      id: 'R7',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Baja Y PuntoEnEntornoSensible es true ENTONCES tieneCriticidad es Criticidad_Media.',
      output: 'Criticidad_Media',
      actionTag: null,
      evaluate: ({ sat, entornoSensible }) => (entornoSensible ? sat.Baja : 0),
    },
    {
      id: 'R8',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI diasSinServicio es Alto Y PuntoEnEntornoSensible es true ENTONCES tieneCriticidad es Criticidad_Critica.',
      output: 'Criticidad_Critica',
      actionTag: null,
      evaluate: ({ days, entornoSensible }) => (entornoSensible ? days.Alto : 0),
    },
    {
      id: 'R9',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Alta Y diasSinServicio es Medio ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ sat, days }) => Math.min(sat.Alta, days.Medio),
    },
    {
      id: 'R10',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Media Y diasSinServicio es Alto ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ sat, days }) => Math.min(sat.Media, days.Alto),
    },
    {
      id: 'R11',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Media Y PuntoEnEntornoSensible es false ENTONCES tieneCriticidad es Criticidad_Baja.',
      output: 'Criticidad_Baja',
      actionTag: null,
      evaluate: ({ sat, entornoSensible }) => (!entornoSensible ? sat.Media : 0),
    },
    {
      id: 'R12',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI diasSinServicio es Alto Y PuntoEnEntornoSensible es false ENTONCES tieneCriticidad es Criticidad_Media.',
      output: 'Criticidad_Media',
      actionTag: null,
      evaluate: ({ days, entornoSensible }) => (!entornoSensible ? days.Alto : 0),
    },
    {
      id: 'R13',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Baja Y diasSinServicio es Medio ENTONCES tieneCriticidad es Criticidad_Media.',
      output: 'Criticidad_Media',
      actionTag: null,
      evaluate: ({ sat, days }) => Math.min(sat.Baja, days.Medio),
    },
    {
      id: 'R14',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Alta Y PuntoEnEntornoSensible es false ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ sat, entornoSensible }) => (!entornoSensible ? sat.Alta : 0),
    },
    {
      id: 'R15',
      block: 'Bloque 1',
      category: 'Saturación, Entorno y Servicio',
      description: 'SI porcentajeSaturacion es Baja Y PuntoEnEntornoSensible es false ENTONCES tieneCriticidad es Criticidad_Baja.',
      output: 'Criticidad_Baja',
      actionTag: null,
      evaluate: ({ sat, entornoSensible }) => (!entornoSensible ? sat.Baja : 0),
    },

    // Bloque 2: Criterios Operativos, Logísticos y RAEE (Restricciones y Prioridad Final)
    {
      id: 'R16',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Alta Y NivelAccesibilidad es NivelAccesibilidad_Buena ENTONCES tieneCriticidad es Criticidad_Critica.',
      output: 'Criticidad_Critica',
      actionTag: 'despacho_inmediato',
      evaluate: ({ sat, access }) => (access === 'Buena' ? sat.Alta : 0),
    },
    {
      id: 'R17',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Alta Y NivelAccesibilidad es NivelAccesibilidad_Mala ENTONCES tieneCriticidad es Criticidad_Media (se reprograma por accesibilidad vial).',
      output: 'Criticidad_Media',
      actionTag: 'reprogramar_accesibilidad_vial',
      evaluate: ({ sat, access }) => (access === 'Mala' ? sat.Alta : 0),
    },
    {
      id: 'R18',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI diasSinServicio es Alto Y NivelAccesibilidad es NivelAccesibilidad_Buena Y capacidadRestantePct es Alta ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: 'atencion_equidad_flota_apta',
      evaluate: ({ days, access, cap }) => (access === 'Buena' ? Math.min(days.Alto, cap.Alta) : 0),
    },
    {
      id: 'R19',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Media Y NivelAccesibilidad es NivelAccesibilidad_Regular ENTONCES tieneCriticidad es Criticidad_Media.',
      output: 'Criticidad_Media',
      actionTag: null,
      evaluate: ({ sat, access }) => (access === 'Regular' ? sat.Media : 0),
    },
    {
      id: 'R20',
      block: 'Bloque 2',
      category: 'Gestión RAEE',
      description: 'SI NivelVolumenRAEE es NivelVolumenRAEE_Alto Y GestorDisponible es true ENTONCES tieneCriticidad es Criticidad_Critica (activa jornada especial RAEE).',
      output: 'Criticidad_Critica',
      actionTag: 'activa_jornada_especial_raee',
      evaluate: ({ raee, gestorDisponible }) => (raee && gestorDisponible ? raee.Alto : 0),
    },
    {
      id: 'R21',
      block: 'Bloque 2',
      category: 'Gestión RAEE',
      description: 'SI NivelVolumenRAEE es NivelVolumenRAEE_Medio Y GestorDisponible es false ENTONCES tieneCriticidad es Criticidad_Baja (se aplaza por falta de gestor).',
      output: 'Criticidad_Baja',
      actionTag: 'aplazar_falta_gestor',
      evaluate: ({ raee, gestorDisponible }) => (raee && !gestorDisponible ? raee.Medio : 0),
    },
    {
      id: 'R22',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Media Y capacidadRestantePct es Baja ENTONCES tieneCriticidad es Criticidad_Media (aplica aplazamiento por capacidad de camión).',
      output: 'Criticidad_Media',
      actionTag: 'aplazar_capacidad_camion',
      evaluate: ({ sat, cap }) => Math.min(sat.Media, cap.Baja),
    },
    {
      id: 'R23',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Baja Y NivelAccesibilidad es NivelAccesibilidad_Buena ENTONCES tieneCriticidad es Criticidad_Baja.',
      output: 'Criticidad_Baja',
      actionTag: null,
      evaluate: ({ sat, access }) => (access === 'Buena' ? sat.Baja : 0),
    },
    {
      id: 'R24',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Alta Y NivelAccesibilidad es NivelAccesibilidad_Regular ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ sat, access }) => (access === 'Regular' ? sat.Alta : 0),
    },
    {
      id: 'R25',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Media Y NivelAccesibilidad es NivelAccesibilidad_Mala ENTONCES tieneCriticidad es Criticidad_Baja (aplazamiento preventivo por vía).',
      output: 'Criticidad_Baja',
      actionTag: 'aplazamiento_preventivo_via',
      evaluate: ({ sat, access }) => (access === 'Mala' ? sat.Media : 0),
    },
    {
      id: 'R26',
      block: 'Bloque 2',
      category: 'Gestión RAEE',
      description: 'SI NivelVolumenRAEE es NivelVolumenRAEE_Alto Y GestorDisponible es false ENTONCES tieneCriticidad es Criticidad_Media (almacenamiento temporal en punto fijo).',
      output: 'Criticidad_Media',
      actionTag: 'almacenamiento_temporal_punto_fijo',
      evaluate: ({ raee, gestorDisponible }) => (raee && !gestorDisponible ? raee.Alto : 0),
    },
    {
      id: 'R27',
      block: 'Bloque 2',
      category: 'Gestión RAEE',
      description: 'SI NivelVolumenRAEE es NivelVolumenRAEE_Medio Y GestorDisponible es true ENTONCES tieneCriticidad es Criticidad_Alta.',
      output: 'Criticidad_Alta',
      actionTag: null,
      evaluate: ({ raee, gestorDisponible }) => (raee && gestorDisponible ? raee.Medio : 0),
    },
    {
      id: 'R28',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI diasSinServicio es Alto Y NivelAccesibilidad es NivelAccesibilidad_Mala ENTONCES tieneCriticidad es Criticidad_Media (vereda crítica pero con restricción climática temporal).',
      output: 'Criticidad_Media',
      actionTag: 'restriccion_climatica_temporal',
      evaluate: ({ days, access }) => (access === 'Mala' ? days.Alto : 0),
    },
    {
      id: 'R29',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI capacidadRestantePct es Baja Y NivelAccesibilidad es NivelAccesibilidad_Mala ENTONCES tieneCriticidad es Criticidad_Baja (regreso a base por seguridad y capacidad).',
      output: 'Criticidad_Baja',
      actionTag: 'regreso_base_seguridad_capacidad',
      evaluate: ({ cap, access }) => (access === 'Mala' ? cap.Baja : 0),
    },
    {
      id: 'R30',
      block: 'Bloque 2',
      category: 'Gestión RAEE',
      description: 'SI NivelVolumenRAEE es NivelVolumenRAEE_Bajo Y GestorDisponible es true ENTONCES tieneCriticidad es Criticidad_Baja (volumen insuficiente para ruta especial).',
      output: 'Criticidad_Baja',
      actionTag: 'volumen_insuficiente_ruta_especial',
      evaluate: ({ raee, gestorDisponible }) => (raee && gestorDisponible ? raee.Bajo : 0),
    },
    {
      id: 'R31',
      block: 'Bloque 2',
      category: 'Operativo y Logístico',
      description: 'SI porcentajeSaturacion es Baja Y NivelAccesibilidad es NivelAccesibilidad_Mala ENTONCES tieneCriticidad es Criticidad_Baja.',
      output: 'Criticidad_Baja',
      actionTag: null,
      evaluate: ({ sat, access }) => (access === 'Mala' ? sat.Baja : 0),
    },
    {
      id: 'R32',
      block: 'Bloque 2',
      category: 'Gestión RAEE',
      description: 'SI NivelVolumenRAEE es NivelVolumenRAEE_Alto Y TipoRAEE_EsPeligroso es true Y GestorDisponible es true ENTONCES tieneCriticidad es Criticidad_Critica (prioridad máxima por manejo de residuos peligrosos/eléctricos).',
      output: 'Criticidad_Critica',
      actionTag: 'prioridad_maxima_raee_peligroso',
      evaluate: ({ raee, tipoRaeeEsPeligroso, gestorDisponible }) => (
        raee && tipoRaeeEsPeligroso && gestorDisponible ? raee.Alto : 0
      ),
    },
  ];

  const ACTION_MESSAGES = {
    prioridad_maxima_raee_peligroso: 'Prioridad máxima RAEE peligroso: despachar gestor autorizado inmediatamente.',
    activa_jornada_especial_raee: 'Activar jornada especial RAEE con vehículo de gestor autorizado.',
    almacenamiento_temporal_punto_fijo: 'Mantener almacenamiento temporal seguro en punto fijo hasta disponibilidad de gestor RAEE.',
    aplazar_falta_gestor: 'Aplazar recolección RAEE por falta de gestor autorizado disponible.',
    volumen_insuficiente_ruta_especial: 'Volumen RAEE insuficiente para ruta especial; consolidar en próximo ciclo.',
    regreso_base_seguridad_capacidad: 'Regreso a base por seguridad vial y baja capacidad restante del vehículo.',
    reprogramar_accesibilidad_vial: 'Reprogramar acceso ordinario y despachar unidad tipo Volqueta Veredal.',
    restriccion_climatica_temporal: 'Vereda crítica con restricción climática temporal: asignar Volqueta y reevaluar corredor.',
    aplazar_capacidad_camion: 'Aplicar aplazamiento operativo por baja capacidad restante del camión.',
    aplazamiento_preventivo_via: 'Aplazamiento preventivo por condición vial mientras persista lluvia o deterioro.',
    atencion_equidad_flota_apta: 'Priorizar por equidad territorial aprovechando vía despejada y capacidad alta.',
    despacho_inmediato: 'Despacho inmediato con flota estándar disponible.',
  };

  function defuzzifyMamdani(rulesList) {
    const aggregated = new Array(101).fill(0);
    for (let score = 0; score <= 100; score += 1) {
      for (const rule of rulesList) {
        aggregated[score] = Math.max(
          aggregated[score],
          Math.min(rule.activation, outputSets[rule.output](score)),
        );
      }
    }
    const denominator = aggregated.reduce((sum, membership) => sum + membership, 0);
    if (denominator === 0) return { centroid: 0, hasActive: false };
    const centroid = aggregated.reduce((sum, membership, index) => sum + membership * index, 0) / denominator;
    return { centroid, hasActive: true };
  }

  function mapScoreToLabels(score) {
    if (score >= 78) {
      return { priority: 'Inmediata', criticidad: 'Criticidad_Critica' };
    }
    if (score >= 55) {
      return { priority: 'Alta', criticidad: 'Criticidad_Alta' };
    }
    if (score >= 30) {
      return { priority: 'Media', criticidad: 'Criticidad_Media' };
    }
    return { priority: 'Baja', criticidad: 'Criticidad_Baja' };
  }

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

    const effectiveSensitivity = Math.min(100, Number(baseSensitivity) + complaintSeverity * 5);

    return {
      sensitivity: effectiveSensitivity,
      puntoEnEntornoSensible: effectiveSensitivity >= 75,
      accessibility: effectiveAccessibility,
      activeComplaints: complaints.length,
      activeClimateEvents: climateEvents.length,
      complaintSeverity,
    };
  }

  function fuzzyPriority({
    saturation,
    sensitivity = 50,
    daysWithoutService,
    accessibility = 'Buena',
    puntoEnEntornoSensible,
    capacidadRestantePct = 80,
    volumenRaee,
    gestorDisponible = true,
    tipoRaeeEsPeligroso = false,
  }) {
    const saturationValue = clamp(Number(saturation) || 0, 0, 100);
    const sensitivityValue = clamp(Number(sensitivity) || 0, 0, 100);
    const daysValue = clamp(Number(daysWithoutService) || 0, 0, 15);
    const capacityValue = clamp(Number(capacidadRestantePct), 0, 100);
    const hasRaeeInput = volumenRaee !== undefined && volumenRaee !== null && Number.isFinite(Number(volumenRaee));
    const raeeValue = hasRaeeInput ? clamp(Number(volumenRaee), 0, 100) : null;

    const access = ['Buena', 'Regular', 'Mala'].includes(accessibility) ? accessibility : 'Regular';
    const entornoSensible = resolveSensitiveEnvironment(sensitivityValue, puntoEnEntornoSensible);
    const gestorFlag = Boolean(gestorDisponible);
    const peligrosoFlag = Boolean(tipoRaeeEsPeligroso);

    const satMemberships = Object.fromEntries(
      Object.entries(sets.saturation).map(([name, fn]) => [name, fn(saturationValue)]),
    );
    const daysMemberships = Object.fromEntries(
      Object.entries(sets.days).map(([name, fn]) => [name, fn(daysValue)]),
    );
    const capMemberships = Object.fromEntries(
      Object.entries(sets.capacity).map(([name, fn]) => [name, fn(capacityValue)]),
    );
    const raeeMemberships = hasRaeeInput
      ? Object.fromEntries(Object.entries(sets.raeeVolume).map(([name, fn]) => [name, fn(raeeValue)]))
      : null;
    const sensMemberships = Object.fromEntries(
      Object.entries(sets.sensitivity).map(([name, fn]) => [name, fn(sensitivityValue)]),
    );

    const evalCtx = {
      sat: satMemberships,
      days: daysMemberships,
      cap: capMemberships,
      raee: raeeMemberships,
      access,
      entornoSensible,
      gestorDisponible: gestorFlag,
      tipoRaeeEsPeligroso: peligrosoFlag,
    };

    const activatedRules = [];
    for (const ruleDef of RULE_DEFINITIONS) {
      const activation = clamp(Number(ruleDef.evaluate(evalCtx)) || 0, 0, 1);
      if (activation > 0) {
        activatedRules.push({
          id: ruleDef.id,
          block: ruleDef.block,
          category: ruleDef.category,
          description: ruleDef.description,
          activation,
          output: ruleDef.output,
          actionTag: ruleDef.actionTag,
        });
      }
    }

    const block1Rules = activatedRules.filter((r) => r.block === 'Bloque 1');
    const block2Rules = activatedRules.filter((r) => r.block === 'Bloque 2');

    const globalDefuzz = defuzzifyMamdani(activatedRules);
    const block1Defuzz = defuzzifyMamdani(block1Rules);
    const block2Defuzz = defuzzifyMamdani(block2Rules);

    const operationalPressure = (saturationValue * 0.05)
      + (daysValue * 0.22)
      + (entornoSensible ? 1.5 : 0)
      + (hasRaeeInput ? raeeValue * 0.03 : 0);

    const rawScore = globalDefuzz.hasActive
      ? clamp(globalDefuzz.centroid * 0.94 + operationalPressure, 0, 99.5)
      : 0;
    const score = Math.round(rawScore * 10) / 10;
    const globalLabels = mapScoreToLabels(score);

    const sanitaryPressure = (saturationValue * 0.05) + (daysValue * 0.25) + (entornoSensible ? 1.5 : 0);
    const rawSanitaryScore = block1Defuzz.hasActive
      ? clamp(block1Defuzz.centroid * 0.94 + sanitaryPressure, 0, 99.5)
      : score;
    const sanitaryScore = Math.round(rawSanitaryScore * 10) / 10;
    const sanitaryLabels = mapScoreToLabels(sanitaryScore);

    const rawOperationalScore = block2Defuzz.hasActive
      ? clamp(block2Defuzz.centroid * 0.94 + operationalPressure, 0, 99.5)
      : score;
    const operationalScore = Math.round(rawOperationalScore * 10) / 10;
    const operationalLabels = mapScoreToLabels(operationalScore);

    const operationalActions = activatedRules
      .filter((r) => r.actionTag && ACTION_MESSAGES[r.actionTag])
      .sort((a, b) => b.activation - a.activation)
      .map((r) => ({
        ruleId: r.id,
        tag: r.actionTag,
        activation: Math.round(r.activation * 1000) / 1000,
        message: ACTION_MESSAGES[r.actionTag],
      }));

    const hasRaeeEmergency = activatedRules.some(
      (r) => (r.id === 'R20' || r.id === 'R32') && r.activation >= 0.4,
    );

    let recommendedVehicleType = 'Compactador / Estándar';
    if (access === 'Mala') {
      recommendedVehicleType = 'Volqueta';
    } else if (hasRaeeEmergency && saturationValue < 75) {
      recommendedVehicleType = 'RAEE_Especial';
    }

    let accessibilityAdvice = 'Acceso vial despejado y compatible con despacho ordinario de flota.';
    if (access === 'Mala') {
      accessibilityAdvice = 'Vía afectada o de difícil acceso: asignar unidad tipo Volqueta Veredal y reevaluar corredor; la restricción vial no elimina la prioridad sanitaria.';
    } else if (access === 'Regular') {
      accessibilityAdvice = 'Tránsito con precaución por pendiente o humedad en calzada; mantener monitoreo operativo.';
    }

    if (operationalActions.length) {
      accessibilityAdvice = `${accessibilityAdvice} Acción Bloque 2: ${operationalActions[0].message}`;
    }

    return {
      score,
      priority: globalLabels.priority,
      criticidad: globalLabels.criticidad,
      sanitaryScore,
      sanitaryPriority: sanitaryLabels.priority,
      sanitaryCriticidad: sanitaryLabels.criticidad,
      operationalScore,
      operationalPriority: operationalLabels.priority,
      operationalCriticidad: operationalLabels.criticidad,
      operationalActions,
      accessibility: access,
      recommendedVehicleType,
      accessibilityAdvice,
      memberships: {
        saturation: {
          ...satMemberships,
          baja: satMemberships.Baja,
          media: satMemberships.Media,
          alta: satMemberships.Alta,
        },
        daysWithoutService: {
          ...daysMemberships,
          pocos: daysMemberships.Bajo,
          varios: daysMemberships.Medio,
          muchos: daysMemberships.Alto,
        },
        capacity: capMemberships,
        raeeVolume: raeeMemberships || { Bajo: 0, Medio: 0, Alto: 0 },
        sensitivity: sensMemberships,
        booleanStates: {
          PuntoEnEntornoSensible: entornoSensible,
          NivelAccesibilidad: `NivelAccesibilidad_${access}`,
          GestorDisponible: gestorFlag,
          TipoRAEE_EsPeligroso: peligrosoFlag,
        },
      },
      activatedRules: activatedRules
        .sort((left, right) => right.activation - left.activation)
        .map(({ id, block, category, description, activation, output, actionTag }) => ({
          id,
          block,
          category,
          description,
          activation: Math.round(activation * 1000) / 1000,
          output,
          actionTag,
        })),
    };
  }

  /**
   * Calcula y ordena las paradas de ruta para un vehículo según la inferencia difusa
   * integral (Bloque 1 + Bloque 2) de cada nodo de acopio en Manizales.
   */
  function prioritizeRouteStops(points, eventsByZone, vehicleOrType = 'Compactador', options = {}) {
    const vehicleType = typeof vehicleOrType === 'string'
      ? vehicleOrType
      : (vehicleOrType?.tipo || 'Compactador');
    const capacityPct = typeof vehicleOrType === 'object' && Number.isFinite(Number(vehicleOrType?.capacidad_restante))
      ? Number(vehicleOrType.capacidad_restante)
      : (Number.isFinite(Number(options.capacidadRestantePct)) ? Number(options.capacidadRestantePct) : 80);
    const gestorDisponible = typeof options.gestorDisponible === 'boolean' ? options.gestorDisponible : true;

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
          puntoEnEntornoSensible: typeof point.entorno_sensible === 'boolean'
            ? point.entorno_sensible
            : context.puntoEnEntornoSensible,
          capacidadRestantePct: capacityPct,
          volumenRaee: point.saturacion_raee,
          gestorDisponible: typeof point.gestor_disponible === 'boolean'
            ? (point.gestor_disponible && gestorDisponible)
            : gestorDisponible,
          tipoRaeeEsPeligroso: typeof point.raee_peligroso === 'boolean'
            ? point.raee_peligroso
            : isRaeeDangerous(point.tipos_raee_acumulados),
        });
        return {
          point,
          context,
          priority: evaluation,
          saturationInput,
        };
      });

    return evaluated
      .filter(({ priority }) => (
        priority.priority === 'Inmediata'
        || priority.priority === 'Alta'
        || priority.sanitaryPriority === 'Inmediata'
        || priority.sanitaryPriority === 'Alta'
      ))
      .sort((a, b) => b.priority.score - a.priority.score)
      .map((item, index) => ({
        orden: index + 1,
        id: String(item.point._id),
        codigo: item.point.codigo || `NAC-${index + 1}`,
        nombre: item.point.nombre,
        zona: item.point.zona_id?.nombre || '',
        barrios_cobertura: item.point.barrios_cobertura || [],
        saturacion: item.saturationInput,
        saturacion_raee: item.point.saturacion_raee ?? 0,
        dias_sin_servicio: item.point.zona_id?.dias_sin_servicio ?? 1,
        accesibilidad: item.priority.accessibility,
        vehiculo_recomendado: item.priority.recommendedVehicleType,
        prioridad: item.priority.priority,
        criticidad: item.priority.criticidad,
        criticidad_sanitaria: item.priority.sanitaryCriticidad,
        prioridad_sanitaria: item.priority.sanitaryPriority,
        score: item.priority.score,
        sanitaryScore: item.priority.sanitaryScore,
        regla_principal: item.priority.activatedRules[0]?.id || 'R1',
        accion_operativa: item.priority.operationalActions[0]?.message || '',
        coordinates: item.point.ubicacion.coordinates,
      }));
  }

  return {
    RULE_DEFINITIONS,
    isRaeeDangerous,
    resolveSensitiveEnvironment,
    fuzzyPriority,
    deriveScenarioContext,
    prioritizeRouteStops,
  };
}));
