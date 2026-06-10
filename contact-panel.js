/* ============================================================
   Admira · contact-panel.js
   Panel lateral de contacto compartido del grupo. Se inyecta en
   <body> y se abre con cualquier disparador [data-admira-contact].

   Campos unificados en TODOS los sites (pixeria.com · xpaceos.com ·
   admira.app · admira.studio …), conservando el estilo de cada uno
   vía las variables de tokens.css.

   Envío: POST al worker pixer-eleven (/lead) → guarda en KV y avisa
   por Telegram al instante. Si la red falla, el lead se encola en
   localStorage y se reintenta (no se pierde ningún contacto).
     - Click en [data-admira-contact] → abre panel
     - X / backdrop / Escape → cierra

   Uso (en cada sitio):
     <link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/contact-panel.css">
     <script defer src="https://csilvasantin.github.io/admira-design/contact-panel.js"></script>
     <a href="#contact" data-admira-contact>Contacto</a>
   ============================================================ */
(function () {
  if (typeof document === 'undefined') return;
  if (window.__admiraContactPanelLoaded) return;
  window.__admiraContactPanelLoaded = true;

  var LEAD_ENDPOINT = 'https://pixer-eleven.csilvasantin.workers.dev/lead';
  var QKEY = 'admira_lead_queue';

  function currentLang() {
    return (document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
  }
  function isSpanish() { return currentLang() === 'es'; }
  function t(en, esText) { return isSpanish() ? esText : en; }

  /* ── transporte + cola offline ─────────────────────────────── */
  function postLead(payload, timeoutMs) {
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, timeoutMs || 9000) : null;
    return fetch(LEAD_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { if (to) clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json().catch(function () { return {}; }); });
  }
  function loadQ() { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } }
  function saveQ(a) { try { localStorage.setItem(QKEY, JSON.stringify(a.slice(-200))); } catch (e) {} }
  function enqueue(p) { var a = loadQ(); a.push(p); saveQ(a); }
  var flushing = false;
  function flushQ() {
    if (flushing) return; var a = loadQ(); if (!a.length) return; flushing = true;
    (function next() {
      if (!a.length) { saveQ(a); flushing = false; return; }
      postLead(a[0], 9000).then(function () { a.shift(); saveQ(a); next(); })
        .catch(function () { flushing = false; });
    })();
  }

  // Opciones del desplegable de Interés (las 3 capas de AdmiraNext). El value
  // es el rótulo canónico EN (dato estable en el store); el texto se localiza.
  var INTEREST = [
    { value: 'Content Creation · LLM Productions · pixeria.com',
      en: 'Content Creation · LLM Productions · pixeria.com',
      es: 'Creación de Contenido · LLM Productions · pixeria.com' },
    { value: 'Content Distribution · Digital Twin · xpaceos.com',
      en: 'Content Distribution · Digital Twin · xpaceos.com',
      es: 'Distribución de Contenido · Gemelo Digital · xpaceos.com' },
    { value: 'Content Monetization · Programmatic Marketplace · admira.app',
      en: 'Content Monetization · Programmatic Marketplace · admira.app',
      es: 'Comercialización de Contenidos · Programmatic Marketplace · admira.app' },
    { value: 'Other', en: 'Other', es: 'Otro' }
  ];

  function init() {
    if (document.getElementById('admiraContactPanel')) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'admira-contact-backdrop';
    backdrop.setAttribute('data-admira-contact-close', '');

    var panel = document.createElement('aside');
    panel.className = 'admira-contact-panel';
    panel.id = 'admiraContactPanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-labelledby', 'admiraContactPanelTitle');

    var interestOpts =
      '<option value="" data-i18n-en="Choose…" data-i18n-es="Elige…"></option>' +
      INTEREST.map(function (o) {
        return '<option value="' + o.value + '" data-i18n-en="' + o.en + '" data-i18n-es="' + o.es + '"></option>';
      }).join('');

    panel.innerHTML =
      '<button class="admira-contact-close" type="button" data-admira-contact-close data-i18n-aria-en="Close contact panel" data-i18n-aria-es="Cerrar panel de contacto">×</button>' +
      '<h2 id="admiraContactPanelTitle" data-i18n-en="Contact us" data-i18n-es="Contáctanos"></h2>' +
      '<div class="admira-contact-panel-grid">' +
        '<div data-i18n-en="Contact details" data-i18n-es="Datos de contacto"></div>' +
        '<div>' +
          '<span><a href="tel:+34930000000">+34 930 000 000</a></span>' +
          '<span><a href="mailto:info@admira.com">info@admira.com</a></span>' +
        '</div>' +
        '<div data-i18n-en="We call you" data-i18n-es="Te llamamos"></div>' +
        '<form class="admira-contact-form" id="admiraContactForm" novalidate>' +
          '<label>' +
            '<span data-i18n-en="Name" data-i18n-es="Nombre"></span>' +
            '<input type="text" name="name" autocomplete="name" maxlength="120" required>' +
          '</label>' +
          '<div class="admira-contact-row">' +
            '<label>' +
              '<span data-i18n-en="Company" data-i18n-es="Empresa"></span>' +
              '<input type="text" name="company" autocomplete="organization" maxlength="120">' +
            '</label>' +
            '<label>' +
              '<span data-i18n-en="Role" data-i18n-es="Cargo"></span>' +
              '<input type="text" name="role" autocomplete="organization-title" maxlength="80">' +
            '</label>' +
          '</div>' +
          '<div class="admira-contact-row">' +
            '<label>' +
              '<span data-i18n-en="Email" data-i18n-es="Email"></span>' +
              '<input type="email" name="email" inputmode="email" autocomplete="email" maxlength="160">' +
            '</label>' +
            '<label>' +
              '<span data-i18n-en="Phone" data-i18n-es="Teléfono"></span>' +
              '<input type="tel" name="phone" inputmode="tel" autocomplete="tel" maxlength="40">' +
            '</label>' +
          '</div>' +
          '<label>' +
            '<span data-i18n-en="Interest" data-i18n-es="Interés"></span>' +
            '<select name="interest">' + interestOpts + '</select>' +
          '</label>' +
          '<label>' +
            '<span data-i18n-en="What would you like to see?" data-i18n-es="¿Qué te gustaría ver?"></span>' +
            '<textarea name="reason" rows="3"></textarea>' +
          '</label>' +
          '<label class="admira-contact-consent">' +
            '<input type="checkbox" name="consent">' +
            '<span data-i18n-en="I agree Admira may contact me." data-i18n-es="Acepto que Admira me contacte."></span>' +
          '</label>' +
          '<div class="admira-contact-actions">' +
            '<button type="submit" data-i18n-en="Send request" data-i18n-es="Enviar solicitud"></button>' +
            '<a href="https://calendar.google.com/calendar/u/0/r/eventedit?text=Videoconferencia%20Admira&details=Quiero%20agendar%20una%20videoconferencia%20con%20Admira.&add=info%40admira.com" target="_blank" rel="noopener noreferrer" data-i18n-en="Book a video conference" data-i18n-es="Agendar videoconferencia"></a>' +
          '</div>' +
          '<p class="admira-contact-status" role="status" aria-live="polite"></p>' +
        '</form>' +
        '<div data-i18n-en="Office" data-i18n-es="Oficina"></div>' +
        '<div data-i18n-en="Barcelona, Spain" data-i18n-es="Barcelona, España"></div>' +
        '<div>Social</div>' +
        '<div><a href="https://www.linkedin.com/company/admira-next/" target="_blank" rel="noopener noreferrer">LinkedIn</a></div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    translatePanel();

    function translatePanel() {
      var langKey = isSpanish() ? 'es' : 'en';
      panel.querySelectorAll('[data-i18n-en][data-i18n-es]').forEach(function (el) {
        el.textContent = el.getAttribute('data-i18n-' + langKey) || '';
      });
      panel.querySelectorAll('[data-i18n-aria-en][data-i18n-aria-es]').forEach(function (el) {
        el.setAttribute('aria-label', el.getAttribute('data-i18n-aria-' + langKey) || '');
      });
    }

    window.addEventListener('admira:languagechange', translatePanel);

    function togglePanel(open) {
      document.body.classList.toggle('admira-contact-open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        setTimeout(function () {
          var firstInput = panel.querySelector('input, textarea');
          if (firstInput) firstInput.focus();
        }, 120);
      }
    }

    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-admira-contact]');
      if (opener) {
        event.preventDefault();
        togglePanel(true);
        return;
      }
      var closer = event.target.closest('[data-admira-contact-close]');
      if (closer) {
        event.preventDefault();
        togglePanel(false);
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') togglePanel(false);
    });

    var form = panel.querySelector('#admiraContactForm');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.querySelector('.admira-contact-status');
      var submit = form.querySelector('button[type="submit"]');
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var phone = form.elements.phone.value.trim();
      if (!name) { if (status) status.textContent = t('Enter your name.', 'Pon tu nombre.'); return; }
      if (!email && !phone) { if (status) status.textContent = t('Enter an email or a phone.', 'Pon un email o un teléfono.'); return; }
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (status) status.textContent = t('Invalid email.', 'Email no válido.'); return; }

      var payload = {
        name: name,
        company: form.elements.company.value.trim(),
        role: form.elements.role.value.trim(),
        email: email,
        phone: phone,
        interest: form.elements.interest.value,
        notes: form.elements.reason.value.trim(),
        consent: form.elements.consent.checked,
        source: location.hostname || 'admira-contact'
      };
      if (status) status.textContent = '';
      if (submit) submit.disabled = true;
      postLead(payload, 9000).then(function () {
        form.reset();
        if (status) status.textContent = t('Thank you! We will be in touch very soon.', '¡Gracias! Te contactaremos muy pronto.');
        flushQ();
      }).catch(function () {
        enqueue(payload);
        form.reset();
        if (status) status.textContent = t('Saved — it will be sent once you are back online.', 'Guardado — se enviará en cuanto haya conexión.');
      }).finally(function () {
        if (submit) submit.disabled = false;
      });
    });

    setTimeout(flushQ, 3000);
    try { window.addEventListener('online', flushQ); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
