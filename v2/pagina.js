/* JPB v2 — página: visuales generativos de servicios + modo HUMANO / MÁQUINA */
(function () {
  'use strict';

  // Marca gigante del cierre: ocupa exactamente el ancho disponible
  var marca = document.querySelector('.marca');
  function fitMarca() {
    if (!marca) return;
    var span = marca.querySelector('span');
    marca.style.fontSize = '100px';
    var w = span.getBoundingClientRect().width, avail = marca.clientWidth;
    if (w > 0) marca.style.fontSize = (100 * avail / w * 0.975).toFixed(2) + 'px';
  }
  if (document.fonts) document.fonts.ready.then(fitMarca);
  fitMarca(); addEventListener('resize', fitMarca); addEventListener('load', fitMarca); setTimeout(fitMarca, 1200);

  /* ---------- Menú móvil ---------- */
  var burger = document.getElementById('nav-burger'), menu = document.getElementById('nav-menu');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open; burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-abierto', open);
  }
  if (burger && menu) {
  burger.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  addEventListener('resize', function () { if (innerWidth > 820 && !menu.hidden) setMenu(false); });
  }

  /* ---------- Modo HUMANO / MÁQUINA ---------- */
  var mdSrc = document.getElementById('md-src');
  if (mdSrc) (function () {
  var md = mdSrc.textContent.trim() + '\n';
  var pre = document.getElementById('maq-md');
  pre.textContent = md;
  document.getElementById('maq-bytes').textContent = new Blob([md]).size;
  var maq = document.getElementById('maquina');
  document.querySelectorAll('[data-modo]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.dataset.modo === 'maquina';
      if (menu && !menu.hidden) setMenu(false);
      document.body.classList.toggle('modo-maquina', m);
      maq.hidden = !m;
      document.querySelectorAll('.modo button').forEach(function (o) { var on = (o.dataset.modo === 'maquina') === m; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); });
      window.scrollTo(0, 0);
      window.dispatchEvent(new CustomEvent('jpb-modo', { detail: m ? 'maquina' : 'humano' }));
    });
  });
  document.getElementById('maq-copy').addEventListener('click', function (e) {
    navigator.clipboard && navigator.clipboard.writeText(md).then(function () { e.target.textContent = '[copiado ✓]'; setTimeout(function () { e.target.textContent = '[copiar]'; }, 1500); });
  });
  document.getElementById('maq-dl').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = 'jpbmarketing.md'; a.click();
  });
  })();

  /* ---------- Barra de contacto en celular: aparece al bajar de la planta ---------- */
  var barra = document.getElementById('barra-movil'), planta = document.getElementById('inicio'), cta = document.getElementById('contacto');
  var enPlanta = !!planta, enCta = false;
  function pintarBarra() {
    if (!barra) return;
    if (!planta) enPlanta = scrollY < 260; // páginas internas: aparece al empezar a bajar
    var on = !enPlanta && !enCta && !document.body.classList.contains('modo-maquina'); barra.classList.toggle('on', on); barra.setAttribute('aria-hidden', !on);
  }
  if (planta) new IntersectionObserver(function (e) { enPlanta = e[0].intersectionRatio > .35; pintarBarra(); }, { threshold: [0, .35, 1] }).observe(planta);
  else addEventListener('scroll', pintarBarra, { passive: true });
  if (cta) new IntersectionObserver(function (e) { enCta = e[0].isIntersecting; pintarBarra(); }).observe(cta);
  addEventListener('jpb-modo', pintarBarra); pintarBarra();

  /* ---------- Aparición suave al bajar (páginas internas) ---------- */
  var aparecen = document.querySelectorAll('.aparece');
  if (aparecen.length && 'IntersectionObserver' in window) {
    var ioA = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); ioA.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    aparecen.forEach(function (el) { ioA.observe(el); });
  } else aparecen.forEach(function (el) { el.classList.add('visto'); });

  /* ---------- Teléfono de la sección Panel: la demo a tamaño real de teléfono, escalada ---------- */
  var marco = document.querySelector('.phone-frame'), ifr = marco && marco.querySelector('iframe');
  function escalaPanel() { if (!ifr) return; var f = marco.clientWidth / 390; ifr.style.transform = 'scale(' + f + ')'; ifr.style.height = (marco.clientHeight / f) + 'px'; }
  escalaPanel(); addEventListener('resize', escalaPanel);

  /* ---------- Indicador "Baja para ver más": se va al bajar ---------- */
  var baja = document.getElementById('baja'), tarjeta = document.getElementById('estacion');
  function pintarBaja() {
    if (!baja) return;
    baja.classList.toggle('fuera', scrollY > 120);
    var h = tarjeta && !tarjeta.hidden ? tarjeta.offsetHeight : 0;
    document.documentElement.style.setProperty('--card-h', h + 'px');
  }
  addEventListener('scroll', pintarBaja, { passive: true }); setInterval(pintarBaja, 600); pintarBaja();
})();
