require('dotenv').config();

const mongoose = require('mongoose');
const {
  Zona,
  PuntoAcopio,
  Vehiculo,
  EventoContexto,
  Ruta,
} = require('./models');

const geoPoint = (longitude, latitude) => ({
  type: 'Point',
  coordinates: [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))],
});

/**
 * Zonas Territoriales de Manizales, Caldas (Comunas Urbanas, Veredas y Corregimientos).
 * Regla de Nodos de Referencia: Cada zona agrupa sus barrios constitutivos hacia
 * un hito urbano o centro poblado ampliamente reconocido en la ciudad.
 */
const zones = [
  {
    codigo: 'MZL-Z01',
    nombre: 'Comuna Cumanday · Centro Histórico',
    tipo: 'Comuna',
    hito_referencia: 'Plaza de Bolívar',
    barrios_agrupados: ['Centro', 'Los Agustinos', 'San José', 'Fundadores', 'Parque Caldas'],
    location: geoPoint(-75.51738, 5.06889),
    sensibilidad: 88,
    days: 1,
    demand: 820,
  },
  {
    codigo: 'MZL-Z02',
    nombre: 'Comuna Ecoturístico Cerro de Oro · Eje Comercial',
    tipo: 'Comuna',
    hito_referencia: 'Mall Plaza',
    barrios_agrupados: ['La Carola', 'Los Cámbulos', 'Villahermosa', 'Alta Suiza', 'San Marcel', 'La Sultana'],
    location: geoPoint(-75.48322, 5.06941),
    sensibilidad: 84,
    days: 2,
    demand: 790,
  },
  {
    codigo: 'MZL-Z03',
    nombre: 'Comuna Palogrande · Zona Rosa y Universitaria',
    tipo: 'Comuna',
    hito_referencia: 'Torre del Cable',
    barrios_agrupados: ['El Cable', 'Palogrande', 'La Estrella', 'Belén', 'Palermo', 'La Rambla'],
    location: geoPoint(-75.48784, 5.05612),
    sensibilidad: 91,
    days: 1,
    demand: 750,
  },
  {
    codigo: 'MZL-Z04',
    nombre: 'Comuna Tesorito · Corredor Industrial',
    tipo: 'Comuna',
    hito_referencia: 'Parque Industrial Maltería',
    barrios_agrupados: ['Maltería', 'Juanchito', 'La Enea', 'Lusitania', 'San Pío X'],
    location: geoPoint(-75.44215, 5.03918),
    sensibilidad: 76,
    days: 3,
    demand: 680,
  },
  {
    codigo: 'MZL-Z05',
    nombre: 'Comuna Atardeceres · Sector Occidental',
    tipo: 'Comuna',
    hito_referencia: 'Mirador de Chipre',
    barrios_agrupados: ['Chipre', 'Villa Pilar', 'Sacatín', 'La Francia', 'Campohermoso', 'Morrogacho'],
    location: geoPoint(-75.52951, 5.07524),
    sensibilidad: 74,
    days: 2,
    demand: 540,
  },
  {
    codigo: 'MZL-Z06',
    nombre: 'Comuna Ciudadela del Norte',
    tipo: 'Comuna',
    hito_referencia: 'Cisco Bosques del Norte',
    barrios_agrupados: ['Bosques del Norte', 'San Cayetano', 'Solferino', 'Sinaí', 'Caribe', 'Perla del Ruiz'],
    location: geoPoint(-75.49852, 5.08847),
    sensibilidad: 81,
    days: 3,
    demand: 640,
  },
  {
    codigo: 'MZL-Z07',
    nombre: 'Comuna San José · Sector Abastecimiento',
    tipo: 'Comuna',
    hito_referencia: 'Plaza de Mercado Galería',
    barrios_agrupados: ['La Galería', 'Colón', 'Las Delicias', 'Assis', 'San Ignacio'],
    location: geoPoint(-75.52105, 5.07352),
    sensibilidad: 89,
    days: 1,
    demand: 860,
  },
  {
    codigo: 'MZL-Z08',
    nombre: 'Comuna Universitaria · Sur Urbano',
    tipo: 'Comuna',
    hito_referencia: 'Redoma Fátima',
    barrios_agrupados: ['Fátima', 'Pío XII', 'Aranjuez', 'Malabar', 'Kennedy', 'Camilo Torres'],
    location: geoPoint(-75.49954, 5.05108),
    sensibilidad: 72,
    days: 2,
    demand: 590,
  },
  {
    codigo: 'MZL-Z09',
    nombre: 'Comuna La Fuente · Zona Gastronómica Suroriental',
    tipo: 'Comuna',
    hito_referencia: 'Bulevar de Milán',
    barrios_agrupados: ['Milán', 'El Paraíso', 'La Fuente', 'Guamal', 'Bengala'],
    location: geoPoint(-75.47651, 5.04853),
    sensibilidad: 69,
    days: 2,
    demand: 480,
  },
  {
    codigo: 'MZL-Z10',
    nombre: 'Vereda La Cabaña',
    tipo: 'Vereda',
    hito_referencia: 'Centro Poblado La Cabaña',
    barrios_agrupados: ['La Cabaña', 'Cuchilla del Salado', 'Las Pavas', 'La Linda Rural'],
    location: geoPoint(-75.58812, 5.09804),
    sensibilidad: 70,
    days: 9,
    demand: 145,
  },
  {
    codigo: 'MZL-Z11',
    nombre: 'Vereda El Rosario',
    tipo: 'Vereda',
    hito_referencia: 'Crucero El Rosario',
    barrios_agrupados: ['El Rosario', 'La Violeta', 'Trinidad', 'Santa Clara'],
    location: geoPoint(-75.54508, 5.03812),
    sensibilidad: 66,
    days: 7,
    demand: 130,
  },
  {
    codigo: 'MZL-Z12',
    nombre: 'Vereda Alto del Guamo',
    tipo: 'Vereda',
    hito_referencia: 'Alto del Guamo',
    barrios_agrupados: ['Alto del Guamo', 'El Águila', 'Alto del Naranjo', 'Quiebra de Vélez'],
    location: geoPoint(-75.49206, 5.11905),
    sensibilidad: 75,
    days: 10,
    demand: 120,
  },
  {
    codigo: 'MZL-Z13',
    nombre: 'Corregimiento Río Blanco',
    tipo: 'Corregimiento',
    hito_referencia: 'Reserva Protectora Río Blanco',
    barrios_agrupados: ['Río Blanco', 'Minitas', 'La Aurora', 'Buenavista'],
    location: geoPoint(-75.46104, 5.07809),
    sensibilidad: 96,
    days: 6,
    demand: 110,
  },
  {
    codigo: 'MZL-Z14',
    nombre: 'Vereda Bajo Tablazo',
    tipo: 'Vereda',
    hito_referencia: 'Cruce Bajo Tablazo',
    barrios_agrupados: ['Bajo Tablazo', 'Alto Tablazo', 'Java', 'La Pola'],
    location: geoPoint(-75.53421, 5.04485),
    sensibilidad: 64,
    days: 6,
    demand: 125,
  },
];

