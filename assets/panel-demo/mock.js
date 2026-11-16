/* Servidor simulado para la demo de Panel JPB: intercepta fetch('api/...') y responde con datos ficticios.
   Todo es de ejemplo ("Aceros del Norte S.A." no existe). Los cambios viven solo en memoria.
   Versión para el panel nuevo (Cotizar, Precios, Mejoras, resultado de cotizaciones, licitaciones). */
(function () {
  var MIN = 60000, H = 3600000, D = 86400000;
  var now = Date.now();
  var CLIENTE_ID = 'aceros-norte';

  // ── Utilidades ──────────────────────────────────────────────
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ym(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function diasAtras(n) { return ymd(new Date(now - n * D)); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function json(obj, status) {
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }
  // Mes actual en hora de Chile (igual que mesActualClaveLocal() del panel).
  function mesChile(offset) {
    var k;
    try { k = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }).slice(0, 7); } catch (e) { k = ym(new Date()); }
    var y = +k.slice(0, 4), m = +k.slice(5, 7) - (offset || 0);
    while (m < 1) { m += 12; y--; }
    return y + '-' + pad(m);
  }

  // ── Cliente ficticio ────────────────────────────────────────
  var CLIENTES = [{
    id: CLIENTE_ID, nombre: 'Aceros del Norte S.A.',
    whatsapp: { configurado: true }, ads: { configurado: true, customerId: '000-000-0000' },
    cotizaciones: { configurado: true },
    facturacion: { diaCorte: 15, pagoFijo: 250000, comisionPct: 3 }
  }];

  // Primera visita: los mensajes de las últimas 3 horas se ven como "Nuevo" (sin leer).
  try {
    var kLeidos = 'panel_leidos_' + CLIENTE_ID;
    if (!localStorage.getItem(kLeidos)) localStorage.setItem(kLeidos, JSON.stringify({ base: now - 3 * H, chats: {} }));
  } catch (e) { /* sin storage: todo se ve como leído */ }

  // ── Conversaciones ──────────────────────────────────────────
  // estadoPedido: cumple (≥ 500 kg) · parcial (variable) · no_cumple
  var CHATS = [
    { telefono: '+56 9 5555 0101', estadoPedido: 'cumple', ult: 12 * MIN, ultCli: 12 * MIN },
    { telefono: '+56 9 5555 0102', estadoPedido: 'cumple', ult: 55 * MIN, ultCli: 55 * MIN },
    { telefono: '+56 9 5555 0103', estadoPedido: 'parcial', ult: 2 * H, ultCli: 2 * H },
    { telefono: '+56 9 5555 0104', estadoPedido: 'no_cumple', ult: 179 * MIN, ultCli: 180 * MIN },
    { telefono: '+56 9 5555 0105', estadoPedido: 'cumple', respondido: true, ult: 5 * H, ultCli: 5 * H },
    { telefono: 'web-482913', canal: 'web', estadoPedido: null, ult: 539 * MIN, ultCli: 540 * MIN },
    { telefono: '+56 9 5555 0106', estadoPedido: 'cumple', pausada: true, ult: 22 * H, ultCli: 22 * H },
    { telefono: '+56 9 5555 0107', estadoPedido: 'cumple', respondido: true, ult: 4 * D, ultCli: 4 * D + 4 * H },
    { telefono: '+56 9 5555 0108', estadoPedido: 'parcial', ult: 6 * D, ultCli: 6 * D + 1 * H },
    { telefono: '+56 9 5555 0109', estadoPedido: null, ult: 30 * H - MIN, ultCli: 30 * H },
    { telefono: '+56 9 5555 0113', estadoPedido: 'cumple', ult: 9 * D, ultCli: 9 * D },
    { telefono: '+56 9 5555 0114', estadoPedido: 'cumple', ult: 2 * D + 5 * H, ultCli: 2 * D + 5 * H },
    { telefono: 'web-517204', canal: 'web', estadoPedido: null, ult: 11 * D, ultCli: 11 * D + 2 * MIN },
    { telefono: '+56 9 5555 0110', estadoPedido: 'no_cumple', archivado: true, ult: 18 * D, ultCli: 18 * D }
  ];

  // [rol, texto, minutos atrás]
  var MENSAJES = {
    '+56 9 5555 0101': [
      ['cliente', 'Hola, necesito cotizar plancha de acero A36 de 6 mm.', 62],
      ['bot', '¡Hola! Con gusto. ¿Cuántas planchas necesitas, de qué medida y a qué comuna sería el despacho?', 61],
      ['cliente', '10 planchas de 1,5 x 3 m. Despacho a una obra en Maipú.', 48],
      ['bot', 'Perfecto: son unos 2.120 kg, así que cumple el pedido mínimo de 500 kg. ¿Me indicas tu nombre, empresa y correo para enviarte la cotización formal?', 47],
      ['cliente', 'Paola Reyes, Constructora Maipú, compras@cmaipu.example', 35],
      ['bot', 'Gracias, Paola. Un ejecutivo te envía hoy la cotización con despacho a Maipú incluido.', 34],
      ['cliente', 'Perfecto, quedo atento a la cotización.', 12]
    ],
    '+56 9 5555 0102': [
      ['cliente', 'Buenas tardes, necesito 600 kg de fierro estriado A630 de 12 mm.', 130],
      ['bot', 'Buenas tardes. Tenemos stock disponible en barras de 6 y 12 m. ¿Para qué comuna sería el despacho?', 129],
      ['cliente', 'Quilicura, barras de 12 m.', 100],
      ['bot', 'Listo, queda registrado: 600 kg de fierro estriado 12 mm en barras de 12 m con despacho a Quilicura. Te enviamos la cotización en breve.', 99],
      ['cliente', '¿Pueden despachar el viernes en la mañana?', 55]
    ],
    '+56 9 5555 0103': [
      ['cliente', 'Hola, ¿qué precio tiene el tubo cuadrado 40x40x2?', 240],
      ['bot', 'Hola. El tubo cuadrado 40x40x2 mm de 6 m está a $14.900 + IVA por unidad (unos 14 kg). ¿Cuántas unidades necesitas?', 239],
      ['cliente', 'Unas 30 por ahora, pero puede que sigan más.', 150],
      ['bot', '30 unidades son unos 420 kg, un poco bajo el mínimo de 500 kg. Si lo complementas con otro producto o lo programamos con tu próxima compra, lo podemos cotizar.', 149],
      ['cliente', 'Depende del precio, ¿hay descuento por volumen?', 120]
    ],
    '+56 9 5555 0104': [
      ['cliente', 'Necesito fierro estriado de 10 mm.', 200],
      ['bot', '¡Hola! ¿Qué cantidad necesitas aproximadamente?', 199],
      ['cliente', 'Solo necesito 40 kilos de fierro estriado.', 180],
      ['bot', 'Gracias por escribir. Nuestro pedido mínimo es de 500 kg; para cantidades menores te recomendamos un distribuidor en tu zona.', 179]
    ],
    '+56 9 5555 0105': [
      ['cliente', 'Hola, quiero confirmar el pedido de 800 kg de perfil C 100x50x3.', 400],
      ['bot', '¡Hola, Jorge! Confirmado. Te dejo los datos para la transferencia y coordinamos el retiro en planta.', 399],
      ['bot', 'Retiro disponible desde mañana a las 8:30 en planta Lampa.', 360],
      ['cliente', 'Listo, ya hicimos la transferencia. Gracias.', 300]
    ],
    'web-482913': [
      ['cliente', 'Hola, ¿tienen planchas de acero inoxidable 304?', 540],
      ['bot', 'Hola, sí trabajamos acero inoxidable 304 en espesores de 1 a 6 mm. ¿Qué espesor y qué cantidad necesitas?', 539]
    ],
    '+56 9 5555 0106': [
      ['cliente', 'Necesito cotizar 120 ángulos de 40x40x4 para una estructura.', 1500],
      ['bot', 'Claro, son unos 1.740 kg. Como es para una estructura, te comunico con un ejecutivo para revisar el detalle técnico.', 1499],
      ['bot', 'Hola, soy Camila del equipo comercial. Te llamo en unos minutos para afinar la cotización.', 1450],
      ['cliente', 'Ok, me llama entonces el vendedor.', 1320]
    ],
    '+56 9 5555 0107': [
      ['cliente', 'Necesito cotizar 1.200 kg de plancha lisa de 3 mm con despacho a Puerto Montt.', 6000],
      ['bot', 'Con gusto. Te enviamos la cotización con despacho a Puerto Montt (salida martes y jueves).', 5990],
      ['bot', 'Rodrigo, te enviamos la cotización por correo: $1.452.600 + IVA con despacho incluido. ¿Pudiste revisarla?', 5760]
    ],
    '+56 9 5555 0108': [
      ['cliente', 'Hola, ¿cuánto sale despachar a Rancagua?', 8700],
      ['bot', 'Hola. El despacho a Rancagua depende del volumen: sobre 1.000 kg es sin costo. ¿Qué producto necesitas?', 8690],
      ['cliente', 'Perfiles y algo de malla, todavía no tengo las cantidades.', 8670],
      ['bot', 'Te dejo el detalle del despacho por si te sirve. Cuando tengas las cantidades te preparo la cotización.', 8640]
    ],
    '+56 9 5555 0109': [
      ['cliente', '¿Cuál es el horario de retiro en planta?', 1800],
      ['bot', 'Retiramos en planta de lunes a viernes de 8:30 a 17:30 y sábados de 9:00 a 13:00.', 1799]
    ],
    '+56 9 5555 0113': [
      ['cliente', 'Hola, necesito 80 tubos cuadrados de 50x50x3 para un galpón en Colina.', 12990],
      ['bot', 'Hola. Son unos 2.040 kg, cumple el mínimo. ¿Necesitas despacho a Colina o retiras en planta?', 12980],
      ['cliente', 'Despacho, por favor. Es urgente, empezamos la obra la otra semana.', 12960]
    ],
    '+56 9 5555 0114': [
      ['cliente', 'Buenos días, ¿tienen fierro estriado de 16 mm? Necesito 1.500 kg.', 3200],
      ['bot', 'Buenos días. Sí, tenemos stock de 16 mm en barras de 12 m. ¿A qué comuna sería el despacho?', 3199],
      ['cliente', 'San Bernardo. ¿Me pueden mandar la cotización hoy?', 3180]
    ],
    'web-517204': [
      ['cliente', 'hola', 15842],
      ['bot', '¡Hola! Soy el asistente de Aceros del Norte. ¿Qué producto necesitas cotizar?', 15840]
    ],
    '+56 9 5555 0110': [
      ['cliente', 'Necesitaba 60 kg de perfil, pero veo que el mínimo es 500.', 25930],
      ['bot', 'Así es, el pedido mínimo es de 500 kg. Te dejamos el contacto de un distribuidor en Chillán.', 25925],
      ['cliente', 'Gracias, lo veremos más adelante.', 25920]
    ]
  };
  Object.keys(MENSAJES).forEach(function (t) {
    MENSAJES[t] = MENSAJES[t].map(function (m) {
      return { rol: m[0], texto: m[1], ts: now - m[2] * MIN, estado: m[0] === 'bot' ? 'read' : undefined };
    });
  });
  CHATS.forEach(function (c) {
    var arr = MENSAJES[c.telefono] || [];
    var u = arr[arr.length - 1];
    c.ultimoTs = u ? u.ts : now - c.ult;
    c.ultimoClienteTs = now - c.ultCli;
    c.ultimoMensaje = u ? u.texto : '';
    c._orig = c.estadoPedido;
  });

  // ── Precotización: lo que el bot dejó clasificado en cada pedido ──
  var PRECOT = {
    '+56 9 5555 0101': { productos: [{ tipo: 'Plancha A36 6 mm (1,5 x 3 m)', cantidad: 10, unidad: 'unidades', pesoKg: 2120, clasificacion: 'CUMPLE' }],
      cliente: { nombre: 'Paola Reyes', empresa: 'Constructora Maipú', email: 'compras@cmaipu.example', detalle: '10 planchas A36 de 6 mm, 1,5 x 3 m, despacho a obra en Maipú.', fecha: new Date(now - 35 * MIN).toISOString() } },
    '+56 9 5555 0102': { productos: [{ tipo: 'Fierro estriado A630 12 mm (barras de 12 m)', cantidad: 600, unidad: 'kilos', clasificacion: 'CUMPLE' }],
      cliente: { nombre: 'Hernán Ríos', empresa: 'Metalúrgica Ríos', email: 'hrios@mrios.example', detalle: '600 kg de fierro estriado 12 mm, despacho a Quilicura el viernes AM.', fecha: new Date(now - 99 * MIN).toISOString() } },
    '+56 9 5555 0105': { productos: [{ tipo: 'Perfil C 100x50x3 mm', cantidad: 800, unidad: 'kilos', clasificacion: 'CUMPLE' }],
      cliente: { nombre: 'Jorge Olmos', empresa: 'Agrícola Los Olmos', email: 'jorge@losolmos.example', detalle: '800 kg de perfil C con retiro en planta.', fecha: new Date(now - 399 * MIN).toISOString() } },
    '+56 9 5555 0106': { productos: [{ tipo: 'Ángulo 40x40x4 mm (6 m)', cantidad: 120, unidad: 'unidades', pesoKg: 1740, clasificacion: 'CUMPLE' }],
      cliente: { nombre: 'Camilo Vega', empresa: 'Taller Mecánico Vega', email: '', detalle: '120 ángulos 40x40x4 para estructura; revisar detalle técnico con ejecutivo.', fecha: new Date(now - 1499 * MIN).toISOString() } },
    '+56 9 5555 0107': { productos: [{ tipo: 'Plancha lisa 3 mm', cantidad: 1200, unidad: 'kilos', clasificacion: 'CUMPLE' }],
      cliente: { nombre: 'Rodrigo Mena', empresa: 'Servicios Industriales Sur', email: 'rmena@sisur.example', detalle: '1.200 kg de plancha lisa 3 mm con despacho a Puerto Montt.', fecha: new Date(now - 5990 * MIN).toISOString() } },
    '+56 9 5555 0113': { productos: [{ tipo: 'Tubo cuadrado 50x50x3 mm (6 m)', cantidad: 80, unidad: 'unidades', pesoKg: 2040, clasificacion: 'CUMPLE' }], cliente: null },
    '+56 9 5555 0114': { productos: [
      { tipo: 'Fierro estriado A630 16 mm (barras de 12 m)', cantidad: 1500, unidad: 'kilos', clasificacion: 'CUMPLE' },
      { tipo: 'Alambre negro recocido N°18', cantidad: 50, unidad: 'kilos', clasificacion: 'CUMPLE' }], cliente: null }
  };

  // Precio neto por kilo (sin IVA) de cada familia de producto.
  var PRECIOS = {
    precios: { 'Fierro estriado': 1050, 'Plancha A36': 1180, 'Plancha lisa': 1150, 'Perfil C': 1290, 'Ángulo': 1240, 'Tubo cuadrado': 1320, 'Acero inoxidable 304': 4900, 'Alambre': 1450 },
    actualizado: new Date(now - 6 * D).toISOString()
  };

  // ── Clientes (cotizaciones + contactos) ─────────────────────
  // ultimaFecha en ISO (YYYY-MM-DD): el panel la usa para "Para reactivar" (14 a 120 días).
  var ROSTER = [
    { clave: 'tel:56955550101', nombre: 'Constructora Maipú', empresa: 'Constructora Maipú', contacto: 'Paola Reyes', telefono: '+56 9 5555 0101', email: 'compras@cmaipu.example', totalCotizado: 8940000, cantidadCotizaciones: 2, ultimaFecha: diasAtras(0), origenWhatsapp: true, importante: true, notaSeguimiento: 'Pidió despacho incluido; llamar el jueves.' },
    { clave: 'tel:56955550102', nombre: 'Metalúrgica Ríos', empresa: 'Metalúrgica Ríos', contacto: 'Hernán Ríos', telefono: '+56 9 5555 0102', email: 'hrios@mrios.example', totalCotizado: 1326000, cantidadCotizaciones: 2, ultimaFecha: diasAtras(1), origenWhatsapp: true },
    { clave: 'tel:56955550103', nombre: 'Ferretería El Tornillo', empresa: 'Ferretería El Tornillo', contacto: 'Marcela Soto', telefono: '+56 9 5555 0103', email: '', totalCotizado: 446000, cantidadCotizaciones: 1, ultimaFecha: diasAtras(1), origenWhatsapp: true, nota: 'Compra recurrente en pequeñas cantidades.' },
    { clave: 'tel:56955550105', nombre: 'Agrícola Los Olmos', empresa: 'Agrícola Los Olmos', contacto: 'Jorge Olmos', telefono: '+56 9 5555 0105', email: 'jorge@losolmos.example', totalCotizado: 3180000, cantidadCotizaciones: 3, ultimaFecha: diasAtras(2), origenWhatsapp: true,
      resultado: { estado: 'ganada', motivo: '', competidor: '', monto: 1086000, nota: 'Retiro en planta, pagó por transferencia.', ts: now - 5 * H } },
    { clave: 'tel:56955550107', nombre: 'Servicios Industriales Sur', empresa: 'Servicios Industriales Sur', contacto: 'Rodrigo Mena', telefono: '+56 9 5555 0107', email: 'rmena@sisur.example', totalCotizado: 1452600, cantidadCotizaciones: 1, ultimaFecha: diasAtras(4), origenWhatsapp: true, importante: true, notaSeguimiento: 'Revisando con gerencia, retomar el lunes.' },
    { clave: 'tel:56955550106', nombre: 'Taller Mecánico Vega', empresa: 'Taller Mecánico Vega', contacto: 'Camilo Vega', telefono: '+56 9 5555 0106', email: '', totalCotizado: 2271000, cantidadCotizaciones: 1, ultimaFecha: diasAtras(1), origenWhatsapp: true },
    { clave: 'tel:56955550120', nombre: 'Constructora Altamira', empresa: 'Constructora Altamira', contacto: 'Felipe Araya', telefono: '+56 9 5555 0120', email: 'faraya@altamira.example', totalCotizado: 12480000, cantidadCotizaciones: 3, ultimaFecha: diasAtras(38), origenWhatsapp: false,
      resultado: { estado: 'ganada', motivo: '', competidor: '', monto: 9860000, nota: 'Compró fierro y malla; el perfil lo dejó para la segunda etapa.', ts: now - 30 * D } },
    { clave: 'tel:56955550121', nombre: 'Estructuras Biobío', empresa: 'Estructuras Biobío', contacto: 'Claudia Muñoz', telefono: '+56 9 5555 0121', email: 'cmunoz@estbiobio.example', totalCotizado: 5320000, cantidadCotizaciones: 2, ultimaFecha: diasAtras(20), origenWhatsapp: true,
      resultado: { estado: 'perdida', motivo: 'Precio', competidor: 'Distribuidora local', monto: 5320000, nota: 'La diferencia fue de un 4% en el kilo de perfil.', ts: now - 12 * D } },
    { clave: 'tel:56955550122', nombre: 'Montajes Cordillera', empresa: 'Montajes Cordillera', contacto: 'Andrés Pizarro', telefono: '+56 9 5555 0122', email: '', totalCotizado: 2760000, cantidadCotizaciones: 1, ultimaFecha: diasAtras(45), origenWhatsapp: true,
      resultado: { estado: 'perdida', motivo: 'Plazo de entrega', competidor: '', monto: 2760000, nota: 'Necesitaba entrega en 48 h.', ts: now - 40 * D } },
    { clave: 'tel:56955550123', nombre: 'Galpones del Sur', empresa: 'Galpones del Sur', contacto: 'Patricio Leal', telefono: '+56 9 5555 0123', email: 'pleal@galponesdelsur.example', totalCotizado: 6890000, cantidadCotizaciones: 2, ultimaFecha: diasAtras(17), origenWhatsapp: false, cotParciales: 1, montoParcial: 2150000, nota: 'Falta confirmar el largo de las costaneras.' },
    { clave: 'tel:56955550124', nombre: 'Industrias Ovalle', empresa: 'Industrias Ovalle', contacto: 'Verónica Tapia', telefono: '+56 9 5555 0124', email: 'vtapia@indovalle.example', totalCotizado: 1980000, cantidadCotizaciones: 1, ultimaFecha: diasAtras(29), origenWhatsapp: true },
    { clave: 'tel:56955550114', nombre: 'Obras Civiles Maipo', empresa: 'Obras Civiles Maipo', contacto: 'Sebastián Fuentes', telefono: '+56 9 5555 0114', email: '', totalCotizado: 0, cantidadCotizaciones: 0, ultimaFecha: '', origenWhatsapp: true },
    { clave: 'tel:56955550113', nombre: 'Constructora Los Andes', empresa: 'Constructora Los Andes', contacto: 'Matías Rojas', telefono: '+56 9 5555 0113', email: '', totalCotizado: 0, cantidadCotizaciones: 0, ultimaFecha: '', origenWhatsapp: true },
    { clave: 'tel:56955550111', nombre: 'Inmobiliaria Pacífico', empresa: 'Inmobiliaria Pacífico', contacto: 'Daniela Torres', telefono: '+56 9 5555 0111', email: 'dtorres@inmopacifico.example', totalCotizado: 0, cantidadCotizaciones: 0, ultimaFecha: diasAtras(0), origenWhatsapp: false, origenFormulario: true, cantidadFormularios: 1 },
    { clave: 'tel:56955550110', nombre: 'Maestranza Ñuble', empresa: 'Maestranza Ñuble', contacto: 'Iván Parra', telefono: '+56 9 5555 0110', email: '', totalCotizado: 310000, cantidadCotizaciones: 1, ultimaFecha: diasAtras(25), origenWhatsapp: true }
  ];
  ROSTER.forEach(function (cl) {
    if (cl.importante === undefined) cl.importante = false;
    if (cl.notaSeguimiento === undefined) cl.notaSeguimiento = '';
    if (cl.resultado === undefined) cl.resultado = null;
  });
  ROSTER.sort(function (a, b) { return b.totalCotizado - a.totalCotizado; });
  var ROSTER_TS = now - 40 * MIN;

  // ── Análisis de IA ──────────────────────────────────────────
  var ANALISIS = [
    { telefono: '+56 9 5555 0101', puntaje: 92, razon: 'Entregó cantidad, medida, comuna y datos de contacto; espera la cotización hoy.', cumple: true, resumen: 'Constructora que necesita 10 planchas A36 de 6 mm (1,5 x 3 m) con despacho a una obra en Maipú. Ya dejó nombre, empresa y correo.', alertas: [], comp: 'Segundo pedido del año; el anterior fue por un volumen similar.' },
    { telefono: '+56 9 5555 0102', puntaje: 84, razon: 'Compra recurrente y pide fecha de entrega concreta.', cumple: true, resumen: 'Metalúrgica que pide 600 kg de fierro estriado de 12 mm para despacho en Quilicura el viernes en la mañana.', alertas: ['Pidió fecha de despacho y aún no tiene respuesta.'], comp: 'Compra todos los meses; este pedido es 20% mayor que su promedio.' },
    { telefono: '+56 9 5555 0114', puntaje: 78, razon: 'Volumen alto (1.500 kg) y pide la cotización el mismo día.', cumple: true, resumen: 'Cliente nuevo que necesita 1.500 kg de fierro estriado de 16 mm con despacho a San Bernardo.', alertas: ['Lleva más de 2 días esperando la cotización.'], comp: '' },
    { telefono: '+56 9 5555 0103', puntaje: 58, razon: 'Interesado, pero sensible al precio y sin volumen confirmado.', cumple: null, resumen: 'Ferretería que pregunta por descuentos por volumen en tubo cuadrado 40x40. Pedido bajo el mínimo, con posibilidad de compras recurrentes.', alertas: ['Pide descuento antes de confirmar cantidad.'], comp: '' },
    { telefono: '+56 9 5555 0113', puntaje: 74, razon: 'Obra con fecha de inicio cercana; no ha recibido cotización.', cumple: true, resumen: 'Constructora que necesita 80 tubos cuadrados 50x50x3 para un galpón en Colina, con despacho. Dijo que es urgente.', alertas: ['9 días sin cotización: riesgo de que compre a otro proveedor.'], comp: '' },
    { telefono: '+56 9 5555 0107', puntaje: 71, razon: 'Cotización enviada hace 4 días sin respuesta.', cumple: true, resumen: 'Pidió 1.200 kg de plancha lisa de 3 mm para Puerto Montt. No ha respondido desde que recibió la cotización.', alertas: ['Más de 3 días sin respuesta tras la cotización.'], comp: 'Cotizaciones similares suelen cerrarse dentro de los primeros 5 días.' },
    { telefono: '+56 9 5555 0105', puntaje: 96, razon: 'Compra confirmada y transferencia realizada.', cumple: true, resumen: 'Cierre de 800 kg de perfil C con retiro en planta. Pago por transferencia confirmado por el cliente.', alertas: [], comp: 'Cliente frecuente: 3 pedidos en los últimos 60 días.' },
    { telefono: '+56 9 5555 0104', puntaje: 22, razon: 'Cantidad muy por debajo del mínimo.', cumple: false, resumen: 'Pidió 40 kg de fierro estriado. Se le informó el mínimo de 500 kg y se le sugirió un distribuidor local.', alertas: [], comp: '' }
  ].map(function (a, i) {
    return { telefono: a.telefono, actualizadoTs: now - (3 + i * 0.5) * H, nivelInteres: { puntaje: a.puntaje, razon: a.razon }, cumpleMinimo: a.cumple, resumen: a.resumen, alertas: a.alertas, comparacionHistorica: a.comp };
  });
  var ANALISIS_TS = now - 3 * H;

  var FORMULARIOS = [
    { nombre: 'Daniela Torres', empresa: 'Inmobiliaria Pacífico', email: 'dtorres@inmopacifico.example', telefono: '+56 9 5555 0111', producto: 'Perfil C 100x50', cantidad: 800, mensaje: 'Necesito cotizar para una obra en Viña del Mar, entrega en 3 semanas.', pagina: '/cotizar', origen: 'Formulario del sitio web', ts: now - 3 * H },
    { nombre: 'Luis Contreras', empresa: 'Contreras e Hijos', email: 'luis@contrerashijos.example', telefono: '', producto: 'Plancha lisa 3 mm', cantidad: 25, mensaje: '', pagina: '/productos/planchas', origen: 'Formulario del sitio web', ts: now - 26 * H },
    { nombre: 'Andrea Fuentes', empresa: '', email: 'afuentes@correo.example', telefono: '+56 9 5555 0112', producto: '', cantidad: '', mensaje: 'Quisiera saber si tienen servicio de corte a medida.', pagina: '/contacto', origen: 'Formulario del sitio web', ts: now - 2 * D },
    { nombre: 'Sergio Valdés', empresa: 'Mantenciones Valdés', email: 'svaldes@mantvaldes.example', telefono: '', producto: 'Malla acma C92', cantidad: 40, mensaje: '¿Hacen despacho a Talagante?', pagina: '/productos/mallas', origen: 'Formulario del sitio web', ts: now - 9 * D }
  ];

  // ── Google Ads (mes actual y los 2 anteriores) ──────────────
  function diarioMes(y, m, hastaDia, base) {
    var out = [];
    for (var dia = 1; dia <= hastaDia; dia++) {
      var f = 0.75 + rnd() * 0.65;
      var gasto = Math.round(base * f / 100) * 100;
      var clicks = Math.round(gasto / (720 + rnd() * 220));
      out.push({ fecha: y + '-' + pad(m) + '-' + pad(dia), gasto: gasto, clicks: clicks, impresiones: Math.round(clicks * (24 + rnd() * 14)), conversiones: Math.max(0, Math.round(clicks * (0.03 + rnd() * 0.05))) });
    }
    return out;
  }
  function campanasDe(diario) {
    var reparto = [
      ['Búsqueda · Planchas y tubos', 'ENABLED', 0.52, 18000],
      ['Búsqueda · Fierro estriado', 'ENABLED', 0.31, 11000],
      ['Remarketing · Visitantes del sitio', 'PAUSED', 0.17, 6000]
    ];
    return reparto.map(function (r) {
      var d = diario.map(function (x) { return { fecha: x.fecha, gasto: Math.round(x.gasto * r[2]) }; });
      var gasto = d.reduce(function (s, x) { return s + x.gasto; }, 0);
      var clicks = Math.round(diario.reduce(function (s, x) { return s + x.clicks; }, 0) * r[2]);
      var conv = Math.round(diario.reduce(function (s, x) { return s + x.conversiones; }, 0) * r[2]);
      return { nombre: r[0], estado: r[1], gasto: gasto, clicks: clicks, conversiones: conv, ctr: (3.1 + rnd() * 2.4).toFixed(1), cpc_promedio: clicks ? Math.round(gasto / clicks) : 0, valor_conversiones: conv * 890000, presupuesto_diario: r[3], diario: d };
    });
  }
  function adsDeMes(offset) {
    var clave = mesChile(offset);
    var y = +clave.slice(0, 4), m = +clave.slice(5, 7);
    var hoyDia = +(function () { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }).slice(8, 10); } catch (e) { return new Date().getDate(); } })();
    var dias = offset === 0 ? hoyDia : new Date(y, m, 0).getDate();
    var diario = diarioMes(y, m, dias, 21000);
    var gasto = diario.reduce(function (s, x) { return s + x.gasto; }, 0);
    var clicks = diario.reduce(function (s, x) { return s + x.clicks; }, 0);
    var imp = diario.reduce(function (s, x) { return s + x.impresiones; }, 0);
    var conv = diario.reduce(function (s, x) { return s + x.conversiones; }, 0);
    return {
      mes: clave, periodo: clave, actualizado: new Date(now - 40 * MIN).toISOString(),
      totales: { gasto: gasto, clicks: clicks, impresiones: imp, conversiones: conv, cpc_promedio: clicks ? Math.round(gasto / clicks) : 0, costo_por_conversion: conv ? Math.round(gasto / conv) : 0 },
      diario: diario, campañas: campanasDe(diario)
    };
  }
  var ADS = {};
  [0, 1, 2].forEach(function (o) { var d = adsDeMes(o); ADS[d.mes] = d; });
  function mesesAds() { return Object.keys(ADS).sort().reverse(); }

  // ── Gastos ──────────────────────────────────────────────────
  var GASTOS = {
    mes: mesChile(0), actualizadoTs: now - 25 * MIN, metaClp: 21400, iaClp: 17500, totalClp: 38900,
    metaMensajes: { marketing: 38, utility: 112, authentication: 0, service: 640 },
    iaTokens: { promptTokens: 2184300, completionTokens: 318900, llamadas: 1426 }
  };

  // ── Desplazamiento ──────────────────────────────────────────
  var hoyD = new Date();
  var VISITAS = [];
  [9, 5, 2].forEach(function (atras) {
    var d = new Date(hoyD.getFullYear(), hoyD.getMonth(), hoyD.getDate() - atras);
    if (d.getMonth() === hoyD.getMonth()) VISITAS.push({ fecha: ymd(d), total: 6000, detalle: 'Ida y vuelta' });
  });

  // ── Facturación por ciclos (corte día 15) ───────────────────
  function corte(mesesAtras) { return new Date(hoyD.getFullYear(), hoyD.getMonth() - mesesAtras, 15); }
  function ciclo(ini, fin, tot) {
    return { inicio: ymd(ini), cierre: ymd(fin), total: tot.ads + tot.metaIA + tot.desp + tot.fijo + tot.comision,
      desglose: { ads: tot.ads, metaIA: tot.metaIA, desplazamiento: tot.desp, visitas: tot.visitas || [], pagoFijo: tot.fijo, pagoFijoNormal: tot.fijo, pagoFijoMotivo: '', ventas: tot.ventas, comision: tot.comision, comisionPct: 3 } };
  }
  var cerca = hoyD.getDate() >= 15 ? 0 : 1;
  var cierreVig = corte(cerca - 1), inicioVig = corte(cerca);
  var vig = ciclo(inicioVig, cierreVig, { ads: ADS[mesChile(0)].totales.gasto, metaIA: 38900, desp: VISITAS.length * 6000, fijo: 250000, ventas: 9800000, comision: 294000, visitas: VISITAS });
  var cerrado1 = ciclo(corte(cerca + 1), corte(cerca), { ads: 584200, metaIA: 41300, desp: 24000, fijo: 250000, ventas: 12400000, comision: 372000 });
  cerrado1.pagado = true; cerrado1.pagadoTs = now - 8 * D;
  var cerrado2 = ciclo(corte(cerca + 2), corte(cerca + 1), { ads: 512700, metaIA: 36800, desp: 18000, fijo: 250000, ventas: 7600000, comision: 228000 });
  cerrado2.pagado = true; cerrado2.pagadoTs = now - 38 * D;
  var FACTURACION = { diaCorte: 15, cicloVigente: { inicio: vig.inicio, cierre: vig.cierre, totalEstimado: vig.total, desglose: vig.desglose }, ciclosCerrados: [cerrado1, cerrado2] };

  // ── Mejoras y pasos a seguir ────────────────────────────────
  var MOTIVOS_PERDIDA = ['Precio', 'Plazo de entrega', 'Despacho / retiro', 'Especificación o medida', 'Compró a otro proveedor', 'Proyecto suspendido', 'No respondió', 'Otro'];
  var ESTADOS_MEJORA = ['pendiente', 'en_curso', 'hecho', 'descartado'];
  var AREAS_MEJORA = ['Medición', 'Ventas', 'Canales', 'Web', 'Bot', 'Confianza'];
  var MEJORAS = [
    { id: 'v-24h', area: 'Ventas', prioridad: 1, impacto: 'Alto', responsable: 'Cliente', estado: 'en_curso',
      titulo: 'Enviar toda cotización que cumple el mínimo en menos de 24 h',
      detalle: 'Los pedidos que se cotizan el mismo día se cierran casi el doble que los que esperan más de 2 días. Hoy hay pedidos verdes esperando en la pestaña Cotizar.',
      siguientePaso: 'Revisar la pestaña Cotizar cada mañana y a las 15:00; marcar "Ya la cotizé" al enviarla.',
      avance: 'Desde el lunes se revisa dos veces al día.' },
    { id: 'v-grandes', area: 'Ventas', prioridad: 1, impacto: 'Alto', responsable: 'Cliente', estado: 'pendiente',
      titulo: 'Cerrar las 3 cotizaciones más grandes del mes',
      detalle: 'Constructora Maipú, Galpones del Sur y Estructuras en curso concentran más de la mitad del monto cotizado. Cerrar una sola pesa más que todas las chicas juntas.',
      siguientePaso: 'Esta semana: llamada del gerente comercial, ofrecer despacho por etapas de obra y precio por volumen.' },
    { id: 'm-resultado', area: 'Medición', prioridad: 1, impacto: 'Alto', responsable: 'Ambos', estado: 'en_curso',
      titulo: 'Marcar cada cotización como ganada o perdida (con motivo)',
      detalle: 'Sin resultado no se sabe la tasa de cierre ni por qué se pierde (precio, plazo, despacho). Con 15–20 pérdidas marcadas ya se ve el patrón.',
      siguientePaso: 'Usar el botón "Resultado" en Clientes cada vez que una cotización se cierre.',
      avance: '4 cotizaciones marcadas este mes.' },
    { id: 'c-licitaciones', area: 'Canales', prioridad: 1, impacto: 'Alto', responsable: 'Ambos', estado: 'en_curso',
      titulo: 'Vender al Estado: alerta diaria de licitaciones de acero',
      detalle: 'Municipios y servicios públicos licitan fierro, perfiles y planchas todas las semanas en Mercado Público.',
      siguientePaso: 'Las licitaciones que calzan aparecen abajo cada mañana. Confirmar inscripción en ChileProveedores y elegir a cuáles postular.' },
    { id: 'm-ga4', area: 'Medición', prioridad: 2, impacto: 'Alto', responsable: 'JPB', estado: 'hecho',
      titulo: 'Medir conversiones de Google Ads (formulario, WhatsApp y llamada)',
      detalle: 'Sin conversiones medidas no se puede saber qué campaña trae cotizaciones.',
      siguientePaso: 'Listo: revisar el costo por conversión en Gastos > Ads cada semana.',
      avance: 'Conversiones activas desde el día 3 del mes.' },
    { id: 'c-ads', area: 'Canales', prioridad: 2, impacto: 'Alto', responsable: 'JPB', estado: 'pendiente',
      titulo: 'Subir presupuesto en la campaña de fierro estriado',
      detalle: 'Es la campaña con menor costo por conversión y el ticket promedio cotizado supera los $2 millones.',
      siguientePaso: 'Subir 20% por dos semanas y comparar costo por cotización.' },
    { id: 'b-botones', area: 'Bot', prioridad: 2, impacto: 'Medio', responsable: 'JPB', estado: 'pendiente',
      titulo: 'Cotización por WhatsApp con botones Aceptar / Ajustar / Hablar con un ejecutivo',
      detalle: 'Mandar el PDF con validez visible y 3 botones acorta el camino entre la cotización y el "sí".',
      siguientePaso: 'Implementar en el bot el mensaje interactivo con el PDF y registrar la respuesta.' },
    { id: 'v-reactivar', area: 'Ventas', prioridad: 2, impacto: 'Medio', responsable: 'Ambos', estado: 'pendiente',
      titulo: 'Reactivar cotizaciones abiertas con más de 14 días',
      detalle: 'Una obra que cotizó y no respondió muchas veces sigue viva. Un mensaje simple la recupera ("¿sigue en pie la obra?").',
      siguientePaso: 'Usar el filtro "Para reactivar" en Clientes y escribirles por WhatsApp.' },
    { id: 'w-calculadora', area: 'Web', prioridad: 2, impacto: 'Medio', responsable: 'JPB', estado: 'pendiente',
      titulo: 'Calculadora de kilos por medida en el sitio',
      detalle: 'El cliente piensa en barras o planchas y el mínimo es en kilos. Una calculadora evita pedidos bajo el mínimo.',
      siguientePaso: 'Publicarla en las páginas de fierro, planchas y perfiles, terminando en "Cotizar".' },
    { id: 'v-credito', area: 'Ventas', prioridad: 3, impacto: 'Medio', responsable: 'Cliente', estado: 'pendiente',
      titulo: 'Ofrecer crédito a 30 días a constructoras',
      detalle: 'En construcción muchas veces gana el proveedor que da crédito aunque sea un poco más caro.',
      siguientePaso: 'Definir condiciones (monto, antigüedad, seguro de crédito) y cómo comunicarlo en las cotizaciones.' },
    { id: 'k-resenas', area: 'Confianza', prioridad: 3, impacto: 'Bajo', responsable: 'Cliente', estado: 'pendiente',
      titulo: 'Pedir reseña en Google después de cada despacho',
      detalle: 'Prueba social para compradores que no conocen la marca.',
      siguientePaso: 'Mensaje automático con el enlace de reseña al confirmar la entrega.' },
    { id: 'w-fotos', area: 'Web', prioridad: 3, impacto: 'Bajo', responsable: 'JPB', estado: 'descartado',
      titulo: 'Galería de fotos de la planta en la portada',
      detalle: 'Se reemplazó por un video corto de despacho, que convierte mejor.',
      siguientePaso: '' }
  ];
  MEJORAS.forEach(function (m) { m.origen = 'semilla'; if (!m.avance) m.avance = ''; });

  var LICITACIONES = {
    items: [
      { codigo: '9990-41-LE26', nombre: 'Adquisición de fierro estriado A630 para obras de pavimentación participativa', tipo: 'directa', cierre: diasAtras(-6) + 'T15:00:00', nueva: true },
      { codigo: '9990-17-L126', nombre: 'Suministro de planchas de acero y perfiles para taller municipal', tipo: 'directa', cierre: diasAtras(-9) + 'T15:00:00', nueva: true },
      { codigo: '9990-88-LE26', nombre: 'Compra de perfiles y tubos de acero para mantención de pasarelas peatonales', tipo: 'directa', cierre: diasAtras(-12) + 'T15:00:00', nueva: false },
      { codigo: '9990-23-LP26', nombre: 'Suministro de mallas electrosoldadas y fierro para viviendas sociales', tipo: 'directa', cierre: diasAtras(-15) + 'T15:00:00', nueva: false }
    ],
    ts: now - 5 * H, totalActivas: 2140, ticketPropio: true, error: null
  };

  // Indicadores comerciales (misma lógica que calcularIndicadores de mejoras.js).
  function paraReactivar(cl) {
    if (!cl.totalCotizado || cl.resultado || !cl.ultimaFecha) return false;
    var t = Date.parse(cl.ultimaFecha + 'T12:00:00Z');
    if (isNaN(t)) return false;
    var dias = Math.floor((Date.now() - t) / D);
    return dias >= 14 && dias <= 120;
  }
  function indicadores() {
    var clientes = ROSTER;
    var cotizados = clientes.filter(function (cl) { return cl.totalCotizado > 0; });
    var suma = function (arr, f) { return arr.reduce(function (s, x) { return s + (f(x) || 0); }, 0); };
    var totalCotizado = suma(cotizados, function (cl) { return cl.totalCotizado; });
    var top3 = cotizados.slice().sort(function (a, b) { return b.totalCotizado - a.totalCotizado; }).slice(0, 3);
    var ganadas = clientes.filter(function (cl) { return cl.resultado && cl.resultado.estado === 'ganada'; });
    var perdidas = clientes.filter(function (cl) { return cl.resultado && cl.resultado.estado === 'perdida'; });
    var montoRes = function (cl) { return cl.resultado.monto || cl.totalCotizado || 0; };
    var motivos = {};
    perdidas.forEach(function (cl) { var k = cl.resultado.motivo || 'Otro'; motivos[k] = (motivos[k] || 0) + 1; });
    var abiertas = cotizados.filter(function (cl) { return !cl.resultado; });
    var reactivar = cotizados.filter(paraReactivar);
    var cerradas = ganadas.length + perdidas.length;
    var adsMes = ADS[mesChile(0)];
    return {
      totalCotizado: totalCotizado,
      cantidadCotizaciones: suma(clientes, function (cl) { return cl.cantidadCotizaciones; }),
      clientesCotizados: cotizados.length,
      ticketPromedio: cotizados.length ? Math.round(totalCotizado / cotizados.length) : 0,
      top3: top3.map(function (cl) { return { nombre: cl.nombre, monto: cl.totalCotizado }; }),
      top3Pct: totalCotizado ? Math.round(suma(top3, function (cl) { return cl.totalCotizado; }) / totalCotizado * 100) : 0,
      ganadas: ganadas.length, perdidas: perdidas.length,
      montoGanado: suma(ganadas, montoRes), montoPerdido: suma(perdidas, montoRes),
      tasaCierre: cerradas ? Math.round(ganadas.length / cerradas * 100) : null,
      sinResultado: abiertas.length, montoAbierto: suma(abiertas, function (cl) { return cl.totalCotizado; }),
      paraReactivar: reactivar.length, montoReactivar: suma(reactivar, function (cl) { return cl.totalCotizado; }),
      parciales: suma(clientes, function (cl) { return cl.cotParciales; }),
      montoParcial: suma(clientes, function (cl) { return cl.montoParcial; }),
      motivosPerdida: Object.keys(motivos).sort(function (a, b) { return motivos[b] - motivos[a]; }).map(function (k) { return { motivo: k, n: motivos[k] }; }),
      formularios30: FORMULARIOS.filter(function (f) { return (f.ts || 0) >= Date.now() - 30 * D; }).length,
      ads: adsMes ? { gasto: adsMes.totales.gasto, conversiones: adsMes.totales.conversiones, costoPorConversion: adsMes.totales.conversiones ? Math.round(adsMes.totales.gasto / adsMes.totales.conversiones) : null } : null,
      actualizadoTs: ROSTER_TS
    };
  }

  // ── Estado mutable en memoria ───────────────────────────────
  function chatDe(t) { return CHATS.filter(function (c) { return c.telefono === t; })[0]; }
  function sync(c) {
    var arr = MENSAJES[c.telefono] || [];
    var u = arr[arr.length - 1];
    if (u) { c.ultimoMensaje = u.texto; c.ultimoTs = u.ts; }
  }
  function rosterDe(clave) { return ROSTER.filter(function (x) { return x.clave === clave; })[0]; }
  function claveCliente(telefono, empresa, contacto) {
    if (telefono) return 'tel:' + digits(telefono);
    var nombre = String(empresa || contacto || '').trim().toLowerCase();
    return nombre ? 'nom:' + nombre : null;
  }
  function aplicarContacto(cl, d) {
    if (d.nombre) cl.contacto = d.nombre;
    var principal = d.empresa || d.nombre;
    if (principal) cl.nombre = principal;
    if (d.empresa) cl.empresa = d.empresa;
    if (d.email) cl.email = d.email;
    if (d.telefono && !cl.telefono) cl.telefono = d.telefono;
    cl.nota = d.nota || '';
  }

  function pdfBlob(texto) {
    var lines = texto.split('\n');
    var stream = 'BT /F1 16 Tf 56 780 Td (' + lines[0] + ') Tj ET\n';
    var y = 750;
    for (var i = 1; i < lines.length; i++) { stream += 'BT /F1 11 Tf 56 ' + y + ' Td (' + lines[i] + ') Tj ET\n'; y -= 20; }
    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      '<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    var out = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return new Blob([out], { type: 'application/pdf' });
  }
  function ascii(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, ''); }

  // ── Enrutador ───────────────────────────────────────────────
  function ruta(url, method, body) {
    var u = url.split('?')[0];
    var q = new URLSearchParams(url.split('?')[1] || '');
    var m;
    body = body || {};
    if (u === 'api/me') return json({ role: 'client', clientId: CLIENTE_ID, nombre: CLIENTES[0].nombre });
    if (u === 'api/clients') {
      if (method === 'POST') return json({ error: 'No autorizado' }, 403);
      return json(CLIENTES);
    }
    if (u === 'api/logout' || u.indexOf('api/push') === 0) return json({ ok: true });
    m = u.match(/^api\/clients\/[^/]+\/(.*)$/);
    if (!m) return json({ error: 'No disponible en la demo' }, 404);
    var r = m[1], p, k;

    // Conversaciones
    if (r === 'chats') {
      var items = CHATS.slice().sort(function (a, b) { return b.ultimoTs - a.ultimoTs; }).map(function (c) {
        return { telefono: c.telefono, canal: c.canal || 'whatsapp', ultimoTs: c.ultimoTs, ultimoClienteTs: c.ultimoClienteTs, ultimoMensaje: c.ultimoMensaje, estadoPedido: c.estadoPedido, estadoManual: !!c.estadoManual, respondido: !!c.respondido, archivado: !!c.archivado, pausada: !!c.pausada };
      });
      return json({ items: items, error: null });
    }
    p = r.match(/^chats\/([^/]+)(?:\/(.*))?$/);
    if (p) {
      var tel = decodeURIComponent(p[1]), acc = p[2], c = chatDe(tel);
      if (!c) return json({ telefono: tel, pausada: false, mensajes: [], pedidos: [] });
      if (!acc) return json({ telefono: tel, pausada: !!c.pausada, mensajes: MENSAJES[tel] || [], pedidos: [] });
      if (acc === 'enviar') {
        var t = str(body.texto, 2000);
        if (!t) return json({ error: 'Mensaje vacío' }, 400);
        (MENSAJES[tel] = MENSAJES[tel] || []).push({ rol: 'bot', texto: t, ts: Date.now(), estado: 'sent' });
        sync(c);
        return json({ ok: true });
      }
      if (acc === 'pausar') { c.pausada = true; return json({ ok: true }); }
      if (acc === 'reanudar') { c.pausada = false; return json({ ok: true }); }
      if (acc === 'respondido') { c.respondido = body.respondido !== false; return json({ ok: true }); }
      if (acc === 'archivar') { c.archivado = body.archivar !== false; return json({ ok: true }); }
      if (acc === 'estado') {
        if (body.estado !== null && ['cumple', 'parcial', 'no_cumple'].indexOf(body.estado) < 0) return json({ error: 'estado inválido' }, 400);
        if (body.estado) { c.estadoPedido = body.estado; c.estadoManual = true; }
        else { c.estadoPedido = c._orig; c.estadoManual = false; }
        return json({ ok: true });
      }
      if (acc === 'precotizacion') return json(copia(PRECOT[tel] || { productos: [], cliente: null }));
      if (acc === 'seguimiento') return json({ ok: true });
      if (acc.indexOf('solicitud-pdf') === 0) return 'PDF:' + tel;
      return json({ ok: true });
    }
    if (r === 'chats-archivar-lote') {
      var tels = Array.isArray(body.telefonos) ? body.telefonos : [];
      tels.forEach(function (x) { var ch = chatDe(x); if (ch) ch.archivado = true; });
      return json({ ok: true, archivados: tels.length });
    }

    // Precios por kilo
    if (r === 'precios') {
      if (method === 'POST') {
        var limpios = {};
        Object.keys(body.precios || {}).forEach(function (tipo) {
          var n = Number(body.precios[tipo]);
          if (tipo.length <= 60 && isFinite(n) && n > 0 && n < 100000000) limpios[tipo] = n;
        });
        PRECIOS = { precios: limpios, actualizado: new Date().toISOString() };
      }
      return json(copia(PRECIOS));
    }

    // Clientes (roster)
    if (r === 'clientes') return json({ actualizadoTs: ROSTER_TS, clientes: copia(ROSTER) });
    if (r === 'clientes/sincronizar') { ROSTER_TS = Date.now(); return json({ actualizadoTs: ROSTER_TS, clientes: copia(ROSTER) }); }
    if (r === 'clientes/importante') {
      k = rosterDe(body.clave);
      if (!body.clave) return json({ error: 'falta clave' }, 400);
      if (k) { k.importante = !!body.importante; k.notaSeguimiento = body.importante ? str(body.nota, 200) : ''; }
      return json({ ok: true });
    }
    if (r === 'clientes/contacto') {
      var d = { nombre: str(body.nombre, 120), empresa: str(body.empresa, 120), email: str(body.email, 160), telefono: str(body.telefono, 40), nota: str(body.nota, 500) };
      var clave = str(body.clave, 150) || claveCliente(d.telefono, d.empresa, d.nombre);
      if (!clave) return json({ error: 'Falta un teléfono, nombre o empresa.' }, 400);
      k = rosterDe(clave);
      if (!k) {
        k = { clave: clave, nombre: '', contacto: '', telefono: d.telefono, email: '', totalCotizado: 0, cantidadCotizaciones: 0, ultimaFecha: '', origenWhatsapp: false, manual: true, importante: false, notaSeguimiento: '', resultado: null };
        ROSTER.push(k);
      }
      aplicarContacto(k, d);
      return json({ ok: true, cliente: copia(k) });
    }
    if (r === 'clientes/resultado') {
      if (!body.clave) return json({ error: 'falta clave' }, 400);
      if (['abierta', 'ganada', 'perdida'].indexOf(body.estado) < 0) return json({ error: 'Estado inválido' }, 400);
      k = rosterDe(body.clave);
      if (!k) return json({ error: 'Ese cliente no está en la lista (actualiza la lista e intenta de nuevo)' }, 404);
      if (body.estado === 'abierta') k.resultado = null;
      else {
        var motivo = body.estado === 'perdida' ? str(body.motivo, 60) : '';
        if (body.estado === 'perdida' && MOTIVOS_PERDIDA.indexOf(motivo) < 0) return json({ error: 'Elige un motivo de pérdida' }, 400);
        k.resultado = { estado: body.estado, motivo: motivo, competidor: body.estado === 'perdida' ? str(body.competidor, 80) : '', monto: Math.max(0, Math.round(Number(body.monto) || 0)), nota: str(body.nota, 300), ts: Date.now() };
      }
      return json({ ok: true, resultado: k.resultado });
    }

    // Análisis y formularios
    if (r === 'analisis') return json({ actualizadoTs: ANALISIS_TS, items: ANALISIS });
    if (r === 'analisis/ejecutar') { ANALISIS_TS = Date.now(); ANALISIS.forEach(function (a) { a.actualizadoTs = ANALISIS_TS; }); return json({ ok: true }); }
    if (r === 'formularios') return json({ items: FORMULARIOS });
    if (r === 'pipeline') return json({ items: [], actualizadoTs: null });

    // Mejoras + licitaciones
    if (r === 'mejoras') return json({ items: copia(MEJORAS), indicadores: indicadores(), motivosPerdida: MOTIVOS_PERDIDA, licitaciones: copia(LICITACIONES), licitacionesActivas: true });
    if (r === 'mejoras/item') {
      var id = str(body.id, 60);
      var idx = -1;
      MEJORAS.forEach(function (x, i) { if (x.id === id) idx = i; });
      if (body.eliminar) {
        if (idx < 0) return json({ error: 'No existe' }, 404);
        MEJORAS.splice(idx, 1);
      } else if (idx >= 0 && body.titulo === undefined) {
        // Lo que puede hacer un cliente: cambiar estado y nota de avance.
        if (body.estado !== undefined) {
          if (ESTADOS_MEJORA.indexOf(body.estado) < 0) return json({ error: 'Estado inválido' }, 400);
          MEJORAS[idx].estado = body.estado;
        }
        if (body.avance !== undefined) MEJORAS[idx].avance = str(body.avance, 400);
        MEJORAS[idx].actualizado = Date.now();
      } else {
        var titulo = str(body.titulo, 160);
        if (!titulo && idx < 0) return json({ error: 'Falta el título' }, 400);
        var prev = idx >= 0 ? MEJORAS[idx] : { id: 'm-' + Date.now().toString(36), origen: 'manual' };
        var next = copia(prev);
        next.titulo = titulo || prev.titulo;
        next.area = AREAS_MEJORA.indexOf(body.area) >= 0 ? body.area : (prev.area || 'Ventas');
        next.prioridad = [1, 2, 3].indexOf(Number(body.prioridad)) >= 0 ? Number(body.prioridad) : (prev.prioridad || 2);
        next.impacto = ['Alto', 'Medio', 'Bajo'].indexOf(body.impacto) >= 0 ? body.impacto : (prev.impacto || 'Medio');
        next.responsable = ['JPB', 'Ambos', 'Cliente'].indexOf(body.responsable) >= 0 ? body.responsable : (prev.responsable || 'JPB');
        next.estado = ESTADOS_MEJORA.indexOf(body.estado) >= 0 ? body.estado : (prev.estado || 'pendiente');
        next.detalle = body.detalle !== undefined ? str(body.detalle, 1200) : (prev.detalle || '');
        next.siguientePaso = body.siguientePaso !== undefined ? str(body.siguientePaso, 600) : (prev.siguientePaso || '');
        next.avance = body.avance !== undefined ? str(body.avance, 400) : (prev.avance || '');
        next.actualizado = Date.now();
        if (idx >= 0) MEJORAS[idx] = next; else MEJORAS.push(next);
      }
      return json({ items: copia(MEJORAS) });
    }
    if (r === 'licitaciones/sincronizar') {
      LICITACIONES.ts = Date.now();
      return json({ resultado: { nuevas: [], total: LICITACIONES.items.length }, licitaciones: copia(LICITACIONES) });
    }

    // Google Ads
    if (r === 'ads') {
      var mes = q.get('mes') || mesChile(0);
      if (method === 'POST') {
        body.mes = mes; body.periodo = body.periodo || mes;
        ADS[mes] = body;
        return json({ ok: true });
      }
      return json({ mes: mes, datos: ADS[mes] || null, mesesDisponibles: mesesAds() });
    }
    if (r === 'ads/sincronizar') {
      var mesS = body.mes || mesChile(0);
      if (ADS[mesS]) { ADS[mesS].actualizado = new Date().toISOString(); return json(ADS[mesS]); }
      return json({ error: 'En la demo solo hay datos de los últimos 3 meses.' }, 400);
    }

    // Facturación, gastos y desplazamiento
    if (r === 'facturacion') return json(FACTURACION);
    if (r === 'facturacion/pagar') {
      FACTURACION.ciclosCerrados.forEach(function (ci) {
        if (ci.cierre === body.cierre) { ci.pagado = !!body.pagado; ci.pagadoTs = ci.pagado ? Date.now() : null; }
      });
      return json({ ok: true });
    }
    if (r === 'gastos' || r === 'gastos/sincronizar') {
      var g = copia(GASTOS);
      g.gastoAds = ADS[mesChile(0)] ? ADS[mesChile(0)].totales.gasto : 0;
      return json(g);
    }
    if (r === 'desplazamiento') return json({ visitas: VISITAS });
    if (r === 'desplazamiento/asistencia') {
      var hoy = ymd(new Date());
      if (VISITAS.some(function (v) { return v.fecha === hoy; })) return json({ error: 'Ya se registró una asistencia hoy' }, 409);
      VISITAS.push({ fecha: hoy, total: 6000, detalle: 'Ida y vuelta' });
      return json({ ok: true, fecha: hoy, total: 6000 });
    }
    return json({ ok: true });
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('api/') !== 0) return realFetch(input, init);
    var method = ((init && init.method) || 'GET').toUpperCase();
    var body = null;
    try { body = init && init.body ? JSON.parse(init.body) : null; } catch (e) { body = null; }
    var res;
    try { res = ruta(url, method, body); } catch (e) { res = json({ error: 'Error en la demo' }, 500); }
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (typeof res === 'string' && res.indexOf('PDF:') === 0) {
          var tel = res.slice(4), c = chatDe(tel);
          var cl = ROSTER.filter(function (x) { return digits(x.telefono) && digits(x.telefono) === digits(tel); })[0] || {};
          var ped = PRECOT[tel] && PRECOT[tel].cliente;
          var blob = pdfBlob(ascii('Solicitud de cotizacion (demo)') + '\n' +
            ascii('Cliente: ' + (cl.nombre || tel)) + '\n' +
            ascii('Telefono: ' + tel) + '\n' +
            ascii('Pedido: ' + ((ped && ped.detalle) || 'segun la conversacion de WhatsApp')) + '\n' +
            ascii('Estado del pedido: ' + ((c && c.estadoPedido) || 'sin etiqueta')) + '\n' +
            ascii('Documento de ejemplo generado en la demo de Panel JPB.'));
          resolve(new Response(blob, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="solicitud-cotizacion-demo-' + digits(tel).slice(-4) + '.pdf"' } }));
        } else resolve(res);
      }, 120);
    });
  };

  // ── Ajustes de la página para la demo ───────────────────────
  // El panel real trae textos pensados para un fabricante de bolsas y un bloque interno
  // (lo que recibe la fábrica y la comisión de JPB). En la demo se ocultan/neutralizan.
  try {
    var css = document.createElement('style');
    var bolsas = ['Hielo', 'Wicket', 'Cubre pallet', 'Basura', 'Rollo', 'Alta resistencia', 'Bins', 'Especiales', 'Pouch vacío', 'Film laminado', 'Film barrera', 'Stretch'];
    css.textContent = '.precot-interno{display:none!important}' +
      // Las tarjetas de indicadores y las etiquetas de Clientes desbordaban a lo ancho en celular (390 px).
      '.stats>.stat{min-width:0}.client-roster-tags{flex-wrap:wrap}' +
      '@media (max-width:480px){.stats .stat-icon{display:none}}' +
      bolsas.map(function (b) { return '.precios-fila:has(input[data-tipo="' + b + '"]),.precot-tipo option[value="' + b + '"]'; }).join(',') + '{display:none!important}';
    document.head.appendChild(css);
    var ayuda = document.querySelector('.precios-ayuda');
    if (ayuda) ayuda.textContent = 'Precio neto (sin IVA) por kilo de cada familia de producto. Con estos valores se calcula la precotización.';
    var comp = document.getElementById('rs-competidor');
    if (comp) comp.placeholder = 'Ej: distribuidora local, otro proveedor';
    var resp = document.getElementById('mj-responsable');
    if (resp) Array.prototype.slice.call(resp.options).forEach(function (o) { if (o.value !== 'JPB' && o.value !== 'Ambos' && o.value !== 'Cliente') o.remove(); });
  } catch (e) { /* si falla, la demo sigue funcionando */ }

  // El refresco de la lista de chats (renderChipsFiltro) reescribe TODOS los .filtro-chip de la
  // página, también los de Clientes y Mejoras, que quedaban como "undefined (0)". Mientras no se
  // arregle el selector en el panel, se protege el texto de esos chips.
  document.addEventListener('DOMContentLoaded', function () {
    var orig = window.renderChipsFiltro;
    if (typeof orig !== 'function') return;
    window.renderChipsFiltro = function () {
      var otros = Array.prototype.map.call(document.querySelectorAll('#clientes-filtros .filtro-chip, #mejoras-filtro-estado .filtro-chip'), function (b) { return [b, b.textContent, b.className]; });
      var r = orig.apply(this, arguments);
      otros.forEach(function (x) { x[0].textContent = x[1]; x[0].className = x[2]; });
      return r;
    };
  });
})();
