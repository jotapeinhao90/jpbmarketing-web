(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EmoCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round1 = (x) => Math.round(x * 10) / 10;
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const sd = (a) => {
    if (a.length < 2) return null;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
  };
  function pearson(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 4) return null;
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
      syy += (ys[i] - my) ** 2;
    }
    if (sxx === 0 || syy === 0) return null;
    return sxy / Math.sqrt(sxx * syy);
  }
  function slope(ys) {
    const n = ys.length;
    if (n < 3) return null;
    const mx = (n - 1) / 2, my = mean(ys);
    let num = 0, den = 0;
    ys.forEach((y, i) => { num += (i - mx) * (y - my); den += (i - mx) ** 2; });
    return den ? num / den : null;
  }
  function lag1(ys) {
    if (ys.length < 6) return null;
    return pearson(ys.slice(0, -1), ys.slice(1));
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const dateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); };
  const dayDiff = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);
  const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const FAMILIES = {
    joy:          { label: 'Alegría',      color: '#F5C842' },
    trust:        { label: 'Confianza',    color: '#8CCB6C' },
    fear:         { label: 'Miedo',        color: '#3FA277' },
    surprise:     { label: 'Sorpresa',     color: '#5BB8E2' },
    sadness:      { label: 'Tristeza',     color: '#4F78D6' },
    disgust:      { label: 'Aversión',     color: '#9B6CC9' },
    anger:        { label: 'Enojo',        color: '#E5534B' },
    anticipation: { label: 'Anticipación', color: '#F29B3C' },
  };
  const FAMILY_ORDER = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];

  const LVL_BASE = { 1: 35, 2: 60, 3: 85 };
  const EMOTIONS = [];
  const E = (k, label, fam, v, a, lvl, lex) => EMOTIONS.push({ k, label, fam, v, a, lvl, lex });

  E('serenidad', 'Serenidad', 'joy', 0.6, 0.12, 1, 'tranquil|seren|en paz|relajad|calmad|sosegad');
  E('contento', 'Contento/a', 'joy', 0.7, 0.35, 2, 'content|a gusto|conforme|satisfech');
  E('alegria', 'Alegría', 'joy', 0.85, 0.6, 2, 'alegr|feliz|felicid|disfrut|me rei|reimos|risa|de buen animo|de buenas');
  E('euforia', 'Euforia', 'joy', 0.95, 0.92, 3, 'eufori|a tope|imparable|en las nubes|on fire');
  E('alivio', 'Alivio', 'joy', 0.6, 0.15, 1, 'alivi|respire|me saque un peso|por fin|menos mal|descanse de');
  E('orgullo', 'Orgullo', 'joy', 0.8, 0.5, 2, 'orgull|me enorgullec|me senti capaz');
  E('diversion', 'Diversión', 'joy', 0.75, 0.65, 2, 'divert|pasamos bien|la pase bien|la pasamos bien|carrete');
  E('gratitud', 'Gratitud', 'joy', 0.8, 0.3, 2, 'agradec|gratitud|gracias a|afortunad|tengo suerte de');
  E('aceptacion', 'Aceptación', 'trust', 0.4, 0.1, 1, 'acept|esta bien asi|asum');
  E('confianza', 'Confianza', 'trust', 0.6, 0.3, 2, 'confianz|confio en mi|me siento seguro|me siento segura|con fe');
  E('admiracion', 'Admiración', 'trust', 0.7, 0.5, 3, 'admir|inspirad|inspirac');
  E('carino', 'Cariño', 'trust', 0.85, 0.4, 2, 'carin|amor(?![a-z])|amoros|te quiero|querid|abrazo|ternura|afecto');
  E('inquietud', 'Inquietud', 'fear', -0.4, 0.5, 1, 'inquiet|intranquil|nerviosismo|nervios');
  E('preocupacion', 'Preocupación', 'fear', -0.45, 0.5, 1, 'preocup|dandole vueltas|dando vueltas|rumi|no paro de pensar|no puedo dejar de pensar');
  E('inseguridad', 'Inseguridad', 'fear', -0.55, 0.4, 2, 'insegur|impostor|no soy suficiente|no soy capaz|no se si podre|dudo de mi');
  E('ansiedad', 'Ansiedad', 'fear', -0.6, 0.8, 2, 'ansios|ansied|acelerad|taquicardia|palpitac|nudo en');
  E('miedo', 'Miedo', 'fear', -0.7, 0.75, 2, 'miedo|temor|asust|susto|temi|pavor|aterr');
  E('panico', 'Pánico', 'fear', -0.9, 0.95, 3, 'panic|ataque de ansiedad|ataque de panico|desesper');
  E('abrumado', 'Abrumado/a', 'fear', -0.65, 0.7, 2, 'abruma|sobrepasad|desbordad|demasiadas cosas|no alcanzo|no me da el tiempo|colapsad|superad[oa] por');
  E('estres', 'Estrés', 'fear', -0.6, 0.8, 2, 'estres|presionad|tenso|tension');
  E('sorpresa', 'Sorpresa', 'surprise', 0.1, 0.7, 2, 'sorprend|sorpresa|no me lo esperaba|inesperad');
  E('asombro', 'Asombro', 'surprise', 0.5, 0.75, 3, 'asombr|increible|alucin|wow|impresionad');
  E('desconcierto', 'Desconcierto', 'surprise', -0.2, 0.6, 1, 'desconcert|confundid|confusion|no entiendo|perdid[oa]|descolocad');
  E('melancolia', 'Melancolía', 'sadness', -0.4, 0.15, 1, 'melanc|nostalg');
  E('tristeza', 'Tristeza', 'sadness', -0.7, 0.2, 2, 'trist|ganas de llorar|llore|llorand|pena(?![a-z])|apenad|bajonead');
  E('desolacion', 'Desolación', 'sadness', -0.9, 0.15, 3, 'desol|hundid|devastad|destrozad|sin salida|todo perdido');
  E('soledad', 'Soledad', 'sadness', -0.65, 0.2, 2, 'soledad|me sentia sol[oa]|me siento sol[oa]|aislad|nadie me|sin amigos|sin nadie');
  E('desanimo', 'Desánimo', 'sadness', -0.6, 0.1, 2, 'desanim|bajon|sin ganas|desmotiv|apatic|no tengo ganas|sin motivacion|sin animo');
  E('decepcion', 'Decepción', 'sadness', -0.6, 0.35, 2, 'decepcion|desilusion|esperaba mas|me fallo|me fallaron|defraud');
  E('cansancio', 'Cansancio', 'sadness', -0.45, 0.05, 1, 'cansad|cansanc|tengo sueno|con sueno|fatiga|sin energia|pesadez|dormi mal|dormi poco');
  E('agotamiento', 'Agotamiento', 'sadness', -0.7, 0.05, 3, 'agotad|agotamien|quemad|burnout|no doy mas|exhaust|reventad|molid|destruid');
  E('vacio', 'Vacío', 'sadness', -0.4, 0.05, 2, 'vacio|indiferen|anestesiad|nada me llama|da lo mismo|no siento nada');
  E('tedio', 'Tedio', 'disgust', -0.3, 0.1, 1, 'aburr|tedio|monoton|fome');
  E('rechazo', 'Rechazo', 'disgust', -0.5, 0.5, 2, 'rechazo|no soporto|me carga|me cae mal|desagrada|detesto|insoportable');
  E('asco', 'Asco', 'disgust', -0.7, 0.6, 3, 'asco|repugn|nauseab');
  E('culpa', 'Culpa', 'disgust', -0.65, 0.4, 2, 'mi culpa|me siento culpable|sentimiento de culpa|culpa por|arrepent|remordim|no debi|le falle|les falle');
  E('verguenza', 'Vergüenza', 'disgust', -0.75, 0.45, 2, 'verguenz|bochorn|roche|ridicul|humillad');
  E('fastidio', 'Fastidio', 'anger', -0.4, 0.5, 1, 'fastid|incomod|me molesto|molest|me choco');
  E('enojo', 'Enojo', 'anger', -0.7, 0.75, 2, 'enoj|enfad|rabia|cabread|chat[oa](?![a-z])|indignad|enfurec');
  E('furia', 'Furia', 'anger', -0.9, 0.95, 3, 'furi|explote|explotar|sacad[oa] de quicio|colerico|odi[oa](?![a-z])');
  E('frustracion', 'Frustración', 'anger', -0.65, 0.7, 2, 'frustr|no me sale|impotenc|no avanzo|trabad[oa]|estancad|empantanad');
  E('irritabilidad', 'Irritabilidad', 'anger', -0.55, 0.7, 1, 'irrit|de mal humor|malgenio|mal genio|a la defensiva');
  E('resentimiento', 'Resentimiento', 'anger', -0.65, 0.45, 2, 'resent|rencor|me quede con la espina');
  E('interes', 'Interés', 'anticipation', 0.4, 0.5, 1, 'interes|curios|me llamo la atencion|me atrae');
  E('expectativa', 'Expectativa', 'anticipation', 0.5, 0.65, 2, 'expectativ|espero con|a la espera|ilusion');
  E('entusiasmo', 'Entusiasmo', 'anticipation', 0.85, 0.8, 3, 'entusias|emocionad|motivadis|con todo|pilas');
  E('motivacion', 'Motivación', 'anticipation', 0.8, 0.7, 2, 'motivad|con ganas|enfocad|productiv|avanzand|con energia|concentrad|metido en|fluyendo');
  E('esperanza', 'Esperanza', 'anticipation', 0.7, 0.4, 2, 'esperanz|optimis|va a salir bien|se viene algo bueno|voy bien');

  const EMO_BY_KEY = {};
  EMOTIONS.forEach((e) => { e.rx = new RegExp('(?:^|[^a-z])(?:' + e.lex + ')', 'g'); EMO_BY_KEY[e.k] = e; });

  const GENERIC_POS = /\b(bien|buen dia|buena|genial|excelente|perfecto|rico|bacan|bueno)\b/g;
  const GENERIC_NEG = /\b(mal|pesimo|horrible|terrible|fome|penca|desastre)\b/g;

  const THEMES = {
    trabajo:   { label: 'Trabajo / negocio', rx: /trabaj|reunion|cliente|proveedor|factura|cotiz|oficina|jefe|empresa|campan|venta|negocio|propuesta|prospec/g },
    dinero:    { label: 'Dinero',            rx: /plata|dinero|gast|deuda|sueldo|ingreso|lucas|impuesto|\bsii\b|tarjeta|caja|presupuesto/g },
    estudio:   { label: 'Estudio / título',  rx: /titulo|tesis|informe|universidad|\buai\b|ramo|examen|estudi|profe|entrega|introduccion/g },
    pareja:    { label: 'Pareja',            rx: /pareja|polola|pololo|novia|novio|pololeo|terminamos/g },
    familia:   { label: 'Familia',           rx: /\bmama\b|\bpapa\b|hermano|hermana|familia|abuel|\btio\b|\btia\b|primo|prima/g },
    amigos:    { label: 'Amigos',            rx: /amigo|amiga|junte|juntamos|salimos|carrete/g },
    salud:     { label: 'Salud',             rx: /salud|medic|doctor|dolor|enferm|resfri|dolia/g },
    sueno:     { label: 'Sueño',             rx: /dormi|insomnio|desvel|siesta|acoste|me desperte/g },
    deporte:   { label: 'Deporte',           rx: /gimnasio|\bgym\b|entren|\bcorrer\b|trote|ejercicio|caminata|caminar|pesas|smart ?fit/g },
    ocio:      { label: 'Ocio',              rx: /serie|pelicula|netflix|videojuego|musica|\bleer\b|libro|paseo|almuerzo/g },
    proyectos: { label: 'Proyectos',         rx: /\bbot\b|\bapp\b|proyecto|barberia|plataforma|pagina web|codigo|programar|automatiz|wix/g },
    futuro:    { label: 'Futuro / incertidumbre', rx: /futuro|incertidumbre|que va a pasar|a largo plazo|mi vida|el proximo ano/g },
  };

  const DISTORTIONS = {
    catastrofizacion: {
      label: 'Catastrofización',
      desc: 'Imaginar el peor desenlace como lo más probable.',
      reframe: '¿Cuál es el desenlace más probable, no el peor? ¿Qué harías si pasara lo peor — ya has superado cosas difíciles antes?',
      rx: /todo (va a|se va a) salir mal|va a salir (pesimo|mal)|seguro que (todo )?(sale|va|me)|es el fin|lo peor|se va a (caer|arruinar|echar a perder)|no hay salida|ya esta todo perdido|me va a ir (pesimo|mal)|se acabo todo|se acaba todo|todo se (va a )?acab/,
    },
    sobregeneralizacion: {
      label: 'Sobregeneralización',
      desc: 'Convertir un hecho puntual en una regla ("siempre", "nunca").',
      reframe: '¿Es realmente "siempre"? Piensa en una vez en que fue distinto, aunque sea parcial.',
      rx: /siempre me|nunca me|nunca puedo|siempre lo|nada me sale|todo me sale mal|nadie me|todos me|jamas lo|siempre la misma|otra vez lo mismo|como siempre|siempre me dejo|nunca logro|siempre termino/,
    },
    todo_o_nada: {
      label: 'Todo o nada',
      desc: 'Ver las cosas en blanco y negro, sin grises.',
      reframe: '¿Dónde caería esto en una escala de 0 a 100 en vez de "perfecto" o "fracaso"?',
      rx: /todo o nada|fracaso total|si no es perfecto|o lo hago perfecto|arruine todo|echo a perder todo|un completo fracaso|fue un fracaso/,
    },
    lectura_mente: {
      label: 'Lectura de mente',
      desc: 'Asumir lo que otros piensan sin tener evidencia.',
      reframe: '¿Qué evidencia concreta tengo de lo que piensa? ¿Qué otra explicación podría haber?',
      rx: /seguro (que )?(piensa|piensan|cree|creen)|debe(n)? (de )?(pensar|creer)|creo que (piensa|piensan)|(piensa|piensan) que soy|me (van a|va a) juzgar|que (van|va) a pensar|se debe estar preguntando/,
    },
    deberia: {
      label: 'Los "debería"',
      desc: 'Exigirse reglas rígidas que generan culpa o presión.',
      reframe: 'Cambia "debería" por "me gustaría" o "prefiero". ¿Quién puso esa regla y sigue siendo útil hoy?',
      rx: /deberia|debi |tendria que|no deberia|se supone que|tendria que haber/,
    },
    etiquetado: {
      label: 'Etiquetado',
      desc: 'Definirse entero por un error ("soy un desastre").',
      reframe: 'Describe la conducta, no a la persona: "cometí un error en X", en vez de "soy un X".',
      rx: /soy (un[a]? )?(inutil|fracasad|tont|estupid|desastre|flojo|floja|idiota|perdedor|mediocre|incapaz|basura|bruto|bruta|nefast)|que (tonto|tonta|idiota|inutil) soy/,
    },
    personalizacion: {
      label: 'Personalización',
      desc: 'Cargarse la culpa de cosas que dependen de muchos factores.',
      reframe: '¿Qué parte fue realmente mía y qué parte dependió de otros o de las circunstancias?',
      rx: /es mi culpa|por mi culpa|fue mi culpa|yo tuve la culpa|yo cause|todo es culpa mia|yo arruine/,
    },
    razonamiento_emocional: {
      label: 'Razonamiento emocional',
      desc: 'Tomar un sentimiento como si fuera un hecho.',
      reframe: 'Sentirlo no lo hace cierto. ¿Qué hechos apoyan y cuáles contradicen lo que siento?',
      rx: /siento que (soy|voy a|no voy|nunca|todo|nada)|me siento (tonto|tonta|inutil|un fracaso|fracasad[oa]) (asi que|por lo tanto|entonces)/,
    },
    descalificar_positivo: {
      label: 'Descalificar lo positivo',
      desc: 'Restarle valor a los logros ("fue suerte", "no cuenta").',
      reframe: 'Si un amigo hiciera esto, ¿le dirías que "no cuenta"? ¿Qué hiciste tú para que resultara?',
      rx: /no cuenta|no fue nada|tuve suerte|fue pura suerte|casualidad|cualquiera (lo|podria)|no es para tanto|no tiene merito|no me lo merezco/,
    },
    filtro_mental: {
      label: 'Filtro mental',
      desc: 'Fijarse solo en lo negativo y no ver el resto.',
      reframe: 'Anota tres cosas que sí salieron bien hoy, aunque sean pequeñas, y compáralas con lo malo.',
      rx: /lo unico que (veo|pienso|recuerdo)|solo pienso en|no puedo dejar de pensar en (lo malo|el error|que me equivoque)/,
    },
  };

  const NEEDS = {
    descanso:       { label: 'Descanso',        rx: /necesito (descansar|parar|vacaciones|dormir)|no dormi|dormi poco|agotad|no doy mas|necesito un respiro/ },
    conexion:       { label: 'Conexión',        rx: /me siento sol[oa]|soledad|aislad|nadie me|extrano a|sin amigos|me falto (hablar|compania)/ },
    competencia:    { label: 'Sentirme capaz',  rx: /no avanzo|no me sale|no soy capaz|no logro|me siento torpe|atrasad|no me alcanza|me equivoque|cometi un error|\bla cague\b/ },
    autonomia:      { label: 'Autonomía',       rx: /me obligan|me mandan|no me dejan|me presionan|no tengo opcion|no tengo eleccion|dependo de/ },
    reconocimiento: { label: 'Reconocimiento',  rx: /no me valoran|no reconocen|ni un gracias|me ignoran|invisible|no me toman en cuenta/ },
    seguridad:      { label: 'Seguridad',       rx: /no alcanza la plata|deuda|incertidumbre|que va a pasar|estabilidad|plata|impuesto|no me alcanza/ },
    sentido:        { label: 'Sentido',         rx: /para que|no tiene sentido|sin proposito|por que hago esto|vacio/ },
    claridad:       { label: 'Orden / claridad', rx: /desorden|caos|no se por donde partir|demasiadas cosas|abruma|no alcanzo|colapsad/ },
  };

  const PROMPTS = [
    '¿Qué fue lo mejor de hoy, aunque sea pequeño?',
    '¿Qué te dio energía hoy y qué te la quitó?',
    '¿Qué necesitabas hoy que no te diste?',
    '¿Qué sentiste en el cuerpo en el momento más difícil del día?',
    '¿Qué harías distinto mañana, sin juzgarte?',
    '¿De qué estás agradecido hoy? Tres cosas.',
    '¿Qué pendiente te está pesando más y cuál sería el primer paso mínimo?',
    '¿Con quién te sentiste bien hoy y qué hizo esa persona?',
    '¿Qué pensamiento se repitió más hoy? ¿Es un hecho o una interpretación?',
    '¿En qué momento fuiste amable contigo hoy?',
    '¿Qué aprendiste hoy de ti?',
    '¿Qué quieres que sea verdad mañana al acostarte?',
    '¿Qué te preocupa que todavía no sucede? ¿Qué parte depende de ti?',
    '¿Qué lograste hoy que no estaba en tu lista?',
  ];

  const CRISIS_RX = /quiero morir|quiero morirme|quitarme la vida|suicid|no quiero (seguir )?vivir|matarme|acabar con (todo|mi vida)|hacerme dano|cortarme|mejor sin mi|desaparecer para siempre|no vale la pena vivir/;
  function detectCrisis(text) { return CRISIS_RX.test(norm(text)); }
  const CRISIS_MESSAGE = 'Parece que estás pasando por algo muy pesado, y no tienes que cargarlo solo/a. En Chile puedes llamar gratis y las 24 horas al *4141 (Línea de Prevención del Suicidio) o a Salud Responde, 600 360 7777. Si hay peligro inmediato, llama al 131 (SAMU) o al 133 (Carabineros). Hablar con alguien de confianza hoy también ayuda.';

  const GEN_ACTIONS = ['llamar', 'escribir', 'enviar', 'mandar', 'preparar', 'revisar', 'hacer', 'comprar', 'agendar', 'coordinar', 'terminar', 'pagar', 'cotizar', 'avanzar', 'entregar', 'hablar', 'responder', 'contestar', 'ir', 'visitar', 'cerrar', 'armar', 'organizar', 'ordenar', 'planificar', 'estudiar', 'redactar', 'subir', 'publicar', 'programar', 'probar', 'corregir', 'cobrar', 'facturar', 'reservar', 'sacar', 'buscar', 'pedir', 'confirmar', 'retomar', 'empezar', 'comenzar', 'partir', 'definir', 'decidir', 'resolver', 'limpiar', 'entrenar', 'correr', 'juntarme', 'reunirme', 'cerrar', 'actualizar', 'mejorar', 'automatizar', 'implementar'];
  const STOP_VERBS = ['descansar', 'desahogar', 'sentir', 'estar', 'ser', 'poder', 'querer', 'dormir', 'relajar', 'relajarme', 'tranquilizar', 'respirar', 'parar', 'soltar', 'calmar', 'desconectar', 'tener', 'saber', 'entender', 'pensar', 'vivir', 'morir', 'sufrir', 'llorar', 'desaparecer', 'olvidar', 'cambiar', 'ver'];

  const DOW = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

  function dueFrom(sNorm, baseStr) {
    const out = { due: null, time: null };
    const tm = sNorm.match(/a las (\d{1,2})(?:[:.](\d{2}))?/);
    if (tm) out.time = `${pad2(Math.min(23, Number(tm[1])))}:${tm[2] || '00'}`;
    if (/\bhoy\b/.test(sNorm)) { out.due = baseStr; return out; }
    if (/pasado manana/.test(sNorm)) { out.due = addDays(baseStr, 2); return out; }
    if (/\bmanana\b/.test(sNorm)) { out.due = addDays(baseStr, 1); return out; }
    for (const name of Object.keys(DOW)) {
      if (new RegExp('\\b(el|este|para el|antes del) ' + name + '\\b').test(sNorm)) {
        const cur = parseDate(baseStr).getDay();
        let diff = (DOW[name] - cur + 7) % 7;
        if (diff === 0) diff = 7;
        out.due = addDays(baseStr, diff);
        return out;
      }
    }
    if (/esta semana/.test(sNorm)) {
      const cur = parseDate(baseStr).getDay();
      const diff = cur <= 5 ? 5 - cur : 6;
      out.due = addDays(baseStr, diff);
    }
    return out;
  }

  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function extractTasks(sentences, baseStr) {
    const tasks = [];
    const seen = new Set();
    const STRONG = /(?:tengo que|tengo q|debo|hay que|me falta|tengo pendiente|pendiente(?: de)?:?|no olvidar|acordarme de|que no se me olvide)\s+/;
    const WEAK = /(?:voy a|necesito|tengo planeado)\s+/;
    sentences.forEach((sent) => {
      const sNorm = norm(sent);
      [[STRONG, true], [WEAK, false]].forEach(([re, strong]) => {
        const m = re.exec(sNorm);
        if (!m) return;
        const start = m.index + m[0].length;
        const rest = sent.slice(start).replace(/\s+/g, ' ').trim();
        const pieces = rest.split(/\s*[,;]\s*|\s+y\s+(?=[a-záéíóúñ]+(?:ar|er|ir)(?:me|le|la|lo|se)?\b)/i);
        const dueInfo = dueFrom(sNorm, baseStr);
        pieces.forEach((p, idx) => {
          let piece = p.trim();
          if (!piece) return;
          const first = norm(piece.split(' ')[0]);
          if (!/(ar|er|ir)(me|le|la|lo|se)?$/.test(first) || first.length < 4) { if (idx === 0) return; if (!/(ar|er|ir)$/.test(first)) return; }
          const base = first.replace(/(me|le|la|lo|se)$/, '');
          if (STOP_VERBS.includes(base)) return;
          if (!strong && !GEN_ACTIONS.includes(base)) return;
          piece = piece.replace(/\s+(para|el|este|antes del)?\s*(hoy|manana|mañana|pasado mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b.*$/i, '').replace(/[.!?]+$/, '').trim();
          if (piece.length < 5) return;
          const title = capital(piece).slice(0, 90);
          const key = norm(title);
          if (seen.has(key)) return;
          seen.add(key);
          tasks.push({ title, due: dueInfo.due || addDays(baseStr, 1), inferred: !dueInfo.due, time: dueInfo.time });
        });
      });
    });
    return tasks.slice(0, 8);
  }

  function parseAmount(numStr, unit) {
    let n = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(n)) return null;
    if (unit && /mil|lucas|k/.test(unit)) n *= 1000;
    return Math.round(n);
  }

  function extractExpenses(text) {
    const out = [];
    const re = /gast[eé]\s+\$?\s*([\d.,]+)\s*(mil|lucas|k)?\s+en\s+([^.,;\n]+?)(?=\s+y\s|[.,;\n]|$)/gi;
    let m;
    while ((m = re.exec(text))) {
      const amount = parseAmount(m[1], m[2] ? m[2].toLowerCase() : '');
      if (amount && amount >= 100) out.push({ description: capital(m[3].trim()).slice(0, 60), amount });
    }
    return out.slice(0, 5);
  }

  const splitSentences = (text) => String(text || '').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

  function detectEmotions(sentNorm, acc) {
    EMOTIONS.forEach((e) => {
      e.rx.lastIndex = 0;
      let m;
      while ((m = e.rx.exec(sentNorm))) {
        const pre = sentNorm.slice(0, m.index + 1).split(/\s+/).filter(Boolean).slice(-4).join(' ');
        const negated = /\b(no|nunca|ni|tampoco|jamas)\b/.test(pre);
        if (negated) { acc.negations.push(e.k); continue; }
        const last2 = pre.split(' ').slice(-2).join(' ');
        let f = 1;
        if (/\b(muy|super|re|demasiado|tan|full|harto|mucho|bien)\b/.test(last2)) f = 1.3;
        if (/\b(algo|poco|medio|poquito|levemente|apenas)\b/.test(last2)) f = 0.7;
        const cur = acc.map[e.k] || { count: 0, base: LVL_BASE[e.lvl], f: 1 };
        cur.count += 1;
        cur.f = Math.max(cur.f, f);
        acc.map[e.k] = cur;
        if (m.index === e.rx.lastIndex) e.rx.lastIndex++;
      }
    });
  }

  function valenceToEmoji(v) {
    if (v >= 3) return '😄';
    if (v >= 1.5) return '🙂';
    if (v >= -0.5) return '😐';
    if (v >= -2) return '😕';
    if (v >= -3.5) return '😟';
    return '😞';
  }

  function sleepFrom(textNorm) {
    const m = textNorm.match(/dormi\D{0,14}?(\d{1,2}(?:[.,]\d)?)\s*(?:h\b|hr|hrs|horas)/);
    if (m) return clamp(parseFloat(m[1].replace(',', '.')), 1, 14);
    if (/no dormi nada|no pude dormir|casi no dormi/.test(textNorm)) return 3;
    if (/dormi (muy )?mal|dormi poco|me desvele|insomnio/.test(textNorm)) return 5;
    if (/dormi (muy )?bien|dormi harto|dormi rico/.test(textNorm)) return 8;
    return null;
  }

  function analyzeText(text, opts) {
    const o = opts || {};
    const base = o.today || dateStr(new Date());
    const original = String(text || '');
    const textNorm = norm(original);
    const sentences = splitSentences(original);
    const acc = { map: {}, negations: [] };
    sentences.forEach((s) => detectEmotions(norm(s), acc));

    const emotions = Object.keys(acc.map).map((k) => {
      const c = acc.map[k];
      const i = clamp(Math.round((c.base * c.f + Math.min(24, (c.count - 1) * 8)) / 5) * 5, 10, 100);
      return { k, i, auto: true };
    }).sort((a, b) => b.i - a.i).slice(0, 10);

    let wSum = 0, vSum = 0, aSum = 0;
    emotions.forEach((e) => { const w = e.i / 100; wSum += w; vSum += w * EMO_BY_KEY[e.k].v; aSum += w * EMO_BY_KEY[e.k].a; });
    let val = 0;
    if (wSum > 0) {
      val = vSum / wSum;
      if (emotions.length === 1) val *= 0.85;
    } else {
      const gp = (textNorm.match(GENERIC_POS) || []).length;
      const gn = (textNorm.match(GENERIC_NEG) || []).length;
      val = ((gp - gn) / (gp + gn + 2)) * 0.6;
    }
    acc.negations.forEach((k) => { val += EMO_BY_KEY[k].v > 0 ? -0.04 : 0.03; });
    const valence = round1(clamp(val * 5, -5, 5));

    let energy = wSum > 0 ? 1 + 9 * (aSum / wSum) : 5;
    if (/cansad|agotad|sin energia|sin ganas/.test(textNorm)) energy -= 1.2;
    if (/con energia|a full|pilas/.test(textNorm)) energy += 0.8;
    energy = round1(clamp(energy, 1, 10));

    const stressKeys = ['estres', 'abrumado', 'ansiedad', 'panico', 'preocupacion', 'inquietud', 'miedo', 'frustracion'];
    let stress = 3 + emotions.filter((e) => stressKeys.includes(e.k)).reduce((s, e) => s + (e.i / 100) * 2.2, 0);
    stress += ((textNorm.match(/plazo|urgente|atrasad|presion|deadline|a ultima hora|de ultimo minuto/g) || []).length) * 0.6;
    stress -= emotions.filter((e) => ['serenidad', 'alivio'].includes(e.k)).length * 0.8;
    stress = round1(clamp(stress, 1, 10));

    const themes = Object.keys(THEMES).map((k) => {
      THEMES[k].rx.lastIndex = 0;
      return { k, n: (textNorm.match(THEMES[k].rx) || []).length };
    }).filter((t) => t.n > 0).sort((a, b) => b.n - a.n).slice(0, 5).map((t) => t.k);

    const distortions = [];
    sentences.forEach((s) => {
      const sn = norm(s);
      Object.keys(DISTORTIONS).forEach((k) => {
        if (distortions.some((d) => d.k === k)) return;
        if (DISTORTIONS[k].rx.test(sn)) distortions.push({ k, q: s.length > 110 ? s.slice(0, 107) + '…' : s });
      });
    });

    const needs = Object.keys(NEEDS).filter((k) => NEEDS[k].rx.test(textNorm));
    if (themes.includes('dinero') && emotions.some((e) => EMO_BY_KEY[e.k].fam === 'fear') && !needs.includes('seguridad')) needs.push('seguridad');

    const wins = sentences.filter((s) => /\b(logre|consegui|termine|cerre|avance|resulto|salio bien|me fue bien|lo hice|cumpli|entregue|aprobe|pude)\b/.test(norm(s))).slice(0, 4).map((s) => (s.length > 120 ? s.slice(0, 117) + '…' : s));
    const gratitude = sentences.filter((s) => /agradec|gracias a|afortunad|me ayudo|me hizo bien/.test(norm(s))).slice(0, 3).map((s) => (s.length > 120 ? s.slice(0, 117) + '…' : s));
    const tasks = extractTasks(sentences, base);
    const expenses = extractExpenses(original);

    return {
      emotions,
      valence,
      energy,
      stress,
      sleepH: sleepFrom(textNorm),
      themes,
      distortions: distortions.slice(0, 4),
      needs,
      tasks,
      expenses,
      wins,
      gratitude,
      crisis: detectCrisis(original),
      hits: emotions.length,
    };
  }

  function famOf(k) { return EMO_BY_KEY[k] ? EMO_BY_KEY[k].fam : null; }

  function estimatePerma(emo) {
    const emos = emo.emotions || [];
    const has = (keys) => emos.filter((e) => keys.includes(e.k)).reduce((s, e) => s + e.i / 100, 0);
    const th = emo.themes || [];
    const P = clamp(5 + (emo.valence || 0) * 0.9, 0, 10);
    const E = clamp(4 + has(['motivacion', 'interes', 'entusiasmo', 'euforia']) * 2.2 - has(['tedio', 'vacio']) * 2, 0, 10);
    const social = th.includes('amigos') || th.includes('familia') || th.includes('pareja');
    const R = clamp(4.5 + (social ? 2 : 0) + has(['carino', 'gratitud', 'confianza']) * 1.8 - has(['soledad']) * 2.5, 0, 10);
    const M = clamp(4.5 + has(['esperanza', 'orgullo', 'expectativa', 'gratitud']) * 1.6 - has(['vacio', 'desanimo']) * 2.2 + (th.includes('proyectos') || th.includes('estudio') ? 0.8 : 0), 0, 10);
    const A = clamp(4 + (emo.wins ? emo.wins.length : 0) * 1.6 + has(['orgullo', 'motivacion']) * 1.4 - has(['frustracion', 'verguenza']) * 1.5, 0, 10);
    return { p: round1(P), e: round1(E), r: round1(R), m: round1(M), a: round1(A), est: true };
  }

  function buildInsight(emo, seedStr) {
    const emos = (emo.emotions || []).slice().sort((a, b) => b.i - a.i);
    const topNeg = emos.find((e) => EMO_BY_KEY[e.k] && EMO_BY_KEY[e.k].v < 0);
    const topPos = emos.find((e) => EMO_BY_KEY[e.k] && EMO_BY_KEY[e.k].v > 0);
    const theme = (emo.themes || [])[0];
    const themeLabel = theme ? THEMES[theme].label.toLowerCase() : null;
    const parts = [];
    const v = emo.valence || 0;
    if (v >= 2) parts.push(`Fue un día mayormente bueno${topPos ? `, con ${EMO_BY_KEY[topPos.k].label.toLowerCase()} como emoción más marcada` : ''}.`);
    else if (v <= -2) parts.push(`Fue un día pesado${topNeg ? `: predominó ${EMO_BY_KEY[topNeg.k].label.toLowerCase()}` : ''}${themeLabel ? `, ligado sobre todo a ${themeLabel}` : ''}. Tiene sentido sentirse así.`);
    else parts.push(`Fue un día mixto${topNeg && topPos ? `, con ${EMO_BY_KEY[topPos.k].label.toLowerCase()} y también ${EMO_BY_KEY[topNeg.k].label.toLowerCase()}` : ''}.`);
    if (emo.sleepH != null && emo.sleepH < 6 && (emo.stress || 0) >= 6) parts.push(`Dormiste ${emo.sleepH} h y el estrés fue alto: esa combinación suele bajar la tolerancia a las cosas, así que parte de lo que sentiste puede ser cansancio y no solo "la situación".`);
    else if (emo.sleepH != null && emo.sleepH >= 7.5 && v >= 1.5) parts.push(`Dormir ${emo.sleepH} h probablemente ayudó a que el día se sintiera más liviano.`);
    if ((emo.distortions || []).length) {
      const d = DISTORTIONS[emo.distortions[0].k];
      parts.push(`Noté un patrón de pensamiento: ${d.label.toLowerCase()}. ${d.reframe}`);
    } else if ((emo.wins || []).length) {
      parts.push('Anota ese logro: los días buenos también merecen quedar registrados con detalle.');
    }
    return parts.join(' ');
  }

  function recommend(ctx) {
    const emos = (ctx.emotions || []).map((e) => e.k || e);
    const fams = emos.map(famOf);
    const out = [];
    const add = (id, why) => { if (!out.some((o) => o.id === id)) out.push({ id, why }); };
    const stress = ctx.stress != null ? ctx.stress : 5;
    const energy = ctx.energy != null ? ctx.energy : 5;
    if (emos.includes('panico') || stress >= 9) add('tipp', 'Tu nivel de activación es muy alto: primero baja el cuerpo, después piensa.');
    if (stress >= 7 || emos.some((k) => ['ansiedad', 'estres', 'abrumado', 'miedo', 'inquietud'].includes(k))) add('suspiro', 'Alargar la exhalación calma el sistema nervioso; 5 min diarios mejoraron el ánimo en un ensayo de Stanford.');
    if (emos.includes('abrumado') || emos.includes('preocupacion')) add('volcado', 'Sacar todo de la cabeza y elegir UNA siguiente acción reduce la sensación de abrumo.');
    if (fams.includes('anger')) { add('stop', 'Antes de reaccionar, una pausa breve evita decisiones de las que te arrepientes.'); add('opuesta', 'Para el enojo, la acción opuesta es actuar con amabilidad o distancia en vez de atacar.'); }
    if (emos.some((k) => ['desanimo', 'cansancio', 'vacio', 'soledad', 'tristeza'].includes(k)) || energy <= 4) add('activacion', 'Con ánimo bajo, el ánimo sigue a la acción (no al revés): una acción pequeña basta.');
    if ((ctx.distortions || []).length || emos.some((k) => ['inseguridad', 'verguenza', 'culpa'].includes(k))) add('pensamientos', 'Examinar el pensamiento con evidencia suele bajar la intensidad de la emoción.');
    if (emos.some((k) => ['culpa', 'verguenza', 'inseguridad'].includes(k)) || (ctx.distortions || []).some((d) => d.k === 'etiquetado')) add('autocompasion', 'Hablarte como le hablarías a un amigo baja la autocrítica sin bajar la exigencia.');
    if (!out.length) add('anclaje', 'Un ejercicio corto de atención al presente sirve como punto de partida.');
    return out.slice(0, 3);
  }

  function emoOf(entry) {
    if (entry.emo && entry.emo.v) return entry.emo;
    if (entry._derived) return entry._derived;
    const a = analyzeText(entry.content || '', { today: entry.date });
    const derived = {
      v: 1, valence: a.valence, energy: a.energy, stress: a.stress, sleepH: a.sleepH,
      emotions: a.emotions, themes: a.themes, distortions: a.distortions, needs: a.needs,
      wins: a.wins, gratitude: a.gratitude, tasks: [], source: 'derivado',
    };
    return derived;
  }

  function buildEntryEmo(manual, text, today) {
    const m = manual || {};
    const a = analyzeText(text, { today });
    const chosen = (m.emotions || []).map((e) => ({ k: e.k, i: e.i, auto: false }));
    const chosenKeys = new Set(chosen.map((e) => e.k));
    const extra = a.emotions.filter((e) => !chosenKeys.has(e.k)).map((e) => ({ k: e.k, i: Math.round(e.i * 0.8), auto: true }));
    const emotions = chosen.concat(extra).slice(0, 12);
    const merged = {
      v: 1,
      valence: m.valence != null ? m.valence : a.valence,
      energy: m.energy != null ? m.energy : a.energy,
      stress: m.stress != null ? m.stress : a.stress,
      sleepH: m.sleepH != null ? m.sleepH : a.sleepH,
      sleepQ: m.sleepQ != null ? m.sleepQ : null,
      emotions,
      themes: a.themes,
      distortions: a.distortions,
      needs: a.needs,
      wins: a.wins,
      gratitude: (m.gratitude && m.gratitude.length) ? m.gratitude : a.gratitude,
      tasks: a.tasks.map((t) => ({ ...t, added: false })),
      expenses: a.expenses.map((x) => ({ ...x, added: false })),
      perma: m.perma || null,
      source: m.source || 'local',
    };
    if (!merged.perma) merged.perma = estimatePerma(merged);
    merged.insight = m.insight || buildInsight(merged, today);
    merged.crisis = a.crisis;
    return merged;
  }

  function filterRange(entries, range, todayStr) {
    if (!range || range === 'all') return entries.slice();
    const from = addDays(todayStr, -(range - 1));
    return entries.filter((e) => e.date >= from && e.date <= todayStr);
  }

  function loadIndex(series) {
    const last = series.slice(-5);
    if (last.length < 2) return null;
    const stress = mean(last.map((d) => d.stress));
    const sleeps = last.filter((d) => d.sleepH != null).map((d) => d.sleepH);
    const sleepDebt = sleeps.length ? mean(sleeps.map((s) => Math.max(0, 7.5 - s))) : 0;
    const val = mean(last.map((d) => d.valence));
    const en = mean(last.map((d) => d.energy));
    const score = clamp(
      (stress - 1) / 9 * 38 +
      clamp(sleepDebt / 3, 0, 1) * 24 +
      clamp(-val / 5, 0, 1) * 24 +
      clamp((10 - en) / 9, 0, 1) * 14, 0, 100);
    const label = score < 35 ? 'Ligera' : score < 60 ? 'Moderada' : 'Alta';
    return { score: Math.round(score), label, stress: round1(stress), sleepDebt: round1(sleepDebt), valence: round1(val), energy: round1(en) };
  }

  function computeAnalytics(entriesIn, tools, range, todayStr) {
    const all = entriesIn.slice().sort((a, b) => a.date.localeCompare(b.date));
    const entries = filterRange(all, range, todayStr);
    const series = entries.map((e) => {
      const emo = emoOf(e);
      return { date: e.date, valence: emo.valence, energy: emo.energy, stress: emo.stress, sleepH: emo.sleepH != null ? emo.sleepH : null, emo, entry: e };
    });
    const n = series.length;
    const spanDays = n ? dayDiff(series[0].date, todayStr) + 1 : 0;
    const windowDays = range && range !== 'all' ? range : Math.max(spanDays, n);
    const out = { n, series, range, windowDays, insights: [], todayStr };
    if (!n) return out;

    const val = series.map((d) => d.valence);
    const prevEntries = range && range !== 'all' ? all.filter((e) => e.date < addDays(todayStr, -(range - 1)) && e.date >= addDays(todayStr, -(2 * range - 1))) : [];
    const prevVal = prevEntries.map((e) => emoOf(e).valence);

    out.kpi = {
      valence: round1(mean(val)),
      valencePrev: prevVal.length ? round1(mean(prevVal)) : null,
      energy: round1(mean(series.map((d) => d.energy))),
      stress: round1(mean(series.map((d) => d.stress))),
      sleep: series.filter((d) => d.sleepH != null).length ? round1(mean(series.filter((d) => d.sleepH != null).map((d) => d.sleepH))) : null,
      consistency: Math.round((n / Math.max(1, windowDays)) * 100),
    };

    const distinct = series.map((d) => new Set(d.emo.emotions.map((e) => e.k)).size);
    const allKeys = new Set();
    series.forEach((d) => d.emo.emotions.forEach((e) => allKeys.add(e.k)));
    out.granularity = { perDay: round1(mean(distinct)), distinct: allKeys.size };

    out.variability = sd(val);
    out.inertia = lag1(val);
    let posI = 0, negI = 0;
    const famTotals = {}, emoTotals = {};
    series.forEach((d) => d.emo.emotions.forEach((e) => {
      const def = EMO_BY_KEY[e.k];
      if (!def) return;
      if (def.v > 0) posI += e.i; else if (def.v < 0) negI += e.i;
      famTotals[def.fam] = (famTotals[def.fam] || 0) + e.i;
      emoTotals[e.k] = (emoTotals[e.k] || 0) + e.i;
    }));
    out.posNeg = { pos: posI, neg: negI, ratio: negI > 0 ? round1(posI / negI) : null };
    out.famTotals = famTotals;
    out.emoTotals = emoTotals;

    const m = mean(val), s = sd(val);
    if (s != null && n >= 6) {
      const low = m - 0.75 * s;
      const rec = [];
      series.forEach((d, i) => {
        if (d.valence <= low) {
          let j = i + 1;
          while (j < series.length && series[j].valence < m) j++;
          if (j < series.length) rec.push(dayDiff(d.date, series[j].date));
        }
      });
      out.recovery = rec.length ? round1(mean(rec)) : null;
    } else out.recovery = null;

    const sl = series.filter((d) => d.sleepH != null);
    out.sleepR = sl.length >= 5 ? pearson(sl.map((d) => d.sleepH), sl.map((d) => d.valence)) : null;
    out.stressR = n >= 5 ? pearson(series.map((d) => d.stress), val) : null;
    out.energyR = n >= 5 ? pearson(series.map((d) => d.energy), val) : null;
    out.slope = slope(val);
    out.sleepPoints = sl.map((d) => ({ x: d.sleepH, y: d.valence, date: d.date }));

    const themeAgg = {};
    series.forEach((d) => (d.emo.themes || []).forEach((t) => { (themeAgg[t] = themeAgg[t] || []).push(d.valence); }));
    out.themeEffects = Object.keys(themeAgg).filter((t) => t !== 'sueno' && themeAgg[t].length >= 2).map((t) => ({ k: t, n: themeAgg[t].length, avg: round1(mean(themeAgg[t])), delta: round1(mean(themeAgg[t]) - m) })).sort((a, b) => a.delta - b.delta);

    const wd = {};
    series.forEach((d) => { const w = parseDate(d.date).getDay(); (wd[w] = wd[w] || []).push(d.valence); });
    out.weekday = Object.keys(wd).map((w) => ({ w: Number(w), n: wd[w].length, avg: round1(mean(wd[w])) }));

    const dist = {}, needs = {}, wins = [];
    series.forEach((d) => {
      (d.emo.distortions || []).forEach((x) => { dist[x.k] = (dist[x.k] || 0) + 1; });
      (d.emo.needs || []).forEach((x) => { needs[x] = (needs[x] || 0) + 1; });
      (d.emo.wins || []).forEach((w) => wins.push({ date: d.date, text: w }));
    });
    out.distortionCounts = Object.keys(dist).map((k) => ({ k, n: dist[k] })).sort((a, b) => b.n - a.n);
    out.needCounts = Object.keys(needs).map((k) => ({ k, n: needs[k] })).sort((a, b) => b.n - a.n);
    out.wins = wins;

    const permaDims = ['p', 'e', 'r', 'm', 'a'];
    const permaSeries = series.map((d) => d.emo.perma || estimatePerma(d.emo));
    out.perma = {};
    permaDims.forEach((k) => { out.perma[k] = round1(mean(permaSeries.map((p) => p[k]))); });

    const inRange = (t) => t.date >= (range && range !== 'all' ? addDays(todayStr, -(range - 1)) : '0000');
    const sessions = (tools || []).filter((t) => t.kind === 'session' && inRange(t));
    const byTool = {};
    sessions.forEach((t) => { if (t.before != null && t.after != null) (byTool[t.tool] = byTool[t.tool] || []).push({ before: t.before, after: t.after }); });
    out.toolStats = Object.keys(byTool).map((id) => {
      const list = byTool[id];
      const drop = mean(list.map((x) => (x.before - x.after) / Math.max(1, x.before) * 100));
      return { id, n: list.length, before: round1(mean(list.map((x) => x.before))), after: round1(mean(list.map((x) => x.after))), dropPct: Math.round(drop) };
    }).sort((a, b) => b.dropPct - a.dropPct);
    out.sessionsCount = sessions.length;

    out.load = loadIndex(all.filter((e) => e.date <= todayStr).map((e) => { const x = emoOf(e); return { date: e.date, stress: x.stress, sleepH: x.sleepH, valence: x.valence, energy: x.energy }; }));

    let streak = 0;
    const dates = new Set(all.map((e) => e.date));
    let cursor = dates.has(todayStr) ? todayStr : addDays(todayStr, -1);
    while (dates.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
    out.streak = streak;

    out.insights = buildAnalyticsInsights(out);
    return out;
  }

  function buildAnalyticsInsights(a) {
    const ins = [];
    const push = (icon, text, strength, kind) => ins.push({ icon, text, strength, kind: kind || 'info' });
    const n = a.n;
    if (n < 3) { push('🌱', 'Con más registros (al menos 5 días) voy a poder mostrarte patrones. Cada entrada suma.', 0.1); return ins; }

    if (a.slope != null && n >= 5) {
      const perWeek = round1(a.slope * 7);
      if (Math.abs(perWeek) >= 0.8) push(perWeek > 0 ? '📈' : '📉', `Tu ánimo viene ${perWeek > 0 ? 'subiendo' : 'bajando'} (~${Math.abs(perWeek)} puntos por semana en este período).`, Math.min(1, Math.abs(perWeek) / 4), perWeek > 0 ? 'good' : 'warn');
    }
    const best = a.series.reduce((p, c) => (c.valence > p.valence ? c : p));
    const worst = a.series.reduce((p, c) => (c.valence < p.valence ? c : p));
    if (best.date !== worst.date) {
      const bt = (best.emo.themes || [])[0], wt = (worst.emo.themes || [])[0];
      push('⚖️', `Tu mejor día fue el ${fmtShort(best.date)} (${best.valence > 0 ? '+' : ''}${best.valence})${bt ? `, ligado a ${THEMES[bt].label.toLowerCase()}` : ''}; el más difícil, el ${fmtShort(worst.date)} (${worst.valence})${wt ? `, con ${THEMES[wt].label.toLowerCase()} en el centro` : ''}.`, 0.5);
    }
    if (a.sleepR != null && Math.abs(a.sleepR) >= 0.45) {
      const good = a.series.filter((d) => d.sleepH != null && d.sleepH >= 7), bad = a.series.filter((d) => d.sleepH != null && d.sleepH < 6.5);
      if (good.length >= 2 && bad.length >= 2) {
        const dlt = round1(mean(good.map((d) => d.valence)) - mean(bad.map((d) => d.valence)));
        push('😴', `En tus datos, los días con 7 h o más de sueño tu ánimo promedia ${dlt > 0 ? '+' : ''}${dlt} puntos frente a los días con menos de 6,5 h (relación ${strengthWord(a.sleepR)}, ${a.sleepPoints.length} días).`, Math.abs(a.sleepR), 'insight');
      } else push('😴', `El sueño y tu ánimo se mueven juntos (relación ${strengthWord(a.sleepR)}).`, Math.abs(a.sleepR), 'insight');
    }
    if (a.stressR != null && a.stressR <= -0.5) push('🌡️', `Cuando sube el estrés, tu ánimo baja de forma marcada (relación ${strengthWord(a.stressR)}). Eso hace que bajar el estrés sea tu palanca más directa.`, Math.abs(a.stressR), 'insight');
    if (a.themeEffects.length) {
      const neg = a.themeEffects[0], pos = a.themeEffects[a.themeEffects.length - 1];
      if (neg.delta <= -0.8) push('🧲', `Los días en que aparece ${THEMES[neg.k].label.toLowerCase()}, tu ánimo promedia ${neg.avg} (${neg.delta} respecto a tu promedio, ${neg.n} días). Es un tema a cuidar.`, Math.min(1, Math.abs(neg.delta) / 3), 'warn');
      if (pos.delta >= 0.8 && pos.k !== neg.k) push('🔋', `${capital(THEMES[pos.k].label.toLowerCase())} suma: esos días tu ánimo promedia ${pos.avg} (+${pos.delta}). Vale la pena agendarlo a propósito.`, Math.min(1, pos.delta / 3), 'good');
    }
    const wdv = a.weekday.filter((w) => w.n >= 1);
    if (wdv.length >= 4 && n >= 8) {
      const lo = wdv.reduce((p, c) => (c.avg < p.avg ? c : p)), hi = wdv.reduce((p, c) => (c.avg > p.avg ? c : p));
      if (hi.avg - lo.avg >= 2) push('🗓️', `Tu día más bajo de la semana tiende a ser el ${WEEKDAYS[lo.w]} (${lo.avg}) y el más alto el ${WEEKDAYS[hi.w]} (${hi.avg}).`, Math.min(1, (hi.avg - lo.avg) / 6));
    }
    if (a.distortionCounts.length) {
      const d = a.distortionCounts[0];
      push('🧩', `El patrón de pensamiento que más se repite es ${DISTORTIONS[d.k].label.toLowerCase()} (${d.n} ${d.n === 1 ? 'vez' : 'veces'}). Pregunta para desafiarlo: ${DISTORTIONS[d.k].reframe}`, Math.min(1, 0.3 + d.n * 0.15), 'warn');
    }
    if (a.toolStats.length && a.toolStats[0].n >= 2 && a.toolStats[0].dropPct >= 20) {
      const t = a.toolStats[0];
      push('🧰', `Lo que mejor te ha funcionado: ${toolName(t.id)} (bajó tu malestar ~${t.dropPct}% en promedio, ${t.n} veces). Úsalo primero cuando lo necesites.`, 0.8, 'good');
    }
    if (a.inertia != null && a.inertia >= 0.5) push('⚓', 'Tu ánimo tiende a "quedarse pegado": un mal día suele arrastrar al siguiente. Cortar la cadena temprano (dormir, moverte, hablar con alguien) rinde más.', Math.min(1, a.inertia), 'insight');
    if (a.recovery != null) push('🔄', `Cuando tienes un día bajo, te toma en promedio ${a.recovery} ${a.recovery === 1 ? 'día' : 'días'} volver a tu nivel habitual.`, 0.45);
    if (a.load && a.load.score >= 60) push('🚨', `Tu carga acumulada de los últimos días está ${a.load.label.toLowerCase()} (${a.load.score}/100): mucho estrés, poco sueño y ánimo bajo. Es un buen momento para una pausa deliberada.`, 0.95, 'warn');
    ins.sort((x, y) => y.strength - x.strength);
    return ins.slice(0, 7);
  }

  const TOOL_NAMES = { suspiro: 'Suspiro cíclico', tipp: 'TIPP (reset corporal)', anclaje: 'Anclaje 5-4-3-2-1', pensamientos: 'Registro de pensamientos', opuesta: 'Acción opuesta', activacion: 'Activación conductual', volcado: 'Volcado mental', autocompasion: 'Autocompasión', stop: 'STOP' };
  function toolName(id) { return TOOL_NAMES[id] || id; }
  function strengthWord(r) { const a = Math.abs(r); return a >= 0.7 ? 'fuerte' : a >= 0.45 ? 'moderada' : 'leve'; }
  function fmtShort(s) { const d = parseDate(s); return `${d.getDate()}/${d.getMonth() + 1}`; }

  return {
    norm, clamp, round1, mean, sd, pearson, slope, lag1,
    dateStr, parseDate, addDays, dayDiff, WEEKDAYS, WEEKDAYS_SHORT,
    FAMILIES, FAMILY_ORDER, EMOTIONS, EMO_BY_KEY, THEMES, DISTORTIONS, NEEDS, PROMPTS, TOOL_NAMES,
    CRISIS_MESSAGE, detectCrisis, analyzeText, buildEntryEmo, buildInsight, estimatePerma,
    recommend, emoOf, computeAnalytics, valenceToEmoji, toolName, famOf,
  };
});
