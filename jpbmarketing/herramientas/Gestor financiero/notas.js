'use strict';

// ── Notas ────────────────────────────────────────────
// Sección de notas libres (estudios, ideas, apuntes de clientes).
// Usa los helpers globales de app.js: load, save, uid, escHtml, openModal, closeModal, appConfirm.
// Formato del contenido (Markdown simple): "## Título", "### Subtítulo", "- viñeta", "1. lista",
// **negrita**, `código`, [texto](https://link) y links sueltos.

const NOTES_KEY           = 'gestipyme_notes';
const NOTES_DISMISSED_KEY = 'gestipyme_notes_dismissed'; // notas precargadas que el usuario borró (se sincroniza)

let notesQuery = '';

function getNotes()       { return load(NOTES_KEY); }
function saveNotes(data)  { save(NOTES_KEY, data); }

// ── Notas precargadas ────────────────────────────────

const SEED_NOTES = [
  {
    id: 'seed-plastiservi-ventas-2026-11-15',
    title: 'Plastiservi — Estudios e ideas para vender más (plastiservi.cl)',
    tags: ['plastiservi', 'ventas', 'estudio', 'ideas'],
    createdAt: '2026-11-15T12:00:00.000Z',
    content: `Contexto: el sitio ya tiene 5 tandas de mejoras (CTAs, fichas de tubos, bolsas, SEO on-page, marca), plan de Google Ads/SEO (PLAN_GOOGLE_ADS_SEO.md) y estudio de cierre de cotizaciones (conflex/reports/Cierre de cotizaciones B2B.md). Esto es lo que NO estaba cubierto.

## Lo primero: hoy no se mide nada
En js/main.js sigue \`gaId: ''\`. El sitio ya emite eventos (WhatsApp, llamada, formulario), pero sin GA4 no se registra ninguno. Sin datos no hay estudio de ventas posible.

## 4 estudios para hacer

### 1. Demanda pública (Mercado Público)
Consulta a la API pública el 15-nov-2026: de 5.276 licitaciones activas, calzan directo con Plastiservi:
- 5052-37-LP26 — Bolsas y mangas de polietileno
- 3265-62-LE26 — Tuberías HDPE y geomembranas
- 4118-10-LP26 — Material granular y tubos HDPE
- 702988-38-LE26 — Tubería circular corrugada
- 4608-2-LE26 — Herramientas e insumos de alcantarillado
- Además ~30 obras de agua potable, APR y alcantarillado: la constructora que gane cada una es cliente potencial (con nombre y RUT).

Con las órdenes de compra de 12 meses se puede calcular cuánto compra el Estado, a quién y a qué precio.
Repo de referencia (mismo stack, Worker + cron diario): https://github.com/lalrop/API_MercadoPublico_CloudFare

### 2. Por qué no se cierran las cotizaciones
El bot guarda historialCompleto de cada conversación. Pasarlas por IA y clasificar motivos: precio, mínimo 300 kg, despacho, stock, no respondió. Investigación con datos propios y gratis.

### 3. Demanda de búsqueda en Google
Con las skills SEO (DataForSEO): volumen y CPC por medida ("tubo pvc 110", "manga polietileno") para decidir qué páginas crear.

### 4. Cliente incógnito con la competencia
Pedir cotización a Vinilit, Tigre y 2–3 fabricantes de bolsas. Medir tiempo de respuesta, cómo responden y qué piden. Así se sabe si "te cotizamos en 15 minutos" es ventaja real.

## Ideas para vender más

### Canales nuevos
1. **Alerta diaria de licitaciones** (estudio 1): postular directo en bolsas/HDPE y prospectar constructoras que ganen obras sanitarias. Requisito: Plastiservi inscrito en ChileProveedores.
2. **Programa distribuidores / ferreterías**: página "Sé distribuidor" con precio por volumen, pedido mínimo y material POP. Calza con la campaña de prospección a ferreterías.
3. **Google Shopping (Merchant Center)**: ya está en el plan (fase 6.1). Es lo que domina la búsqueda "tubo pvc".

### Herramientas gratis en la web
Idea de la skill free-tools de https://github.com/coreyhaines31/marketingskills
4. **Calculadora de bolsas unidades ↔ kg**: el cliente piensa en unidades y el mínimo es en kg. La lógica ya existe en cotizador-bolsas.js del bot → llevarla a la web y terminar en "cotizar".
5. **Calculadora de materiales para tubos**: metros de red + diámetro + tipo → lista de tubos y fittings para cotizar.

### SEO programático
6. **Una página por medida** ("Tubo PVC hidráulico 110 mm PN-10") generada desde products.js. Hoy producto.html está en noindex y esas búsquedas se pierden.

### Oferta y precio
7. **Precio "desde $X + IVA"** en fichas. En productos estándar, mostrar precio sube la conversión (lo decide el cliente).
8. **Precios por volumen visibles** + promesa concreta ("listo para retiro en planta en X horas"), solo si la cumplen.

### Recompra
9. **"¿Repetimos tu último pedido?"** por WhatsApp según la frecuencia de compra de cada cliente de bolsas.
10. **Pedir reseña en Google** tras cada venta (cuando exista el Google Business Profile, pendiente).

### Confianza y control
11. **Casos de obras y logos de clientes** en tubos (con autorización).
12. **Informe semanal del embudo**: visitas → contactos → cotizaciones → ventas (formularios + bot + Panel JPB).

## Por dónde partir
1. GA4 (falta el ID).
2. Alerta de Mercado Público: barata, rápida y ya muestra oportunidades reales.
3. Calculadora de bolsas: la lógica ya está hecha.

## Repos de GitHub revisados
- https://github.com/coreyhaines31/marketingskills — skills: free-tools, lead-magnets, offers, pricing, programmatic-seo, referrals, cro
- https://github.com/lalrop/API_MercadoPublico_CloudFare — Worker con alerta diaria de licitaciones
- https://github.com/saraivaruas/mercado-publico-api — cliente de la API (licitaciones y órdenes de compra)
- https://github.com/santifer/santifer-irepair — ejemplo de SEO programático (15.500 páginas desde un ERP)`,
  },
  {
    id: 'seed-idea-plataforma-pago-deudas-2026-11-16',
    title: 'Idea de negocio — Plataforma de pago de deudas (Chile → internacional)',
    tags: ['idea', 'negocio', 'donaciones', 'fintech', 'deudas'],
    createdAt: '2026-11-16T12:00:00.000Z',
    content: `Una plataforma web gratuita donde personas endeudadas en Chile cuentan su historia (idealmente en video) y suben los documentos de su deuda. Donantes (multimillonarios, empresas o personas comunes) revisan los casos y pagan toda la deuda o una parte. Cada pago queda publicado, por ejemplo: "A esta familia se le pagó el 50% de su deuda".

La idea viene de un reel viral que atribuía a Elon Musk una app de este tipo. Eso es falso: Musk no está construyendo esa app. Pero el concepto se viralizó y ya hay plataformas pequeñas probando algo parecido.

## Objetivos
- Ayudar a la gente a reducir sus deudas.
- Ganar plata. Ambas cosas son válidas: es un modelo de empresa social.
- Ser transparente, incluso poniendo mi foto en la plataforma.
- Llegar a nivel internacional: donantes de EE.UU., Argentina, Colombia, etc.
- Atraer multimillonarios: una sola donación grande podría financiar todo el proyecto.

## Cómo funcionaría (flujo)
1. La persona se inscribe de forma voluntaria y con consentimiento explícito. Sube su video, su historia y el Informe de Deudas de la CMF.
2. La plataforma verifica el informe con el código QR y la validación de la CMF, y aprueba el perfil.
3. Los donantes revisan los casos y eligen uno.
4. El donante paga directo al acreedor (banco o tarjeta) con el RUT del deudor y sube el comprobante. Puede pagar solo una parte.
5. El caso muestra una barra de progreso ("lleva 50% pagado") y luego queda marcado como "Deuda pagada ✓". Sirve como contenido para redes.
6. Propina opcional para la plataforma.

## Verificación de deudas
- El documento clave es el **Informe de Deudas de la CMF**: es gratis, se obtiene con ClaveÚnica, trae código QR y se puede validar en la web de la CMF. Cubre bancos, cooperativas y otras entidades fiscalizadas.
- Al principio se aceptan solo deudas que aparezcan en ese informe, para reducir el fraude. Más adelante se podrían sumar el CAE, deudas hospitalarias, etc.
- Para confirmar un pago se pide un informe nuevo después del pago. Es un proceso manual.
- **Hoy no existe una API pública de deudas.** El SII ve impuestos, no deudas bancarias.
- A futuro está el **Sistema de Finanzas Abiertas (Ley Fintec 21.521)**. Con autorización de la persona permitirá consultar datos financieros por API, pero su entrada en vigor se postergó a julio de 2027 y para usarlo hay que inscribirse como participante.
- Estrategia: partir manual y dejar la plataforma lista para conectarse cuando el sistema abra.

## Modelo de ingresos
- **Propinas opcionales** a la plataforma o a JPB, como en GoFundMe. Es legal: entran como ingreso de la SPA y tributan con boleta o factura.
- **Donaciones directas** de donantes grandes que valoren el trabajo. Son un bonus, no la base del plan.
- **Marcas patrocinadoras (lo más sólido):** bancos, retail o fintechs que pagan deudas reales como campaña de impacto social. JPB cobra por producir y difundir el contenido. Calza con lo que JPB ya hace.
- Recomendación: modelo doble. Las marcas pagan las cuentas y si cae un multimillonario, mejor.

## ¿Quién dona?
- Empresas que buscan imagen social o RSE.
- Influencers que buscan contenido emotivo.
- Chilenos que viven en el extranjero y quieren ayudar a su país.
- Gente común con aportes chicos (micro-donaciones).
- Multimillonarios: sirven más como golpe mediático. Uno solo que done y se viralice puede atraer miles de donantes normales.

## Ideas para la plataforma
- Video corto por caso, con la historia contada de forma emotiva.
- Barra de progreso y pagos parciales para bajar la barrera de entrada.
- Sello "Deuda verificada con el regulador financiero de Chile".
- Comprobante de pago público al final de cada caso.
- Subtítulos o doblaje al inglés con IA para donantes extranjeros.
- Gancho internacional: "Tu dólar rinde más en Chile".
- Opción de anonimato parcial para cuidar la dignidad de las personas.

## Temas legales
- **Pago directo al acreedor:** es el modelo más simple. La plataforma no toca la plata de la deuda.
- **Si la plata pasa por la plataforma** (sobre todo desde el extranjero vía Stripe o PayPal): aparecen controles antilavado, verificación de identidad de los donantes y posible regulación de pagos. Se puede evaluar trabajar con partners de pago.
- **Beneficio tributario para donantes:** requiere una fundación o corporación sin fines de lucro.
- **Datos personales:** se necesita consentimiento explícito para publicar el video, la historia y la deuda. La nueva Ley 21.719 rige desde diciembre de 2026 y los datos financieros están protegidos. No se puede "buscar" endeudados en bases de datos.
- Consultar con un abogado fintech y un contador antes de recibir plata de terceros.

## Riesgos y opinión honesta
- Como causa: atractiva y con potencial viral.
- Como negocio puro de propinas: débil (6/10). Las propinas dejan poca plata y habrá muchos más endeudados que donantes, con riesgo de que se acumulen casos sin financiar.
- Depender de un multimillonario es como jugar a la lotería.
- El fraude es el riesgo principal. Se mitiga con verificación CMF y pago directo al acreedor.
- Donde sí hay negocio: como formato de marketing de impacto con marcas patrocinadoras.

## Plan por fases
### Fase 1 — Chile (MVP)
- Landing, formulario de inscripción y catálogo de casos.
- Verificación manual de unos 10 casos con el Informe CMF.
- Donantes chilenos y empresas patrocinadoras con pago directo al acreedor.
- Campaña en redes con los casos pagados.

### Fase 2 — Internacional
- Pagos en dólares con un partner de pagos y cumplimiento legal resuelto.
- Contenido en inglés y expansión a donantes de EE.UU., Argentina y Colombia.

### Fase 3 — Automatización
- Integración con el Sistema de Finanzas Abiertas (desde julio de 2027) para verificar deudas y pagos por API.

## Próximos pasos
1. Validar la estructura legal y tributaria con un abogado y un contador.
2. Definir el modelo: plataforma con propinas más marcas patrocinadoras.
3. Construir el prototipo de la fase 1.
4. Conseguir los primeros casos y una o dos marcas piloto.`,
  },
];

