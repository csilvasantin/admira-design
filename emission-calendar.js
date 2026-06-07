/* ============================================================
   Emission Calendar — módulo compartido del calendario de emisión
   Fuente de verdad: API /grid de pixer-eleven (KV). Mismo render en
   pixeria.com (role 'public'), admira.app (role 'sell') y
   xpaceos.com (role 'owner'). Vanilla, sin build. Se incluye por URL:
     <link rel="stylesheet" href=".../admira-design/emission-calendar.css">
     <script src=".../admira-design/emission-calendar.js"></script>
   Uso:
     const cal = EmissionCalendar.mount(containerEl, {
       workerBase:'https://pixer-eleven.csilvasantin.workers.dev',
       screen:'xtanco-led-frontal', date:'2026-06-07',
       role:'public'|'sell'|'owner',
       circuit:'xtanco',                 // para subida (owner)
       storeName:'Xtanco',               // anunciante de contenido propio
       getKey:()=>localStorage.getItem('grid_key'),  // clave de escritura
       onData:(day)=>{},                 // tras cada carga (el host actualiza lo suyo)
       poll:15000,
     });
     cal.setContext({screen,date}); cal.refresh(); cal.destroy();
   Contrato y formato: ver admira-design/EMISSION-CALENDAR.md
   ============================================================ */