/**
 * Puntos de Acopio (Nodos de Referencia Operativos en Manizales).
 * Nota: Los reportes originados en La Carola, Los Cámbulos o Villahermosa se consolidan
 * en el nodo principal "Mall Plaza".
 */
const points = [
  {
    codigo: 'NAC-01',
    nombre: 'Mall Plaza',
    zona: 'Comuna Ecoturístico Cerro de Oro · Eje Comercial',
    barrios_cobertura: ['La Carola', 'Los Cámbulos', 'Villahermosa', 'Alta Suiza'],
    direccion_referencia: 'Av. Kevin Ángel con Calle 55 · Sector La Carola',
    location: geoPoint(-75.48322, 5.06941),
    ordinary: 64,
    raee: 68,
    accessibility: 'Buena',
    raeeTypes: ['Celulares', 'Baterías', 'Cables', 'Computadores'],
  },
  {
    codigo: 'NAC-02',
    nombre: 'Plaza de Bolívar',
    zona: 'Comuna Cumanday · Centro Histórico',
    barrios_cobertura: ['Centro', 'Los Agustinos', 'Parque Caldas'],
    direccion_referencia: 'Carrera 22 con Calle 21 · Centro Histórico',
    location: geoPoint(-75.51738, 5.06889),
    ordinary: 86,
    raee: 62,
    accessibility: 'Buena',
    raeeTypes: ['Baterías', 'Celulares', 'Luminarias LED'],
  },
  {
    codigo: 'NAC-03',
    nombre: 'Torre del Cable',
    zona: 'Comuna Palogrande · Zona Rosa y Universitaria',
    barrios_cobertura: ['El Cable', 'La Estrella', 'Belén', 'La Rambla'],
    direccion_referencia: 'Av. Santander Calle 65 · Glorieta El Cable',
    location: geoPoint(-75.48784, 5.05612),
    ordinary: 81,
    raee: 74,
    accessibility: 'Buena',
    raeeTypes: ['Computadores', 'Celulares', 'Baterías', 'Periféricos'],
  },
  {
    codigo: 'NAC-04',
    nombre: 'Estadio Palogrande',
    zona: 'Comuna Palogrande · Zona Rosa y Universitaria',
    barrios_cobertura: ['Palogrande', 'Palermo', 'Campus Universitario'],
    direccion_referencia: 'Carrera 25 con Calle 62 · Unidad Deportiva',
    location: geoPoint(-75.48972, 5.05784),
    ordinary: 58,
    raee: 52,
    accessibility: 'Buena',
    raeeTypes: ['Baterías', 'Cables', 'Bombillas'],
  },
  {
    codigo: 'NAC-05',
    nombre: 'Plaza de Mercado Galería',
    zona: 'Comuna San José · Sector Abastecimiento',
    barrios_cobertura: ['La Galería', 'Colón', 'Las Delicias', 'San José'],
    direccion_referencia: 'Calle 21 con Carrera 16 · Pabellón Central',
    location: geoPoint(-75.52105, 5.07352),
    ordinary: 92,
    raee: 41,
    accessibility: 'Regular',
    raeeTypes: ['Electrodomésticos', 'Básculas Electrónicas', 'Cables'],
  },
  {
    codigo: 'NAC-06',
    nombre: 'Parque Fundadores',
    zona: 'Comuna Cumanday · Centro Histórico',
    barrios_cobertura: ['Fundadores', 'Linares', 'Versalles'],
    direccion_referencia: 'Calle 33 con Carrera 23 · Estación Cable Aéreo',
    location: geoPoint(-75.50981, 5.06721),
    ordinary: 69,
    raee: 55,
    accessibility: 'Buena',
    raeeTypes: ['Celulares', 'Cargadores', 'Baterías'],
  },
  {
    codigo: 'NAC-07',
    nombre: 'Terminal Los Cámbulos',
    zona: 'Comuna Ecoturístico Cerro de Oro · Eje Comercial',
    barrios_cobertura: ['Los Cámbulos', 'San Marcel', 'La Sultana'],
    direccion_referencia: 'Vía Panamericana · Terminal de Transporte',
    location: geoPoint(-75.48051, 5.06152),
    ordinary: 65,
    raee: 49,
    accessibility: 'Buena',
    raeeTypes: ['Baterías', 'Luminarias', 'Cables'],
  },
  {
    codigo: 'NAC-08',
    nombre: 'Parque Industrial Maltería',
    zona: 'Comuna Tesorito · Corredor Industrial',
    barrios_cobertura: ['Maltería', 'Juanchito', 'Zona Franca Andina'],
    direccion_referencia: 'Km 10 Vía al Magdalena · Sector Industrial Maltería',
    location: geoPoint(-75.44215, 5.03918),
    ordinary: 63,
    raee: 89,
    accessibility: 'Buena',
    raeeTypes: ['Tarjetas', 'Cables', 'Transformadores', 'Baterías Industriales'],
  },
  {
    codigo: 'NAC-09',
    nombre: 'Nodo La Enea',
    zona: 'Comuna Tesorito · Corredor Industrial',
    barrios_cobertura: ['La Enea', 'Lusitania', 'San Pío X'],
    direccion_referencia: 'Carrera 35 con Calle 103 · Acceso Aeropuerto La Nubia',
    location: geoPoint(-75.45804, 5.03552),
    ordinary: 71,
    raee: 61,
    accessibility: 'Buena',
    raeeTypes: ['Electrodomésticos', 'Televisores', 'Cables'],
  },
  {
    codigo: 'NAC-10',
    nombre: 'Mirador de Chipre',
    zona: 'Comuna Atardeceres · Sector Occidental',
    barrios_cobertura: ['Chipre', 'Villa Pilar', 'La Francia', 'Campohermoso'],
    direccion_referencia: 'Av. 12 de Octubre · Monumento a los Colonizadores',
    location: geoPoint(-75.52951, 5.07524),
    ordinary: 62,
    raee: 37,
    accessibility: 'Buena',
    raeeTypes: ['Bombillas', 'Pequeños Electrodomésticos'],
  },
  {
    codigo: 'NAC-11',
    nombre: 'Cisco Bosques del Norte',
    zona: 'Comuna Ciudadela del Norte',
    barrios_cobertura: ['Bosques del Norte', 'San Cayetano', 'Solferino', 'Sinaí', 'Caribe'],
    direccion_referencia: 'Calle 48D con Carrera 3B · Centro Integrado Comunitario',
    location: geoPoint(-75.49852, 5.08847),
    ordinary: 83,
    raee: 58,
    accessibility: 'Regular',
    raeeTypes: ['Televisores', 'Cables', 'Celulares'],
  },
  {
    codigo: 'NAC-12',
    nombre: 'Redoma Fátima',
    zona: 'Comuna Universitaria · Sur Urbano',
    barrios_cobertura: ['Fátima', 'Pío XII', 'Aranjuez', 'Malabar', 'Kennedy'],
    direccion_referencia: 'Calle 66 con Carrera 30B · Eje Sur',
    location: geoPoint(-75.49954, 5.05108),
    ordinary: 66,
    raee: 44,
    accessibility: 'Buena',
    raeeTypes: ['Electrodomésticos', 'Baterías'],
  },
  {
    codigo: 'NAC-13',
    nombre: 'Bulevar de Milán',
    zona: 'Comuna La Fuente · Zona Gastronómica Suroriental',
    barrios_cobertura: ['Milán', 'El Paraíso', 'La Fuente', 'Guamal'],
    direccion_referencia: 'Carrera 23 con Calle 75 · Bulevar Gastronómico',
    location: geoPoint(-75.47651, 5.04853),
    ordinary: 54,
    raee: 46,
    accessibility: 'Buena',
    raeeTypes: ['Luminarias', 'Equipos de Refrigeración'],
  },
  {
    codigo: 'NAC-14',
    nombre: 'Centro Poblado La Cabaña',
    zona: 'Vereda La Cabaña',
    barrios_cobertura: ['La Cabaña', 'Cuchilla del Salado', 'Las Pavas'],
    direccion_referencia: 'Caseta Comunal Principal · Vereda La Cabaña',
    location: geoPoint(-75.58812, 5.09804),
    ordinary: 76,
    raee: 39,
    accessibility: 'Regular',
    raeeTypes: ['Baterías', 'Bombillas', 'Acumuladores Agrícolas'],
  },
  {
    codigo: 'NAC-15',
    nombre: 'Crucero El Rosario',
    zona: 'Vereda El Rosario',
    barrios_cobertura: ['El Rosario', 'La Violeta', 'Trinidad'],
    direccion_referencia: 'Vía Antigua Chinchiná · Crucero El Rosario',
    location: geoPoint(-75.54508, 5.03812),
    ordinary: 68,
    raee: 34,
    accessibility: 'Regular',
    raeeTypes: ['Baterías', 'Bombillas'],
  },
  {
    codigo: 'NAC-16',
    nombre: 'Alto del Guamo',
    zona: 'Vereda Alto del Guamo',
    barrios_cobertura: ['Alto del Guamo', 'El Águila', 'Alto del Naranjo'],
    direccion_referencia: 'Km 8 Vía al Norte · Escuela Rural Alto del Guamo',
    location: geoPoint(-75.49206, 5.11905),
    ordinary: 79,
    raee: 42,
    accessibility: 'Mala',
    raeeTypes: ['Baterías', 'Radios', 'Bombillas'],
  },
  {
    codigo: 'NAC-17',
    nombre: 'Reserva Protectora Río Blanco',
    zona: 'Corregimiento Río Blanco',
    barrios_cobertura: ['Río Blanco', 'Minitas', 'La Aurora'],
    direccion_referencia: 'Portón Control Ambiental · Cuenca Río Blanco',
    location: geoPoint(-75.46104, 5.07809),
    ordinary: 64,
    raee: 53,
    accessibility: 'Regular',
    raeeTypes: ['Baterías', 'Sensores', 'Luminarias'],
  },
  {
    codigo: 'NAC-18',
    nombre: 'Cruce Bajo Tablazo',
    zona: 'Vereda Bajo Tablazo',
    barrios_cobertura: ['Bajo Tablazo', 'Alto Tablazo', 'Java'],
    direccion_referencia: 'Puesto de Salud Bajo Tablazo · Vía Autopista del Café',
    location: geoPoint(-75.53421, 5.04485),
    ordinary: 59,
    raee: 31,
    accessibility: 'Regular',
    raeeTypes: ['Bombillas', 'Cables'],
  },
];