function notasSeed() {
  const notes = getNotes();
  const dismissed = load(NOTES_DISMISSED_KEY);
  const missing = SEED_NOTES.filter(s => !dismissed.includes(s.id) && !notes.some(n => n.id === s.id));
  if (!missing.length) return;
  saveNotes(notes.concat(missing.map(s => ({ ...s, seed: true, updatedAt: s.createdAt }))));
}

// ── Formato ──────────────────────────────────────────

function noteInline(text) {
  let s = escHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return s;
}

function renderNoteMarkdown(md) {
  const out = [];
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  (md || '').split('\n').forEach(raw => {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { closeList(); return; }
    if ((m = line.match(/^###\s+(.*)/))) { closeList(); out.push(`<h5 class="note-h3">${noteInline(m[1])}</h5>`); return; }
    if ((m = line.match(/^##\s+(.*)/)))  { closeList(); out.push(`<h4 class="note-h2">${noteInline(m[1])}</h4>`); return; }
    if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${noteInline(m[1])}</li>`); return;
    }
    if ((m = line.match(/^\s*(\d+)\.\s+(.*)/))) {
      if (list !== 'ol') { closeList(); out.push(`<ol start="${m[1]}">`); list = 'ol'; }
      out.push(`<li>${noteInline(m[2])}</li>`); return;
    }
    closeList();
    out.push(`<p>${noteInline(line)}</p>`);
  });
  closeList();
  return out.join('');
}

function notePreview(md) {
  const plain = (md || '')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 170 ? plain.slice(0, 170) + '…' : plain;
}

function noteDateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── CRUD ─────────────────────────────────────────────

function openNoteModal(id) {
  document.getElementById('noteId').value      = '';
  document.getElementById('noteTitle').value   = '';
  document.getElementById('noteTags').value    = '';
  document.getElementById('noteContent').value = '';
  document.getElementById('noteModalTitle').textContent = 'Nueva Nota';

  if (id) {
    const n = getNotes().find(x => x.id === id);
    if (!n) return;
    document.getElementById('noteModalTitle').textContent = 'Editar Nota';
    document.getElementById('noteId').value      = n.id;
    document.getElementById('noteTitle').value   = n.title;
    document.getElementById('noteTags').value    = (n.tags || []).join(', ');
    document.getElementById('noteContent').value = n.content;
  }
  openModal('noteModal');
}

function saveNoteEntry(e) {
  e.preventDefault();
  const title   = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!title || !content) return;

  const id      = document.getElementById('noteId').value;
  const notes   = getNotes();
  const tagsRaw = document.getElementById('noteTags').value;
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const now     = new Date().toISOString();

  if (id) {
    const idx = notes.findIndex(x => x.id === id);
    if (idx !== -1) notes[idx] = { ...notes[idx], title, content, tags, updatedAt: now };
  } else {
    notes.push({ id: uid(), title, content, tags, createdAt: now, updatedAt: now });
  }

  saveNotes(notes);
  closeModal('noteModal');
  renderNotes();
}

async function deleteNoteEntry(id) {
  if (!(await appConfirm('¿Eliminar esta nota?'))) return;
  const note = getNotes().find(n => n.id === id);
  if (note && note.seed) {
    const dismissed = load(NOTES_DISMISSED_KEY);
    if (!dismissed.includes(id)) save(NOTES_DISMISSED_KEY, dismissed.concat(id));
  }
  saveNotes(getNotes().filter(n => n.id !== id));
  closeModal('noteDetailModal');
  renderNotes();
}

function openNoteDetail(id) {
  const n = getNotes().find(x => x.id === id);
  if (!n) return;
  document.getElementById('noteDetailTitle').textContent = n.title;
  const tagsHtml = (n.tags || []).map(t => `<span class="video-tag">${escHtml(t)}</span>`).join('');
  document.getElementById('noteDetailBody').innerHTML = `
    <div class="note-detail-meta">
      <span>${escHtml(noteDateLabel(n.updatedAt || n.createdAt))}</span>
      ${tagsHtml ? `<div class="video-tags-row">${tagsHtml}</div>` : ''}
    </div>
    <div class="note-detail-content">${renderNoteMarkdown(n.content)}</div>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" onclick="deleteNoteEntry('${n.id}')">Eliminar</button>
      <button type="button" class="btn btn-primary" onclick="closeModal('noteDetailModal'); openNoteModal('${n.id}')">Editar</button>
    </div>
  `;
  openModal('noteDetailModal');
}

// ── Lista ────────────────────────────────────────────

function renderNotes() {
  const el = document.getElementById('noteList');
  if (!el) return;
  const q = notesQuery.trim().toLowerCase();
  const all = getNotes().sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  const list = q
    ? all.filter(n => [n.title, n.content, (n.tags || []).join(' ')].join(' ').toLowerCase().includes(q))
    : all;

  if (!list.length) {
    el.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <p>${q ? 'Ninguna nota coincide con la búsqueda' : 'Sin notas aún'}</p>
      ${q ? '' : '<button class="btn btn-sm btn-primary" id="addFirstNote">Escribir primera nota</button>'}
    </div></div>`;
    document.getElementById('addFirstNote')?.addEventListener('click', () => openNoteModal());
    return;
  }

  el.innerHTML = list.map(n => `
    <div class="video-card card note-card">
      <div class="video-card-head">
        <div class="note-card-date">${escHtml(noteDateLabel(n.updatedAt || n.createdAt))}</div>
        <div class="video-card-actions">
          <button class="btn-icon" onclick="openNoteModal('${n.id}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteNoteEntry('${n.id}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
      <h3 class="video-card-title">${escHtml(n.title)}</h3>
      <p class="note-card-preview">${escHtml(notePreview(n.content))}</p>
      ${n.tags?.length ? `<div class="video-tags-row">${n.tags.map(t => `<span class="video-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <button class="btn btn-outline btn-sm video-detail-btn" onclick="openNoteDetail('${n.id}')">Ver nota →</button>
    </div>
  `).join('');
}

// ── Eventos ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('newNoteBtn')?.addEventListener('click', () => openNoteModal());
  document.getElementById('noteForm')?.addEventListener('submit', saveNoteEntry);
  document.getElementById('noteSearch')?.addEventListener('input', e => { notesQuery = e.target.value; renderNotes(); });
});
