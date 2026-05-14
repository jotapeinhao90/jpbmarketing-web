document.addEventListener('DOMContentLoaded', () => {

    // ── Sticky Header ──
    const header = document.getElementById('siteHeader');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    // ── Mobile Nav ──
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const open = () => { mobileNav.classList.add('open'); mobileNavOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { mobileNav.classList.remove('open'); mobileNavOverlay.classList.remove('open'); document.body.style.overflow = ''; };
    if (hamburger) hamburger.addEventListener('click', open);
    if (mobileNavClose) mobileNavClose.addEventListener('click', close);
    if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', close);

    // ── Scroll Reveal ──
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('active'); obs.unobserve(e.target); } });
    }, { threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

    // ── Load product from URL param ──
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id || !PRODUCTOS[id]) {
        document.querySelector('.prod-hero').innerHTML = '<div class="container" style="padding:80px 0;text-align:center"><h2>Producto no encontrado</h2><a href="index.html#productos" class="btn btn-primary mt-3">Ver todos los productos</a></div>';
        return;
    }

    const p = PRODUCTOS[id];

    // Meta
    document.getElementById('pageTitle').textContent = p.titulo + ' | ETP Polimer Ltda';
    document.getElementById('pageDesc').content = p.descripcion_corta;

    // Breadcrumb
    document.getElementById('bcTitle').textContent = p.titulo;

    // Hero
    document.getElementById('prodCategoria').textContent = p.categoria;
    document.getElementById('prodTitulo').textContent = p.titulo;
    document.getElementById('prodDescCorta').textContent = p.descripcion_corta;

    // Image
    const img = document.getElementById('prodImg');
    const placeholder = document.getElementById('prodImgPlaceholder');
    if (p.img) {
        img.src = p.img;
        img.alt = p.titulo;
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
    }

    // WhatsApp links
    const waMsg = encodeURIComponent(`Hola, me gustaría cotizar "${p.titulo}" y conocer más detalles.`);
    const waUrl = `https://wa.me/56944843503?text=${waMsg}`;
    document.getElementById('prodWaBtn').href = waUrl;
    document.getElementById('prodWaBtn2').href = waUrl;

    // Detail
    document.getElementById('prodDescLarga').textContent = p.descripcion;
    document.getElementById('prodAplic').textContent = p.aplicaciones;

    // Features
    const featuresList = document.getElementById('prodFeatures');
    p.caracteristicas.forEach(c => {
        const li = document.createElement('li');
        li.textContent = c;
        featuresList.appendChild(li);
    });

    // Otros productos (max 8, excluye el actual)
    const otrosGrid = document.getElementById('otrosGrid');
    const otros = Object.entries(PRODUCTOS).filter(([k]) => k !== id).slice(0, 8);
    otros.forEach(([k, prod]) => {
        const a = document.createElement('a');
        a.href = `producto.html?id=${k}`;
        a.className = 'otro-card';
        a.innerHTML = `
            <div class="otro-card-img">
                ${prod.img
                    ? `<img src="${prod.img}" alt="${prod.titulo}">`
                    : `<div class="otro-card-img-placeholder"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
                }
            </div>
            <div class="otro-card-body">
                <h4>${prod.titulo}</h4>
                <span>${prod.categoria} →</span>
            </div>`;
        otrosGrid.appendChild(a);
    });
});