/**
 * Flota Operativa de Recolección en Manizales (Compactadores, Volquetas Rurales y Gestores RAEE).
 */
const vehicles = [
  {
    identificador: 'Compactador EMAS-01',
    tipo: 'Compactador',
    placa: 'MZL-410',
    base_operativa: 'Base Operativa Av. Kevin Ángel (Sector Mall Plaza)',
    capacity: 82,
    location: geoPoint(-75.48510, 5.06810),
    available: true,
  },
  {
    identificador: 'Compactador EMAS-02',
    tipo: 'Compactador',
    placa: 'MZL-412',
    base_operativa: 'Centro Histórico · Parque Fundadores',
    capacity: 75,
    location: geoPoint(-75.51240, 5.06820),
    available: true,
  },
  {
    identificador: 'Compactador EMAS-03',
    tipo: 'Compactador',
    placa: 'MZL-418',
    base_operativa: 'Eje Santander · El Cable',
    capacity: 68,
    location: geoPoint(-75.48890, 5.05690),
    available: true,
  },
  {
    identificador: 'Compactador EMAS-04',
    tipo: 'Compactador',
    placa: 'MZL-425',
    base_operativa: 'Patio Taller La Enea',
    capacity: 0,
    location: geoPoint(-75.45510, 5.03610),
    available: false,
  },
  {
    identificador: 'Volqueta Veredal VV-05',
    tipo: 'Volqueta',
    placa: 'CAL-701',
    base_operativa: 'Salida Occidental · Vía La Cabaña',
    capacity: 85,
    location: geoPoint(-75.55120, 5.08450),
    available: true,
  },
  {
    identificador: 'Volqueta Veredal VV-06',
    tipo: 'Volqueta',
    placa: 'CAL-709',
    base_operativa: 'Salida Norte · Corredor Alto del Guamo',
    capacity: 78,
    location: geoPoint(-75.49510, 5.09820),
    available: true,
  },
  {
    identificador: 'Volqueta Veredal VV-07',
    tipo: 'Volqueta',
    placa: 'CAL-715',
    base_operativa: 'Corredor Sur · El Rosario / Tablazo',
    capacity: 74,
    location: geoPoint(-75.53640, 5.04310),
    available: true,
  },
  {
    identificador: 'Gestor RAEE EcoCaldas-08',
    tipo: 'RAEE_Especial',
    placa: 'RAE-901',
    base_operativa: 'Planta de Aprovechamiento Maltería',
    capacity: 92,
    location: geoPoint(-75.44820, 5.04150),
    available: true,
  },
  {
    identificador: 'Gestor RAEE EcoCaldas-09',
    tipo: 'RAEE_Especial',
    placa: 'RAE-904',
    base_operativa: 'Punto Limpio El Cable / Mall Plaza',
    capacity: 88,
    location: geoPoint(-75.48480, 5.06310),
    available: true,
  },
];

