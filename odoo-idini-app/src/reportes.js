// Reportes y consultas sobre Odoo. Cada función devuelve JSON listo para la app.
import { group, leer, contar, odoo, txt, rel } from "./odoo.js";

const CONFIRMADAS = [["state", "in", ["sale", "done"]]];
const COTIZACIONES = [["state", "in", ["draft", "sent"]]];
const POS_CERRADAS = [["state", "in", ["paid", "done", "invoiced"]]];
const POS_ABIERTAS = [["state", "=", "draft"]];
const POR_COBRAR = [["move_type", "=", "out_invoice"], ["state", "=", "posted"], ["payment_state", "in", ["not_paid", "partial"]]];

/* ---------- Fechas (hora de Chile) ---------- */
const hoyChile = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const addDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diasEntre = (a, b) => Math.round((new Date(`${a}T12:00:00Z`) - new Date(`${b}T12:00:00Z`)) / 864e5);

const mapaDias = (rows, campo, agg) => {
  const m = {};
  for (const r of rows) m[String(r[campo][0]).slice(0, 10)] = { total: r[agg] || 0, n: r.__count || 0 };
  return m;
};
const suma = (m, desde) => Object.entries(m).reduce((a, [k, v]) => (k >= desde ? { total: a.total + v.total, n: a.n + v.n } : a), { total: 0, n: 0 });
const tot = (rows, agg = "amount_total:sum") => ({ total: rows[0]?.[agg] || 0, n: rows[0]?.__count || 0 });

/* ---------- Resumen (pestaña Hoy) ---------- */
export async function kpis(env) {
  const hoy = hoyChile();
  const d30 = addDias(hoy, -29);
  const d365 = addDias(hoy, -364);
  const [estados, meses, prodTop, clientes, vendedores, ultimos, facturas, nProd, nConStock, nClientes, posCerradas,
    vDia, cDia, pDia, fDia, payDia, categorias] = await Promise.all([
    group(env, "sale.order", [], ["state"], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [...CONFIRMADAS, ["date_order", ">=", d365]], ["date_order:month"], ["amount_total:sum", "__count"], { order: "date_order:month asc" }),
    group(env, "sale.order.line", [["order_id.state", "in", ["sale", "done"]]], ["product_id"], ["price_subtotal:sum", "product_uom_qty:sum"], { order: "price_subtotal:sum desc", limit: 8 }),
    group(env, "sale.order", CONFIRMADAS, ["partner_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc", limit: 6 }),
    group(env, "sale.order", CONFIRMADAS, ["user_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc", limit: 6 }),
    leer(env, "sale.order", [], ["name", "date_order", "amount_total", "state", "partner_id", "user_id"], { limit: 8, order: "date_order desc" }),
    group(env, "account.move", [["move_type", "=", "out_invoice"], ["state", "=", "posted"]], [], ["amount_total:sum", "amount_residual:sum", "__count"]),
    contar(env, "product.product", [["active", "=", true]]),
    contar(env, "product.product", [["qty_available", ">", 0]]),
    contar(env, "res.partner", [["customer_rank", ">", 0]]),
    group(env, "pos.order", POS_CERRADAS, [], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [...CONFIRMADAS, ["date_order", ">=", d30]], ["date_order:day"], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [...COTIZACIONES, ["date_order", ">=", d30]], ["date_order:day"], ["amount_total:sum", "__count"]),
    group(env, "pos.order", [...POS_CERRADAS, ["date_order", ">=", d30]], ["date_order:day"], ["amount_total:sum", "__count"]),
    group(env, "account.move", [["move_type", "=", "out_invoice"], ["state", "=", "posted"], ["invoice_date", ">=", d30]], ["invoice_date:day"], ["amount_total:sum", "__count"]),
    group(env, "account.payment", [["payment_type", "=", "inbound"], ["state", "in", ["in_process", "paid"]], ["date", ">=", d30]], ["date:day"], ["amount:sum", "__count"]),
    group(env, "sale.order.line", [["order_id.state", "in", ["sale", "done"]]], ["product_id.categ_id"], ["price_subtotal:sum", "product_uom_qty:sum"], { order: "price_subtotal:sum desc", limit: 7 }),
  ]);

  const est = Object.fromEntries(estados.map((e) => [e.state, { total: e["amount_total:sum"], n: e.__count }]));
  const sumaEst = (...ks) => ks.reduce((a, k) => ({ total: a.total + (est[k]?.total || 0), n: a.n + (est[k]?.n || 0) }), { total: 0, n: 0 });
  const conf = sumaEst("sale", "done");
  const cot = sumaEst("draft", "sent");
  const f = facturas[0] || {};

  const mV = mapaDias(vDia, "date_order:day", "amount_total:sum");
  const mC = mapaDias(cDia, "date_order:day", "amount_total:sum");
  const mP = mapaDias(pDia, "date_order:day", "amount_total:sum");
  const mF = mapaDias(fDia, "invoice_date:day", "amount_total:sum");
  const mPay = mapaDias(payDia, "date:day", "amount:sum");
  const periodo = (desde) => ({
    pedidos: suma(mV, desde), pos: suma(mP, desde), cotizaciones: suma(mC, desde), facturas: suma(mF, desde), pagos: suma(mPay, desde),
  });

  const dias = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDias(hoy, -i);
    dias.push({ dia: d, pedidos: mV[d]?.total || 0, pos: mP[d]?.total || 0 });
  }

  return {
    generado: new Date().toISOString(),
    hoy,
    ventas: { confirmadas: conf, cotizaciones: cot, ticket: conf.n ? conf.total / conf.n : 0 },
    facturas: { total: f["amount_total:sum"] || 0, porCobrar: f["amount_residual:sum"] || 0, n: f.__count || 0 },
    pos: tot(posCerradas),
    catalogo: { productos: nProd, conStock: nConStock, clientes: nClientes },
    periodos: { hoy: periodo(hoy), semana: periodo(addDias(hoy, -6)), mes: periodo(d30) },
    dias,
    meses: meses.map((m) => ({ desde: m["date_order:month"][0], mes: m["date_order:month"][1], total: m["amount_total:sum"], n: m.__count })),
    categorias: categorias.map((c) => ({ nombre: rel(c["product_id.categ_id"]) || "Sin categoría", total: c["price_subtotal:sum"], cant: c["product_uom_qty:sum"] })),
    topProductos: prodTop.map((p) => ({
      nombre: (p.product_id?.[1] || "—").replace(/^\[[^\]]*\]\s*/, ""),
      codigo: (p.product_id?.[1] || "").match(/^\[([^\]]*)\]/)?.[1] || "",
      total: p["price_subtotal:sum"], cant: p["product_uom_qty:sum"],
    })),
    topClientes: clientes.map((c) => ({ nombre: c.partner_id?.[1] || "—", total: c["amount_total:sum"], n: c.__count })),
    topVendedores: vendedores.map((v) => ({ nombre: v.user_id?.[1] || "Sin asignar", total: v["amount_total:sum"], n: v.__count })),
    ultimos: ultimos.map((o) => ({ id: o.id, ref: o.name, fecha: o.date_order, total: o.amount_total, estado: o.state, cliente: o.partner_id?.[1] || "—", vendedor: o.user_id?.[1] || "" })),
  };
}