(function (global) {
  'use strict';

  var WORKER_DEFAULT = 'https://pixer-eleven.csilvasantin.workers.dev';
  var fmtEur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  // ── Modal + toast singletons (uno por documento) ──
  var ui = null;
  function ensureUI() {
    if (ui) return ui;
    var toast = el('<div class="ec-toast"></div>');
    var modal = el('<div class="ec-modal"><div class="ec-box" id="ecBox"></div></div>');
    document.body.appendChild(toast); document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('open'); });
    ui = { toast: toast, modal: modal, box: modal.querySelector('#ecBox'), tTimer: 0 };
    return ui;
  }
  function toast(msg, err) {
    var u = ensureUI(); u.toast.textContent = msg; u.toast.className = 'ec-toast show' + (err ? ' err' : '');
    clearTimeout(u.tTimer); u.tTimer = setTimeout(function () { u.toast.className = 'ec-toast'; }, 2600);
  }
  function openModal(html) { var u = ensureUI(); u.box.innerHTML = html; u.modal.classList.add('open'); return u.box; }
  function closeModal() { if (ui) ui.modal.classList.remove('open'); }

  async function api(base, path, opts) {
    var r = await fetch(base + path, opts);
    var d = null; try { d = await r.json(); } catch (e) {}
    if (!r.ok || (d && d.error)) throw new Error((d && d.error) || ('HTTP ' + r.status));
    return d;
  }

  function Calendar(container, opts) {
    this.c = container;
    this.o = Object.assign({ workerBase: WORKER_DEFAULT, role: 'public', poll: 15000, getKey: function () { return ''; }, onData: function () {} }, opts || {});
    this.day = null;
    this.timer = 0;
    this.c.classList.add('ec-root');
    this.refresh();
    if (this.o.poll) {
      var self = this;
      this.timer = setInterval(function () { if (!(ui && ui.modal.classList.contains('open'))) self.refresh(); }, this.o.poll);
    }
  }
  Calendar.prototype.setContext = function (ctx) {
    if (ctx.screen != null) this.o.screen = ctx.screen;
    if (ctx.date != null) this.o.date = ctx.date;
    if (ctx.circuit != null) this.o.circuit = ctx.circuit;
    if (ctx.storeName != null) this.o.storeName = ctx.storeName;
    return this.refresh();
  };
  Calendar.prototype.destroy = function () { if (this.timer) clearInterval(this.timer); this.c.innerHTML = ''; };
  Calendar.prototype.key = function () { try { return this.o.getKey() || ''; } catch (e) { return ''; } };
  Calendar.prototype.ensureKey = function () {
    var k = this.key();
    if (!k) { k = prompt('Clave de administración (GRID_KEY):') || ''; if (k) try { localStorage.setItem('grid_key', k); } catch (e) {} }
    return k;
  };

  Calendar.prototype.refresh = async function () {
    var o = this.o;
    if (!o.screen) { this.c.innerHTML = '<div class="ec-empty">Sin pantalla seleccionada.</div>'; return; }
    try {
      var d = await api(o.workerBase, '/grid/day?screen=' + encodeURIComponent(o.screen) + '&date=' + encodeURIComponent(o.date || ''));
      this.day = d; this.render();
      try { o.onData(d); } catch (e) {}
    } catch (e) {
      this.c.innerHTML = '<div class="ec-empty">Error cargando calendario: ' + esc(e.message) + '</div>';
    }
  };

  Calendar.prototype.render = function () {
    var d = this.day, o = this.o, role = o.role, np = d.nowPlaying, t = d.totals;
    var pub = role === 'public';
    var canSell = role === 'sell';
    var canOwn = role === 'owner';
    var writes = canSell || canOwn;

    // KPIs
    var kpis = pub
      ? [['', t.totalSlots, 'Huecos del día'], ['sold', t.soldSlots + t.pendingSlots, 'Ocupados'], ['free', t.freeSlots, 'Disponibles'], ['', t.occupancy + '%', 'Ocupación']]
      : [['', t.totalSlots, 'Huecos del día'], ['sold', t.soldSlots, 'Vendidos'], ['free', t.freeSlots, 'Disponibles'], ['', t.occupancy + '%', 'Ocupación'], ['rev', fmtEur.format(t.revenue), 'Ingresos']];
    var kpiHtml = '<div class="ec-kpis' + (pub ? ' ec-pub' : '') + '">' + kpis.map(function (k) {
      return '<div class="ec-kpi ' + k[0] + '"><div class="ec-n">' + esc(k[1]) + '</div><div class="ec-l">' + esc(k[2]) + '</div></div>';
    }).join('') + '</div>';

    // Now playing
    var nowHtml = '';
    if (d.now.isToday && np) {
      if (np.free) {
        nowHtml = '<div class="ec-now ec-freebar"><div class="ec-pulse"></div><div><div class="ec-lab">Ahora · ' + esc(d.now.hhmm) + ' · ' + esc(this.bandLabel(np.bandId)) + '</div><b>Hueco disponible</b> <span class="ec-meta">— sin campaña en esta franja</span></div></div>';
      } else {
        var who = np.kind === 'own' ? 'Contenido propio' : esc(np.advertiser || '—');
        nowHtml = '<div class="ec-now"><div class="ec-pulse"></div><div><div class="ec-lab">Ahora emitiendo · ' + esc(d.now.hhmm) + ' · ' + esc(this.bandLabel(np.bandId)) + '</div><b>' + who + '</b> <span class="ec-meta">— ' + esc(np.title || '') + (np.creative ? ' · ' + esc(np.creative.type) : '') + '</span></div></div>';
      }
    }

    // Bands
    var self = this;
    var bandsHtml = d.bands.map(function (b) {
      var slots = b.slots.map(function (s) {
        if (s.kind === 'free') {
          if (canSell) return '<div class="ec-slot free act" data-band="' + b.id + '"><span>+ Vender hueco</span></div>';
          if (canOwn) return '<div class="ec-slot free own act" data-band="' + b.id + '"><span>+ Mi contenido</span></div>';
          return '<div class="ec-slot free"><span>Disponible</span></div>';
        }
        var playing = d.now.isToday && np && !np.free && np.bookingId === s.bookingId && np.bandId === b.id;
        var cls = s.kind === 'own' ? 'ownc' : (s.kind === 'pending' ? 'pending' : 'paid');
        var tag = s.kind === 'own' ? 'PROPIO' : (s.kind === 'pending' ? 'OFERTA' : 'PAGADO');
        var adv = s.kind === 'own' ? (s.advertiser || 'Propio') : (pub ? (s.kind === 'pending' ? 'Reservado' : esc(s.advertiser || '—')) : esc(s.advertiser || '—'));
        var inl = (canOwn && s.kind === 'pending') ? '<div class="ec-inl"><button class="ok" data-act="accept" data-id="' + s.bookingId + '">✓</button><button class="no" data-act="reject" data-id="' + s.bookingId + '">✕</button></div>' : '';
        var rm = (writes && s.kind !== 'pending') ? '<span class="ec-x" data-unbook="' + s.bookingId + '" title="Quitar">✕</span>' : '';
        return '<div class="ec-slot ' + cls + (playing ? ' playing' : '') + '">' + rm +
          '<span class="ec-tag">' + tag + (playing ? ' · ▶ on air' : '') + '</span>' +
          '<span class="ec-adv">' + adv + '</span>' +
          '<span class="ec-ttl">' + esc(s.title || '') + '</span>' + inl + '</div>';
      }).join('');
      var avail = pub
        ? '<span class="ec-avail"><b>' + b.free + '</b> disponibles · ' + (b.capacity - b.free) + '/' + b.capacity + '</span>'
        : '<span class="ec-avail"><b>' + b.free + '</b> libres · ' + b.own + ' propio · ' + b.paid + ' pagado' + (b.pending ? ' · ' + b.pending + ' oferta' : '') + '</span>';
      return '<div class="ec-band' + (b.isNow ? ' cur' : '') + '"><div class="ec-bhead"><span class="ec-btitle">' + esc(b.label) + '</span><span class="ec-bhours">' + b.from + '–' + b.to + '</span>' + (b.isNow ? '<span class="ec-nowtag">AHORA</span>' : '') + avail + '</div><div class="ec-slots">' + slots + '</div></div>';
    }).join('');

    this.c.innerHTML = kpiHtml + nowHtml + '<div class="ec-bandswrap">' + bandsHtml + '</div>';

    // Wire (solo roles con escritura)
    if (canSell) this.c.querySelectorAll('.ec-slot.free.act').forEach(function (n) { n.onclick = function () { self.openSell(n.dataset.band); }; });
    if (canOwn) this.c.querySelectorAll('.ec-slot.free.act').forEach(function (n) { n.onclick = function () { self.openOwn(n.dataset.band); }; });
    if (writes) {
      this.c.querySelectorAll('[data-unbook]').forEach(function (n) { n.onclick = function (e) { e.stopPropagation(); self.unbook(n.dataset.unbook); }; });
      this.c.querySelectorAll('[data-act]').forEach(function (n) { n.onclick = function (e) { e.stopPropagation(); self.decide(n.dataset.id, n.dataset.act); }; });
    }
  };

  Calendar.prototype.bandLabel = function (id) { var b = (this.day && this.day.bands || []).find(function (x) { return x.id === id; }); return b ? b.label : id; };
  Calendar.prototype.band = function (id) { return (this.day && this.day.bands || []).find(function (x) { return x.id === id; }); };

  // ── Vender (role sell) ──
  Calendar.prototype.openSell = function (bandId) {
    var b = this.band(bandId), self = this;
    var box = openModal(
      '<h3>Vender hueco</h3><p class="ec-sub">' + esc(this.o.screenName || this.o.screen) + ' · ' + esc(b.label) + ' (' + b.from + '–' + b.to + ') · ' + b.free + ' libres</p>' +
      '<div class="ec-f"><label>Anunciante</label><input id="ecAdv" placeholder="Ej. Coca-Cola"></div>' +
      '<div class="ec-f"><label>Campaña / título</label><input id="ecTtl" placeholder="Ej. Verano 2026"></div>' +
      '<div class="ec-row"><div class="ec-f"><label>Tipo</label><select id="ecType"><option value="video">Vídeo</option><option value="image">Imagen</option></select></div><div class="ec-f"><label>Huecos</label><input id="ecSlots" type="number" value="1" min="1" max="' + b.free + '"></div></div>' +
      '<div class="ec-f"><label>URL del creativo</label><input id="ecUrl" type="url" placeholder="https://…/spot.mp4"></div>' +
      '<div class="ec-row"><div class="ec-f"><label>CPM (€)</label><input id="ecCpm" type="number" value="8" min="0" step="0.5"></div><div class="ec-f"><label>Precio (€)</label><input id="ecPrice" type="number" value="0" min="0" step="1"></div></div>' +
      '<div class="ec-act"><button class="ec-btn ghost" id="ecCancel">Cancelar</button><button class="ec-btn sell go" id="ecSave">Vender</button></div>'
    );
    box.querySelector('#ecCancel').onclick = closeModal;
    box.querySelector('#ecSave').onclick = function () { self.doSell(bandId); };
    box.querySelector('#ecAdv').focus();
  };
  Calendar.prototype.doSell = async function (bandId) {
    var k = this.ensureKey(); if (!k) return toast('Necesitas la clave', true);
    var g = function (id) { return document.getElementById(id); };
    var body = {
      key: k, screen: this.o.screen, date: this.o.date, bandId: bandId,
      slots: Math.max(1, parseInt(g('ecSlots').value, 10) || 1),
      advertiser: g('ecAdv').value.trim(), title: g('ecTtl').value.trim(),
      creative: { type: g('ecType').value, url: g('ecUrl').value.trim(), name: g('ecTtl').value.trim() },
      cpm: parseFloat(g('ecCpm').value) || 0, price: parseFloat(g('ecPrice').value) || 0
    };
    if (!body.advertiser) return toast('Pon un anunciante', true);
    try { await api(this.o.workerBase, '/grid/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); closeModal(); toast('Hueco vendido ✓'); this.refresh(); }
    catch (e) { toast(e.message === 'no-space' ? 'No quedan huecos' : ('Error: ' + e.message), true); }
  };

  // ── Contenido propio (role owner) ──
  Calendar.prototype.openOwn = function (bandId) {
    var self = this, d = this.day;
    var bandOpts = d.bands.map(function (b) { return '<option value="' + b.id + '"' + (b.id === bandId ? ' selected' : '') + '>' + esc(b.label) + ' (' + b.free + ' libres)</option>'; }).join('');
    var box = openModal(
      '<h3>Añadir contenido propio</h3><p class="ec-sub">' + esc(this.o.screenName || this.o.screen) + ' · ' + esc(this.o.date) + '</p>' +
      '<div class="ec-f"><label>Título</label><input id="ecTtl" placeholder="Ej. Promo de la casa"></div>' +
      '<div class="ec-row"><div class="ec-f"><label>Franja</label><select id="ecBand">' + bandOpts + '</select></div><div class="ec-f"><label>Huecos</label><input id="ecSlots" type="number" value="1" min="1"></div></div>' +
      '<label style="display:block;font-size:11px;color:var(--ec-mut);font-family:ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Origen del creativo</label>' +
      '<div class="ec-seg"><button data-src="url" class="on">Pegar URL</button><button data-src="file">Subir archivo</button></div>' +
      '<div class="ec-f" id="ecUrlF"><label>URL</label><input id="ecUrl" type="url" placeholder="https://…/spot.mp4"></div>' +
      '<div class="ec-f" id="ecFileF" style="display:none"><label>Archivo (vídeo/imagen, máx 80MB)</label><input id="ecFile" type="file" accept="video/*,image/*"><div class="ec-up" id="ecUp"></div></div>' +
      '<div class="ec-f"><label>Tipo</label><select id="ecType"><option value="video">Vídeo</option><option value="image">Imagen</option></select></div>' +
      '<div class="ec-act"><button class="ec-btn ghost" id="ecCancel">Cancelar</button><button class="ec-btn own go" id="ecSave">Añadir a la playlist</button></div>'
    );
    var src = 'url';
    function setSrc(s) { src = s; box.querySelectorAll('.ec-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.src === s); }); box.querySelector('#ecUrlF').style.display = s === 'url' ? '' : 'none'; box.querySelector('#ecFileF').style.display = s === 'file' ? '' : 'none'; }
    box.querySelectorAll('.ec-seg button').forEach(function (b) { b.onclick = function () { setSrc(b.dataset.src); }; });
    box.querySelector('#ecCancel').onclick = closeModal;
    box.querySelector('#ecSave').onclick = function () { self.doOwn(function () { return src; }); };
    box.querySelector('#ecTtl').focus();
  };
  Calendar.prototype.uploadFile = async function (file) {
    var k = this.ensureKey(); if (!k) throw new Error('sin clave');
    var ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    var up = document.getElementById('ecUp'); if (up) up.textContent = 'Subiendo…';
    var r = await fetch(this.o.workerBase + '/grid/upload?circuit=' + encodeURIComponent(this.o.circuit || 'x') + '&ext=' + encodeURIComponent(ext) + '&key=' + encodeURIComponent(k), { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    var d = await r.json(); if (!r.ok || d.error) throw new Error(d.error || 'upload');
    if (up) up.textContent = 'Subido ✓'; return d.url;
  };
  Calendar.prototype.doOwn = async function (getSrc) {
    var k = this.ensureKey(); if (!k) return toast('Necesitas la clave', true);
    var g = function (id) { return document.getElementById(id); };
    var title = g('ecTtl').value.trim(); if (!title) return toast('Pon un título', true);
    var url = g('ecUrl').value.trim();
    try {
      if (getSrc() === 'file') { var f = g('ecFile').files[0]; if (!f) return toast('Elige un archivo', true); url = await this.uploadFile(f); }
      if (!url) return toast('Falta el creativo', true);
      await api(this.o.workerBase, '/grid/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        key: k, screen: this.o.screen, date: this.o.date, bandId: g('ecBand').value, slots: Math.max(1, parseInt(g('ecSlots').value, 10) || 1),
        status: 'own', advertiser: this.o.storeName || 'Propio', title: title, creative: { type: g('ecType').value, url: url, name: title }
      }) });
      closeModal(); toast('Contenido propio añadido ✓'); this.refresh();
    } catch (e) { toast(e.message === 'no-space' ? 'No quedan huecos' : ('Error: ' + e.message), true); }
  };

  // ── Decidir oferta (role owner) / quitar ──
  Calendar.prototype.decide = async function (id, decision) {
    var k = this.ensureKey(); if (!k) return toast('Necesitas la clave', true);
    try { await api(this.o.workerBase, '/grid/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, screen: this.o.screen, date: this.o.date, id: id, decision: decision }) });
      toast(decision === 'accept' ? 'Oferta aceptada ✓' : 'Oferta rechazada'); this.refresh(); }
    catch (e) { toast('Error: ' + e.message, true); }
  };
  Calendar.prototype.unbook = async function (id) {
    if (!confirm('¿Quitar este contenido?')) return;
    var k = this.ensureKey(); if (!k) return;
    try { await api(this.o.workerBase, '/grid/unbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, screen: this.o.screen, date: this.o.date, id: id }) }); toast('Quitado'); this.refresh(); }
    catch (e) { toast('Error: ' + e.message, true); }
  };

  // ── Emitir (push a /signage/now) — opcional para hosts con esa capacidad ──
  Calendar.prototype.emit = async function () {
    var k = this.ensureKey(); if (!k) return toast('Necesitas la clave', true);
    try { var d = await api(this.o.workerBase, '/grid/emit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, screen: this.o.screen }) });
      toast(d.pushed && d.pushed.length ? ('Emitido a: ' + d.pushed.join(', ')) : 'Sin pixerScreen'); return d; }
    catch (e) { toast('Error: ' + e.message, true); }
  };

  global.EmissionCalendar = {
    mount: function (container, opts) { return new Calendar(container, opts); },
    toast: toast,
    version: '1.0.0',
  };
})(typeof window !== 'undefined' ? window : this);
