// Genera sii-data.js (foto de los datos del SII) desde ~/Documents/SII/<RUT>/ (RCV, F29 y libro de egresos del MCP sii-mcp).
// Uso: node scripts/build-sii-data.js
const fs = require('fs'), path = require('path'), os = require('os');
const RUT = '78351323-4';
const dir = path.join(os.homedir(), 'Documents', 'SII', RUT);
const cache = path.join(dir, 'cache');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(cache, f), 'utf8')).v;
const files = fs.readdirSync(cache);
const meses = {};
for (const f of files.filter((x) => /^res-(VENTA|COMPRA)-REGISTRO-/.test(x))) {
  const [, op, per] = f.match(/res-(VENTA|COMPRA)-REGISTRO-(\d{4}-\d{2})/);
  const m = (meses[per] ||= { periodo: per, ventaNeto: 0, ventaIva: 0, compraNeto: 0, compraIva: 0, compraExento: 0 });
  for (const r of rd(f).filas || []) {
    const sg = r.rsmnTipoDocInteger === 61 ? -1 : 1;
    if (op === 'VENTA') { m.ventaNeto += sg * r.rsmnMntNeto; m.ventaIva += sg * r.rsmnMntIVA; }
    else { m.compraNeto += sg * r.rsmnMntNeto; m.compraIva += sg * r.rsmnMntIVA; m.compraExento += sg * r.rsmnMntExe; }
  }
}
const clientes = {}, proveedores = {};
for (const f of files.filter((x) => /^det-(VENTA|COMPRA)-REGISTRO-/.test(x))) {
  const op = f.includes('VENTA') ? 'VENTA' : 'COMPRA';
  for (const d of rd(f).documentos || []) {
    const sg = d.detTipoDoc === 61 ? -1 : 1;
    const tgt = op === 'VENTA' ? clientes : proveedores;
    const k = d.detRznSoc;
    (tgt[k] ||= { nombre: k, neto: 0, docs: 0 });
    tgt[k].neto += sg * (d.detMntNeto + (d.detMntExe || 0)); tgt[k].docs += 1;
  }
}
const f29 = rd('f29-2026.json');
const pend = files.filter((x) => x.startsWith('res-COMPRA-PENDIENTE')).map((f) => ({ f, filas: (rd(f).filas || []).length }));
const csv = fs.readFileSync(path.join(dir, 'libro-egresos.csv'), 'utf8').replace(/^﻿/, '').trim().split('\n');
const hdr = csv[0].split(';');
const egresos = csv.slice(1).map((l) => Object.fromEntries(l.split(';').map((v, i) => [hdr[i], v])))
  .map((e) => ({ fecha: e.fecha_pago, proveedor: e.proveedor, concepto: e.concepto, doc: e.documento, moneda: e.moneda, usd: Number(String(e.monto_original).replace(',', '.')), clp: Number(e.monto_clp), f22: e.codigo_f22, facturaCompra: !!e.factura_compra }));
const out = {
  generado: new Date().toISOString().slice(0, 10), rut: '78.351.323-4', razon: 'JPB Marketing SpA', regimen: 'Pro Pyme Transparente (art. 14 D N°8)',
  meses: Object.values(meses).sort((a, b) => a.periodo.localeCompare(b.periodo)),
  clientes: Object.values(clientes).sort((a, b) => b.neto - a.neto),
  proveedores: Object.values(proveedores).sort((a, b) => b.neto - a.neto),
  f29, comprasPendientes: pend, egresos,
};
fs.writeFileSync(path.join(__dirname, '..', 'sii-data.js'), '/* generado por scripts/build-sii-data.js */\nwindow.SII_DATA = ' + JSON.stringify(out) + ';\n');
console.log(out.meses.map((m) => m.periodo + ' V' + m.ventaNeto + ' C' + m.compraNeto).join('\n'), '\nclientes', out.clientes.map((c) => c.nombre + ':' + c.neto).join(' | '), '\negresos', egresos.length, 'pend', JSON.stringify(pend), 'f29', f29.length);