/**
 * Eventos de Contexto Operativo (Quejas Ciudadanas y Eventos Climáticos en Manizales).
 * Incluye reportes por barrio que el motor mapea al Nodo de Referencia correspondiente.
 */
const contextEvents = [
  {
    codigo: 'EVT-Q01',
    zone: 'Comuna Ecoturístico Cerro de Oro · Eje Comercial',
    nodo_referencia: 'Mall Plaza',
    barrio_origen: 'La Carola',
    type: 'QuejaCiudadana',
    severity: 4,
    description: 'Reporte en barrio La Carola por acumulación de residuos posconsumo y contenedores al límite; consolidado en nodo Mall Plaza.',
  },
  {
    codigo: 'EVT-Q02',
    zone: 'Comuna Tesorito · Corredor Industrial',
    nodo_referencia: 'Parque Industrial Maltería',
    barrio_origen: 'Maltería',
    type: 'QuejaCiudadana',
    severity: 5,
    description: 'Alerta ambiental por quema informal de cables para extracción de cobre y descarte de tarjetas electrónicas en quebrada.',
  },
  {
    codigo: 'EVT-Q03',
    zone: 'Comuna San José · Sector Abastecimiento',
    nodo_referencia: 'Plaza de Mercado Galería',
    barrio_origen: 'La Galería',
    type: 'QuejaCiudadana',
    severity: 5,
    description: 'Desbordamiento crítico de residuos orgánicos y aparatos eléctricos descartados tras jornada de mercado en La Galería.',
  },
  {
    codigo: 'EVT-Q04',
    zone: 'Comuna Ciudadela del Norte',
    nodo_referencia: 'Cisco Bosques del Norte',
    barrio_origen: 'Solferino',
    type: 'QuejaCiudadana',
    severity: 4,
    description: 'Denuncia comunitaria en Solferino y San Cayetano por disposición inadecuada de televisores CRT y colchones.',
  },
  {
    codigo: 'EVT-Q05',
    zone: 'Comuna Palogrande · Zona Rosa y Universitaria',
    nodo_referencia: 'Torre del Cable',
    barrio_origen: 'El Cable',
    type: 'QuejaCiudadana',
    severity: 3,
    description: 'Alta concentración de baterías de litio, luminarias y periféricos electrónicos en acopio universitario de El Cable.',
  },
  {
    codigo: 'EVT-Q06',
    zone: 'Comuna Cumanday · Centro Histórico',
    nodo_referencia: 'Plaza de Bolívar',
    barrio_origen: 'Los Agustinos',
    type: 'QuejaCiudadana',
    severity: 4,
    description: 'Saturación de contenedores soterrados en corredor peatonal del Centro Histórico tras jornada comercial.',
  },
  {
    codigo: 'EVT-C01',
    zone: 'Vereda Alto del Guamo',
    nodo_referencia: 'Alto del Guamo',
    barrio_origen: 'Alto del Guamo',
    type: 'EventoClimatico',
    severity: 5,
    road: 'Mala',
    description: 'Deslizamiento de tierra y pérdida parcial de banca por lluvias intensas en corredor rural hacia Alto del Guamo.',
  },
  {
    codigo: 'EVT-C02',
    zone: 'Vereda La Cabaña',
    nodo_referencia: 'Centro Poblado La Cabaña',
    barrio_origen: 'La Cabaña',
    type: 'EventoClimatico',
    severity: 4,
    road: 'Regular',
    description: 'Precipitaciones continuas en ladera occidental; calzada húmeda con paso restringido a vehículos tipo volqueta.',
  },
  {
    codigo: 'EVT-C03',
    zone: 'Vereda El Rosario',
    nodo_referencia: 'Crucero El Rosario',
    barrio_origen: 'El Rosario',
    type: 'EventoClimatico',
    severity: 3,
    road: 'Regular',
    description: 'Lluvias moderadas y neblina densa en vía antigua a Chinchiná sector El Rosario.',
  },
  {
    codigo: 'EVT-C04',
    zone: 'Corregimiento Río Blanco',
    nodo_referencia: 'Reserva Protectora Río Blanco',
    barrio_origen: 'Minitas',
    type: 'EventoClimatico',
    severity: 4,
    road: 'Regular',
    description: 'Creciente súbita en quebrada afluente de Río Blanco; requiere recolección preventiva para proteger bocatoma.',
  },
  {
    codigo: 'EVT-C05',
    zone: 'Comuna Ciudadela del Norte',
    nodo_referencia: 'Cisco Bosques del Norte',
    barrio_origen: 'Bosques del Norte',
    type: 'EventoClimatico',
    severity: 3,
    road: 'Regular',
    description: 'Aguacero fuerte en ladera norte con escorrentía superficial alta.',
  },
];

