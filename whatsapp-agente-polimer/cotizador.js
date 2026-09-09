// Reglas de negocio de Polimer: peso por producto y si alcanza el mínimo de producción.
// Vive aparte del Worker para poder verificarlo sin desplegar.

export const MINIMO_KG = 300;
const HOMS_PACK_WA = "56979678988";

const MICRAJE_ESTANDAR = {
  hielo: 40,
  wicket: 25,
  "cubre pallet": 80,
  basura: 40,
  rollo: 15,
  "alta resistencia": 150,
  bins: 50,
  especiales: 90,
  "pouch vacio": 90,
  "film laminado": 20,
  "film barrera": 80,
  stretch: 23,
};
const MICRAJE_DEFAULT = 40;

// Una bolsa se fabrica de lámina doblada (dos caras), por eso el ×2. Films, rollos y
// stretch son lámina simple, van ×1. Stretch entra acá porque se vende en rollo, no
// como bolsa — si Polimer lo factura distinto, es el único lugar que hay que tocar.
const UNA_SOLA_CARA = /film|rollo|stretch/i;

// Formatos tan grandes que sobre 500 unidades el mínimo se cumple siempre; el prompt
// los exceptúa explícitamente del cálculo.
const EXENTOS_SOBRE_500 = /cubre\s*pallet|bins/i;

const normalizar = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function micrajeDe(tipo, micraje) {
  const m = Number(micraje);

  if (!m || Number.isNaN(m)) {
    const t = normalizar(tipo);
    const match = Object.keys(MICRAJE_ESTANDAR).find((k) => t.includes(k));
    return match ? MICRAJE_ESTANDAR[match] : MICRAJE_DEFAULT;
  }

  // El cliente puede decir "0.06" (mm) o "60" (micrones) para lo mismo.
  return m < 1 ? m * 1000 : m;
}

export function clasificarPedido({ productos = [] }) {
  const evaluados = productos.map((p) => {
    const micras = micrajeDe(p.tipo, p.micraje);
    const cantidad = Number(p.cantidad) || 0;
    const enKilos = normalizar(p.unidad) === "kilos";

    if (EXENTOS_SOBRE_500.test(p.tipo || "") && !enKilos && cantidad > 500) {
      return { ...p, micras, pesoKg: null, clasificacion: "VALIDO", motivo: "excepcion_minimo" };
    }

    const caras = UNA_SOLA_CARA.test(p.tipo || "") ? 1 : 2;
    const pesoKg = enKilos
      ? cantidad
      : (caras * Number(p.ancho) * Number(p.largo) * micras * 925 * cantidad) / 10_000_000_000;

    return {
      ...p,
      micras,
      pesoKg: Math.round(pesoKg * 100) / 100,
      clasificacion: pesoKg >= MINIMO_KG ? "VALIDO" : "DERIVAR",
    };
  });

  const aDerivar = evaluados.filter((p) => p.clasificacion === "DERIVAR");

  return {
    productos: evaluados,
    todosValidos: aDerivar.length === 0,
    todosDerivar: aDerivar.length === evaluados.length && evaluados.length > 0,
    linkDerivacion: aDerivar.length ? linkHomsPack(aDerivar) : null,
  };
}

export function linkHomsPack(productos) {
  const detalle = productos
    .map((p) => `${p.tipo} ${p.ancho}x${p.largo} cm, ${p.micras} micrones, ${p.cantidad} ${p.unidad}`)
    .join("; ");
  return `https://wa.me/${HOMS_PACK_WA}?text=${encodeURIComponent(`Hola, vengo referido de Polimer. Quiero cotizar: ${detalle}`)}`;
}
