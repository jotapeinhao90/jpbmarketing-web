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
    menu.hidden = !open; burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-abierto', open);
  }
  burger.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  addEventListener('resize', function () { if (innerWidth > 820 && !menu.hidden) setMenu(false); });

  /* ---------- Modo HUMANO / MÁQUINA ---------- */
  var md = document.getElementById('md-src').textContent.trim() + '\n';
  var pre = document.getElementById('maq-md');
  pre.textContent = md;
  document.getElementById('maq-bytes').textContent = new Blob([md]).size;
  var maq = document.getElementById('maquina');
  document.querySelectorAll('[data-modo]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.dataset.modo === 'maquina';
      if (typeof setMenu === 'function' && !menu.hidden) setMenu(false);
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

  /* ---------- Barra de contacto en celular: aparece al bajar de la planta ---------- */
  var barra = document.getElementById('barra-movil'), planta = document.getElementById('inicio'), cta = document.getElementById('contacto');
  var enPlanta = true, enCta = false;
  function pintarBarra() { var on = !enPlanta && !enCta && !document.body.classList.contains('modo-maquina'); barra.classList.toggle('on', on); barra.setAttribute('aria-hidden', !on); }
  new IntersectionObserver(function (e) { enPlanta = e[0].intersectionRatio > .35; pintarBarra(); }, { threshold: [0, .35, 1] }).observe(planta);
  new IntersectionObserver(function (e) { enCta = e[0].isIntersecting; pintarBarra(); }).observe(cta);
  addEventListener('jpb-modo', pintarBarra);
})();
