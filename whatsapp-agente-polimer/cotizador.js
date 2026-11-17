// Reglas de negocio de Polimer: peso por producto y si alcanza el mínimo de producción.
// Vive aparte del Worker para poder verificarlo sin desplegar.

export const MINIMO_KG = 300;

const MICRAJE_ESTANDAR = {
  hielo: 70,
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

    const caras = UNA_SOLA_CARA.test(p.tipo || "") ? 1 : 2;
    const pesoCrudo = enKilos
      ? cantidad
      : (caras * Number(p.ancho) * Number(p.largo) * micras * 925 * cantidad) / 10_000_000_000;
    // Clasificar sobre el número YA redondeado — si no, un peso real de 299.9989 se
    // muestra como "300 kg" pero se marca como que no cumple, contradiciendo lo que ve.
    const pesoKg = Math.round(pesoCrudo * 100) / 100;

    const cumple = pesoKg >= MINIMO_KG;
    const resultado = { ...p, micras, pesoKg, clasificacion: cumple ? "VALIDO" : "NO_CUMPLE" };

    if (!cumple) {
      // Qué habría que pedir para llegar al mínimo, para decírselo al cliente: en kilos si
      // el pedido venía en kilos, en unidades de esa misma medida si venía en unidades.
      if (enKilos) {
        resultado.minimoKg = MINIMO_KG;
      } else {
        resultado.minimoUnidades = unidadesParaPeso({
          tipo: p.tipo, ancho: p.ancho, largo: p.largo, micraje: p.micraje, pesoKg: MINIMO_KG,
        }).unidadesAprox;
      }
    }
    return resultado;
  });

  const noCumplen = evaluados.filter((p) => p.clasificacion === "NO_CUMPLE");

  return {
    productos: evaluados,
    todosValidos: noCumplen.length === 0,
    todosNoCumplen: noCumplen.length === evaluados.length && evaluados.length > 0,
  };
}

// Inverso de clasificarPedido: dado un peso objetivo, cuántas unidades hacen falta.
// Existe para que el modelo nunca tenga que despejar la fórmula mentalmente cuando el
// cliente pregunta "¿cuántas bolsas son 300 kg?" — ese despeje a mano es exactamente
// el tipo de cuenta grande donde un LLM se equivoca (pasó en producción: calculó
// 242.000 bolsas para 300 kg en 21x35/40 micras, cuando la cifra real es ~55.200).
// Redondea hacia arriba: si se usa para decirle al cliente cuál es el mínimo, la cifra
// tiene que alcanzar los kg pedidos, nunca quedar apenas por debajo.
export function unidadesParaPeso({ tipo, ancho, largo, micraje, pesoKg }) {
  const micras = micrajeDe(tipo, micraje);
  const caras = UNA_SOLA_CARA.test(tipo || "") ? 1 : 2;
  const divisor = caras * Number(ancho) * Number(largo) * micras * 925;
  const unidadesAprox = divisor > 0 ? Math.ceil((Number(pesoKg) * 10_000_000_000) / divisor - 1e-9) : null;
  return { unidadesAprox, micras };
}

// Rollos se cotizan por peso, no por unidades cortadas: el cliente suele dar el peso
// de cada rollo y cuántos rollos quiere ("rollos de 2,5 kilos, dame 100"). Esa
// multiplicación va en código por la misma razón que unidadesParaPeso — nunca dejar
// que el modelo haga la cuenta de cabeza.
export function pesoTotalRollos({ pesoPorRolloKg, cantidadRollos }) {
  const total = Number(pesoPorRolloKg) * Number(cantidadRollos);
  return { pesoTotalKg: Math.round(total * 100) / 100 };
}