/* ---------- Alertas: lo que requiere atención ---------- */
export async function alertas(env) {
  const hoy = hoyChile();
  const pendiente = (codigo) => [["picking_type_code", "=", codigo], ["state", "in", ["assigned", "confirmed", "waiting"]]];
  const [venc, porVenc, borr, cotVenc, cotVig, porFact, entregas, entregasAtr, recep, recepAtr, compras, negativos, posAbiertas, sesiones] = await Promise.all([
    group(env, "account.move", [...POR_COBRAR, ["invoice_date_due", "<", hoy]], [], ["amount_residual:sum", "__count"]),
    group(env, "account.move", [...POR_COBRAR, ["invoice_date_due", ">=", hoy]], [], ["amount_residual:sum", "__count"]),
    group(env, "account.move", [["move_type", "=", "out_invoice"], ["state", "=", "draft"], ["amount_total", ">", 0]], [], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [...COTIZACIONES, ["validity_date", "<", hoy]], [], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [...COTIZACIONES, "|", ["validity_date", ">=", hoy], ["validity_date", "=", false]], [], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [["state", "=", "sale"], ["invoice_status", "=", "to invoice"]], [], ["amount_total:sum", "__count"]),
    contar(env, "stock.picking", pendiente("outgoing")),
    contar(env, "stock.picking", [...pendiente("outgoing"), ["scheduled_date", "<", hoy]]),
    contar(env, "stock.picking", pendiente("incoming")),
    contar(env, "stock.picking", [...pendiente("incoming"), ["scheduled_date", "<", hoy]]),
    group(env, "purchase.order", [["state", "=", "purchase"], ["receipt_status", "in", ["pending", "partial"]]], [], ["amount_total:sum", "__count"]),
    contar(env, "stock.quant", [["location_id.usage", "=", "internal"], ["quantity", "<", 0]]),
    group(env, "pos.order", POS_ABIERTAS, [], ["amount_total:sum", "__count"]),
    contar(env, "pos.session", [["state", "=", "opened"]]),
  ]);
  const v = (rows, a = "amount_total:sum") => ({ total: rows[0]?.[a] || 0, n: rows[0]?.__count || 0 });
  return {
    facturasVencidas: v(venc, "amount_residual:sum"),
    facturasPorVencer: v(porVenc, "amount_residual:sum"),
    facturasBorrador: v(borr),
    cotizacionesVencidas: v(cotVenc),
    cotizacionesVigentes: v(cotVig),
    porFacturar: v(porFact),
    entregas: { n: entregas, atrasadas: entregasAtr },
    recepciones: { n: recep, atrasadas: recepAtr },
    comprasPorRecibir: v(compras),
    stockNegativo: negativos,
    posAbierto: { ...v(posAbiertas), sesiones },
  };
}

