/* ============================================================
   Admira · contact-panel.js
   Inyecta el panel lateral de contacto compartido del grupo
   y enlaza el comportamiento al disparador [data-admira-contact].

   Réplica del flujo de www.admiranext.com:
     - Click en [data-admira-contact] → abre panel
     - X / backdrop / Escape → cierra
     - Submit del formulario → POST a formsubmit.co/ajax/info@admira.com

   Uso (en cada sitio):
     <link rel="stylesheet" href="https://csilvasantin.github.io/admira-design/contact-panel.css">
     <script defer src="https://csilvasantin.github.io/admira-design/contact-panel.js"></script>
     <a href="#contact" data-admira-contact>Contacto</a>
   ============================================================ */
(function () {
  if (typeof document === 'undefined') return;
  if (window.__admiraContactPanelLoaded) return;
  window.__admiraContactPanelLoaded = true;

  function currentLang() {
    return (document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
  }
  function isSpanish() { return currentLang() === 'es'; }
  function t(en, esText) { return isSpanish() ? esText : en; }

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
            '<input type="text" name="name" autocomplete="name" required>' +
          '</label>' +
          '<label>' +
            '<span data-i18n-en="Phone" data-i18n-es="Teléfono"></span>' +
            '<input type="tel" name="phone" autocomplete="tel" required>' +
          '</label>' +
          '<label>' +
            '<span data-i18n-en="Reason" data-i18n-es="Motivo"></span>' +
            '<textarea name="reason" rows="3" required></textarea>' +
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
      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.trim();
      var reason = form.elements.reason.value.trim();
      var status = form.querySelector('.admira-contact-status');
      var submit = form.querySelector('button[type="submit"]');
      if (!name || !phone || !reason) {
        if (status) status.textContent = t('Please fill all fields.', 'Rellena todos los campos.');
        return;
      }
      if (status) status.textContent = '';
      if (submit) submit.disabled = true;
      fetch('https://formsubmit.co/ajax/info@admira.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: 'Solicitud de llamada - Admira Xperience',
          name: name,
          phone: phone,
          reason: reason,
          source: location.hostname
        })
      }).then(function (response) {
        if (!response.ok) throw new Error('submit failed');
        form.reset();
        if (status) status.textContent = t('Request sent. We will call you shortly.', 'Solicitud enviada. Te llamamos en breve.');
      }).catch(function () {
        if (status) status.textContent = t('Could not send it right now. Try again or write to info@admira.com.', 'No se pudo enviar ahora. Inténtalo de nuevo o escribe a info@admira.com.');
      }).finally(function () {
        if (submit) submit.disabled = false;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
