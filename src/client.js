const colors = {
  location: '#38bdf8',
  acopio: '#fbbf24',
  truck: '#c084fc',
};

let map = null;
let svgMapState = null;
let territory = null;
let selectedPointId = null;
let accessibility = 'Buena';
let activeFilter = 'all';
let markers = [];
let currentRouteGeometry = null;
let apiAvailable = false;
let inferenceSeq = 0;

/**
 * Base de datos operativa de respaldo (Manizales, Caldas) sincronizada al 100%
 * con src/seed.js y ontology/villa_verde_v3.owl para garantizar renderizado visual
 * completo incluso si se abre prueba.html directamente como archivo local.
 */
function buildEmbeddedManizalesTerritory() {
  const zonas = [
    { _id: 'z01', codigo: 'MZL-Z01', nombre: 'Comuna Cumanday · Centro Histórico', tipo: 'Comuna', hito_referencia: 'Plaza de Bolívar', barrios_agrupados: ['Centro', 'Los Agustinos', 'San José', 'Fundadores', 'Parque Caldas'], ubicacion: { type: 'Point', coordinates: [-75.51738, 5.06889] }, sensibilidad_entorno: 88, dias_sin_servicio: 1, demanda_esperada: 820 },
    { _id: 'z02', codigo: 'MZL-Z02', nombre: 'Comuna Ecoturístico Cerro de Oro · Eje Comercial', tipo: 'Comuna', hito_referencia: 'Mall Plaza', barrios_agrupados: ['La Carola', 'Los Cámbulos', 'Villahermosa', 'Alta Suiza', 'San Marcel', 'La Sultana'], ubicacion: { type: 'Point', coordinates: [-75.48322, 5.06941] }, sensibilidad_entorno: 84, dias_sin_servicio: 2, demanda_esperada: 790 },
    { _id: 'z03', codigo: 'MZL-Z03', nombre: 'Comuna Palogrande · Zona Rosa y Universitaria', tipo: 'Comuna', hito_referencia: 'Torre del Cable', barrios_agrupados: ['El Cable', 'Palogrande', 'La Estrella', 'Belén', 'Palermo', 'La Rambla'], ubicacion: { type: 'Point', coordinates: [-75.48784, 5.05612] }, sensibilidad_entorno: 91, dias_sin_servicio: 1, demanda_esperada: 750 },
    { _id: 'z04', codigo: 'MZL-Z04', nombre: 'Comuna Tesorito · Corredor Industrial', tipo: 'Comuna', hito_referencia: 'Parque Industrial Maltería', barrios_agrupados: ['Maltería', 'Juanchito', 'La Enea', 'Lusitania', 'San Pío X'], ubicacion: { type: 'Point', coordinates: [-75.44215, 5.03918] }, sensibilidad_entorno: 76, dias_sin_servicio: 3, demanda_esperada: 680 },
    { _id: 'z05', codigo: 'MZL-Z05', nombre: 'Comuna Atardeceres · Sector Occidental', tipo: 'Comuna', hito_referencia: 'Mirador de Chipre', barrios_agrupados: ['Chipre', 'Villa Pilar', 'Sacatín', 'La Francia', 'Campohermoso'], ubicacion: { type: 'Point', coordinates: [-75.52951, 5.07524] }, sensibilidad_entorno: 74, dias_sin_servicio: 2, demanda_esperada: 540 },
    { _id: 'z06', codigo: 'MZL-Z06', nombre: 'Comuna Ciudadela del Norte', tipo: 'Comuna', hito_referencia: 'Cisco Bosques del Norte', barrios_agrupados: ['Bosques del Norte', 'San Cayetano', 'Solferino', 'Sinaí', 'Caribe'], ubicacion: { type: 'Point', coordinates: [-75.49852, 5.08847] }, sensibilidad_entorno: 81, dias_sin_servicio: 3, demanda_esperada: 640 },
    { _id: 'z07', codigo: 'MZL-Z07', nombre: 'Comuna San José · Sector Abastecimiento', tipo: 'Comuna', hito_referencia: 'Plaza de Mercado Galería', barrios_agrupados: ['La Galería', 'Colón', 'Las Delicias', 'Assis', 'San Ignacio'], ubicacion: { type: 'Point', coordinates: [-75.52105, 5.07352] }, sensibilidad_entorno: 89, dias_sin_servicio: 1, demanda_esperada: 860 },
    { _id: 'z08', codigo: 'MZL-Z08', nombre: 'Comuna Universitaria · Sur Urbano', tipo: 'Comuna', hito_referencia: 'Redoma Fátima', barrios_agrupados: ['Fátima', 'Pío XII', 'Aranjuez', 'Malabar', 'Kennedy'], ubicacion: { type: 'Point', coordinates: [-75.49954, 5.05108] }, sensibilidad_entorno: 72, dias_sin_servicio: 2, demanda_esperada: 590 },
    { _id: 'z09', codigo: 'MZL-Z09', nombre: 'Comuna La Fuente · Zona Gastronómica Suroriental', tipo: 'Comuna', hito_referencia: 'Bulevar de Milán', barrios_agrupados: ['Milán', 'El Paraíso', 'La Fuente', 'Guamal'], ubicacion: { type: 'Point', coordinates: [-75.47651, 5.04853] }, sensibilidad_entorno: 69, dias_sin_servicio: 2, demanda_esperada: 480 },
    { _id: 'z10', codigo: 'MZL-Z10', nombre: 'Vereda La Cabaña', tipo: 'Vereda', hito_referencia: 'Centro Poblado La Cabaña', barrios_agrupados: ['La Cabaña', 'Cuchilla del Salado', 'Las Pavas'], ubicacion: { type: 'Point', coordinates: [-75.58812, 5.09804] }, sensibilidad_entorno: 70, dias_sin_servicio: 9, demanda_esperada: 145 },
    { _id: 'z11', codigo: 'MZL-Z11', nombre: 'Vereda El Rosario', tipo: 'Vereda', hito_referencia: 'Crucero El Rosario', barrios_agrupados: ['El Rosario', 'La Violeta', 'Trinidad'], ubicacion: { type: 'Point', coordinates: [-75.54508, 5.03812] }, sensibilidad_entorno: 66, dias_sin_servicio: 7, demanda_esperada: 130 },
    { _id: 'z12', codigo: 'MZL-Z12', nombre: 'Vereda Alto del Guamo', tipo: 'Vereda', hito_referencia: 'Alto del Guamo', barrios_agrupados: ['Alto del Guamo', 'El Águila', 'Alto del Naranjo'], ubicacion: { type: 'Point', coordinates: [-75.49206, 5.11905] }, sensibilidad_entorno: 75, dias_sin_servicio: 10, demanda_esperada: 120 },
    { _id: 'z13', codigo: 'MZL-Z13', nombre: 'Corregimiento Río Blanco', tipo: 'Corregimiento', hito_referencia: 'Reserva Protectora Río Blanco', barrios_agrupados: ['Río Blanco', 'Minitas', 'La Aurora'], ubicacion: { type: 'Point', coordinates: [-75.46104, 5.07809] }, sensibilidad_entorno: 96, dias_sin_servicio: 6, demanda_esperada: 110 },
    { _id: 'z14', codigo: 'MZL-Z14', nombre: 'Vereda Bajo Tablazo', tipo: 'Vereda', hito_referencia: 'Cruce Bajo Tablazo', barrios_agrupados: ['Bajo Tablazo', 'Alto Tablazo', 'Java'], ubicacion: { type: 'Point', coordinates: [-75.53421, 5.04485] }, sensibilidad_entorno: 64, dias_sin_servicio: 6, demanda_esperada: 125 },
  ];
  const byName = Object.fromEntries(zonas.map((z) => [z.nombre, z]));

  const puntos = [
    { _id: 'p01', codigo: 'NAC-01', nombre: 'Mall Plaza', zona_id: byName['Comuna Ecoturístico Cerro de Oro · Eje Comercial'], barrios_cobertura: ['La Carola', 'Los Cámbulos', 'Villahermosa', 'Alta Suiza'], direccion_referencia: 'Av. Kevin Ángel con Calle 55 · Sector La Carola', ubicacion: { type: 'Point', coordinates: [-75.48322, 5.06941] }, saturacion_ordinarios: 64, saturacion_raee: 68, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Celulares', 'Baterías', 'Cables', 'Computadores'] },
    { _id: 'p02', codigo: 'NAC-02', nombre: 'Plaza de Bolívar', zona_id: byName['Comuna Cumanday · Centro Histórico'], barrios_cobertura: ['Centro', 'Los Agustinos', 'Parque Caldas'], direccion_referencia: 'Carrera 22 con Calle 21 · Centro Histórico', ubicacion: { type: 'Point', coordinates: [-75.51738, 5.06889] }, saturacion_ordinarios: 86, saturacion_raee: 62, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Baterías', 'Celulares', 'Luminarias LED'] },
    { _id: 'p03', codigo: 'NAC-03', nombre: 'Torre del Cable', zona_id: byName['Comuna Palogrande · Zona Rosa y Universitaria'], barrios_cobertura: ['El Cable', 'La Estrella', 'Belén', 'La Rambla'], direccion_referencia: 'Av. Santander Calle 65 · Glorieta El Cable', ubicacion: { type: 'Point', coordinates: [-75.48784, 5.05612] }, saturacion_ordinarios: 81, saturacion_raee: 74, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Computadores', 'Celulares', 'Baterías', 'Periféricos'] },
    { _id: 'p04', codigo: 'NAC-04', nombre: 'Estadio Palogrande', zona_id: byName['Comuna Palogrande · Zona Rosa y Universitaria'], barrios_cobertura: ['Palogrande', 'Palermo', 'Campus Universitario'], direccion_referencia: 'Carrera 25 con Calle 62 · Unidad Deportiva', ubicacion: { type: 'Point', coordinates: [-75.48972, 5.05784] }, saturacion_ordinarios: 58, saturacion_raee: 52, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Baterías', 'Cables', 'Bombillas'] },
    { _id: 'p05', codigo: 'NAC-05', nombre: 'Plaza de Mercado Galería', zona_id: byName['Comuna San José · Sector Abastecimiento'], barrios_cobertura: ['La Galería', 'Colón', 'Las Delicias', 'San José'], direccion_referencia: 'Calle 21 con Carrera 16 · Pabellón Central', ubicacion: { type: 'Point', coordinates: [-75.52105, 5.07352] }, saturacion_ordinarios: 92, saturacion_raee: 41, accesibilidad_actual: 'Regular', tipos_raee_acumulados: ['Electrodomésticos', 'Básculas Electrónicas', 'Cables'] },
    { _id: 'p06', codigo: 'NAC-06', nombre: 'Parque Fundadores', zona_id: byName['Comuna Cumanday · Centro Histórico'], barrios_cobertura: ['Fundadores', 'Linares', 'Versalles'], direccion_referencia: 'Calle 33 con Carrera 23 · Estación Cable Aéreo', ubicacion: { type: 'Point', coordinates: [-75.50981, 5.06721] }, saturacion_ordinarios: 69, saturacion_raee: 55, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Celulares', 'Cargadores', 'Baterías'] },
    { _id: 'p07', codigo: 'NAC-07', nombre: 'Terminal Los Cámbulos', zona_id: byName['Comuna Ecoturístico Cerro de Oro · Eje Comercial'], barrios_cobertura: ['Los Cámbulos', 'San Marcel', 'La Sultana'], direccion_referencia: 'Vía Panamericana · Terminal de Transporte', ubicacion: { type: 'Point', coordinates: [-75.48051, 5.06152] }, saturacion_ordinarios: 65, saturacion_raee: 49, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Baterías', 'Luminarias', 'Cables'] },
    { _id: 'p08', codigo: 'NAC-08', nombre: 'Parque Industrial Maltería', zona_id: byName['Comuna Tesorito · Corredor Industrial'], barrios_cobertura: ['Maltería', 'Juanchito', 'Zona Franca Andina'], direccion_referencia: 'Km 10 Vía al Magdalena · Sector Industrial Maltería', ubicacion: { type: 'Point', coordinates: [-75.44215, 5.03918] }, saturacion_ordinarios: 63, saturacion_raee: 89, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Tarjetas', 'Cables', 'Transformadores', 'Baterías Industriales'] },
    { _id: 'p09', codigo: 'NAC-09', nombre: 'Nodo La Enea', zona_id: byName['Comuna Tesorito · Corredor Industrial'], barrios_cobertura: ['La Enea', 'Lusitania', 'San Pío X'], direccion_referencia: 'Carrera 35 con Calle 103 · Acceso Aeropuerto La Nubia', ubicacion: { type: 'Point', coordinates: [-75.45804, 5.03552] }, saturacion_ordinarios: 71, saturacion_raee: 61, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Electrodomésticos', 'Televisores', 'Cables'] },
    { _id: 'p10', codigo: 'NAC-10', nombre: 'Mirador de Chipre', zona_id: byName['Comuna Atardeceres · Sector Occidental'], barrios_cobertura: ['Chipre', 'Villa Pilar', 'La Francia', 'Campohermoso'], direccion_referencia: 'Av. 12 de Octubre · Monumento a los Colonizadores', ubicacion: { type: 'Point', coordinates: [-75.52951, 5.07524] }, saturacion_ordinarios: 62, saturacion_raee: 37, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Bombillas', 'Pequeños Electrodomésticos'] },
    { _id: 'p11', codigo: 'NAC-11', nombre: 'Cisco Bosques del Norte', zona_id: byName['Comuna Ciudadela del Norte'], barrios_cobertura: ['Bosques del Norte', 'San Cayetano', 'Solferino', 'Sinaí', 'Caribe'], direccion_referencia: 'Calle 48D con Carrera 3B · Centro Integrado Comunitario', ubicacion: { type: 'Point', coordinates: [-75.49852, 5.08847] }, saturacion_ordinarios: 83, saturacion_raee: 58, accesibilidad_actual: 'Regular', tipos_raee_acumulados: ['Televisores', 'Cables', 'Celulares'] },
    { _id: 'p12', codigo: 'NAC-12', nombre: 'Redoma Fátima', zona_id: byName['Comuna Universitaria · Sur Urbano'], barrios_cobertura: ['Fátima', 'Pío XII', 'Aranjuez', 'Malabar', 'Kennedy'], direccion_referencia: 'Calle 66 con Carrera 30B · Eje Sur', ubicacion: { type: 'Point', coordinates: [-75.49954, 5.05108] }, saturacion_ordinarios: 66, saturacion_raee: 44, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Electrodomésticos', 'Baterías'] },
    { _id: 'p13', codigo: 'NAC-13', nombre: 'Bulevar de Milán', zona_id: byName['Comuna La Fuente · Zona Gastronómica Suroriental'], barrios_cobertura: ['Milán', 'El Paraíso', 'La Fuente', 'Guamal'], direccion_referencia: 'Carrera 23 con Calle 75 · Bulevar Gastronómico', ubicacion: { type: 'Point', coordinates: [-75.47651, 5.04853] }, saturacion_ordinarios: 54, saturacion_raee: 46, accesibilidad_actual: 'Buena', tipos_raee_acumulados: ['Luminarias', 'Equipos de Refrigeración'] },
    { _id: 'p14', codigo: 'NAC-14', nombre: 'Centro Poblado La Cabaña', zona_id: byName['Vereda La Cabaña'], barrios_cobertura: ['La Cabaña', 'Cuchilla del Salado', 'Las Pavas'], direccion_referencia: 'Caseta Comunal Principal · Vereda La Cabaña', ubicacion: { type: 'Point', coordinates: [-75.58812, 5.09804] }, saturacion_ordinarios: 76, saturacion_raee: 39, accesibilidad_actual: 'Regular', tipos_raee_acumulados: ['Baterías', 'Bombillas', 'Acumuladores Agrícolas'] },
    { _id: 'p15', codigo: 'NAC-15', nombre: 'Crucero El Rosario', zona_id: byName['Vereda El Rosario'], barrios_cobertura: ['El Rosario', 'La Violeta', 'Trinidad'], direccion_referencia: 'Vía Antigua Chinchiná · Crucero El Rosario', ubicacion: { type: 'Point', coordinates: [-75.54508, 5.03812] }, saturacion_ordinarios: 68, saturacion_raee: 34, accesibilidad_actual: 'Regular', tipos_raee_acumulados: ['Baterías', 'Bombillas'] },
    { _id: 'p16', codigo: 'NAC-16', nombre: 'Alto del Guamo', zona_id: byName['Vereda Alto del Guamo'], barrios_cobertura: ['Alto del Guamo', 'El Águila', 'Alto del Naranjo'], direccion_referencia: 'Km 8 Vía al Norte · Escuela Rural Alto del Guamo', ubicacion: { type: 'Point', coordinates: [-75.49206, 5.11905] }, saturacion_ordinarios: 79, saturacion_raee: 42, accesibilidad_actual: 'Mala', tipos_raee_acumulados: ['Baterías', 'Radios', 'Bombillas'] },
    { _id: 'p17', codigo: 'NAC-17', nombre: 'Reserva Protectora Río Blanco', zona_id: byName['Corregimiento Río Blanco'], barrios_cobertura: ['Río Blanco', 'Minitas', 'La Aurora'], direccion_referencia: 'Portón Control Ambiental · Cuenca Río Blanco', ubicacion: { type: 'Point', coordinates: [-75.46104, 5.07809] }, saturacion_ordinarios: 64, saturacion_raee: 53, accesibilidad_actual: 'Regular', tipos_raee_acumulados: ['Baterías', 'Sensores', 'Luminarias'] },
    { _id: 'p18', codigo: 'NAC-18', nombre: 'Cruce Bajo Tablazo', zona_id: byName['Vereda Bajo Tablazo'], barrios_cobertura: ['Bajo Tablazo', 'Alto Tablazo', 'Java'], direccion_referencia: 'Puesto de Salud Bajo Tablazo · Autopista del Café', ubicacion: { type: 'Point', coordinates: [-75.53421, 5.04485] }, saturacion_ordinarios: 59, saturacion_raee: 31, accesibilidad_actual: 'Regular', tipos_raee_acumulados: ['Bombillas', 'Cables'] },
  ];

  const vehiculos = [
    { _id: 'v01', identificador: 'Compactador EMAS-01', tipo: 'Compactador', placa: 'MZL-410', base_operativa: 'Av. Kevin Ángel · Mall Plaza', capacidad_restante: 82, ubicacion_actual: { type: 'Point', coordinates: [-75.48510, 5.06810] }, disponible: true },
    { _id: 'v02', identificador: 'Compactador EMAS-02', tipo: 'Compactador', placa: 'MZL-412', base_operativa: 'Centro Histórico · Fundadores', capacidad_restante: 75, ubicacion_actual: { type: 'Point', coordinates: [-75.51240, 5.06820] }, disponible: true },
    { _id: 'v03', identificador: 'Compactador EMAS-03', tipo: 'Compactador', placa: 'MZL-418', base_operativa: 'Eje Santander · El Cable', capacidad_restante: 68, ubicacion_actual: { type: 'Point', coordinates: [-75.48890, 5.05690] }, disponible: true },
    { _id: 'v04', identificador: 'Compactador EMAS-04', tipo: 'Compactador', placa: 'MZL-425', base_operativa: 'Patio Taller La Enea', capacidad_restante: 0, ubicacion_actual: { type: 'Point', coordinates: [-75.45510, 5.03610] }, disponible: false },
    { _id: 'v05', identificador: 'Volqueta Veredal VV-05', tipo: 'Volqueta', placa: 'CAL-701', base_operativa: 'Salida Occidental · Vía La Cabaña', capacidad_restante: 85, ubicacion_actual: { type: 'Point', coordinates: [-75.55120, 5.08450] }, disponible: true },
    { _id: 'v06', identificador: 'Volqueta Veredal VV-06', tipo: 'Volqueta', placa: 'CAL-709', base_operativa: 'Salida Norte · Alto del Guamo', capacidad_restante: 78, ubicacion_actual: { type: 'Point', coordinates: [-75.49510, 5.09820] }, disponible: true },
    { _id: 'v07', identificador: 'Volqueta Veredal VV-07', tipo: 'Volqueta', placa: 'CAL-715', base_operativa: 'Corredor Sur · El Rosario', capacidad_restante: 74, ubicacion_actual: { type: 'Point', coordinates: [-75.53640, 5.04310] }, disponible: true },
    { _id: 'v08', identificador: 'Gestor RAEE EcoCaldas-08', tipo: 'RAEE_Especial', placa: 'RAE-901', base_operativa: 'Planta Maltería', capacidad_restante: 92, ubicacion_actual: { type: 'Point', coordinates: [-75.44820, 5.04150] }, disponible: true },
    { _id: 'v09', identificador: 'Gestor RAEE EcoCaldas-09', tipo: 'RAEE_Especial', placa: 'RAE-904', base_operativa: 'Punto Limpio El Cable', capacidad_restante: 88, ubicacion_actual: { type: 'Point', coordinates: [-75.48480, 5.06310] }, disponible: true },
  ];

  const eventos = [
    { codigo: 'EVT-Q01', zona_id: 'z02', zona_nombre: 'Comuna Ecoturístico Cerro de Oro · Eje Comercial', nodo_referencia: 'Mall Plaza', barrio_origen: 'La Carola', tipo_evento: 'QuejaCiudadana', severidad: 4, descripcion: 'Reporte en barrio La Carola por acumulación de residuos posconsumo y contenedores al límite; consolidado en nodo Mall Plaza.', activo: true },
    { codigo: 'EVT-Q02', zona_id: 'z04', zona_nombre: 'Comuna Tesorito · Corredor Industrial', nodo_referencia: 'Parque Industrial Maltería', barrio_origen: 'Maltería', tipo_evento: 'QuejaCiudadana', severidad: 5, descripcion: 'Alerta ambiental por quema informal de cables y descarte de tarjetas electrónicas en quebrada.', activo: true },
    { codigo: 'EVT-Q03', zona_id: 'z07', zona_nombre: 'Comuna San José · Sector Abastecimiento', nodo_referencia: 'Plaza de Mercado Galería', barrio_origen: 'La Galería', tipo_evento: 'QuejaCiudadana', severidad: 5, descripcion: 'Desbordamiento crítico de residuos orgánicos y aparatos eléctricos tras jornada de mercado en La Galería.', activo: true },
    { codigo: 'EVT-Q04', zona_id: 'z06', zona_nombre: 'Comuna Ciudadela del Norte', nodo_referencia: 'Cisco Bosques del Norte', barrio_origen: 'Solferino', tipo_evento: 'QuejaCiudadana', severidad: 4, descripcion: 'Denuncia comunitaria en Solferino y San Cayetano por disposición inadecuada de televisores CRT.', activo: true },
    { codigo: 'EVT-C01', zona_id: 'z12', zona_nombre: 'Vereda Alto del Guamo', nodo_referencia: 'Alto del Guamo', barrio_origen: 'Alto del Guamo', tipo_evento: 'EventoClimatico', severidad: 5, estado_via: 'Mala', descripcion: 'Deslizamiento de tierra y pérdida parcial de banca por lluvias intensas hacia Alto del Guamo.', activo: true },
    { codigo: 'EVT-C02', zona_id: 'z10', zona_nombre: 'Vereda La Cabaña', nodo_referencia: 'Centro Poblado La Cabaña', barrio_origen: 'La Cabaña', tipo_evento: 'EventoClimatico', severidad: 4, estado_via: 'Regular', descripcion: 'Precipitaciones continuas en ladera occidental; calzada húmeda con paso restringido a volqueta.', activo: true },
    { codigo: 'EVT-C03', zona_id: 'z11', zona_nombre: 'Vereda El Rosario', nodo_referencia: 'Crucero El Rosario', barrio_origen: 'El Rosario', tipo_evento: 'EventoClimatico', severidad: 3, estado_via: 'Regular', descripcion: 'Lluvias moderadas y neblina densa en vía antigua a Chinchiná sector El Rosario.', activo: true },
  ];

  return { zonas, puntos, vehiculos, eventos };
}

function getFuzzyEngine() {
  return window.VillaVerdeFuzzy;
}

function getEventsByZoneLocal() {
  const mapByZone = new Map();
  (territory?.eventos || []).filter((e) => e.activo !== false).forEach((event) => {
    const zoneId = String(event.zona_id?._id || event.zona_id);
    mapByZone.set(zoneId, [...(mapByZone.get(zoneId) || []), event]);
  });
  return mapByZone;
}

function hasAvailableRaeeManagerLocal() {
  return (territory?.vehiculos || []).some(
    (v) => v.tipo === 'RAEE_Especial' && v.disponible !== false && Number(v.capacidad_restante) > 0,
  );
}

function computeLocalStops(vehicleOrType = 'Compactador', gestorOverride = null) {
  const engine = getFuzzyEngine();
  const eventsByZone = getEventsByZoneLocal();
  const gestorDisponible = typeof gestorOverride === 'boolean' ? gestorOverride : hasAvailableRaeeManagerLocal();
  return engine.prioritizeRouteStops(territory.puntos, eventsByZone, vehicleOrType, { gestorDisponible });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Error HTTP ${response.status}`);
  return body;
}

function coordinates(feature) {
  return feature.ubicacion.coordinates;
}

function setInspector(feature, kind, place, status, extra, description) {
  const labels = {
    location: ['Barrios Agrupados', 'Frecuencia', 'Sensibilidad'],
    acopio: ['Zona Territorial', 'Nivel de Saturación', 'Barrios Cubiertos'],
    truck: ['Base Operativa', 'Estado de Flota', 'Capacidad Libre'],
  };
  document.getElementById('inspector-type').textContent = kind;
  document.getElementById('inspector-name').textContent = feature.nombre || feature.identificador;
  document.getElementById('inspector-place-label').textContent = labels[feature.mapType][0];
  document.getElementById('inspector-status-label').textContent = labels[feature.mapType][1];
  document.getElementById('inspector-extra-label').textContent = labels[feature.mapType][2];
  document.getElementById('inspector-place').textContent = place;
  document.getElementById('inspector-status').textContent = status;
  document.getElementById('inspector-extra').textContent = extra;
  document.getElementById('inspector-description').textContent = description;
  document.getElementById('inspector-type').style.color = colors[feature.mapType];
  const coordsBadge = document.getElementById('inspector-coords');
  const coords = feature.ubicacion?.coordinates || feature.ubicacion_actual?.coordinates;
  if (coordsBadge && coords) {
    coordsBadge.textContent = `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
  }
}

function setAccessibilityUI(value) {
  accessibility = ['Buena', 'Regular', 'Mala'].includes(value) ? value : 'Buena';
  const label = document.getElementById('accessibility-label');
  if (label) label.textContent = accessibility;
  document.querySelectorAll('.accessibility-option').forEach((option) => {
    const active = option.dataset.accessibility === accessibility;
    option.classList.toggle('bg-cyan-900/50', active);
    option.classList.toggle('border-cyan-500', active);
    option.classList.toggle('text-cyan-300', active);
    option.classList.toggle('bg-gray-800', !active);
    option.classList.toggle('text-gray-400', !active);
  });
}

function formatSaturationText(val) {
  const n = Number(val);
  const tag = n >= 80 ? 'Alta' : n >= 35 ? 'Media' : 'Baja';
  return `${n}% (${tag})`;
}

function formatCapacityText(val) {
  const n = Number(val);
  const tag = n >= 60 ? 'Alta' : n >= 35 ? 'Media' : 'Baja';
  return `${n}% (${tag})`;
}

function formatRaeeText(val) {
  const n = Number(val);
  const tag = n >= 65 ? 'Alto' : n >= 35 ? 'Medio' : 'Bajo';
  return `${n}% (${tag})`;
}

function updateFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.map-filter').forEach((button) => {
    const active = button.dataset.mapFilter === filter;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('bg-emerald-600', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('bg-gray-800', !active);
    button.classList.toggle('text-gray-300', !active);
  });
  markers.forEach(({ marker, element, type }) => {
    const visible = filter === 'all' || type === filter;
    if (marker && marker.getElement) {
      marker.getElement().style.display = visible ? '' : 'none';
    } else if (element) {
      element.style.display = visible ? '' : 'none';
    }
  });
}

function updatePointSelection(pointId, shouldRunInference = false) {
  selectedPointId = pointId;
  const pointSelect = document.getElementById('inference-point');
  if (pointSelect && pointSelect.value !== pointId) pointSelect.value = pointId;
  const point = territory.puntos.find((item) => item._id === pointId);
  if (!point) return;

  const saturation = document.getElementById('saturation-slider');
  const days = document.getElementById('days-slider');
  const raeeSlider = document.getElementById('raee-volume-slider');
  const capacitySlider = document.getElementById('capacity-slider');
  const sensitiveToggle = document.getElementById('sensitive-env-toggle');
  const gestorToggle = document.getElementById('gestor-available-toggle');
  const raeeDangerousToggle = document.getElementById('raee-dangerous-toggle');

  saturation.value = point.saturacion_ordinarios;
  days.value = point.zona_id?.dias_sin_servicio ?? 1;
  document.getElementById('saturation-value').textContent = formatSaturationText(saturation.value);
  document.getElementById('days-value').textContent = `${days.value} días`;
  setAccessibilityUI(point.accesibilidad_actual || 'Buena');

  if (raeeSlider) {
    raeeSlider.value = point.saturacion_raee ?? 0;
    document.getElementById('raee-volume-value').textContent = formatRaeeText(raeeSlider.value);
  }
  if (capacitySlider) {
    const vehicleId = document.getElementById('route-vehicle')?.value;
    const selectedVehicle = territory.vehiculos.find((v) => String(v._id) === String(vehicleId));
    const capVal = selectedVehicle ? selectedVehicle.capacidad_restante : 80;
    capacitySlider.value = capVal;
    document.getElementById('capacity-value').textContent = formatCapacityText(capVal);
  }
  if (sensitiveToggle) {
    const eventsByZone = getEventsByZoneLocal();
    const ctx = getFuzzyEngine().deriveScenarioContext(
      eventsByZone.get(String(point.zona_id?._id || point.zona_id)) || [],
      point.zona_id?.sensibilidad_entorno ?? 50,
      point.accesibilidad_actual || 'Buena',
    );
    sensitiveToggle.checked = typeof point.entorno_sensible === 'boolean'
      ? point.entorno_sensible
      : ctx.puntoEnEntornoSensible;
  }
  if (gestorToggle) {
    gestorToggle.checked = typeof point.gestor_disponible === 'boolean'
      ? point.gestor_disponible
      : hasAvailableRaeeManagerLocal();
  }
  if (raeeDangerousToggle) {
    raeeDangerousToggle.checked = typeof point.raee_peligroso === 'boolean'
      ? point.raee_peligroso
      : getFuzzyEngine().isRaeeDangerous(point.tipos_raee_acumulados);
  }

  const barriosEl = document.getElementById('inference-point-barrios');
  if (barriosEl) {
    barriosEl.textContent = `Barrios cubiertos: ${(point.barrios_cobertura || []).join(', ')} · ${point.direccion_referencia || ''}`;
  }

  if (shouldRunInference) {
    runInference();
  }
}

function buildFeatureItems() {
  return [
    ...territory.zonas.map((zone) => ({
      feature: { ...zone, mapType: 'location' },
      mapType: 'location',
      type: 'location',
      kind: `${zone.tipo} · Hito: ${zone.hito_referencia || zone.nombre}`,
      coordinates: coordinates(zone),
      place: (zone.barrios_agrupados || []).slice(0, 4).join(', '),
      status: `${zone.dias_sin_servicio} días sin servicio`,
      extra: `Sensibilidad ${zone.sensibilidad_entorno}%`,
      description: `Demanda estimada: ${zone.demanda_esperada} unidades diarias. Hito principal: ${zone.hito_referencia || zone.nombre}.`,
      symbol: zone.tipo === 'Vereda' ? 'V' : zone.tipo === 'Comuna' ? 'C' : 'R',
    })),
    ...territory.puntos.map((point) => ({
      feature: { ...point, mapType: 'acopio' },
      mapType: 'acopio',
      type: 'acopio',
      kind: 'Nodo Hito de Acopio',
      coordinates: coordinates(point),
      place: point.zona_id?.nombre || 'Manizales',
      status: `${point.saturacion_ordinarios}% ordinarios · ${point.saturacion_raee}% RAEE`,
      extra: (point.barrios_cobertura || []).slice(0, 3).join(', '),
      description: `${point.direccion_referencia || 'Manizales'}. Tipos RAEE recibidos: ${(point.tipos_raee_acumulados || []).join(', ') || 'Ordinarios'}.`,
      symbol: 'A',
    })),
    ...territory.vehiculos.map((vehicle) => ({
      feature: { ...vehicle, mapType: 'truck' },
      mapType: 'truck',
      type: 'truck',
      kind: `Unidad ${vehicle.tipo}`,
      coordinates: coordinates({ ubicacion: vehicle.ubicacion_actual }),
      place: vehicle.base_operativa || 'Manizales, Caldas',
      status: vehicle.disponible ? `En servicio (${vehicle.placa || 'MZL'})` : 'Fuera de línea',
      extra: `${vehicle.capacidad_restante}% capacidad libre`,
      description: `Vehículo ${vehicle.identificador} asignado a la operación territorial de Manizales.`,
      symbol: 'T',
    })),
  ];
}

function renderActiveEventsAndTables() {
  const eventsContainer = document.getElementById('active-events-list');
  const countBadge = document.getElementById('events-count-badge');
  if (countBadge && territory.eventos) {
    countBadge.textContent = `${territory.eventos.length} activos`;
  }
  if (eventsContainer && territory.eventos) {
    eventsContainer.replaceChildren();
    territory.eventos.forEach((evt) => {
      const card = document.createElement('div');
      const isClimate = evt.tipo_evento === 'EventoClimatico';
      card.className = `p-3 rounded-xl border transition-all ${
        isClimate
          ? 'bg-sky-950/35 border-sky-500/30 text-sky-200'
          : 'bg-amber-950/35 border-amber-500/30 text-amber-200'
      }`;
      const icon = isClimate ? 'fa-cloud-showers-heavy text-sky-400' : 'fa-bullhorn text-amber-400';
      const badge = isClimate ? 'EVENTO CLIMÁTICO' : 'QUEJA CIUDADANA';
      card.innerHTML = `
        <div class="flex justify-between items-center font-bold text-[10px] mb-1">
          <span><i class="fa-solid ${icon} mr-1"></i>${badge} · ${evt.nodo_referencia || 'Manizales'}</span>
          <span class="px-1.5 py-0.5 rounded bg-gray-900/80 text-white">Sev. ${evt.severidad}/5${evt.estado_via ? ` · Vía ${evt.estado_via}` : ''}</span>
        </div>
        <p class="text-[11px] text-gray-200 leading-snug">${evt.descripcion}</p>
        <div class="text-[10px] text-gray-400 mt-1">Barrio / Sector origen: <strong class="text-white">${evt.barrio_origen || evt.zona_nombre || 'Manizales'}</strong></div>
      `;
      eventsContainer.appendChild(card);
    });
  }

  const citizenTable = document.getElementById('citizen-raee-table');
  if (citizenTable && territory.puntos) {
    citizenTable.replaceChildren();
    territory.puntos.forEach((point) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-800/50 cursor-pointer transition-colors';
      tr.innerHTML = `
        <td class="p-2.5 font-bold text-emerald-400">${point.nombre}</td>
        <td class="p-2.5 text-gray-300">${(point.barrios_cobertura || []).join(', ')}</td>
        <td class="p-2.5 text-cyan-300">${(point.tipos_raee_acumulados || []).join(', ') || 'Ordinarios'}</td>
        <td class="p-2.5 font-mono font-bold text-amber-300">${point.saturacion_raee}%</td>
      `;
      tr.addEventListener('click', () => {
        updatePointSelection(point._id, true);
        switchTab('motor');
      });
      citizenTable.appendChild(tr);
    });
  }
}

function populateControls() {
  document.getElementById('count-comunas').textContent = `${territory.zonas.filter((z) => z.tipo === 'Comuna').length} comunas`;
  document.getElementById('count-veredas').textContent = `${territory.zonas.filter((z) => z.tipo !== 'Comuna').length} veredas y corregimientos`;
  document.getElementById('count-acopios').textContent = `${territory.puntos.length} nodos hito`;
  document.getElementById('count-camiones').textContent = `${territory.vehiculos.length} camiones`;

  const pointSelect = document.getElementById('inference-point');
  pointSelect.replaceChildren();
  territory.puntos.forEach((point) => {
    const option = document.createElement('option');
    option.value = point._id;
    option.textContent = `${point.nombre} · Barrios: ${(point.barrios_cobertura || []).slice(0, 3).join(', ')}`;
    pointSelect.appendChild(option);
  });
  pointSelect.addEventListener('change', () => updatePointSelection(pointSelect.value, true));

  const vehicleSelect = document.getElementById('route-vehicle');
  vehicleSelect.replaceChildren();
  territory.vehiculos.filter((v) => v.disponible).forEach((vehicle) => {
    const option = document.createElement('option');
    option.value = vehicle._id;
    option.textContent = `${vehicle.identificador} (${vehicle.tipo}) · Cap. ${vehicle.capacidad_restante}%`;
    vehicleSelect.appendChild(option);
  });

  const mallPlaza = territory.puntos.find((p) => p.nombre === 'Mall Plaza') || territory.puntos[0];
  if (mallPlaza) {
    pointSelect.value = mallPlaza._id;
    updatePointSelection(mallPlaza._id, false);
    setInspector(
      { ...mallPlaza, mapType: 'acopio' },
      'Nodo Hito de Acopio',
      mallPlaza.zona_id?.nombre || 'Manizales',
      `${mallPlaza.saturacion_ordinarios}% ordinarios · ${mallPlaza.saturacion_raee}% RAEE`,
      (mallPlaza.barrios_cobertura || []).join(', '),
      `${mallPlaza.direccion_referencia}. RAEE recibidos: ${(mallPlaza.tipos_raee_acumulados || []).join(', ')}.`,
    );
  }
}

/**
 * Renderiza el mapa vectorial estilizado de Manizales siguiendo el diseño visual de prueba.html
 * (retícula cartográfica, corredores viales de Manizales, marcadores con halo interactivo y ruta animada).
 */
function renderInteractiveVectorMap() {
  const container = document.getElementById('map');
  container.replaceChildren();
  const minLon = -75.596;
  const maxLon = -75.432;
  const minLat = 5.030;
  const maxLat = 5.126;
  const width = 860;
  const height = 520;

  const project = ([lon, lat]) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * (width - 90) + 45;
    const y = height - (((lat - minLat) / (maxLat - minLat)) * (height - 80) + 40);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  };

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'w-full h-auto');
  svg.innerHTML = `
    <defs>
      <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1e293b" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="#0b1724"/>
    <rect width="${width}" height="${height}" fill="url(#map-grid)" opacity=".55"/>
    <path d="M35 160 C180 185 320 265 440 285 S615 310 790 440 M280 450 C360 365 425 320 565 295 S690 340 820 420 M420 40 C435 135 450 220 440 285 S430 410 380 490" fill="none" stroke="#26394a" stroke-width="12" stroke-linecap="round"/>
    <path d="M35 160 C180 185 320 265 440 285 S615 310 790 440 M280 450 C360 365 425 320 565 295 S690 340 820 420 M420 40 C435 135 450 220 440 285 S430 410 380 490" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
    <g fill="#94a3b8" font-size="11" font-family="Inter, sans-serif" font-weight="600" opacity=".75">
      <text x="24" y="30" fill="#38bdf8">SECTOR RURAL OCCIDENTAL · LA CABAÑA</text>
      <text x="415" y="28" fill="#38bdf8">CORREDOR NORTE · ALTO DEL GUAMO</text>
      <text x="310" y="255">CENTRO HISTÓRICO · CUMANDAY</text>
      <text x="530" y="235">LA CAROLA · MALL PLAZA</text>
      <text x="515" y="395">EL CABLE · PALOGRANDE</text>
      <text x="645" y="485">CORREDOR INDUSTRIAL · MALTERÍA</text>
      <text x="630" y="195" fill="#34d399">RESERVA RÍO BLANCO</text>
    </g>
    <g id="route-layer">
      <polyline id="svg-urgent-route-line" fill="none" stroke="#34d399" stroke-width="3.5" stroke-dasharray="9 7" opacity=".92" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;

  const routePath = svg.querySelector('#svg-urgent-route-line');
  const nodesGroup = document.createElementNS(svgNS, 'g');
  svg.appendChild(nodesGroup);

  const features = buildFeatureItems();
  markers = features.map((item) => {
    const [cx, cy] = project(item.coordinates);
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'map-marker');
    g.setAttribute('transform', `translate(${cx} ${cy})`);
    g.setAttribute('tabindex', '0');

    const halo = document.createElementNS(svgNS, 'circle');
    halo.setAttribute('class', 'marker-halo');
    halo.setAttribute('r', '18');
    halo.setAttribute('fill', colors[item.type]);

    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', item.type === 'acopio' ? '12.5' : '11');
    dot.setAttribute('fill', '#0f172a');
    dot.setAttribute('stroke', colors[item.type]);
    dot.setAttribute('stroke-width', '2.5');

    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', colors[item.type]);
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '800');
    text.textContent = item.symbol;

    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', '16');
    label.setAttribute('dy', '3.5');
    label.setAttribute('fill', '#e2e8f0');
    label.setAttribute('font-size', '10');
    label.setAttribute('font-weight', '600');
    label.textContent = item.feature.nombre || item.feature.identificador;

    g.append(halo, dot, text, label);
    g.addEventListener('click', () => {
      document.querySelectorAll('.map-marker').forEach((m) => m.classList.remove('selected'));
      g.classList.add('selected');
      setInspector(item.feature, item.kind, item.place, item.status, item.extra, item.description);
      if (item.type === 'acopio') updatePointSelection(item.feature._id, true);
    });
    nodesGroup.appendChild(g);
    return { element: g, type: item.type, item, project };
  });

  svgMapState = { svg, routePath, project };
  container.appendChild(svg);
  updateFilter(activeFilter);
}

function addMapboxMarkers() {
  const features = buildFeatureItems();
  markers = features.map((item) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'mapbox-marker';
    element.setAttribute('aria-label', `${item.kind}: ${item.feature.nombre || item.feature.identificador}`);
    const badge = document.createElement('span');
    badge.textContent = item.symbol;
    badge.style.backgroundColor = colors[item.type];
    element.appendChild(badge);
    element.addEventListener('click', () => {
      setInspector(item.feature, item.kind, item.place, item.status, item.extra, item.description);
      if (item.type === 'acopio') updatePointSelection(item.feature._id, true);
    });
    const marker = new mapboxgl.Marker({ element, anchor: 'bottom' })
      .setLngLat(item.coordinates)
      .addTo(map);
    return { marker, type: item.type, item };
  });
  updateFilter(activeFilter);
}

function showRoute(routes) {
  currentRouteGeometry = routes.length ? routes[0].geometry : null;
  const visible = document.getElementById('toggle-routes').checked;

  if (svgMapState) {
    if (!currentRouteGeometry || !visible) {
      svgMapState.routePath.setAttribute('points', '');
      return;
    }
    const pts = currentRouteGeometry.coordinates
      .map((coord) => svgMapState.project(coord).join(','))
      .join(' ');
    svgMapState.routePath.setAttribute('points', pts);
    return;
  }

  if (!map) return;
  const sourceId = 'urgent-route';
  if (map.getLayer('urgent-route-line')) map.removeLayer('urgent-route-line');
  if (map.getSource(sourceId)) map.removeSource(sourceId);
  if (!routes.length) return;
  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: routes[0].geometry },
  });
  map.addLayer({
    id: 'urgent-route-line',
    type: 'line',
    source: sourceId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#34d399', 'line-width': 5, 'line-opacity': 0.85 },
  });
  map.setLayoutProperty('urgent-route-line', 'visibility', visible ? 'visible' : 'none');
  const bounds = new mapboxgl.LngLatBounds();
  routes[0].geometry.coordinates.forEach((coordinate) => bounds.extend(coordinate));
  map.fitBounds(bounds, { padding: 70, maxZoom: 13 });
}

function renderDynamicRouteTable(stops, highlightedId = null) {
  const tbody = document.getElementById('dynamic-route-table');
  if (!tbody) return;
  tbody.replaceChildren();
  stops.forEach((stop) => {
    const isHighlighted = highlightedId && String(stop.id) === String(highlightedId);
    const tr = document.createElement('tr');
    tr.className = isHighlighted
      ? 'bg-emerald-950/60 border-l-4 border-l-emerald-400 font-semibold text-white'
      : 'bg-gray-900/30 hover:bg-gray-800/40';
    const badgeClass = stop.prioridad === 'Inmediata'
      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
    tr.innerHTML = `
      <td class="p-3 font-mono font-bold text-emerald-400">#${stop.orden}</td>
      <td class="p-3 font-bold text-white">${stop.nombre}</td>
      <td class="p-3 text-gray-300">${(stop.barrios_cobertura || []).join(', ')}</td>
      <td class="p-3 font-mono font-bold text-cyan-300">${stop.saturacion}%</td>
      <td class="p-3 font-mono">${stop.dias_sin_servicio} d</td>
      <td class="p-3">${stop.accesibilidad}</td>
      <td class="p-3 font-mono font-extrabold text-white">${stop.score}%</td>
      <td class="p-3"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">${stop.prioridad}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function styleRuleDescription(desc) {
  return desc
    .replace(/\b(SI|ENTONCES|Y|es)\b/g, '<span class="text-white font-bold">$1</span>')
    .replace(/\b(Criticidad_Critica|NivelAccesibilidad_Mala|NivelVolumenRAEE_Alto|Alta|Alto|true)\b/g, '<span class="text-red-400 font-bold">$1</span>')
    .replace(/\b(Criticidad_Alta|Criticidad_Media|NivelAccesibilidad_Regular|NivelVolumenRAEE_Medio|Media|Medio)\b/g, '<span class="text-amber-400 font-bold">$1</span>')
    .replace(/\b(Criticidad_Baja|NivelAccesibilidad_Buena|NivelVolumenRAEE_Bajo|Baja|Bajo|false)\b/g, '<span class="text-cyan-400 font-bold">$1</span>');
}

async function calculateRoute(preserveTable = false) {
  const status = document.getElementById('route-status');
  const vehicleId = document.getElementById('route-vehicle').value;
  if (!vehicleId) return;
  const capEl = document.getElementById('capacity-slider');
  const gestorEl = document.getElementById('gestor-available-toggle');
  const capVal = capEl ? Number(capEl.value) : undefined;
  const gestorVal = gestorEl ? Boolean(gestorEl.checked) : undefined;

  if (apiAvailable) {
    try {
      const result = await requestJson('/api/rutas/calcular', {
        method: 'POST',
        body: JSON.stringify({
          vehiculoId: vehicleId,
          capacidadRestantePct: capVal,
          gestorDisponible: gestorVal,
        }),
      });
      showRoute(result.routes);
      if (result.routes.length) {
        const route = result.routes[0];
        if (preserveTable !== true) renderDynamicRouteTable(route.stops, selectedPointId);
        const kilometers = (route.distanceMeters / 1000).toFixed(1);
        const minutes = Math.round(route.durationSeconds / 60);
        status.textContent = `${route.stops.length} paradas · ${kilometers} km · ${minutes} min · Cabecera: #1 ${route.stops[0]?.nombre || ''}`;
      }
      return;
    } catch (_err) {
      // Continúa con cálculo local en el navegador
    }
  }

  const baseVehicle = territory.vehiculos.find((v) => v._id === vehicleId) || territory.vehiculos[0];
  const vehicle = capVal !== undefined ? { ...baseVehicle, capacidad_restante: capVal } : baseVehicle;
  const stops = computeLocalStops(vehicle, gestorVal).slice(0, 12);
  const coords = [vehicle.ubicacion_actual.coordinates, ...stops.map((s) => s.coordinates)];
  showRoute([{ geometry: { type: 'LineString', coordinates: coords } }]);
  if (preserveTable !== true) renderDynamicRouteTable(stops, selectedPointId);
  status.textContent = `${stops.length} paradas priorizadas en Manizales · Cabecera: #1 ${stops[0]?.nombre || ''}`;
}

function renderInferenceResult(result) {
  document.getElementById('priority-score').textContent = `${result.score}%`;
  document.getElementById('priority-score').className = 'text-4xl font-extrabold drop-shadow-md '
    + (result.priority === 'Inmediata' ? 'text-red-500' : result.priority === 'Alta' ? 'text-amber-400' : 'text-cyan-400');

  document.getElementById('priority-label').textContent = `Atención ${result.priority} (${result.criticidad || 'Criticidad_Media'})`;
  document.getElementById('priority-label').className = 'px-3.5 py-1 mt-2 text-xs font-bold rounded-full '
    + (result.priority === 'Inmediata'
      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
      : result.priority === 'Alta'
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30');

  const sanitaryBadge = document.getElementById('sanitary-criticality-badge');
  if (sanitaryBadge) {
    sanitaryBadge.textContent = `${result.sanitaryCriticidad || result.criticidad} (${result.sanitaryScore ?? result.score}%)`;
  }
  const operationalBadge = document.getElementById('operational-criticality-badge');
  if (operationalBadge) {
    operationalBadge.textContent = `${result.operationalCriticidad || result.criticidad} (${result.operationalScore ?? result.score}%)`;
  }

  const actionBox = document.getElementById('operational-action-box');
  if (actionBox) {
    if (result.operationalActions?.length) {
      actionBox.classList.remove('hidden');
      actionBox.innerHTML = `<span class="font-bold text-amber-400">&gt;&gt; ACCIÓN BLOQUE 2:</span> ${result.operationalActions[0].message}`;
    } else {
      actionBox.classList.add('hidden');
      actionBox.textContent = '';
    }
  }

  const rankBadge = document.getElementById('route-rank-badge');
  if (result.routeOrderPosition) {
    rankBadge.textContent = `Orden en Ruta del Camión: Parada #${result.routeOrderPosition} de ${result.updatedRouteStops.length}`;
    document.getElementById('route-order-highlight').textContent = `Nodo ${result.puntoAcopio.nombre} en posición #${result.routeOrderPosition} de despacho (${result.score}%)`;
  } else {
    rankBadge.textContent = 'Atención programada en ciclo ordinario';
    document.getElementById('route-order-highlight').textContent = `Nodo ${result.puntoAcopio.nombre} en ciclo ordinario (${result.score}%)`;
  }

  document.getElementById('recommended-vehicle').textContent = result.recommendedVehicleType || 'Compactador / Estándar';
  document.getElementById('explanation').textContent = `Se evalúa "${result.puntoAcopio.nombre}" (${result.zona.nombre} · Cobertura: ${(result.puntoAcopio.barrios_cobertura || []).join(', ')}) con centroide global ${result.score}% (${result.criticidad || result.priority}) y criticidad sanitaria ${result.sanitaryScore ?? result.score}% (${result.sanitaryCriticidad || result.priority}) por saturación ${result.inputs.saturation}%, ${result.inputs.daysWithoutService} días sin servicio, entorno sensible=${result.inputs.puntoEnEntornoSensible}, capacidad=${result.inputs.capacidadRestantePct}% y volumen RAEE=${result.inputs.volumenRaee}%. ${result.accessibilityAdvice}`;

  const memSummary = document.getElementById('membership-summary');
  if (memSummary && result.memberships) {
    const satM = result.memberships.saturation;
    const daysM = result.memberships.daysWithoutService;
    const capM = result.memberships.capacity || { Baja: 0, Alta: 0 };
    const raeeM = result.memberships.raeeVolume || { Bajo: 0, Medio: 0, Alto: 0 };
    memSummary.innerHTML = `
      <div class="p-2 rounded-lg bg-gray-900/80 border border-gray-800">
        <div class="text-cyan-400 font-bold mb-0.5">μ(Saturación)</div>
        <div class="text-gray-300">B:${(satM.Baja ?? satM.baja).toFixed(2)} M:${(satM.Media ?? satM.media).toFixed(2)} A:${(satM.Alta ?? satM.alta).toFixed(2)}</div>
      </div>
      <div class="p-2 rounded-lg bg-gray-900/80 border border-gray-800">
        <div class="text-amber-400 font-bold mb-0.5">μ(Días sin Serv.)</div>
        <div class="text-gray-300">B:${(daysM.Bajo ?? daysM.pocos).toFixed(2)} M:${(daysM.Medio ?? daysM.varios).toFixed(2)} A:${(daysM.Alto ?? daysM.muchos).toFixed(2)}</div>
      </div>
      <div class="p-2 rounded-lg bg-gray-900/80 border border-gray-800">
        <div class="text-emerald-400 font-bold mb-0.5">μ(Capacidad Flota)</div>
        <div class="text-gray-300">B:${capM.Baja.toFixed(2)} A:${capM.Alta.toFixed(2)}</div>
      </div>
      <div class="p-2 rounded-lg bg-gray-900/80 border border-gray-800">
        <div class="text-purple-400 font-bold mb-0.5">μ(Volumen RAEE)</div>
        <div class="text-gray-300">B:${raeeM.Bajo.toFixed(2)} M:${raeeM.Medio.toFixed(2)} A:${raeeM.Alto.toFixed(2)}</div>
      </div>
    `;
  }

  const rules = document.getElementById('activated-rules');
  rules.replaceChildren();
  result.activatedRules.forEach((rule, idx) => {
    const card = document.createElement('div');
    const isTop = idx === 0;
    const isBlock1 = rule.block === 'Bloque 1';
    card.className = isTop
      ? 'p-3 rounded-xl bg-emerald-900/30 border border-emerald-500/50 text-gray-200'
      : isBlock1
        ? 'p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/35 text-gray-300'
        : 'p-3 rounded-xl bg-purple-900/30 border border-purple-500/40 text-gray-300';
    card.innerHTML = `
      <div class="flex justify-between items-center mb-1 gap-2">
        <div class="flex items-center gap-1.5">
          <span class="${isTop ? 'text-emerald-400' : isBlock1 ? 'text-cyan-400' : 'text-purple-400'} font-bold">${rule.id}</span>
          <span class="px-1.5 py-0.5 rounded bg-gray-900/80 text-[9px] text-gray-300 border border-gray-700">${rule.block || 'Bloque 1'}</span>
        </div>
        <span class="px-2 py-0.5 rounded bg-gray-900/80 text-[10px] font-bold text-white">Activación ${Math.round(rule.activation * 100)}%</span>
      </div>
      <div>${styleRuleDescription(rule.description)}</div>
    `;
    rules.appendChild(card);
  });

  if (result.updatedRouteStops) {
    renderDynamicRouteTable(result.updatedRouteStops, selectedPointId);
  }
}

async function runInference() {
  const status = document.getElementById('inference-status');
  const button = document.getElementById('run-inference');
  if (!selectedPointId) return;
  const seq = ++inferenceSeq;
  const satVal = Number(document.getElementById('saturation-slider').value);
  const daysVal = Number(document.getElementById('days-slider').value);
  const capVal = Number(document.getElementById('capacity-slider')?.value ?? 80);
  const raeeVal = Number(document.getElementById('raee-volume-slider')?.value ?? 0);
  const sensitiveVal = Boolean(document.getElementById('sensitive-env-toggle')?.checked);
  const gestorVal = Boolean(document.getElementById('gestor-available-toggle')?.checked ?? true);
  const dangerousVal = Boolean(document.getElementById('raee-dangerous-toggle')?.checked);
  button.disabled = true;

  try {
    if (apiAvailable) {
      try {
        const vehicleId = document.getElementById('route-vehicle')?.value;
        const result = await requestJson('/api/inferencia/evaluar', {
          method: 'POST',
          body: JSON.stringify({
            puntoAcopioId: selectedPointId,
            saturacion: satVal,
            accesibilidad: accessibility,
            diasSinServicio: daysVal,
            vehiculoId: vehicleId,
            capacidadRestantePct: capVal,
            volumenRaee: raeeVal,
            puntoEnEntornoSensible: sensitiveVal,
            gestorDisponible: gestorVal,
            tipoRaeeEsPeligroso: dangerousVal,
          }),
        });
        if (seq !== inferenceSeq) return;
        const localPoint = territory.puntos.find((p) => p._id === selectedPointId);
        if (localPoint) {
          localPoint.saturacion_ordinarios = satVal;
          localPoint.saturacion_raee = raeeVal;
          localPoint.accesibilidad_actual = result.inputs.accessibility;
          localPoint.entorno_sensible = sensitiveVal;
          localPoint.gestor_disponible = gestorVal;
          localPoint.raee_peligroso = dangerousVal;
          if (localPoint.zona_id) localPoint.zona_id.dias_sin_servicio = daysVal;
        }
        renderInferenceResult(result);
        await calculateRoute(true);
        if (seq === inferenceSeq) {
          status.textContent = `Motor Mamdani (R1–R32) ejecutado para ${result.puntoAcopio.nombre}. Ruta actualizada.`;
        }
        return;
      } catch (apiErr) {
        console.warn('Error en /api/inferencia/evaluar, usando motor local:', apiErr);
      }
    }

    // Ejecución local directa cuando se abre prueba.html sin servidor
    const engine = getFuzzyEngine();
    const point = territory.puntos.find((p) => p._id === selectedPointId);
    if (!point) return;
    point.saturacion_ordinarios = satVal;
    point.saturacion_raee = raeeVal;
    point.accesibilidad_actual = accessibility;
    point.entorno_sensible = sensitiveVal;
    point.gestor_disponible = gestorVal;
    point.raee_peligroso = dangerousVal;
    if (point.zona_id) point.zona_id.dias_sin_servicio = daysVal;

    const zId = String(point.zona_id?._id || point.zona_id);
    const zEvents = (territory.eventos || []).filter((e) => String(e.zona_id) === zId);
    const ctx = engine.deriveScenarioContext(
      zEvents,
      point.zona_id?.sensibilidad_entorno ?? 75,
      accessibility,
    );

    const evalRes = engine.fuzzyPriority({
      saturation: satVal,
      sensitivity: ctx.sensitivity,
      daysWithoutService: daysVal,
      accessibility: ctx.accessibility,
      puntoEnEntornoSensible: sensitiveVal,
      capacidadRestantePct: capVal,
      volumenRaee: raeeVal,
      gestorDisponible: gestorVal,
      tipoRaeeEsPeligroso: dangerousVal,
    });
    const vehicleId = document.getElementById('route-vehicle')?.value;
    const selectedVehicle = territory.vehiculos.find((v) => String(v._id) === String(vehicleId));
    const stops = computeLocalStops(
      selectedVehicle ? { ...selectedVehicle, capacidad_restante: capVal } : { tipo: 'Compactador', capacidad_restante: capVal },
      gestorVal,
    );
    const stopIdx = stops.findIndex((s) => String(s.id) === String(point._id));

    renderInferenceResult({
      puntoAcopio: {
        id: point._id,
        nombre: point.nombre,
        barrios_cobertura: point.barrios_cobertura,
      },
      zona: {
        id: zId,
        nombre: point.zona_id?.nombre || 'Manizales',
      },
      inputs: {
        saturation: satVal,
        sensitivity: ctx.sensitivity,
        daysWithoutService: daysVal,
        accessibility: evalRes.accessibility,
        puntoEnEntornoSensible: sensitiveVal,
        capacidadRestantePct: capVal,
        volumenRaee: raeeVal,
        gestorDisponible: gestorVal,
        tipoRaeeEsPeligroso: dangerousVal,
      },
      routeOrderPosition: stopIdx >= 0 ? stopIdx + 1 : null,
      updatedRouteStops: stops,
      ...evalRes,
    });
    await calculateRoute(true);
    if (seq === inferenceSeq) {
      status.textContent = `Motor Mamdani (R1–R32) ejecutado para ${point.nombre}. Ruta actualizada.`;
    }
  } catch (error) {
    console.error('Error al ejecutar el motor difuso:', error);
    if (status) status.textContent = `Error al evaluar inferencia: ${error.message}`;
  } finally {
    button.disabled = false;
  }
}

async function resolveBarrioSearch(barrioQuery) {
  const banner = document.getElementById('barrio-resolution-banner');
  const q = String(barrioQuery || '').trim();
  if (!q) return;

  const matchedPoint = territory.puntos.find(
    (p) => p.nombre.toLowerCase() === q.toLowerCase()
      || (p.barrios_cobertura || []).some((b) => b.toLowerCase().includes(q.toLowerCase())),
  );

  if (matchedPoint) {
    banner.innerHTML = `
      <div class="flex items-center gap-2 text-emerald-200">
        <i class="fa-solid fa-circle-check text-emerald-400"></i>
        <span><strong>Asignación Ontológica:</strong> El reporte del sector <strong>${q}</strong> se consolida en el Nodo Hito <strong>${matchedPoint.nombre}</strong> (<code>${matchedPoint.direccion_referencia} · ${matchedPoint.ubicacion.coordinates[0]}, ${matchedPoint.ubicacion.coordinates[1]}</code> · Cobertura: ${(matchedPoint.barrios_cobertura || []).join(', ')}).</span>
      </div>
      <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">Nodo Activo: ${matchedPoint.codigo}</span>
    `;
    updatePointSelection(matchedPoint._id, true);
    setInspector(
      { ...matchedPoint, mapType: 'acopio' },
      'Nodo Hito de Acopio',
      matchedPoint.zona_id?.nombre || 'Manizales',
      `${matchedPoint.saturacion_ordinarios}% ordinarios · ${matchedPoint.saturacion_raee}% RAEE`,
      (matchedPoint.barrios_cobertura || []).join(', '),
      `${matchedPoint.direccion_referencia}. RAEE: ${(matchedPoint.tipos_raee_acumulados || []).join(', ')}.`,
    );
    if (map) {
      map.flyTo({ center: matchedPoint.ubicacion.coordinates, zoom: 14 });
    }
  } else {
    banner.innerHTML = `<span class="text-amber-300"><i class="fa-solid fa-circle-info mr-1"></i>No se encontró coincidencia para "${q}". Prueba con La Carola, El Cable, Centro, Solferino, La Cabaña o Alto del Guamo.</span>`;
  }
}

window.quickResolveBarrio = (barrioName) => {
  const input = document.getElementById('barrio-search-input');
  if (input) input.value = barrioName;
  resolveBarrioSearch(barrioName);
};

async function initialize() {
  document.querySelectorAll('.map-filter').forEach((button) => {
    button.addEventListener('click', () => updateFilter(button.dataset.mapFilter));
  });
  document.getElementById('toggle-routes').addEventListener('change', (event) => {
    const visibility = event.target.checked ? 'visible' : 'none';
    if (map?.getLayer('urgent-route-line')) {
      map.setLayoutProperty('urgent-route-line', 'visibility', visibility);
    } else if (svgMapState && currentRouteGeometry) {
      showRoute([{ geometry: currentRouteGeometry }]);
    }
  });
  document.getElementById('calculate-route').addEventListener('click', calculateRoute);
  document.getElementById('run-inference').addEventListener('click', runInference);
  document.getElementById('btn-resolve-barrio').addEventListener('click', () => {
    resolveBarrioSearch(document.getElementById('barrio-search-input').value);
  });

  document.getElementById('saturation-slider').addEventListener('input', (event) => {
    document.getElementById('saturation-value').textContent = formatSaturationText(event.target.value);
    runInference();
  });

  document.getElementById('days-slider').addEventListener('input', (event) => {
    document.getElementById('days-value').textContent = `${event.target.value} días`;
    runInference();
  });

  document.getElementById('capacity-slider')?.addEventListener('input', (event) => {
    document.getElementById('capacity-value').textContent = formatCapacityText(event.target.value);
    runInference();
  });

  document.getElementById('raee-volume-slider')?.addEventListener('input', (event) => {
    document.getElementById('raee-volume-value').textContent = formatRaeeText(event.target.value);
    runInference();
  });

  ['sensitive-env-toggle', 'gestor-available-toggle', 'raee-dangerous-toggle'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => runInference());
  });

  document.getElementById('route-vehicle')?.addEventListener('change', (event) => {
    const vehicle = territory?.vehiculos.find((v) => String(v._id) === String(event.target.value));
    const capSlider = document.getElementById('capacity-slider');
    if (vehicle && capSlider) {
      capSlider.value = vehicle.capacidad_restante;
      document.getElementById('capacity-value').textContent = formatCapacityText(vehicle.capacidad_restante);
    }
    calculateRoute();
  });

  document.querySelectorAll('.accessibility-option').forEach((button) => {
    button.addEventListener('click', () => {
      setAccessibilityUI(button.dataset.accessibility);
      runInference();
    });
  });

  document.getElementById('preset-mall-plaza-90').addEventListener('click', () => {
    const mallPlaza = territory.puntos.find((p) => p.nombre === 'Mall Plaza');
    if (!mallPlaza) return;
    updatePointSelection(mallPlaza._id, false);
    document.getElementById('saturation-slider').value = 90;
    document.getElementById('saturation-value').textContent = formatSaturationText(90);
    setAccessibilityUI('Buena');
    runInference();
  });

  document.getElementById('preset-guamo-clima').addEventListener('click', () => {
    const guamo = territory.puntos.find((p) => p.nombre === 'Alto del Guamo');
    if (!guamo) return;
    updatePointSelection(guamo._id, false);
    document.getElementById('saturation-slider').value = 88;
    document.getElementById('saturation-value').textContent = formatSaturationText(88);
    document.getElementById('days-slider').value = 11;
    document.getElementById('days-value').textContent = '11 días';
    setAccessibilityUI('Mala');
    runInference();
  });

  try {
    territory = await requestJson('/api/territorio/mapa');
    apiAvailable = true;
    try {
      const owlInfo = await requestJson('/api/ontologia/resumen');
      const owlBadge = document.getElementById('owl-badge');
      if (owlBadge && owlInfo) {
        owlBadge.innerHTML = `<i class="fa-solid fa-diagram-project mr-1"></i>OWL: ${owlInfo.file} (${owlInfo.classes.length} clases · ${owlInfo.individuals.length} individuos)`;
      }
    } catch (_e) {
      // Mantiene etiqueta base de ontology/villa_verde_v3.owl
    }
  } catch (_offlineErr) {
    territory = buildEmbeddedManizalesTerritory();
    apiAvailable = false;
  }

  populateControls();
  renderActiveEventsAndTables();

  if (apiAvailable) {
    try {
      const config = await requestJson('/api/config/mapbox');
      if (config.publicToken && window.mapboxgl) {
        mapboxgl.accessToken = config.publicToken;
        map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/dark-v11',
          center: config.center || [-75.5012, 5.0689],
          zoom: 12,
        });
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.on('load', async () => {
          addMapboxMarkers();
          await runInference();
        });
        map.on('error', () => {
          if (!svgMapState) {
            map = null;
            renderInteractiveVectorMap();
            runInference();
          }
        });
        return;
      }
    } catch (_err) {
      // Usa el mapa vectorial estilizado de Manizales
    }
  }

  renderInteractiveVectorMap();
  await runInference();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach((element) => element.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach((element) => {
    element.classList.remove('bg-emerald-600', 'text-white', 'shadow-md');
    element.classList.add('text-gray-400');
  });
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  const activeButton = document.getElementById(`btn-tab-${tabId}`);
  activeButton.classList.add('bg-emerald-600', 'text-white', 'shadow-md');
  activeButton.classList.remove('text-gray-400');
  if (tabId === 'ontologia' && map) map.resize();
}

window.switchTab = switchTab;
initialize();