/* ---------- Cobranza ---------- */
export async function cobranza(env) {
  const hoy = hoyChile();
  const [pendientes, pagos, pagosMes, borr, porFact] = await Promise.all([
    leer(env, "account.move", POR_COBRAR, ["name", "partner_id", "invoice_date", "invoice_date_due", "amount_total", "amount_residual"], { order: "invoice_date_due asc", limit: 200 }),
    leer(env, "account.payment", [["payment_type", "=", "inbound"]], ["name", "partner_id", "amount", "date", "state"], { order: "date desc, id desc", limit: 8 }),
    group(env, "account.payment", [["payment_type", "=", "inbound"], ["state", "in", ["in_process", "paid"]]], ["date:month"], ["amount:sum", "__count"], { order: "date:month asc" }),
    leer(env, "account.move", [["move_type", "=", "out_invoice"], ["state", "=", "draft"], ["amount_total", ">", 0]], ["partner_id", "amount_total", "create_date"], { limit: 10 }),
    leer(env, "sale.order", [["state", "=", "sale"], ["invoice_status", "=", "to invoice"]], ["name", "partner_id", "amount_total", "date_order"], { order: "date_order asc", limit: 10 }),
  ]);
  const tramos = { alDia: { total: 0, n: 0 }, d30: { total: 0, n: 0 }, d60: { total: 0, n: 0 }, d90: { total: 0, n: 0 }, mas: { total: 0, n: 0 } };
  const deudores = {};
  const lista = pendientes.map((f) => {
    const dias = f.invoice_date_due ? diasEntre(hoy, f.invoice_date_due) : 0; // >0 = vencida
    const t = dias <= 0 ? "alDia" : dias <= 30 ? "d30" : dias <= 60 ? "d60" : dias <= 90 ? "d90" : "mas";
    tramos[t].total += f.amount_residual; tramos[t].n++;
    const cli = rel(f.partner_id) || "—";
    deudores[cli] = (deudores[cli] || 0) + f.amount_residual;
    return { nombre: f.name, cliente: cli, vence: f.invoice_date_due || "", diasVencida: dias, total: f.amount_total, saldo: f.amount_residual };
  });
  const porCobrar = lista.reduce((a, f) => a + f.saldo, 0);
  return {
    porCobrar: { total: porCobrar, n: lista.length },
    vencido: { total: lista.filter((f) => f.diasVencida > 0).reduce((a, f) => a + f.saldo, 0), n: lista.filter((f) => f.diasVencida > 0).length },
    tramos,
    deudores: Object.entries(deudores).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nombre, total]) => ({ nombre, total })),
    facturas: lista.slice(0, 12),
    pagos: pagos.map((p) => ({ nombre: p.name, cliente: rel(p.partner_id) || "—", monto: p.amount, fecha: p.date, estado: p.state })),
    pagosMeses: pagosMes.map((m) => ({ desde: m["date:month"][0], mes: m["date:month"][1], total: m["amount:sum"], n: m.__count })),
    borradores: borr.map((b) => ({ cliente: rel(b.partner_id) || "Sin cliente", total: b.amount_total })),
    porFacturar: porFact.map((o) => ({ ref: o.name, cliente: rel(o.partner_id) || "—", total: o.amount_total, fecha: o.date_order })),
  };
}