/**
 * Rutas Operativas de Camiones en Manizales.
 */
const routes = [
  {
    codigo: 'RUT-MZL-01',
    nombre: 'Ruta Troncal Urbana · Eje Kevin Ángel y Centro',
    vehiculo_identificador: 'Compactador EMAS-01',
    tipo_operacion: 'Ordinarios_Urbana',
    nodos_asignados: [
      'Plaza de Mercado Galería',
      'Plaza de Bolívar',
      'Cisco Bosques del Norte',
      'Mall Plaza',
      'Parque Fundadores',
      'Terminal Los Cámbulos',
    ],
    activa: true,
  },
  {
    codigo: 'RUT-MZL-02',
    nombre: 'Ruta Troncal Suroriental · Santander e Industrial',
    vehiculo_identificador: 'Compactador EMAS-03',
    tipo_operacion: 'Ordinarios_Urbana',
    nodos_asignados: [
      'Torre del Cable',
      'Nodo La Enea',
      'Redoma Fátima',
      'Parque Industrial Maltería',
      'Estadio Palogrande',
      'Bulevar de Milán',
    ],
    activa: true,
  },
  {
    codigo: 'RUT-MZL-03',
    nombre: 'Ruta Equidad Rural · Corredor Norte y Reserva',
    vehiculo_identificador: 'Volqueta Veredal VV-06',
    tipo_operacion: 'Equidad_Veredal',
    nodos_asignados: [
      'Alto del Guamo',
      'Reserva Protectora Río Blanco',
      'Mall Plaza',
    ],
    activa: true,
  },
  {
    codigo: 'RUT-MZL-04',
    nombre: 'Ruta Equidad Rural · Ladera Occidental y Sur',
    vehiculo_identificador: 'Volqueta Veredal VV-05',
    tipo_operacion: 'Equidad_Veredal',
    nodos_asignados: [
      'Centro Poblado La Cabaña',
      'Crucero El Rosario',
      'Cruce Bajo Tablazo',
      'Mirador de Chipre',
    ],
    activa: true,
  },
  {
    codigo: 'RUT-MZL-05',
    nombre: 'Ruta Especializada RAEE · Circuito Metropolitano Manizales',
    vehiculo_identificador: 'Gestor RAEE EcoCaldas-08',
    tipo_operacion: 'Especial_RAEE',
    nodos_asignados: [
      'Parque Industrial Maltería',
      'Torre del Cable',
      'Mall Plaza',
      'Plaza de Bolívar',
      'Nodo La Enea',
      'Reserva Protectora Río Blanco',
    ],
    activa: true,
  },
];

