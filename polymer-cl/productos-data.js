// ETP Polimer — Datos de todos los productos
const PRODUCTOS = {
    "bolsas-hielo": {
        titulo: "Bolsas para Hielo",
        categoria: "Bolsas Industriales",
        img: "img/prod-hielo.jpg",
        descripcion_corta: "Fabricadas con polietileno de alta resistencia, diseñadas para soportar temperaturas muy bajas sin deteriorarse ni adherirse entre sí.",
        descripcion: "Las bolsas para hielo de ETP Polimer están fabricadas con polietileno de alta resistencia, específicamente diseñadas para soportar temperaturas muy bajas sin deteriorarse ni adherirse entre sí. El producto cuenta con impresión personalizada en ambas caras, lo que las hace ideales para empresas que deseen destacar su marca en diversos canales de distribución.",
        caracteristicas: [
            "Polietileno virgen de alta calidad (PEBD o PEAD según necesidad)",
            "Alta transparencia y brillo",
            "Sellado reforzado para prevenir fugas de agua",
            "Apta para congelación y manipulación industrial",
            "Impresión flexográfica en una o dos caras",
            "Medidas y espesores personalizados"
        ],
        aplicaciones: "Fábricas de hielo, distribuidores, comercios minoristas, botillerías, servicios de catering y eventos."
    },
    "bolsas-wicketer": {
        titulo: "Bolsas Wicketer",
        categoria: "Bolsas para Envasado",
        img: "img/prod-wicketer.jpg",
        descripcion_corta: "Sistema innovador de bolsas apiladas en alambre metálico para maximizar la eficiencia en líneas de envasado automático y semi-automático.",
        descripcion: "ETP Polimer es especialista en la producción de bolsas wicketer diseñadas para maximizar la eficiencia y la velocidad en líneas de envasado automáticas y semiautomáticas. Estas bolsas utilizan un sistema donde se apilan entre 100 y 250 unidades, cuentan con perforaciones cerca de la boca y se montan en un alambre metálico en forma de U (wicket) para dispensación automática precisa.",
        caracteristicas: [
            "Apiladas y perforadas (2 o más perforaciones)",
            "Montadas en alambre metálico en forma de U",
            "Fabricadas en PE de diversas densidades o PP/CPP",
            "Alta claridad, buena sellabilidad y resistencia",
            "Aptas para contacto alimentario",
            "Impresión flexográfica o rotograbado de alta calidad",
            "Opción de fuelle de fondo y microperforaciones"
        ],
        aplicaciones: "Industria alimentaria (panaderías, avícolas), artículos de higiene, envasado industrial automático."
    },
    "fundas-cubre-pallet": {
        titulo: "Fundas Cubre Pallet",
        categoria: "Protección Logística",
        img: "img/prod-cubre-pallet.jpg",
        descripcion_corta: "Amplia gama de fundas para proteger mercancías durante almacenamiento, transporte y distribución nacional e internacional.",
        descripcion: "ETP Polimer ofrece una amplia gama de fundas para proteger mercancías durante almacenamiento, transporte y distribución, tanto nacional como para exportación. Estas soluciones se diseñaron considerando la importancia de mantener la integridad de sus productos frente a los diversos factores ambientales.",
        caracteristicas: [
            "Fundas de polietileno estándar contra polvo, suciedad y humedad",
            "Disponibles en rollos prepicados o unidades individuales",
            "Fundas termocontraíbles que se adaptan a la carga con calor",
            "Fundas elásticas (Stretch Hoods) con sujeción en cinco caras",
            "Alta transparencia para lectura de códigos de barra",
            "Resistencia a perforaciones y condiciones de intemperie",
            "Soluciones para diferentes volúmenes de producción"
        ],
        aplicaciones: "Almacenamiento, transporte nacional e internacional, distribución logística, protección en intemperie."
    },
    "bolsas-basura": {
        titulo: "Bolsas de Basura",
        categoria: "Bolsas Industriales",
        img: "img/prod-basura.jpg",
        descripcion_corta: "Línea completa de bolsas de basura para gestión eficiente de residuos en aplicaciones domésticas, comerciales e industriales.",
        descripcion: "ETP Polimer ofrece una línea completa de bolsas de basura diseñadas para gestión eficiente de residuos en Chile. Dirigidas a usuarios domésticos, comerciales e industriales, estas bolsas combinan calidad, resistencia y confiabilidad. Se enfocan en productos que cumplan su función sin fallos mediante materiales duraderos y diseños prácticos.",
        caracteristicas: [
            "Polietileno de alta calidad (LDPE, HDPE y LLDPE)",
            "Tamaños desde 20L hasta 240L",
            "Sellos de fondo robustos (planos, estrella u otros)",
            "Negro, transparente, azul y verde para segregación de residuos",
            "Sistemas de cierre: amarras o tirafácil",
            "Alternativas con material reciclado disponibles",
            "Soluciones personalizadas B2B para clientes industriales"
        ],
        aplicaciones: "Hogares, oficinas, comercios, industrias, hospitales, servicios municipales."
    },
    "bolsas-rollo-prepicadas": {
        titulo: "Bolsas en Rollo Prepicadas",
        categoria: "Bolsas para Envasado",
        img: "",
        descripcion_corta: "Bolsas en rollo continuo con sistema de prepicado para separación fácil y limpia, optimizando almacenamiento y dispensación.",
        descripcion: "ETP Polimer ofrece bolsas en rollo prepicadas fabricadas con láminas de polietileno de alta calidad y otros polímeros flexibles según su necesidad. Se presentan en formato continuo enrollado con sistema de prepicado que permite separar cada unidad de manera fácil y limpia. Están diseñadas para optimizar almacenamiento y facilitar dispensación controlada.",
        caracteristicas: [
            "Láminas de polietileno (LDPE, LLDPE, HDPE o mezclas)",
            "Formato en rollo continuo",
            "Prepicado nítido para separación sin esfuerzo",
            "Disponibles planas o con fuelle lateral/de fondo",
            "Transparentes, translúcidas u opacas",
            "Opción de impresión con logos e instrucciones",
            "Aptas para contacto alimentario"
        ],
        aplicaciones: "Supermercados, industria alimentaria, comercio minorista, lavanderías, tintorerías y contención de residuos livianos."
    },
    "bolsas-contenedoras": {
        titulo: "Bolsas Contenedoras de Alta Resistencia",
        categoria: "Bolsas Industriales",
        img: "img/prod-contenedoras.jpg",
        descripcion_corta: "Gama diversa de bolsas contenedoras para almacenamiento, transporte y protección de productos a granel y alto volumen.",
        descripcion: "ETP Polimer ofrece una gama diversa de bolsas contenedoras diseñadas para almacenamiento, transporte y protección de productos a granel y alto volumen. Fabricadas con polímeros de alta calidad como polietileno de diversos espesores, estructuras coextruidas y laminados especiales, estas bolsas garantizan rendimiento óptimo según cada necesidad específica.",
        caracteristicas: [
            "Robustez y durabilidad para cargas industriales",
            "Liners para bins, octabines, cajas y contenedores rígidos",
            "Sacos industriales de gran capacidad",
            "Barrera contra humedad, polvo y contaminantes externos",
            "Versiones certificadas para contacto directo con alimentos",
            "Estructuras coextruidas y laminados especiales",
            "Asesoramiento personalizado en material y diseño"
        ],
        aplicaciones: "Industria alimentaria, agricultura, construcción, química, petroquímica, minería y reciclaje."
    },
    "bolsas-bins": {
        titulo: "Bolsas Bins de Polietileno Coextruido",
        categoria: "Bolsas Industriales",
        img: "img/prod-bins.jpg",
        descripcion_corta: "Bolsas robustas fabricadas con polietileno coextruido multicapa para revestir contenedores, bins y maxisacos en contacto alimentario.",
        descripcion: "En ETP Polimer ofrecemos bolsas robustas y seguras diseñadas específicamente para revestir contenedores, bins y maxisacos utilizados en almacenamiento y transporte de productos a granel. Fabricadas con polietileno coextruido bajo estrictos controles de calidad, cumpliendo normativas para contacto directo con alimentos.",
        caracteristicas: [
            "Polietileno coextruido multicapa (HDPE + LDPE/LLDPE)",
            "Excelente resistencia a la perforación y al desgarro",
            "Rigidez y resistencia mecánica para grandes volúmenes",
            "Producidas bajo estrictos controles de calidad",
            "Cumplen normativas para contacto alimentario",
            "Certificadas para inocuidad y protección higiénica",
            "Facilita procesos logísticos de carga y descarga"
        ],
        aplicaciones: "Industria alimentaria, agrícola y de procesamiento. Almacenamiento y transporte de productos a granel."
    },
    "envases-especiales": {
        titulo: "Envases Especiales a la Medida",
        categoria: "Soluciones Personalizadas",
        img: "",
        descripcion_corta: "Soluciones de envasado flexible personalizadas para productos con requisitos técnicos, funcionales o comerciales específicos.",
        descripcion: "ETP Polimer ofrece soluciones de envasado flexible personalizadas para productos que requieren requisitos técnicos, funcionales o comerciales específicos. Nos especializamos en crear envases que van más allá de las opciones estándar del mercado.",
        caracteristicas: [
            "Barreras específicas contra oxígeno, humedad, luz UV, gases o aromas",
            "Diseño para pasteurización, esterilización y llenado en caliente",
            "Pouches y films con formas únicas",
            "Sistemas de dispensación (spouts, válvulas)",
            "Cierres especiales (zippers de alta resistencia, child-proof)",
            "Pre-cortes láser para apertura facilitada",
            "Estructuras mono-materiales reciclables y opciones compostables"
        ],
        aplicaciones: "Soluciones médico-farmacéuticas, agroquímicas, industriales, alimentarias y aplicaciones con requerimientos técnicos especiales."
    },
    "puche-doypack": {
        titulo: "Puche Doypack",
        categoria: "Envases Flexibles",
        img: "",
        descripcion_corta: "Bolsas Stand-Up que se mantienen en posición vertical, maximizando la exposición de marca en puntos de venta.",
        descripcion: "ETP Polimer ofrece Pouches Doypack, una solución de envasado flexible y moderna que permite que los productos se mantengan en posición vertical. Esta solución destaca especialmente en puntos de venta por su diseño inteligente con fuelle en la base, maximizando la exposición de marca y producto en estanterías.",
        caracteristicas: [
            "Fuelle en la base para mantenerse de pie",
            "Estructuras laminadas: PET, PE, BOPP, Aluminio, Papel Kraft",
            "Barrera efectiva contra humedad, oxígeno y luz",
            "Acabados brillantes, mates o con ventanas transparentes",
            "Zipper resellable para conveniencia del consumidor",
            "Válvula desgasificadora para café tostado",
            "Euroslot o troquel para colgar en exhibición"
        ],
        aplicaciones: "Snacks, café, frutos secos, salsas, productos para mascotas, cosméticos y productos de limpieza."
    },
    "pouche-vacio": {
        titulo: "Pouche para Vacío",
        categoria: "Envases Flexibles",
        img: "img/prod-vacio.jpg",
        descripcion_corta: "Bolsas de envasado al vacío de alta calidad para máxima protección y conservación, extendiendo la vida útil de tus productos.",
        descripcion: "ETP Polimer ofrece bolsas de envasado al vacío de alta calidad diseñadas para la máxima protección y conservación de sus productos, extendiendo su vida útil al eliminar el aire y mantener un sellado hermético.",
        caracteristicas: [
            "Materiales coextruidos o laminados de alta barrera",
            "Estructura con Nylon/Poliamida para excelente extracción del aire",
            "Opción con zipper resellable de alta calidad",
            "Resistencia a la perforación y rasgado",
            "Preparados para impresión de alta definición (HD)",
            "Gráficos vibrantes y textos nítidos",
            "Sellado único y definitivo disponible"
        ],
        aplicaciones: "Carnes, quesos, pescados, comidas preparadas y productos perecederos que requieren extensión de vida útil."
    },
    "films-laminados": {
        titulo: "Films Laminados",
        categoria: "Films Especiales",
        img: "img/prod-films-laminados.jpg",
        descripcion_corta: "Films de alta calidad mediante combinación de Nylon Poliamida, Poliéster (PET) y BOPP, en acabados natural y mate.",
        descripcion: "ETP Polimer ofrece films laminados de alta calidad mediante la combinación estratégica de materiales como Nylon Poliamida (PA), Poliéster (PET) y Polipropileno Biorientado (BOPP), disponibles en acabados natural (brillante) y mate. Diseñados para aplicaciones de envasado flexible que requieren optimización de barreras y resistencia mecánica superior.",
        caracteristicas: [
            "Nylon Poliamida (PA): resistencia a perforación y barrera a gases",
            "Poliéster (PET): rigidez, estabilidad y resistencia térmica",
            "BOPP natural y mate: barrera contra humedad y sellabilidad",
            "Barreras personalizadas contra humedad, oxígeno y aroma",
            "Mayor resistencia mecánica que films monocapa",
            "Presentación visual superior",
            "Acabados brillante o mate según necesidad"
        ],
        aplicaciones: "Envasado flexible de alta performance, protección de productos, uso en máquinas envasadoras industriales."
    },
    "films-barrera": {
        titulo: "Films Barrera",
        categoria: "Films Especiales",
        img: "img/prod-films-barrera.jpg",
        descripcion_corta: "Solución coextruida multicapa de 7 capas con Poliamida y EVOH para protección inigualable contra oxígeno, gases y humedad.",
        descripcion: "ETP Polimer ofrece films de alta barrera coextruidos multicapa diseñados para ofrecer protección inigualable y extender la vida útil de sus productos. Estos films incorporan Poliamida (PA) y EVOH, creando una barrera formidable contra oxígeno, gases y humedad.",
        caracteristicas: [
            "Estructura de 7 capas coextruidas",
            "Capa EVOH como escudo de alta eficiencia contra gases",
            "Poliamida para resistencia mecánica y barrera contra aromas",
            "Conserva frescura, sabor, color y nutrientes",
            "Compatible con termoformado, envasado al vacío y MAP",
            "Buena transparencia y brillo para presentación atractiva",
            "Resistencia a perforación y rasgado"
        ],
        aplicaciones: "Carnes frescas y procesadas, quesos, pescados, comidas preparadas y alimentos que demandan máxima protección."
    },
    "film-stretch": {
        titulo: "Film Stretch",
        categoria: "Films Especiales",
        img: "img/prod-film-stretch.jpg",
        descripcion_corta: "Película de polietileno estirable de alta calidad para asegurar y proteger cargas en pallets durante transporte y almacenamiento.",
        descripcion: "Nuestro Film Stretch, fabricado con polietileno estirable de la más alta calidad, es su aliado perfecto para asegurar y proteger sus cargas de manera eficiente y confiable. Diseñado para envolver y estabilizar cargas sobre pallets durante transporte y almacenamiento.",
        caracteristicas: [
            "Polietileno estirable de alta calidad",
            "Notable capacidad de elongación",
            "Excelente adherencia para envolver firmemente",
            "Alta resistencia a la punción y al desgarro",
            "Protección contra polvo, suciedad y humedad",
            "Disponible en medidas personalizadas",
            "Venta por mayor con relación costo-beneficio favorable"
        ],
        aplicaciones: "Sector industrial y logístico. Estabilización de cargas paletizadas para transporte y almacenamiento."
    }
};