/* ---------- Compras ---------- */
export async function compras(env) {
  const hoy = hoyChile();
  const [estados, proveedores, recientes, meses, recepciones, nProv] = await Promise.all([
    group(env, "purchase.order", [], ["state"], ["amount_total:sum", "__count"]),
    group(env, "purchase.order", [["state", "in", ["purchase", "done"]]], ["partner_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc", limit: 6 }),
    leer(env, "purchase.order", [], ["name", "partner_id", "amount_total", "state", "date_order", "receipt_status", "user_id"], { order: "date_order desc", limit: 12 }),
    group(env, "purchase.order", [["state", "in", ["purchase", "done"]]], ["date_order:month"], ["amount_total:sum", "__count"], { order: "date_order:month asc" }),
    leer(env, "stock.picking", [["picking_type_code", "=", "incoming"], ["state", "in", ["assigned", "confirmed", "waiting"]]], ["name", "partner_id", "scheduled_date", "origin"], { order: "scheduled_date asc", limit: 10 }),
    group(env, "product.supplierinfo", [], ["partner_id"], ["__count"]),
  ]);
  const est = Object.fromEntries(estados.map((e) => [e.state, { total: e["amount_total:sum"], n: e.__count }]));
  const conf = { total: (est.purchase?.total || 0) + (est.done?.total || 0), n: (est.purchase?.n || 0) + (est.done?.n || 0) };
  const pendiente = recientes.filter((o) => o.state === "purchase" && ["pending", "partial"].includes(o.receipt_status));
  return {
    comprado: conf,
    borradores: { total: (est.draft?.total || 0) + (est.sent?.total || 0), n: (est.draft?.n || 0) + (est.sent?.n || 0) },
    anuladas: est.cancel?.n || 0,
    porRecibir: { total: pendiente.reduce((a, o) => a + o.amount_total, 0), n: pendiente.length },
    ticket: conf.n ? conf.total / conf.n : 0,
    proveedoresConPrecios: nProv.length,
    proveedores: proveedores.map((p) => ({ nombre: rel(p.partner_id) || "—", total: p["amount_total:sum"], n: p.__count })),
    meses: meses.map((m) => ({ desde: m["date_order:month"][0], mes: m["date_order:month"][1], total: m["amount_total:sum"], n: m.__count })),
    ordenes: recientes.map((o) => ({ ref: o.name, proveedor: rel(o.partner_id) || "—", total: o.amount_total, estado: o.state, fecha: o.date_order, recepcion: txt(o.receipt_status), comprador: rel(o.user_id) })),
    recepciones: recepciones.map((r) => ({ nombre: r.name, proveedor: rel(r.partner_id) || "—", fecha: r.scheduled_date, origen: txt(r.origin), diasAtraso: Math.max(0, diasEntre(hoy, String(r.scheduled_date).slice(0, 10))) })),
  };
}

/* ---------- Inventario ---------- */
export async function inventario(env) {
  const hoy = hoyChile();
  const pendiente = (codigo) => [["picking_type_code", "=", codigo], ["state", "in", ["assigned", "confirmed", "waiting"]]];
  const [almacenes, ubicaciones, negativos, entregas, recepciones, nCon, reservado] = await Promise.all([
    leer(env, "stock.warehouse", [], ["name", "code"]),
    group(env, "stock.quant", [["location_id.usage", "=", "internal"]], ["location_id"], ["quantity:sum", "__count"], { order: "quantity:sum desc" }),
    leer(env, "stock.quant", [["location_id.usage", "=", "internal"], ["quantity", "<", 0]], ["product_id", "quantity", "location_id"], { order: "quantity asc", limit: 15 }),
    leer(env, "stock.picking", pendiente("outgoing"), ["name", "partner_id", "scheduled_date", "origin", "state"], { order: "scheduled_date asc", limit: 12 }),
    leer(env, "stock.picking", pendiente("incoming"), ["name", "partner_id", "scheduled_date", "origin", "state"], { order: "scheduled_date asc", limit: 12 }),
    contar(env, "stock.quant", [["location_id.usage", "=", "internal"], ["quantity", ">", 0]]),
    group(env, "stock.quant", [["location_id.usage", "=", "internal"]], [], ["reserved_quantity:sum"]),
  ]);
  const nombreAlmacen = Object.fromEntries(almacenes.map((a) => [a.code, /^fierrosidini$/i.test(a.name) ? "Fierros Idini (casa matriz)" : a.name]));
  const picking = (p) => ({
    nombre: p.name, contraparte: rel(p.partner_id) || "—", fecha: p.scheduled_date, origen: txt(p.origin),
    diasAtraso: Math.max(0, diasEntre(hoy, String(p.scheduled_date).slice(0, 10))), estado: p.state,
  });
  const ent = entregas.map(picking), rec = recepciones.map(picking);
  return {
    almacenes: almacenes.length,
    ubicaciones: ubicaciones.map((u) => {
      const nombre = rel(u.location_id) || "—";
      const codigo = nombre.split("/")[0];
      return { nombre, almacen: nombreAlmacen[codigo] || codigo, unidades: u["quantity:sum"], lineas: u.__count };
    }),
    conStock: nCon,
    reservado: reservado[0]?.["reserved_quantity:sum"] || 0,
    entregas: { n: ent.length, atrasadas: ent.filter((e) => e.diasAtraso > 0).length, lista: ent },
    recepciones: { n: rec.length, atrasadas: rec.filter((e) => e.diasAtraso > 0).length, lista: rec },
    negativos: negativos.map((q) => ({
      producto: (rel(q.product_id) || "—").replace(/^\[[^\]]*\]\s*/, ""),
      codigo: (rel(q.product_id).match(/^\[([^\]]*)\]/) || [])[1] || "",
      cantidad: q.quantity, ubicacion: rel(q.location_id),
    })),
  };
}