/**
 * Función de mapeo ontológico: dado el nombre de un barrio o vereda (ej. "La Carola"),
 * resuelve el Nodo de Referencia principal (ej. "Mall Plaza").
 */
function resolveBarrioToNode(barrioName) {
  if (!barrioName) return null;
  const normalized = barrioName.trim().toLowerCase();
  for (const point of points) {
    if (
      point.nombre.toLowerCase() === normalized
      || point.barrios_cobertura.some((b) => b.toLowerCase() === normalized)
    ) {
      return point;
    }
  }
  for (const zone of zones) {
    if (zone.barrios_agrupados.some((b) => b.toLowerCase() === normalized)) {
      return points.find((p) => p.nombre === zone.hito_referencia) || null;
    }
  }
  return null;
}

async function upsertMany(Model, documents, key, transform) {
  for (const document of documents) {
    await Model.updateOne(
      { [key]: document[key] },
      { $set: transform(document) },
      { upsert: true, runValidators: true },
    );
  }
}

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI es obligatorio.');
  await mongoose.connect(process.env.MONGODB_URI);

  if (process.argv.includes('--reset')) {
    if (process.env.ALLOW_SEED_RESET !== 'true') {
      throw new Error('El borrado requiere ALLOW_SEED_RESET=true junto con --reset.');
    }
    await Promise.all([
      PuntoAcopio.deleteMany({}),
      EventoContexto.deleteMany({}),
      Vehiculo.deleteMany({}),
      Ruta.deleteMany({}),
      Zona.deleteMany({}),
    ]);
  }

  await upsertMany(Zona, zones, 'nombre', (zone) => ({
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

  const storedZones = await Zona.find({ nombre: { $in: zones.map((zone) => zone.nombre) } });
  const zoneByName = new Map(storedZones.map((zone) => [zone.nombre, zone]));

  for (const point of points) {
    const zone = zoneByName.get(point.zona);
    await PuntoAcopio.updateOne(
      { nombre: point.nombre },
      {
        $set: {
          codigo: point.codigo,
          nombre: point.nombre,
          zona_id: zone._id,
          barrios_cobertura: point.barrios_cobertura,
          direccion_referencia: point.direccion_referencia,
          ubicacion: point.location,
          saturacion_ordinarios: point.ordinary,
          saturacion_raee: point.raee,
          accesibilidad_actual: point.accessibility,
          tipos_raee_acumulados: point.raeeTypes,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  await upsertMany(Vehiculo, vehicles, 'identificador', (vehicle) => ({
    identificador: vehicle.identificador,
    tipo: vehicle.tipo,
    placa: vehicle.placa,
    base_operativa: vehicle.base_operativa,
    capacidad_restante: vehicle.capacity,
    ubicacion_actual: vehicle.location,
    disponible: vehicle.available !== false,
  }));

  for (const event of contextEvents) {
    const zone = zoneByName.get(event.zone);
    await EventoContexto.updateOne(
      { codigo: event.codigo },
      {
        $set: {
          codigo: event.codigo,
          zona_id: zone._id,
          nodo_referencia: event.nodo_referencia,
          barrio_origen: event.barrio_origen,
          tipo_evento: event.type,
          severidad: event.severity,
          descripcion: event.description,
          estado_via: event.road,
          activo: true,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  await upsertMany(Ruta, routes, 'codigo', (route) => ({
    codigo: route.codigo,
    nombre: route.nombre,
    vehiculo_identificador: route.vehiculo_identificador,
    tipo_operacion: route.tipo_operacion,
    nodos_asignados: route.nodos_asignados,
    activa: route.activa,
  }));

  await mongoose.disconnect();
  console.log(
    `Base de datos operativa Manizales cargada: ${zones.length} zonas, ${points.length} nodos de acopio, ${vehicles.length} vehículos, ${contextEvents.length} eventos y ${routes.length} rutas.`,
  );
}

if (require.main === module) {
  seed().catch(async (error) => {
    console.error('No fue posible cargar la base de datos operativa:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = {
  zones,
  points,
  vehicles,
  contextEvents,
  routes,
  resolveBarrioToNode,
  seed,
};
