/* ============================================================
   TRUCXPRESS — request popup
   Any element with data-popup="<form key>" opens a dialog whose
   fields match that button's purpose. Submissions go to send.php
   (Hostinger PHP mail); if that is unavailable the visitor's email
   app opens with every answer filled in.
   ============================================================ */
(function () {
  'use strict';

  const INBOX = 'info@trucxpress.com';
  const PHONE = '+1 (928) 613-2787';
  const EQUIP = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only', 'Box Truck', 'Hotshot'];

  const svg = (d) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    user: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m3-3h-6"/>'),
    clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    truck: svg('<path d="M10 17h4V5H2v12h3m14 0h3v-6l-4-5h-4v11h2"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    dollar: svg('<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
    doc: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>'),
  };

  /* ---- shared field definitions ---- */
  const F = {
    name: { name: 'full_name', label: 'Full name', type: 'text', req: true, half: true, ac: 'name', ph: 'John Carter' },
    phone: { name: 'phone', label: 'Phone', type: 'tel', req: true, half: true, ac: 'tel', ph: '+1 (555) 000-0000' },
    email: { name: 'email', label: 'Email', type: 'email', req: true, half: true, ac: 'email', ph: 'you@company.com' },
    mc: { name: 'mc_number', label: 'MC number', hint: 'leave blank if new', type: 'text', half: true, ph: 'MC-123456' },
    equipMulti: { name: 'equipment', label: 'Equipment', type: 'checks', options: EQUIP, req: true },
    equipOne: { name: 'equipment', label: 'Equipment', type: 'chips', options: EQUIP, req: true },
    fleet: { name: 'fleet_size', label: 'Fleet size', type: 'chips', options: ['1 truck', '2–5 trucks', '6–10 trucks', '10+ trucks'], req: true },
  };

  const FORMS = {
    hire: {
      icon: 'user', eyebrow: 'Carrier sign-up', title: 'Hire your dispatcher',
      sub: 'Tell us about your operation and we will pair you with a dedicated dispatcher for your lanes.',
      perks: ['No upfront fees', 'Commission only', 'You approve every load'],
      submit: 'Request my dispatcher',
      fields: [F.name, F.phone, F.email, F.mc, F.equipMulti, F.fleet,
        { name: 'lanes', label: 'Preferred lanes or regions', type: 'text', ph: 'e.g. AZ to TX, Midwest, no Northeast' },
        { name: 'notes', label: 'Anything else we should know?', type: 'textarea', ph: 'Home time, hazmat, team drivers…' }],
    },
    availability: {
      icon: 'clock', eyebrow: 'Dispatcher availability', title: 'Check dispatcher availability',
      sub: 'Tell us where your truck is and when it is free, and we will confirm whether a dispatcher can take it on.',
      perks: ['No commitment', 'Free to ask'],
      submit: 'Check availability',
      fields: [F.name, F.phone, F.equipOne,
        { name: 'truck_location', label: 'Truck location', type: 'text', req: true, half: true, ph: 'City, State' },
        { name: 'available_from', label: 'Available from', type: 'date', req: true, half: true },
        { name: 'lanes', label: 'Where do you want to run?', type: 'text', ph: 'Regions or lanes you prefer' }],
    },
    'dispatch-today': {
      icon: 'truck', eyebrow: 'Load request', title: 'Get dispatched today',
      sub: 'Your truck is empty or about to be. Share where it is and when it is ready, and a dispatcher starts searching.',
      perks: ['Verified brokers only', 'Rate negotiated for you'],
      submit: 'Find me a load',
      fields: [F.name, F.phone, F.equipOne,
        { name: 'current_location', label: 'Where is the truck now?', type: 'text', req: true, half: true, ph: 'City, State' },
        { name: 'ready_at', label: 'Empty / ready at', type: 'datetime-local', req: true, half: true },
        { name: 'destination', label: 'Preferred destination', hint: 'optional', type: 'text', half: true, ph: 'City, State or region' },
        { name: 'target_rate', label: 'Target rate per mile', hint: 'optional', type: 'text', half: true, ph: '$2.50' }],
    },
    findload: {
      icon: 'search', eyebrow: 'Load search', title: 'Find loads for your truck',
      titleWith: (eq) => `Find ${eq} loads`,
      sub: 'Pick your equipment and pickup area. We search verified brokers for freight that fits your lanes and rate.',
      perks: ['Vetted brokers', 'No forced loads'],
      submit: 'Search loads',
      fields: [F.name, F.phone, F.equipOne,
        { name: 'pickup_area', label: 'Pickup area', type: 'text', req: true, half: true, ph: 'City, State' },
        { name: 'ready_date', label: 'Ready date', type: 'date', req: true, half: true },
        { name: 'delivery_preference', label: 'Where do you want to deliver?', type: 'text', ph: 'Lanes or regions you prefer' }],
    },
    quote: {
      icon: 'dollar', eyebrow: 'Free quote', title: 'Get your dispatch rate',
      sub: 'We work on commission only. Share your setup and we will send the exact percentage for your truck.',
      perks: ['No upfront fees', 'No contracts', 'Free quote'],
      submit: 'Get my quote',
      fields: [F.name, F.phone, F.email,
        { name: 'weekly_miles', label: 'Average weekly miles', type: 'select', half: true, options: ['Under 1,500', '1,500–2,500', '2,500–3,500', '3,500+', 'Not sure'] },
        F.equipMulti, F.fleet,
        { name: 'current_setup', label: 'How are you booking loads today?', type: 'chips', req: true, options: ['Self-dispatching', 'Using another dispatcher', 'New authority'] },
        { name: 'questions', label: 'Questions about pricing', type: 'textarea' }],
    },
    start: {
      icon: 'doc', eyebrow: 'Carrier setup', title: 'Start your carrier setup',
      sub: 'We handle onboarding: authority, insurance review and carrier packets. Tell us where you stand today.',
      perks: ['New MCs welcome', 'Paperwork handled'],
      submit: 'Start my setup',
      fields: [F.name, F.phone, F.email, F.mc,
        { name: 'dot_number', label: 'DOT number', hint: 'optional', type: 'text', half: true },
        { name: 'authority_status', label: 'Authority status', type: 'chips', req: true, options: ['Active 1+ year', 'Active under 1 year', 'New, under 90 days', 'Not active yet'] },
        { name: 'insurance', label: 'Insurance', type: 'chips', req: true, options: ['In place', 'In progress', 'Not yet'] },
        F.equipMulti,
        { name: 'documents_ready', label: 'Documents you already have', hint: 'optional', type: 'checks', options: ['MC authority letter', 'W-9', 'Certificate of insurance', 'Voided check or NOA'] }],
    },
  };

  /* ---- helpers ---- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let uid = 0;

  function fieldHTML(f, preset) {
    const id = `tx-${f.name}-${++uid}`;
    const label = `${esc(f.label)}${f.req ? ' <span class="req">*</span>' : ''}${f.hint ? ` <span class="hint">(${esc(f.hint)})</span>` : ''}`;
    const cls = `tx-field${f.half ? ' half' : ''}`;
    if (f.type === 'chips' || f.type === 'checks') {
      const multi = f.type === 'checks';
      const opts = f.options.map((o, i) => {
        const checked = preset && preset === o ? ' checked' : '';
        const req = !multi && f.req && i === 0 ? ' required' : '';
        return `<label><input type="${multi ? 'checkbox' : 'radio'}" name="${f.name}${multi ? '[]' : ''}" value="${esc(o)}"${checked}${req}><span>${esc(o)}</span></label>`;
      }).join('');
      return `<fieldset class="${cls}" style="border:0;padding:0;margin:0" data-group="${f.name}" data-multi="${multi ? 1 : 0}" data-req="${f.req ? 1 : 0}">
        <legend class="tx-label" style="padding:0;margin-bottom:7px">${label}</legend>
        <div class="tx-chips">${opts}</div><div class="tx-error" aria-live="polite"></div></fieldset>`;
    }
    const common = `id="${id}" name="${f.name}"${f.req ? ' required' : ''}${f.ac ? ` autocomplete="${f.ac}"` : ''}${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}`;
    let control;
    if (f.type === 'textarea') control = `<textarea ${common}></textarea>`;
    else if (f.type === 'select') control = `<select ${common}><option value="">Select…</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
    else {
      const extra = f.type === 'tel' ? ' pattern="[0-9+()\\-\\s.]{7,}" inputmode="tel"' : '';
      control = `<input type="${f.type}" ${common}${extra}>`;
    }
    return `<div class="${cls}"><label for="${id}">${label}</label>${control}</div>`;
  }

  /* ---- dialog shell (built once) ---- */
  const dlg = document.createElement('dialog');
  dlg.className = 'tx-modal';
  dlg.setAttribute('aria-labelledby', 'tx-title');
  document.body.appendChild(dlg);
  let lastTrigger = null, openedAt = 0;

  function lockScroll(on) {
    const html = document.documentElement;
    if (on) {
      const gap = window.innerWidth - html.clientWidth;
      html.style.overflow = 'hidden';
      if (gap > 0) html.style.paddingRight = gap + 'px';
    } else {
      html.style.overflow = '';
      html.style.paddingRight = '';
    }
  }

  function open(key, trigger) {
    const cfg = FORMS[key] || FORMS.hire;
    const preset = trigger && trigger.dataset.equipment;
    const title = preset && cfg.titleWith ? cfg.titleWith(preset) : cfg.title;
    lastTrigger = trigger || null;
    openedAt = Date.now();
    dlg.innerHTML = `
      <div class="tx-inner">
        <div class="tx-head">
          <button type="button" class="tx-close" aria-label="Close">${svg('<path d="M18 6 6 18M6 6l12 12"/>')}</button>
          <div class="tx-badge">${ICONS[cfg.icon]}</div>
          <span class="tx-eyebrow">${esc(cfg.eyebrow)}</span>
          <h2 id="tx-title">${esc(title)}</h2>
          <p>${esc(cfg.sub)}</p>
          <div class="tx-perks">${cfg.perks.map((p) => `<span>✓ ${esc(p)}</span>`).join('')}</div>
        </div>
        <div class="tx-body">
          <form novalidate>
            <div class="tx-grid">${cfg.fields.map((f) => fieldHTML(f, f.name === 'equipment' ? preset : null)).join('')}</div>
            <div class="tx-hp" aria-hidden="true"><label>Website <input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>
            <div class="tx-foot">
              <button type="submit" class="btn btn-primary">${esc(cfg.submit)}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </button>
              <small>Prefer to talk? Call <a href="tel:+19286132787">${PHONE}</a></small>
            </div>
          </form>
        </div>
      </div>`;
    dlg.querySelector('.tx-close').addEventListener('click', close);
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      send(form, key, title, (mode, data) => showDone(mode, data));
    });
    lockScroll(true);
    dlg.showModal();
    const first = dlg.querySelector('input:not([type=hidden]):not([tabindex="-1"]), select, textarea');
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus();
  }

  function close() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', () => {
    lockScroll(false);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });

  function validate(form) {
    let ok = true, firstBad = null;
    form.querySelectorAll('fieldset[data-req="1"]').forEach((fs) => {
      const err = fs.querySelector('.tx-error');
      const any = fs.querySelector('input:checked');
      err.textContent = any ? '' : (fs.dataset.multi === '1' ? 'Pick at least one.' : 'Pick one.');
      if (!any) { ok = false; firstBad = firstBad || fs.querySelector('input'); }
    });
    form.querySelectorAll('input:not([type=radio]):not([type=checkbox]), select, textarea').forEach((el) => {
      if (!el.checkValidity()) { ok = false; firstBad = firstBad || el; }
    });
    if (!ok && firstBad) {
      if (firstBad.type !== 'radio' && firstBad.type !== 'checkbox') firstBad.reportValidity();
      firstBad.focus();
    }
    return ok;
  }

  /* ---- sending ---- */
  function readable(form) {
    const out = [];
    const seen = new Set();
    new FormData(form).forEach((v, k) => {
      const key = k.replace(/\[\]$/, '');
      if (key === 'company_website' || seen.has(key)) return;
      seen.add(key);
      const val = new FormData(form).getAll(k).join(', ');
      if (val) out.push([key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), val]);
    });
    return out;
  }

  function send(form, key, title, done) {
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const data = new FormData(form);
    data.append('form_type', key);
    data.append('form_title', title);
    data.append('page', location.pathname);
    data.append('elapsed_ms', String(Date.now() - openedAt));
    const fields = readable(form);
    fetch('send.php', { method: 'POST', body: data })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => (j && j.ok ? done('sent', fields) : Promise.reject('mail')))
      .catch(() => {
        const name = fields.find(([k]) => /name/i.test(k));
        const subject = `TrucXpress: ${title}${name ? ' - ' + name[1] : ''}`;
        const body = fields.map(([k, v]) => `${k}: ${v}`).join('\n');
        window.location.href = `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        done('mailto', fields);
      })
      .finally(() => { btn.disabled = false; });
  }

  function doneHTML(mode, fields) {
    const name = (fields.find(([k]) => /name/i.test(k)) || [])[1] || '';
    const first = name.split(' ')[0];
    const phone = (fields.find(([k]) => k === 'Phone') || [])[1];
    const msg = mode === 'sent'
      ? `Thanks${first ? ', ' + esc(first) : ''}. A TrucXpress dispatcher will contact you${phone ? ' at ' + esc(phone) : ''}.`
      : 'Your email app opened with your answers filled in. Press send there and we will get back to you.';
    return `<div class="tx-tick">${svg('<path d="M20 6 9 17l-5-5"/>')}</div>
      <h2>${mode === 'sent' ? 'Request received' : 'Almost done'}</h2>
      <p>${msg}</p>`;
  }

  function showDone(mode, fields) {
    dlg.querySelector('.tx-body').outerHTML = `<div class="tx-done">${doneHTML(mode, fields)}
      <button type="button" class="btn btn-ghost tx-ok">Close</button></div>`;
    dlg.querySelector('.tx-ok').addEventListener('click', close);
  }

  /* ---- triggers ---- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-popup]');
    if (!t) return;
    e.preventDefault();
    open(t.dataset.popup, t);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest('[data-popup][role="button"]');
    if (!t) return;
    e.preventDefault();
    open(t.dataset.popup, t);
  });

  /* ---- inline contact forms use the same sender ---- */
  document.querySelectorAll('#contact-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      openedAt = openedAt || Date.now() - 5000;
      send(form, 'contact', 'Contact form', (mode, fields) => {
        form.innerHTML = `<div class="tx-done" style="padding:20px 0">${doneHTML(mode, fields)}</div>`;
      });
    });
  });

  window.TXPopup = { open };
})();