/* ---------- Punto de venta ---------- */
export async function pos(env) {
  const hoy = hoyChile();
  const d14 = addDias(hoy, -13);
  const noAnuladas = [["state", "!=", "cancel"]];
  const [estados, metodos, sucursales, cajeros, sesiones, productos, porDia] = await Promise.all([
    group(env, "pos.order", [], ["state"], ["amount_total:sum", "__count"]),
    group(env, "pos.payment", [["pos_order_id.state", "in", ["paid", "done", "invoiced"]]], ["payment_method_id"], ["amount:sum", "__count"], { order: "amount:sum desc" }),
    group(env, "pos.order", POS_CERRADAS, ["config_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc" }),
    group(env, "pos.order", POS_CERRADAS, ["user_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc", limit: 6 }),
    leer(env, "pos.session", [], ["name", "state", "start_at", "config_id"], { order: "id desc", limit: 6 }),
    group(env, "pos.order.line", [["order_id.state", "in", ["paid", "done", "invoiced"]]], ["product_id"], ["price_subtotal_incl:sum", "qty:sum"], { order: "price_subtotal_incl:sum desc", limit: 6 }),
    group(env, "pos.order", [...POS_CERRADAS, ["date_order", ">=", d14]], ["date_order:day"], ["amount_total:sum", "__count"], { order: "date_order:day asc" }),
  ]);
  const est = Object.fromEntries(estados.map((e) => [e.state, { total: e["amount_total:sum"], n: e.__count }]));
  const cerradas = ["paid", "done", "invoiced"].reduce((a, k) => ({ total: a.total + (est[k]?.total || 0), n: a.n + (est[k]?.n || 0) }), { total: 0, n: 0 });
  const mDia = mapaDias(porDia, "date_order:day", "amount_total:sum");
  const dias = [];
  for (let i = 13; i >= 0; i--) { const d = addDias(hoy, -i); dias.push({ dia: d, total: mDia[d]?.total || 0, n: mDia[d]?.n || 0 }); }
  return {
    cerradas,
    ticket: cerradas.n ? cerradas.total / cerradas.n : 0,
    abiertas: est.draft || { total: 0, n: 0 },
    anuladas: est.cancel?.n || 0,
    metodos: metodos.map((m) => ({ nombre: rel(m.payment_method_id) || "—", total: m["amount:sum"], n: m.__count })),
    sucursales: sucursales.map((s) => ({ nombre: rel(s.config_id) || "—", total: s["amount_total:sum"], n: s.__count })),
    cajeros: cajeros.map((c) => ({ nombre: rel(c.user_id) || "—", total: c["amount_total:sum"], n: c.__count })),
    sesiones: sesiones.map((s) => ({ nombre: s.name, estado: s.state, inicio: s.start_at, sucursal: rel(s.config_id) })),
    productos: productos.map((p) => ({ nombre: (rel(p.product_id) || "—").replace(/^\[[^\]]*\]\s*/, ""), total: p["price_subtotal_incl:sum"], cant: p["qty:sum"] })),
    dias,
  };
}

/* ---------- Equipo de ventas ---------- */
export async function equipo(env) {
  const [conf, cot, cajas] = await Promise.all([
    group(env, "sale.order", CONFIRMADAS, ["user_id"], ["amount_total:sum", "__count"]),
    group(env, "sale.order", COTIZACIONES, ["user_id"], ["amount_total:sum", "__count"]),
    group(env, "pos.order", POS_CERRADAS, ["user_id"], ["amount_total:sum", "__count"]),
  ]);
  const gente = {};
  const toma = (rows, campo, agg) => rows.forEach((r) => {
    const nombre = rel(r.user_id) || "Sin asignar";
    (gente[nombre] ||= { nombre, pedidos: { total: 0, n: 0 }, cotizaciones: { total: 0, n: 0 }, caja: { total: 0, n: 0 } })[campo] = { total: r[agg] || 0, n: r.__count || 0 };
  });
  toma(conf, "pedidos", "amount_total:sum");
  toma(cot, "cotizaciones", "amount_total:sum");
  toma(cajas, "caja", "amount_total:sum");
  const personas = Object.values(gente).map((p) => ({
    ...p, vendido: p.pedidos.total + p.caja.total, operaciones: p.pedidos.n + p.caja.n,
    cierre: p.pedidos.n + p.cotizaciones.n ? p.pedidos.n / (p.pedidos.n + p.cotizaciones.n) : null,
  })).sort((a, b) => b.vendido - a.vendido);
  return { personas, totalVendido: personas.reduce((a, p) => a + p.vendido, 0) };
}

