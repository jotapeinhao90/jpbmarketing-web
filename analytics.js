// Analítica de jpbmarketing.cl. Pega tu ID de GA4 (G-XXXXXXXXXX) en GA_ID para activarla.
(function () {
  var GA_ID = '';
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  if (GA_ID) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }
  function ev(name, params) { if (GA_ID) gtag('event', name, params || {}); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('wa.me') > -1) ev('click_whatsapp', { page: location.pathname });
    else if (h.indexOf('mailto:') === 0) ev('click_email', { page: location.pathname });
    else if (h.indexOf('/contacto') === 0) ev('click_contacto', { page: location.pathname });
  });
  document.addEventListener('submit', function (e) {
    ev('form_submit', { page: location.pathname, form: (e.target && e.target.id) || '' });
  });
})();
