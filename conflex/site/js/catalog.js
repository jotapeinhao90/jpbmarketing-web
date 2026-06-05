/* =====================
   CONFLEX — Catalog.js
   Quote cart + selector
   ===================== */

const CART_KEY = 'conflex_cart';

function getCart()   { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }

function addCartItem(item, qty) {
  qty = Math.max(1, parseInt(qty) || 1);
  const c = getCart();
  const ex = c.find(i => i.id === item.id);
  if (ex) ex.qty = (ex.qty || 1) + qty;
  else     c.push({ ...item, qty });
  saveCart(c);
  refreshFloat();
  renderCartPanel();
}

function removeCartItem(id) {
  saveCart(getCart().filter(i => i.id !== id));
  refreshFloat();
  renderCartPanel();
}

function changeCartQty(id, delta) {
  const c    = getCart();
  const item = c.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, (item.qty || 1) + delta);
  saveCart(c);
  renderCartPanel();
}

function clearCart() {
  saveCart([]);
  refreshFloat();
  renderCartPanel();
}

function refreshFloat() {
  const total   = getCart().reduce((s, i) => s + (i.qty || 1), 0);
  const floatEl = document.getElementById('quote-float');
  const cntEl   = document.getElementById('qf-count');
  if (!floatEl) return;
  cntEl.textContent = total;
  floatEl.classList.toggle('show', total > 0);
}

function renderCartPanel() {
  const body = document.getElementById('qp-body');
  if (!body) return;
  const c     = getCart();
  const total = c.reduce((s, i) => s + (i.qty || 1), 0);
  const meta  = document.getElementById('qp-head-meta');
  if (meta) meta.textContent = total + (total === 1 ? ' producto' : ' productos');

  if (!c.length) {
    body.innerHTML = '<p class="quote-empty">Sin productos aún.<br>Selecciona medidas y presiona "Agregar".</p>';
    return;
  }
  body.innerHTML = c.map(item => `
    <div class="qi">
      <div class="qi-info">
        <div class="qi-name">${item.product}</div>
        <div class="qi-meta">${[item.line, item.variant, item.clase ? 'Clase ' + item.clase : '', item.size].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="qi-controls">
        <button class="qi-qty-btn" onclick="changeCartQty('${item.id}',-1)">−</button>
        <span class="qi-qty-num">${item.qty}</span>
        <button class="qi-qty-btn" onclick="changeCartQty('${item.id}',1)">+</button>
        <button class="qi-remove" onclick="removeCartItem('${item.id}')" title="Eliminar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>`).join('');
}

function openCartPanel()  { document.getElementById('quote-overlay')?.classList.add('open'); renderCartPanel(); }
function closeCartPanel() { document.getElementById('quote-overlay')?.classList.remove('open'); }

function sendQuote() {
  window.location.href = 'cotizacion.html';
}