/* ---------- Proyecto de implementación ---------- */
export async function proyecto(env) {
  const hoy = hoyChile();
  const abiertas = [["state", "not in", ["1_done", "1_canceled"]]];
  const [etapas, estados, atrasadas, proximas, proyectos] = await Promise.all([
    group(env, "project.task", [], ["stage_id"], ["__count"], { order: "stage_id asc" }),
    group(env, "project.task", [], ["state"], ["__count"]),
    contar(env, "project.task", [...abiertas, ["date_deadline", "<", hoy]]),
    leer(env, "project.task", abiertas, ["name", "stage_id", "date_deadline", "state"], { order: "date_deadline asc", limit: 12 }),
    leer(env, "project.project", [], ["name", "task_count"]),
  ]);
  const ESTADO = { "01_in_progress": "En curso", "04_waiting_normal": "En espera", "1_done": "Listas", "1_canceled": "Canceladas", "02_changes_requested": "Con cambios", "03_approved": "Aprobadas" };
  const total = estados.reduce((a, e) => a + e.__count, 0);
  const listas = estados.filter((e) => e.state === "1_done").reduce((a, e) => a + e.__count, 0);
  return {
    proyecto: proyectos[0]?.name || "Implementación",
    total, listas, atrasadas,
    avance: total ? listas / total : 0,
    etapas: etapas.map((e) => ({ nombre: rel(e.stage_id) || "Sin etapa", n: e.__count })),
    estados: estados.map((e) => ({ nombre: ESTADO[e.state] || e.state, n: e.__count })),
    proximas: proximas.map((t) => ({ nombre: t.name, etapa: rel(t.stage_id), vence: t.date_deadline ? String(t.date_deadline).slice(0, 10) : "", dias: t.date_deadline ? diasEntre(hoy, String(t.date_deadline).slice(0, 10)) : 0 })),
  };
}

/* ---------- Calidad del catálogo ---------- */
export async function catalogo(env) {
  const act = [["active", "=", true]];
  const [total, conCosto, conPrecio, conStock, categorias, nCategorias, listas, proveedores, topCat] = await Promise.all([
    contar(env, "product.product", act),
    contar(env, "product.product", [...act, ["standard_price", ">", 0]]),
    contar(env, "product.product", [...act, ["list_price", ">", 0]]),
    contar(env, "product.product", [...act, ["qty_available", ">", 0]]),
    contar(env, "product.category", []),
    contar(env, "product.category", []),
    leer(env, "product.pricelist", [], ["name"]),
    group(env, "product.supplierinfo", [], ["partner_id"], ["__count"], { order: "__count desc", limit: 5 }),
    group(env, "product.product", act, ["categ_id"], ["__count"], { order: "__count desc", limit: 8 }),
  ]);
  return {
    total, conCosto, conPrecio, conStock,
    sinCosto: total - conCosto, sinPrecio: total - conPrecio,
    categorias: nCategorias,
    listasPrecio: listas.map((l) => l.name),
    proveedores: proveedores.map((p) => ({ nombre: rel(p.partner_id) || "—", n: p.__count })),
    topCategorias: topCat.map((c) => ({ nombre: rel(c.categ_id) || "Sin categoría", n: c.__count })),
  };
}

/* ---------- Detalles ---------- */
export async function pedido(env, id) {
  const [[o], lineas, entregas, facturas] = await Promise.all([
    leer(env, "sale.order", [["id", "=", id]], ["name", "date_order", "validity_date", "state", "partner_id", "user_id", "amount_untaxed", "amount_tax", "amount_total", "invoice_status", "note"]),
    leer(env, "sale.order.line", [["order_id", "=", id], ["display_type", "=", false]], ["product_id", "name", "product_uom_qty", "qty_delivered", "qty_invoiced", "price_unit", "discount", "price_subtotal"], { order: "sequence asc, id asc" }),
    leer(env, "stock.picking", [["sale_id", "=", id]], ["name", "state", "scheduled_date"]),
    leer(env, "account.move", [["line_ids.sale_line_ids.order_id", "=", id], ["move_type", "=", "out_invoice"]], ["name", "state", "payment_state", "amount_total", "amount_residual"]),
  ]);
  if (!o) throw new Error("Pedido no encontrado");
  return {
    id, ref: o.name, fecha: o.date_order, vigencia: txt(o.validity_date), estado: o.state, cliente: rel(o.partner_id) || "—", clienteId: o.partner_id?.[0] || null, vendedor: rel(o.user_id),
    neto: o.amount_untaxed, iva: o.amount_tax, total: o.amount_total, facturacion: o.invoice_status, nota: txt(o.note),
    lineas: lineas.map((l) => ({
      producto: (rel(l.product_id) || l.name || "—").replace(/^\[[^\]]*\]\s*/, ""), codigo: (rel(l.product_id).match(/^\[([^\]]*)\]/) || [])[1] || "",
      cantidad: l.product_uom_qty, entregado: l.qty_delivered, facturado: l.qty_invoiced, precio: l.price_unit, descuento: l.discount, subtotal: l.price_subtotal,
    })),
    entregas: entregas.map((e) => ({ nombre: e.name, estado: e.state, fecha: e.scheduled_date })),
    facturas: facturas.map((f) => ({ nombre: txt(f.name) || "Borrador", estado: f.state, pago: f.payment_state, total: f.amount_total, saldo: f.amount_residual })),
  };
}

