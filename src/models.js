const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (coordinates) => coordinates.length === 2
        && coordinates.every(Number.isFinite)
        && coordinates[0] >= -180 && coordinates[0] <= 180
        && coordinates[1] >= -90 && coordinates[1] <= 90,
      message: 'Las coordenadas deben tener el formato [longitud, latitud].',
    },
  },
}, { _id: false });

const zonaSchema = new mongoose.Schema({
  codigo: { type: String, trim: true },
  nombre: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['Comuna', 'Corregimiento', 'Vereda'], required: true },
  hito_referencia: { type: String, trim: true, default: '' },
  barrios_agrupados: [{ type: String, trim: true }],
  ubicacion: { type: pointSchema, required: true },
  sensibilidad_entorno: { type: Number, min: 0, max: 100, default: 30 },
  dias_sin_servicio: { type: Number, min: 0, default: 0 },
  demanda_esperada: { type: Number, min: 0, default: 0 },
});
zonaSchema.index({ ubicacion: '2dsphere' });
zonaSchema.index({ nombre: 1 }, { unique: true });

const puntoAcopioSchema = new mongoose.Schema({
  codigo: { type: String, trim: true },
  zona_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zona', required: true, index: true },
  nombre: { type: String, required: true, trim: true },
  barrios_cobertura: [{ type: String, trim: true }],
  direccion_referencia: { type: String, trim: true, default: '' },
  ubicacion: { type: pointSchema, required: true },
  saturacion_ordinarios: { type: Number, min: 0, max: 100, default: 0 },
  saturacion_raee: { type: Number, min: 0, max: 100, default: 0 },
  accesibilidad_actual: { type: String, enum: ['Buena', 'Regular', 'Mala'], default: 'Buena' },
  tipos_raee_acumulados: [{ type: String, trim: true }],
}, { timestamps: true });
puntoAcopioSchema.index({ ubicacion: '2dsphere' });
puntoAcopioSchema.index({ nombre: 1 }, { unique: true });

const vehiculoSchema = new mongoose.Schema({
  identificador: { type: String, required: true, trim: true, unique: true },
  tipo: { type: String, enum: ['Compactador', 'Volqueta', 'RAEE_Especial'], required: true },
  placa: { type: String, trim: true, default: '' },
  base_operativa: { type: String, trim: true, default: '' },
  capacidad_restante: { type: Number, min: 0, max: 100, default: 100 },
  ubicacion_actual: { type: pointSchema, required: true },
  disponible: { type: Boolean, default: true },
});
vehiculoSchema.index({ ubicacion_actual: '2dsphere' });

const eventoContextoSchema = new mongoose.Schema({
  codigo: { type: String, trim: true },
  zona_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zona', required: true, index: true },
  nodo_referencia: { type: String, trim: true, default: '' },
  barrio_origen: { type: String, trim: true, default: '' },
  tipo_evento: { type: String, enum: ['QuejaCiudadana', 'EventoClimatico'], required: true },
  severidad: { type: Number, min: 1, max: 5, default: 1 },
  descripcion: { type: String, trim: true, default: '' },
  estado_via: { type: String, enum: ['Buena', 'Regular', 'Mala'] },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

const rutaSchema = new mongoose.Schema({
  codigo: { type: String, required: true, trim: true, unique: true },
  nombre: { type: String, required: true, trim: true },
  vehiculo_identificador: { type: String, required: true, trim: true },
  tipo_operacion: { type: String, enum: ['Ordinarios_Urbana', 'Equidad_Veredal', 'Especial_RAEE'], required: true },
  nodos_asignados: [{ type: String, trim: true }],
  activa: { type: Boolean, default: true },
}, { timestamps: true });

const Zona = mongoose.models.Zona || mongoose.model('Zona', zonaSchema);
const PuntoAcopio = mongoose.models.PuntoAcopio || mongoose.model('PuntoAcopio', puntoAcopioSchema);
const Vehiculo = mongoose.models.Vehiculo || mongoose.model('Vehiculo', vehiculoSchema);
const EventoContexto = mongoose.models.EventoContexto || mongoose.model('EventoContexto', eventoContextoSchema);
const Ruta = mongoose.models.Ruta || mongoose.model('Ruta', rutaSchema);

module.exports = {
  Zona,
  PuntoAcopio,
  Vehiculo,
  EventoContexto,
  Ruta,
};