/* ---- Selector logic ---- */
function initSelectors(products, lineName) {
  document.querySelectorAll('[data-pid]').forEach(card => {
    const pid  = card.dataset.pid;
    const prod = products[pid];
    if (!prod) return;

    const typeBtns   = Array.from(card.querySelectorAll('.cp-type-btn'));
    const classPills = Array.from(card.querySelectorAll('.cp-class-pill'));
    const sizesEl    = card.querySelector('.cp-sizes');
    const summaryEl  = card.querySelector('.cp-summary');
    const addBtn     = card.querySelector('.cp-add-btn');
    const addedMsg   = card.querySelector('.cp-added-msg');

    let selType  = typeBtns.length ? typeBtns[0].dataset.type : null;
    let selClass = null;
    let selSize  = null;

    function getSizes() {
      if (prod.hasType && prod.hasClass !== false) {
        if (!selType || !selClass) return [];
        return ((prod.types || {})[selType] || {})[selClass] || [];
      }
      if (prod.hasType) {
        return (prod.types || {})[selType] || [];
      }
      if (prod.sizes) return prod.sizes;
      return (prod.classes || {})[selClass] || [];
    }

    function getAvailClasses() {
      if (!prod.hasType) return Object.keys(prod.classes || {});
      return Object.keys(((prod.types || {})[selType]) || {});
    }

    function renderSizes() {
      const sizes = getSizes();
      selSize = null;
      if (summaryEl) summaryEl.classList.remove('show');
      if (addBtn)    addBtn.disabled = true;
      sizesEl.innerHTML = sizes.length
        ? sizes.map(s => `<button class="cp-size">${s}</button>`).join('')
        : '<span class="cp-no-sizes">← Elige una clase</span>';
      sizesEl.querySelectorAll('.cp-size').forEach(btn => {
        btn.addEventListener('click', () => {
          sizesEl.querySelectorAll('.cp-size').forEach(b => b.classList.remove('sel'));
          btn.classList.add('sel');
          selSize = btn.textContent.trim();
          updateSummary();
        });
      });
    }

    function renderClasses() {
      if (!classPills.length) return;
      const avail = getAvailClasses();
      classPills.forEach(p => p.classList.toggle('hidden', !avail.includes(p.dataset.class)));
      const first = card.querySelector('.cp-class-pill:not(.hidden)');
      classPills.forEach(p => p.classList.remove('active'));
      if (first) { first.classList.add('active'); selClass = first.dataset.class; }
      else        selClass = null;
    }

    function updateSummary() {
      if (!summaryEl) return;
      if (!selSize) { summaryEl.classList.remove('show'); if (addBtn) addBtn.disabled = true; return; }
      const parts = [prod.title];
      if (selType)  parts.push(selType);
      if (selClass) parts.push('Clase ' + selClass);
      parts.push(selSize);
      summaryEl.innerHTML = '<strong>' + parts.join(' · ') + '</strong>';
      summaryEl.classList.add('show');
      if (addBtn) addBtn.disabled = false;
    }

    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selType = btn.dataset.type;
        selSize = null;
        renderClasses();
        renderSizes();
      });
    });

    classPills.forEach(pill => {
      pill.addEventListener('click', () => {
        if (pill.classList.contains('hidden')) return;
        classPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selClass = pill.dataset.class;
        selSize  = null;
        renderSizes();
        if (summaryEl) summaryEl.classList.remove('show');
        if (addBtn)    addBtn.disabled = true;
      });
    });

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!selSize || addBtn.disabled) return;
        const id  = [pid, selType, selClass, selSize].filter(Boolean).join('_').replace(/[^a-zA-Z0-9_]/g, '-');
        const qtyEl = card.querySelector('.cp-qty-input');
        const qty = qtyEl ? parseInt(qtyEl.value) || 1 : 1;
        addCartItem({ id, line: lineName, product: prod.title, variant: selType || '', clase: selClass || '', size: selSize }, qty);
        addBtn.textContent = '✓ Agregado';
        addBtn.disabled = true;
        if (addedMsg) addedMsg.classList.add('show');
        setTimeout(() => {
          addBtn.textContent = '+ Agregar a cotización';
          addBtn.disabled = false;
          if (addedMsg) addedMsg.classList.remove('show');
        }, 2200);
      });
    }

    renderClasses();
    renderSizes();
  });

  /* Active sidebar link on scroll */
  const sections  = document.querySelectorAll('.cat-section[id]');
  const navLinks  = document.querySelectorAll('.cat-nav-link');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('cat-active'));
        const active = document.querySelector(`.cat-nav-link[href="#${e.target.id}"]`);
        if (active) active.classList.add('cat-active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(s => io.observe(s));
}

document.addEventListener('DOMContentLoaded', () => {
  refreshFloat();
  document.getElementById('quote-float-btn')?.addEventListener('click', openCartPanel);
  document.getElementById('qp-close')?.addEventListener('click', closeCartPanel);
  document.getElementById('quote-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'quote-overlay') closeCartPanel();
  });
  document.getElementById('qp-send')?.addEventListener('click', sendQuote);
  document.getElementById('qp-clear')?.addEventListener('click', clearCart);
});