export async function producto(env, id) {
  const [[p], quants, proveedores, ventas, posv] = await Promise.all([
    leer(env, "product.product", [["id", "=", id]], ["name", "default_code", "barcode", "list_price", "standard_price", "qty_available", "virtual_available", "incoming_qty", "outgoing_qty", "categ_id", "uom_id", "active"], { context: { active_test: false } }),
    group(env, "stock.quant", [["product_id", "=", id], ["location_id.usage", "=", "internal"]], ["location_id"], ["quantity:sum", "reserved_quantity:sum"]),
    leer(env, "product.supplierinfo", [["product_id", "=", id]], ["partner_id", "price", "min_qty"]).then(async (r) => (r.length ? r : leer(env, "product.supplierinfo", [["product_tmpl_id.product_variant_ids", "in", [id]]], ["partner_id", "price", "min_qty"]))),
    group(env, "sale.order.line", [["product_id", "=", id], ["order_id.state", "in", ["sale", "done"]]], [], ["product_uom_qty:sum", "price_subtotal:sum", "__count"]),
    group(env, "pos.order.line", [["product_id", "=", id], ["order_id.state", "in", ["paid", "done", "invoiced"]]], [], ["qty:sum", "price_subtotal_incl:sum", "__count"]),
  ]);
  if (!p) throw new Error("Producto no encontrado");
  const margen = p.standard_price > 0 && p.list_price > 0 ? (p.list_price - p.standard_price) / p.list_price : null;
  return {
    id, archivado: !p.active, nombre: p.name, codigo: txt(p.default_code), barras: txt(p.barcode), categoria: rel(p.categ_id), unidad: rel(p.uom_id),
    precio: p.list_price, costo: p.standard_price, margen,
    stock: p.qty_available, previsto: p.virtual_available, entrante: p.incoming_qty, saliente: p.outgoing_qty,
    ubicaciones: quants.map((q) => ({ nombre: rel(q.location_id), unidades: q["quantity:sum"], reservado: q["reserved_quantity:sum"] })),
    proveedores: proveedores.map((s) => ({ nombre: rel(s.partner_id) || "—", precio: s.price, minimo: s.min_qty })),
    vendido: { cant: (ventas[0]?.["product_uom_qty:sum"] || 0), total: ventas[0]?.["price_subtotal:sum"] || 0, n: ventas[0]?.__count || 0 },
    vendidoCaja: { cant: (posv[0]?.["qty:sum"] || 0), total: posv[0]?.["price_subtotal_incl:sum"] || 0, n: posv[0]?.__count || 0 },
  };
}

export async function cliente(env, id) {
  const [[c], conf, cot, deuda, ultima, pagado] = await Promise.all([
    leer(env, "res.partner", [["id", "=", id]], ["name", "vat", "city", "street", "phone", "email", "website", "comment", "create_date"], { context: { active_test: false } }),
    group(env, "sale.order", [...CONFIRMADAS, ["partner_id", "=", id]], [], ["amount_total:sum", "__count"]),
    group(env, "sale.order", [...COTIZACIONES, ["partner_id", "=", id]], [], ["amount_total:sum", "__count"]),
    group(env, "account.move", [...POR_COBRAR, ["partner_id", "=", id]], [], ["amount_residual:sum", "__count"]),
    leer(env, "sale.order", [...CONFIRMADAS, ["partner_id", "=", id]], ["date_order"], { order: "date_order desc", limit: 1 }),
    group(env, "account.payment", [["payment_type", "=", "inbound"], ["partner_id", "=", id], ["state", "in", ["in_process", "paid"]]], [], ["amount:sum", "__count"]),
  ]);
  if (!c) throw new Error("Cliente no encontrado");
  return {
    id, nombre: c.name, rut: txt(c.vat), ciudad: txt(c.city), direccion: txt(c.street), telefono: txt(c.phone), email: txt(c.email), web: txt(c.website),
    desde: txt(c.create_date),
    compras: { total: conf[0]?.["amount_total:sum"] || 0, n: conf[0]?.__count || 0 },
    cotizaciones: { total: cot[0]?.["amount_total:sum"] || 0, n: cot[0]?.__count || 0 },
    porCobrar: { total: deuda[0]?.["amount_residual:sum"] || 0, n: deuda[0]?.__count || 0 },
    pagos: { total: pagado[0]?.["amount:sum"] || 0, n: pagado[0]?.__count || 0 },
    ultimaCompra: ultima[0]?.date_order || "",
  };
}

