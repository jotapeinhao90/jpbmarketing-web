/* =====================
   CONFLEX — Products data
   ===================== */
const PRODUCTS = {

  /* ---- LÍNEA CONDUIT ---- */
  'conduit-curvas-90': {
    name: 'Curvas 90°', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Permite cambios de dirección a 90° en cañerías conduit. Disponible en tipo Cementar (adhesivo) y Anger (presión/rosca). Clases I–IV según resistencia mecánica.',
    specs: ['Norma IEC 61386','PVC autoextinguible','Tipos Cementar y Anger','Clases I, II, III, IV','16 – 160 mm'],
    hasType:true, hasClass:true, typeLabel:'Tipo de unión',
    types:{
      'Cementar':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'III':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'IV':['16mm','20mm','25mm','32mm']},
      'Anger':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['63mm','75mm','90mm','110mm','140mm','160mm'],'III':['63mm','75mm','90mm','110mm','140mm','160mm']}
    }
  },
  'conduit-curvas-45': {
    name: 'Curvas 45°', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Cambio de dirección suave a 45° para trayectos que requieren una desviación gradual. Menor tensión sobre el cable que una curva de 90°. Tipos Cementar y Anger.',
    specs: ['Norma IEC 61386','PVC autoextinguible','Tipos Cementar y Anger','Clases I, II, III, IV','16 – 160 mm'],
    hasType:true, hasClass:true, typeLabel:'Tipo de unión',
    types:{
      'Cementar':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'III':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'IV':['16mm','20mm','25mm','32mm']},
      'Anger':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['63mm','75mm','90mm','110mm','140mm','160mm'],'III':['63mm','75mm','90mm','110mm','140mm','160mm']}
    }
  },
  'conduit-curvas-r600': {
    name: 'Curvas 90° Radio 600', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Radio largo (R=600mm) para tendido de cables sin dañar el aislamiento. Esencial en instalaciones industriales de alta exigencia. Tipos Cementar y Anger.',
    specs: ['Radio R=600mm','PVC autoextinguible','Tipos Cementar y Anger','Clases I, II, IV','16 – 160 mm'],
    hasType:true, hasClass:true, typeLabel:'Tipo de unión',
    types:{
      'Cementar':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'IV':['16mm','20mm','25mm','32mm']},
      'Anger':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['63mm','75mm','90mm','110mm','140mm','160mm']}
    }
  },
  'conduit-salidas-caja': {
    name: 'Salidas de Caja', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Conecta la cañería conduit a cajas eléctricas de registro o derivación. Ingreso ordenado y seguro del ducto. Disponible en Clases I, II y III.',
    specs: ['Norma IEC 61386','PVC autoextinguible','Sin tipo Cementar/Anger','Clases I, II y III','63 – 140 mm'],
    hasType:false, hasClass:true,
    classes:{'I':['75mm','90mm','110mm','140mm'],'II':['63mm','75mm','90mm','110mm','140mm'],'III':['63mm','75mm','90mm','110mm','140mm']}
  },
  'conduit-coplas': {
    name: 'Coplas', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Une dos tramos de cañería conduit del mismo diámetro. Garantiza continuidad y estanqueidad en la instalación eléctrica. Clases I, II y III.',
    specs: ['Norma IEC 61386','PVC autoextinguible','Clases I, II y III','40 – 160 mm'],
    hasType:false, hasClass:true,
    classes:{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'III':['63mm','75mm','90mm','110mm','140mm','160mm']}
  },
  'conduit-terminal-cam': {
    name: 'Terminal Cámara', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Conexión de cañería conduit a cámaras de registro o cajas eléctricas. Terminación limpia y sellada en el punto de ingreso. Tipos Cementar y Anger, Clases I–IV.',
    specs: ['Norma IEC 61386','Tipos Cementar y Anger','Clases I, II, III, IV','16 – 160 mm'],
    hasType:true, hasClass:true, typeLabel:'Tipo de unión',
    types:{
      'Cementar':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['40mm','50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'III':['50mm','63mm','75mm','90mm','110mm','140mm','160mm'],'IV':['16mm','20mm','25mm','32mm']},
      'Anger':{'I':['75mm','90mm','110mm','140mm','160mm'],'II':['63mm','75mm','90mm','110mm','140mm','160mm']}
    }
  },
  'conduit-terminal-he': {
    name: 'Terminal HE', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Terminal Hembra Exterior: extremo roscado hacia afuera para conexión a tableros y cajas eléctricas. Clases II y III.',
    specs: ['Rosca exterior (HE)','Clases II y III','110 – 160 mm'],
    hasType:false, hasClass:true,
    classes:{'II':['140mm','160mm'],'III':['110mm','140mm','160mm']}
  },
  'conduit-terminal-hect': {
    name: 'Terminal HE C/T', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Terminal HE con tuerca de fijación incorporada. Mayor seguridad mecánica en el punto de conexión a tablero. Clases II y III.',
    specs: ['Incluye tuerca de fijación','Clases II y III','110 – 160 mm'],
    hasType:false, hasClass:true,
    classes:{'II':['140mm','160mm'],'III':['110mm','140mm','160mm']}
  },
  'conduit-camaras': {
    name: 'Cámaras de Registro', line: 'Línea Conduit', lineSlug: 'conduit', lineUrl: 'conduit.html',
    desc: 'Elemento de registro subterráneo con tapa para inspección y mantenimiento de cañerías conduit. Disponibles en 110mm y 160mm con múltiples salidas.',
    specs: ['Con tapa de registro','110mm y 160mm','20, 25 y 32 salidas'],
    hasType:false, hasClass:false,
    sizes:['110mm / 20 salidas','110mm / 25 salidas','110mm / 32 salidas','160mm / 20 salidas','160mm / 25 salidas']
  },

  /* ---- FITTING SCHEDULE 40/80 ---- */
  'sch4080-curvas-90': {
    name: 'Curvas 90°', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Curva 90° Schedule 40/80 en PVC naranja. Schedule 40 pared estándar; Schedule 80 pared reforzada y mayor resistencia a presión. De 1/2" a 8".',
    specs: ['Norma ASTM D-1785','PVC naranja','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'sch4080-curvas-r600': {
    name: 'Curvas 90° Radio 600', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Radio largo (R=600mm) Schedule 40/80. Mayor radio de curvatura para tendido de cables sin deterioro del aislamiento en instalaciones industriales.',
    specs: ['Radio R=600mm','PVC naranja','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'sch4080-curvas-45': {
    name: 'Curvas 45°', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Desviación suave a 45° para instalaciones Schedule. Menor tensión sobre el aislamiento de cables en tendidos con cambios graduales.',
    specs: ['PVC naranja','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'sch4080-terminal-cam': {
    name: 'Terminal Cámara', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Conexión de cañería Schedule a cámaras de registro o cajas eléctricas. Terminación limpia y sellada. Schedule 40 y 80.',
    specs: ['PVC naranja','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'sch4080-terminal-he': {
    name: 'Terminal HE', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Terminal Hembra Exterior: extremo roscado hacia afuera para conexión a tableros. Schedule 40 y 80, de 1/2" a 6".',
    specs: ['Rosca exterior (HE)','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },
  'sch4080-terminal-hect': {
    name: 'Terminal HE C/T', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Terminal HE con tuerca de fijación. Mayor seguridad mecánica en la conexión. Schedule 40 y 80, de 1/2" a 6".',
    specs: ['Incluye tuerca de fijación','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },
  'sch4080-terminal-hi': {
    name: 'Terminal HI', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Terminal Hembra Interior: roscado interior para acoplamiento de tuberías con rosca macho. Schedule 40 y 80, de 1/2" a 6".',
    specs: ['Rosca interior (HI)','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },
  'sch4080-copla-cem': {
    name: 'Copla Cementar', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Une dos tramos de cañería con adhesivo PVC. Unión resistente y hermética. Schedule 40 y 80, de 1/2" a 8".',
    specs: ['Unión por adhesivo','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'sch4080-copla-hihi': {
    name: 'Copla HI-HI', line: 'Fitting Schedule 40/80', lineSlug: 'schedule-40-80', lineUrl: 'schedule-40-80.html',
    desc: 'Unión roscada hembra-hembra para mayor seguridad mecánica. Schedule 40 y 80, de 1/2" a 6".',
    specs: ['Unión roscada HI-HI','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },

  /* ---- SCHEDULE GRIS UV ---- */
  'grisuv-curvas-90': {
    name: 'Curvas 90° Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Curva 90° PVC gris con aditivo UV. Para instalaciones en exterior, azoteas y zonas descubiertas. El aditivo previene deterioro y decoloración solar.',
    specs: ['Protección UV integrada','PVC gris','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'grisuv-curvas-r600': {
    name: 'Curvas 90° R-600 Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Radio amplio (R=600mm) con protección UV. Protege el aislamiento de cables en instalaciones exteriores con tendidos largos.',
    specs: ['Radio R=600mm + UV','PVC gris','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'grisuv-curvas-45': {
    name: 'Curvas 45° Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Desviación suave a 45° para exteriores con exposición solar. Mayor durabilidad frente a degradación UV que los productos estándar.',
    specs: ['Protección UV','PVC gris','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'grisuv-terminal-cam': {
    name: 'Terminal Cámara Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Conexión a cámaras de registro en exterior. Resistencia UV previene el deterioro en instalaciones descubiertas permanentes.',
    specs: ['Protección UV','PVC gris','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'grisuv-terminal-he': {
    name: 'Terminal HE Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Terminal HE con aditivo UV. Rosca exterior para conexión a tableros en instalaciones a la intemperie. Schedule 40 y 80.',
    specs: ['Rosca exterior + UV','PVC gris','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },
  'grisuv-terminal-hect': {
    name: 'Terminal HE C/T Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Con tuerca de fijación y protección UV. Máxima seguridad mecánica en conexiones exteriores permanentes.',
    specs: ['Tuerca + UV','PVC gris','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },
  'grisuv-terminal-hi': {
    name: 'Terminal HI Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Terminal Hembra Interior con protección UV para exteriores. Roscado interior con durabilidad aumentada para la intemperie.',
    specs: ['Rosca interior + UV','PVC gris','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  },
  'grisuv-copla-cem': {
    name: 'Copla Cementar Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Unión por adhesivo resistente a UV. Para empalmes en exteriores expuestos al sol con máxima durabilidad.',
    specs: ['Adhesivo + UV','PVC gris','Schedule 40 y 80','1/2" – 8"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"','8"']}
  },
  'grisuv-copla-hihi': {
    name: 'Copla HI-HI Gris UV', line: 'Schedule Gris UV', lineSlug: 'schedule-gris-uv', lineUrl: 'schedule-gris-uv.html',
    desc: 'Unión roscada hembra-hembra con protección UV. Para exteriores donde se requiere máxima resistencia mecánica y solar.',
    specs: ['Roscada HI-HI + UV','PVC gris','Schedule 40 y 80','1/2" – 6"'],
    hasType:true, hasClass:false, typeLabel:'Schedule',
    types:{'Sch 40':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"'],'Sch 80':['1/2"','3/4"','1"','1¼"','1½"','2"','2½"','3"','4"','5"','6"']}
  }
};

/* Group products by line */
const LINES = {
  'conduit': {
    title: 'Fitting Conduit',
    desc: 'Accesorios para instalaciones eléctricas conduit. Tipos Cementar y Anger. Clases I–IV.',
    color: '#e85c1a',
    products: Object.keys(PRODUCTS).filter(k => k.startsWith('conduit-'))
  },
  'schedule-40-80': {
    title: 'Fitting Schedule 40/80',
    desc: 'PVC naranja de alta resistencia. Norma ASTM D-1785. Schedule 40 y 80.',
    color: '#e85c1a',
    products: Object.keys(PRODUCTS).filter(k => k.startsWith('sch4080-'))
  },
  'schedule-gris-uv': {
    title: 'Schedule Gris UV',
    desc: 'PVC gris con protección UV para exteriores e intemperie.',
    color: '#4a7c59',
    products: Object.keys(PRODUCTS).filter(k => k.startsWith('grisuv-'))
  }
};
