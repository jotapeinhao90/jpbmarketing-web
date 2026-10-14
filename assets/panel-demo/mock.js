/* Servidor simulado para la demo de Panel JPB: intercepta fetch('api/...') y responde con datos ficticios.
   Todo es de ejemplo ("Aceros del Norte S.A." no existe). Los cambios viven solo en memoria. */
(function () {
  var MIN = 60000, H = 3600000, D = 86400000;
  var now = Date.now();

  // ── Utilidades ──────────────────────────────────────────────
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ym(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function json(obj, status) {
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ── Cliente ficticio ────────────────────────────────────────
  var CLIENTES = [{
    id: 'aceros-norte', nombre: 'Aceros del Norte S.A.',
    whatsapp: { configurado: true }, ads: { configurado: true, customerId: '000-000-0000' },
    facturacion: { diaCorte: 15 }
  }];

  // ── Conversaciones ──────────────────────────────────────────
  // estadoPedido: cumple (≥ 500 kg) · parcial (variable) · no_cumple
  var CHATS = [
    { telefono: '+56 9 5555 0101', nombre: 'Constructora Maipú', estadoPedido: 'cumple', ult: 12 * MIN, ultCli: 12 * MIN, msg: 'Perfecto, quedo atento a la cotización.' },
    { telefono: '+56 9 5555 0102', nombre: 'Metalúrgica Ríos', estadoPedido: 'cumple', ult: 55 * MIN, ultCli: 55 * MIN, msg: '¿Pueden despachar el viernes en la mañana?' },
    { telefono: '+56 9 5555 0103', nombre: 'Ferretería El Tornillo', estadoPedido: 'parcial', ult: 2 * H, ultCli: 2 * H, msg: 'Depende del precio, ¿hay descuento por volumen?' },
    { telefono: '+56 9 5555 0104', nombre: '', estadoPedido: 'no_cumple', ult: 3 * H, ultCli: 3 * H, msg: 'Solo necesito 40 kilos de fierro estriado.' },
    { telefono: '+56 9 5555 0105', nombre: 'Agrícola Los Olmos', estadoPedido: 'cumple', respondido: true, ult: 5 * H, ultCli: 5 * H + 20 * MIN, msg: 'Listo, ya hicimos la transferencia. Gracias.' },
    { telefono: 'web-482913', canal: 'web', nombre: '', estadoPedido: null, ult: 9 * H, ultCli: 9 * H, msg: 'Hola, ¿tienen planchas de acero inoxidable 304?' },
    { telefono: '+56 9 5555 0106', nombre: 'Taller Mecánico Vega', estadoPedido: 'cumple', pausada: true, ult: 22 * H, ultCli: 22 * H, msg: 'Ok, me llama entonces el vendedor.' },
    { telefono: '+56 9 5555 0107', nombre: 'Servicios Industriales Sur', estadoPedido: 'cumple', ult: 4 * D, ultCli: 4 * D + 3 * H, msg: 'Le envié la cotización. ¿Pudo revisarla?' },
    { telefono: '+56 9 5555 0108', nombre: '', estadoPedido: 'parcial', ult: 6 * D, ultCli: 6 * D + 2 * H, msg: 'Te dejo el detalle del despacho por si te sirve.' },
    { telefono: '+56 9 5555 0109', nombre: '', estadoPedido: null, ult: 30 * H, ultCli: 30 * H, msg: '¿Cuál es el horario de retiro en planta?' },
    { telefono: '+56 9 5555 0110', nombre: 'Maestranza Ñuble', estadoPedido: 'no_cumple', archivado: true, ult: 18 * D, ultCli: 18 * D, msg: 'Gracias, lo veremos más adelante.' }
  ];
  CHATS.forEach(function (c) { c.ultimoTs = now - c.ult; c.ultimoClienteTs = now - c.ultCli; c.ultimoMensaje = c.msg; });

  var MENSAJES = {
    '+56 9 5555 0101': [
      ['cliente', 'Hola, necesito cotizar plancha de acero A36 de 6 mm.', 62],
      ['bot', '¡Hola! Con gusto. ¿Cuántas planchas necesitas y a qué comuna sería el despacho?', 61],
      ['cliente', '40 planchas de 1,5 x 3 m. Despacho en Maipú.', 48],
      ['bot', 'Perfecto, son aproximadamente 2.100 kg, así que cumple el pedido mínimo. Te preparo la cotización con despacho incluido.', 47],
      ['bot', 'Cotización lista: 40 planchas A36 6 mm · $2.940.000 + IVA, despacho incluido. Válida por 7 días.', 30],
      ['cliente', 'Perfecto, quedo atento a la cotización.', 12]
    ],
    '+56 9 5555 0102': [
      ['cliente', 'Buenas tardes, necesito 600 kg de fierro estriado de 12 mm.', 130],
      ['bot', 'Buenas tardes. Tenemos stock disponible. ¿Para qué comuna sería el despacho?', 129],
      ['cliente', 'Quilicura.', 100],
      ['bot', 'Listo, te envío la cotización en unos minutos con el despacho a Quilicura.', 99],
      ['cliente', '¿Pueden despachar el viernes en la mañana?', 55]
    ],
    '+56 9 5555 0103': [
      ['cliente', 'Hola, ¿qué precio tiene el tubo cuadrado 40x40?', 240],
      ['bot', 'Hola. El tubo cuadrado 40x40 x 6 m está a $14.900 + IVA por unidad. ¿Cuántas unidades necesitas?', 239],
      ['cliente', 'Unas 30 por ahora, pero puede que sigan más.', 150],
      ['bot', 'Para 30 unidades el pedido queda bajo nuestro mínimo, pero para pedidos recurrentes podemos coordinar entregas programadas.', 149],
      ['cliente', 'Depende del precio, ¿hay descuento por volumen?', 120]
    ],
    '+56 9 5555 0104': [
      ['cliente', 'Necesito fierro estriado de 10 mm.', 200],
      ['bot', '¡Hola! ¿Qué cantidad necesitas aproximadamente?', 199],
      ['cliente', 'Solo necesito 40 kilos de fierro estriado.', 180],
      ['bot', 'Gracias por escribir. Nuestro pedido mínimo es de 500 kg; para cantidades menores te recomendamos nuestros distribuidores en tu zona.', 179]
    ],
    '+56 9 5555 0105': [
      ['cliente', 'Hola, quiero confirmar el pedido de 800 kg de perfil C.', 400],
      ['bot', '¡Hola! Confirmado. Te dejo los datos para la transferencia y coordinamos el retiro.', 399],
      ['cliente', 'Listo, ya hicimos la transferencia. Gracias.', 300]
    ],
    'web-482913': [
      ['cliente', 'Hola, ¿tienen planchas de acero inoxidable 304?', 540],
      ['bot', 'Hola, sí trabajamos acero inoxidable 304 en varios espesores. ¿Qué espesor y qué cantidad necesitas?', 539]
    ],
    '+56 9 5555 0106': [
      ['cliente', 'Necesito cotizar ángulos de 40x40x4 para una estructura.', 1500],
      ['bot', 'Claro. Te comunico con un ejecutivo para ver el detalle técnico del proyecto.', 1499],
      ['bot', 'Hola, soy Camila del equipo comercial. Te llamo en unos minutos para afinar la cotización.', 1450],
      ['cliente', 'Ok, me llama entonces el vendedor.', 1320]
    ],
    '+56 9 5555 0107': [
      ['cliente', 'Necesito cotizar 1.200 kg de plancha lisa de 3 mm.', 6000],
      ['bot', 'Con gusto. Te envío la cotización con despacho a Puerto Montt.', 5990],
      ['bot', 'Le envié la cotización. ¿Pudo revisarla?', 5760]
    ],
    '+56 9 5555 0108': [
      ['cliente', 'Hola, ¿cuánto sale despachar a Rancagua?', 8700],
      ['bot', 'Hola. El despacho a Rancagua depende del volumen del pedido. ¿Qué producto necesitas?', 8690],
      ['bot', 'Te dejo el detalle del despacho por si te sirve.', 8640]
    ],
    '+56 9 5555 0109': [
      ['cliente', '¿Cuál es el horario de retiro en planta?', 1800],
      ['bot', 'Retiramos en planta de lunes a viernes de 8:30 a 17:30 y sábados de 9:00 a 13:00.', 1799]
    ],
    '+56 9 5555 0110': [
      ['cliente', 'Gracias, lo veremos más adelante.', 25920]
    ]
  };
  Object.keys(MENSAJES).forEach(function (t) {
    MENSAJES[t] = MENSAJES[t].map(function (m) {
      return { rol: m[0], texto: m[1], ts: now - m[2] * MIN, estado: m[0] === 'bot' ? 'read' : undefined };
    });
  });

  // ── Clientes (cotizaciones + contactos) ─────────────────────
  var ROSTER = [
    { clave: 'c1', nombre: 'Constructora Maipú', contacto: 'Paola Reyes', telefono: '+56 9 5555 0101', email: 'compras@constructoramaipu.example', totalCotizado: 2940000, cantidadCotizaciones: 1, ultimaFecha: '12 oct', origenWhatsapp: true, importante: true, notaSeguimiento: 'Pidió despacho incluido; llamar el jueves.' },
    { clave: 'c2', nombre: 'Metalúrgica Ríos', contacto: 'Hernán Ríos', telefono: '+56 9 5555 0102', email: 'hrios@metalurgicarios.example', totalCotizado: 1480000, cantidadCotizaciones: 2, ultimaFecha: '11 oct', origenWhatsapp: true },
    { clave: 'c3', nombre: 'Ferretería El Tornillo', contacto: 'Marcela Soto', telefono: '+56 9 5555 0103', email: '', totalCotizado: 446000, cantidadCotizaciones: 1, ultimaFecha: '11 oct', origenWhatsapp: true, nota: 'Compra recurrente en pequeñas cantidades.' },
    { clave: 'c4', nombre: 'Agrícola Los Olmos', contacto: 'Jorge Olmos', telefono: '+56 9 5555 0105', email: 'jorge@losolmos.example', totalCotizado: 3720000, cantidadCotizaciones: 3, ultimaFecha: '10 oct', origenWhatsapp: true },
    { clave: 'c5', nombre: 'Servicios Industriales Sur', contacto: 'Rodrigo Mena', telefono: '+56 9 5555 0107', email: 'rmena@sisur.example', totalCotizado: 1980000, cantidadCotizaciones: 1, ultimaFecha: '8 oct', origenWhatsapp: true, importante: true, notaSeguimiento: 'Revisando con gerencia, retomar el lunes.' },
    { clave: 'c6', nombre: 'Taller Mecánico Vega', contacto: 'Camilo Vega', telefono: '+56 9 5555 0106', email: '', totalCotizado: 865000, cantidadCotizaciones: 1, ultimaFecha: '9 oct', origenWhatsapp: true },
    { clave: 'c7', nombre: 'Inmobiliaria Pacífico', contacto: 'Daniela Torres', telefono: '', email: 'dtorres@inmopacifico.example', totalCotizado: 0, cantidadCotizaciones: 0, ultimaFecha: '', origenFormulario: true, cantidadFormularios: 1 },
    { clave: 'c8', nombre: 'Maestranza Ñuble', contacto: 'Iván Parra', telefono: '+56 9 5555 0110', email: '', totalCotizado: 310000, cantidadCotizaciones: 1, ultimaFecha: '25 sep', origenWhatsapp: true }
  ];

  // ── Análisis de IA ──────────────────────────────────────────
  var ANALISIS = [
    { telefono: '+56 9 5555 0101', puntaje: 92, razon: 'Entregó cantidad, comuna y plazo, y espera la cotización.', cumple: true, resumen: 'Constructora que necesita 40 planchas A36 de 6 mm con despacho a Maipú. Ya recibió la cotización de $2.940.000 + IVA.', alertas: [], comp: 'Segundo pedido del año; el anterior fue por un volumen similar.' },
    { telefono: '+56 9 5555 0102', puntaje: 84, razon: 'Compra recurrente y pide fecha de entrega concreta.', cumple: true, resumen: 'Metalúrgica que pide 600 kg de fierro estriado de 12 mm para despacho en Quilicura el viernes.', alertas: [], comp: 'Compra todos los meses; este pedido es 20% mayor al promedio.' },
    { telefono: '+56 9 5555 0103', puntaje: 58, razon: 'Interesado, pero sensible al precio y sin volumen confirmado.', cumple: null, resumen: 'Ferretería que pregunta por descuentos por volumen en tubo cuadrado 40x40. Pedido bajo el mínimo, con posibilidad de compras recurrentes.', alertas: ['Pide descuento antes de confirmar cantidad.'], comp: '' },
    { telefono: '+56 9 5555 0104', puntaje: 22, razon: 'Cantidad muy por debajo del mínimo.', cumple: false, resumen: 'Pidió 40 kg de fierro estriado. Se le informó el mínimo de 500 kg y se le sugirió un distribuidor local.', alertas: [], comp: '' },
    { telefono: '+56 9 5555 0107', puntaje: 71, razon: 'Cotización enviada hace 4 días sin respuesta.', cumple: true, resumen: 'Pidió 1.200 kg de plancha lisa de 3 mm para Puerto Montt. No ha respondido desde que recibió la cotización.', alertas: ['Más de 3 días sin respuesta tras la cotización.'], comp: 'Cotizaciones similares suelen cerrarse dentro de los primeros 5 días.' },
    { telefono: '+56 9 5555 0105', puntaje: 96, razon: 'Compra confirmada y transferencia realizada.', cumple: true, resumen: 'Cierre de 800 kg de perfil C con retiro en planta. Pago por transferencia confirmado por el cliente.', alertas: [], comp: 'Cliente frecuente: 3 pedidos en los últimos 60 días.' }
  ].map(function (a, i) {
    return { telefono: a.telefono, actualizadoTs: now - (3 + i) * H, nivelInteres: { puntaje: a.puntaje, razon: a.razon }, cumpleMinimo: a.cumple, resumen: a.resumen, alertas: a.alertas, comparacionHistorica: a.comp };
  });

  var FORMULARIOS = [
    { nombre: 'Daniela Torres', empresa: 'Inmobiliaria Pacífico', email: 'dtorres@inmopacifico.example', telefono: '+56 9 5555 0111', producto: 'Perfil C 100x50', cantidad: 800, mensaje: 'Necesito cotizar para una obra en Viña del Mar, entrega en 3 semanas.', pagina: '/cotizar', origen: 'Formulario del sitio web', ts: now - 3 * H },
    { nombre: 'Luis Contreras', empresa: 'Contreras e Hijos', email: 'luis@contrerashijos.example', telefono: '', producto: 'Plancha lisa 3 mm', cantidad: 25, mensaje: '', pagina: '/productos/planchas', origen: 'Formulario del sitio web', ts: now - 26 * H },
    { nombre: 'Andrea Fuentes', empresa: '', email: 'afuentes@correo.example', telefono: '+56 9 5555 0112', producto: '', cantidad: '', mensaje: 'Quisiera saber si tienen servicio de corte a medida.', pagina: '/contacto', origen: 'Formulario del sitio web', ts: now - 2 * D }
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
    var hoy = new Date();
    var f = new Date(hoy.getFullYear(), hoy.getMonth() - offset, 1);
    var y = f.getFullYear(), m = f.getMonth() + 1;
    var dias = offset === 0 ? hoy.getDate() : new Date(y, m, 0).getDate();
    var diario = diarioMes(y, m, dias, 21000);
    var gasto = diario.reduce(function (s, x) { return s + x.gasto; }, 0);
    var clicks = diario.reduce(function (s, x) { return s + x.clicks; }, 0);
    var imp = diario.reduce(function (s, x) { return s + x.impresiones; }, 0);
    var conv = diario.reduce(function (s, x) { return s + x.conversiones; }, 0);
    return {
      periodo: y + '-' + pad(m), actualizado: new Date(now - 40 * MIN).toISOString(),
      totales: { gasto: gasto, clicks: clicks, impresiones: imp, conversiones: conv, cpc_promedio: clicks ? Math.round(gasto / clicks) : 0, costo_por_conversion: conv ? Math.round(gasto / conv) : 0 },
      diario: diario, campañas: campanasDe(diario)
    };
  }
  var ADS = {};
  [0, 1, 2].forEach(function (o) { var d = adsDeMes(o); ADS[d.periodo] = d; });

  // ── Gastos ──────────────────────────────────────────────────
  var GASTOS = {
    mes: ym(new Date()), actualizadoTs: now - 25 * MIN, metaClp: 21400, iaClp: 17500,
    metaMensajes: { marketing: 38, utility: 112, authentication: 0, service: 640 },
    iaTokens: { promptTokens: 2184300, completionTokens: 318900, llamadas: 1426 }
  };

  // ── Desplazamiento ──────────────────────────────────────────
  var hoyD = new Date();
  var VISITAS = [];
  [9, 5, 2].forEach(function (atras) {
    var d = new Date(hoyD.getFullYear(), hoyD.getMonth(), hoyD.getDate() - atras);
    if (d.getMonth() === hoyD.getMonth()) VISITAS.push({ fecha: ymd(d), total: 6000, detalle: 'ida y vuelta' });
  });

  // ── Facturación por ciclos (corte día 15) ───────────────────
  function corte(mesesAtras) { return new Date(hoyD.getFullYear(), hoyD.getMonth() - mesesAtras, 15); }
  function ciclo(ini, fin, tot) {
    return { inicio: ymd(ini), cierre: ymd(fin), total: tot.ads + tot.metaIA + tot.desp + tot.fijo + tot.comision,
      desglose: { ads: tot.ads, metaIA: tot.metaIA, desplazamiento: tot.desp, visitas: tot.visitas || [], pagoFijo: tot.fijo, pagoFijoNormal: tot.fijo, ventas: tot.ventas, comision: tot.comision, comisionPct: 3 } };
  }
  var cerca = hoyD.getDate() >= 15 ? 0 : 1;
  var cierreVig = corte(cerca - 1), inicioVig = corte(cerca);
  var vig = ciclo(inicioVig, cierreVig, { ads: ADS[ym(hoyD)].totales.gasto, metaIA: 38900, desp: VISITAS.length * 6000, fijo: 250000, ventas: 9800000, comision: 294000, visitas: VISITAS });
  var cerrado1 = ciclo(corte(cerca + 1), corte(cerca), { ads: 584200, metaIA: 41300, desp: 24000, fijo: 250000, ventas: 12400000, comision: 372000 });
  cerrado1.pagado = true; cerrado1.pagadoTs = now - 8 * D;
  var cerrado2 = ciclo(corte(cerca + 2), corte(cerca + 1), { ads: 512700, metaIA: 36800, desp: 18000, fijo: 250000, ventas: 7600000, comision: 228000 });
  cerrado2.pagado = true; cerrado2.pagadoTs = now - 38 * D;
  var FACTURACION = { cicloVigente: { inicio: vig.inicio, cierre: vig.cierre, totalEstimado: vig.total, desglose: vig.desglose }, ciclosCerrados: [cerrado1, cerrado2] };

  // ── Estado mutable en memoria ───────────────────────────────
  function chatDe(t) { return CHATS.filter(function (c) { return c.telefono === t; })[0]; }
  function sync(c) {
    var arr = MENSAJES[c.telefono] || [];
    var u = arr[arr.length - 1];
    if (u) { c.ultimoMensaje = u.texto; c.ultimoTs = u.ts; }
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

  // ── Enrutador ───────────────────────────────────────────────
  function ruta(url, method, body) {
    var u = url.split('?')[0];
    var q = new URLSearchParams(url.split('?')[1] || '');
    var m;
    if (u === 'api/me') return json({ role: 'cliente', clientId: 'aceros-norte' });
    if (u === 'api/clients') return json(CLIENTES);
    if (u === 'api/logout' || u.indexOf('api/push') === 0) return json({ ok: true });
    m = u.match(/^api\/clients\/[^/]+\/(.*)$/);
    if (!m) return json({ error: 'No disponible en la demo' }, 404);
    var r = m[1], p;

    if (r === 'chats') return json(CHATS.map(function (c) {
      return { telefono: c.telefono, canal: c.canal || 'whatsapp', ultimoTs: c.ultimoTs, ultimoClienteTs: c.ultimoClienteTs, ultimoMensaje: c.ultimoMensaje, estadoPedido: c.estadoPedido, estadoManual: !!c.estadoManual, respondido: !!c.respondido, archivado: !!c.archivado, pausada: !!c.pausada };
    }));
    p = r.match(/^chats\/([^/]+)(?:\/(.*))?$/);
    if (p) {
      var tel = decodeURIComponent(p[1]), acc = p[2], c = chatDe(tel);
      if (!c) return json({ error: 'No existe' }, 404);
      if (!acc) return json({ pausada: !!c.pausada, mensajes: MENSAJES[tel] || [] });
      if (acc === 'enviar') {
        var t = (body && body.texto) || '';
        (MENSAJES[tel] = MENSAJES[tel] || []).push({ rol: 'bot', texto: t, ts: Date.now(), estado: 'sent' });
        c.respondido = true; sync(c);
        return json({ ok: true });
      }
      if (acc === 'pausar') { c.pausada = true; return json({ ok: true }); }
      if (acc === 'reanudar') { c.pausada = false; return json({ ok: true }); }
      if (acc === 'respondido') { c.respondido = !!(body && body.respondido); return json({ ok: true }); }
      if (acc === 'archivar') { c.archivado = !!(body && body.archivar); return json({ ok: true }); }
      if (acc === 'estado') {
        if (c._orig === undefined) c._orig = c.estadoPedido;
        if (body && body.estado) { c.estadoPedido = body.estado; c.estadoManual = true; }
        else { c.estadoPedido = c._orig; c.estadoManual = false; }
        return json({ ok: true });
      }
      if (acc.indexOf('solicitud-pdf') === 0) return 'PDF:' + tel;
      return json({ ok: true });
    }
    if (r === 'chats-archivar-lote') return json({ ok: true });
    if (r === 'clientes') return json({ actualizadoTs: now - 40 * MIN, clientes: ROSTER });
    if (r === 'clientes/importante') {
      var k = ROSTER.filter(function (x) { return x.clave === body.clave; })[0];
      if (k) { k.importante = !!body.importante; k.notaSeguimiento = body.nota || ''; }
      return json({ ok: true });
    }
    if (r === 'clientes/contacto' || r === 'clientes/sincronizar') return json({ ok: true });
    if (r === 'analisis') return json({ actualizadoTs: now - 3 * H, items: ANALISIS });
    if (r === 'analisis/ejecutar') return json({ ok: true });
    if (r === 'formularios') return json({ items: FORMULARIOS });
    if (r === 'ads') {
      var mes = q.get('mes');
      return json({ datos: ADS[mes] || null, mesesDisponibles: Object.keys(ADS) });
    }
    if (r === 'ads/sincronizar') return json({ ok: true });
    if (r === 'facturacion') return json(FACTURACION);
    if (r === 'facturacion/pagar') return json({ ok: true });
    if (r === 'gastos') return json(GASTOS);
    if (r === 'desplazamiento') return json({ visitas: VISITAS });
    if (r === 'desplazamiento/asistencia') {
      VISITAS.push({ fecha: ymd(new Date()), total: 6000, detalle: 'ida y vuelta' });
      return json({ ok: true });
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
    var res = ruta(url, method, body);
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (typeof res === 'string' && res.indexOf('PDF:') === 0) {
          var tel = res.slice(4), c = chatDe(tel);
          var nombre = (ROSTER.filter(function (x) { return digits(x.telefono) === digits(tel); })[0] || {}).nombre || tel;
          var blob = pdfBlob('Solicitud de cotizacion (demo)\nCliente: ' + nombre + '\nTelefono: ' + tel + '\nProducto: segun la conversacion de WhatsApp\nEstado del pedido: ' + (c && c.estadoPedido || 'sin etiqueta') + '\nDocumento de ejemplo generado en la demo de Panel JPB.');
          resolve(new Response(blob, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="solicitud-demo.pdf"' } }));
        } else resolve(res);
      }, 120);
    });
  };
})();