/* ---------- Listados (ya existentes) ---------- */
export async function productos(env, url) {
  const q = (url.searchParams.get("q") || "").trim();
  const categ = url.searchParams.get("categ");
  const modo = url.searchParams.get("modo") || (url.searchParams.get("stock") === "1" ? "stock" : "");
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const domain = [["active", "=", true]];
  if (q) domain.push("|", ["name", "ilike", q], ["default_code", "ilike", q]);
  if (categ) domain.push(["categ_id", "=", parseInt(categ, 10)]);
  if (modo === "stock") domain.push(["qty_available", ">", 0]);
  if (modo === "negativo") domain.push(["qty_available", "<", 0]);
  if (modo === "sincosto") domain.push(["standard_price", "<=", 0]);
  const [items, total] = await Promise.all([
    leer(env, "product.product", domain, ["name", "default_code", "list_price", "standard_price", "qty_available", "categ_id"], { limit: 30, offset, order: "name asc, id asc" }),
    contar(env, "product.product", domain),
  ]);
  return {
    total,
    items: items.map((p) => ({ id: p.id, nombre: p.name, codigo: txt(p.default_code), precio: p.list_price, costo: p.standard_price, stock: p.qty_available, categoria: rel(p.categ_id) })),
  };
}

export async function categorias(env) {
  const g = await group(env, "product.product", [["active", "=", true]], ["categ_id"], ["__count"], { order: "__count desc", limit: 40 });
  return g.map((c) => ({ id: c.categ_id?.[0], nombre: rel(c.categ_id) || "Sin categoría", n: c.__count }));
}

export async function ventas(env, url) {
  const estado = url.searchParams.get("estado");
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const hoy = hoyChile();
  const domain = [];
  const cliente = parseInt(url.searchParams.get("cliente") || "", 10);
  if (cliente) domain.push(["partner_id", "=", cliente]);
  if (estado === "confirmadas") domain.push(...CONFIRMADAS);
  else if (estado === "cotizaciones") domain.push(...COTIZACIONES);
  else if (estado === "vencidas") domain.push(...COTIZACIONES, ["validity_date", "<", hoy]);
  else if (estado === "porfacturar") domain.push(["state", "=", "sale"], ["invoice_status", "=", "to invoice"]);
  const [items, total] = await Promise.all([
    leer(env, "sale.order", domain, ["name", "date_order", "amount_total", "state", "partner_id", "user_id", "validity_date", "invoice_status"], { limit: 25, offset, order: "date_order desc" }),
    contar(env, "sale.order", domain),
  ]);
  return {
    total,
    items: items.map((o) => ({
      id: o.id, ref: o.name, fecha: o.date_order, total: o.amount_total, estado: o.state, cliente: rel(o.partner_id) || "—", vendedor: rel(o.user_id),
      vencida: ["draft", "sent"].includes(o.state) && !!o.validity_date && o.validity_date < hoy, porFacturar: o.invoice_status === "to invoice",
    })),
  };
}

export async function clientes(env, url) {
  const q = (url.searchParams.get("q") || "").trim();
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const soloCompradores = url.searchParams.get("modo") !== "todos";
  const domain = [["customer_rank", ">", 0], ["is_company", "=", true]];
  if (soloCompradores) domain.push(["sale_order_ids", "!=", false]);
  if (q) domain.push("|", "|", ["name", "ilike", q], ["vat", "ilike", q], ["email", "ilike", q]);
  const [items, total] = await Promise.all([
    leer(env, "res.partner", domain, ["name", "vat", "city", "phone", "email", "street"], { limit: 30, offset, order: "name asc, id asc" }),
    contar(env, "res.partner", domain),
  ]);
  return {
    total,
    items: items.map((c) => ({ id: c.id, nombre: c.name, rut: txt(c.vat), ciudad: txt(c.city), telefono: txt(c.phone), email: txt(c.email), direccion: txt(c.street) })),
  };
}
