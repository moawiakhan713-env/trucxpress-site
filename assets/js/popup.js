/* ============================================================
   TRUCXPRESS — request popup
   Any element with data-popup="<form key>" opens a dialog whose
   fields match that button's purpose. Submissions go to send.php
   (Hostinger), which emails info@trucxpress.com. If that fails the
   visitor gets one-click Gmail / Outlook / copy options with every
   answer filled in, never a silent mailto. Every mailto: link on the
   site opens the same chooser, because a mailto link does nothing on
   a computer with no email app set up.
   ============================================================ */
(function () {
  'use strict';

  const INBOX = 'info@trucxpress.com';
  const PHONE = '+1 (313) 459-3803';
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
              <small>Prefer to talk? WhatsApp <a href="https://wa.me/13134593803" target="_blank" rel="noopener">${PHONE}</a></small>
            </div>
          </form>
        </div>
      </div>`;
    dlg.querySelector('.tx-close').addEventListener('click', close);
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      send(form, key, title, (mode, data) => showDone(mode, data, title));
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
    const label = btn.innerHTML;
    btn.innerHTML = 'Sending…';
    const data = new FormData(form);
    data.append('form_type', key);
    data.append('form_title', title);
    data.append('page', location.pathname);
    data.append('elapsed_ms', String(Date.now() - openedAt));
    const fields = readable(form);
    fetch('/send.php', { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => (j && j.ok ? done('sent', fields) : Promise.reject('mail')))
      .catch(() => done('fallback', fields, title))
      .finally(() => { btn.disabled = false; btn.innerHTML = label; });
  }

  /* ---- email helpers (used by the fallback and by every mailto link) ---- */
  const enc = encodeURIComponent;
  function mailLinks(to, subject, body) {
    const q = (pairs) => pairs.filter(([, v]) => v).map(([k, v]) => `${k}=${enc(v)}`).join('&');
    return {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&${q([['to', to], ['su', subject], ['body', body]])}`,
      outlook: `https://outlook.live.com/mail/0/deeplink/compose?${q([['to', to], ['subject', subject], ['body', body]])}`,
      app: `mailto:${to}${subject || body ? '?' + q([['subject', subject], ['body', body]]) : ''}`,
    };
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (err) { rej(err); }
      ta.remove();
    });
  }
  const I = {
    gmail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>'),
    outlook: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/><path d="M8 19v-3"/>'),
    app: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  };
  function pickHTML(links, copyLabel) {
    return `<div class="tx-pick">
        <a class="tx-pick-btn" href="${links.gmail}" target="_blank" rel="noopener">${I.gmail}<span>Gmail</span></a>
        <a class="tx-pick-btn" href="${links.outlook}" target="_blank" rel="noopener">${I.outlook}<span>Outlook / Hotmail</span></a>
        <a class="tx-pick-btn" href="${links.app}" data-mail-app>${I.app}<span>Email app</span></a>
        <button type="button" class="tx-pick-btn" data-copy>${I.copy}<span>${esc(copyLabel)}</span></button>
      </div>`;
  }
  function wireCopy(root, text, label) {
    const b = root.querySelector('[data-copy]');
    if (!b) return;
    b.addEventListener('click', () => {
      const span = b.querySelector('span');
      copyText(text)
        .then(() => { span.textContent = 'Copied ✓'; })
        .catch(() => { span.textContent = 'Copy failed: ' + INBOX; })
        .finally(() => setTimeout(() => { span.textContent = label; }, 2600));
    });
  }
  const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.)/.test(location.hostname) || location.protocol === 'file:';

  function doneHTML(mode, fields, title) {
    const get = (k) => (fields.find(([f]) => f === k) || [])[1] || '';
    const name = get('Full name') || [get('First name'), get('Last name')].filter(Boolean).join(' ');
    const first = name.split(' ')[0];
    const phone = (fields.find(([k]) => k === 'Phone') || [])[1];
    if (mode === 'sent') {
      return `<div class="tx-tick">${svg('<path d="M20 6 9 17l-5-5"/>')}</div>
        <h2>Request received</h2>
        <p>Thanks${first ? ', ' + esc(first) : ''}. A TrucXpress dispatcher will contact you${phone ? ' at ' + esc(phone) : ''}.</p>`;
    }
    const subject = `TrucXpress: ${title}${name ? ' - ' + name : ''}`;
    const body = fields.map(([k, v]) => `${k}: ${v}`).join('\n');
    return `<div class="tx-tick tx-warn">${svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>')}</div>
      <h2>One more click to send</h2>
      <p>Our form could not send this automatically. Pick how you email and your answers are already filled in, or copy them and send to <strong>${INBOX}</strong>.</p>
      ${pickHTML(mailLinks(INBOX, subject, body), 'Copy my answers')}
      <p class="tx-call">${I.phone} Faster: WhatsApp <a href="https://wa.me/13134593803" target="_blank" rel="noopener">${PHONE}</a></p>
      ${isLocal ? '<p class="tx-note">Preview note: the form only sends on the live website, not on a local copy.</p>' : ''}
      <textarea hidden data-copy-src>${esc(`To: ${INBOX}\nSubject: ${subject}\n\n${body}`)}</textarea>`;
  }
  function wireDone(root) {
    const src = root.querySelector('[data-copy-src]');
    if (src) wireCopy(root, src.value, 'Copy my answers');
  }

  function showDone(mode, fields, title) {
    dlg.querySelector('.tx-body').outerHTML = `<div class="tx-done">${doneHTML(mode, fields, title)}
      <button type="button" class="btn btn-ghost tx-ok">Close</button></div>`;
    wireDone(dlg.querySelector('.tx-done'));
    dlg.querySelector('.tx-ok').addEventListener('click', close);
  }

  /* ---- mailto chooser: works with or without an email app ---- */
  const picker = document.createElement('dialog');
  picker.className = 'tx-modal tx-mailpick';
  picker.setAttribute('aria-labelledby', 'tx-mp-title');
  document.body.appendChild(picker);
  function openMailPicker(href, trigger) {
    const url = new URL(href);
    const to = decodeURIComponent(url.pathname) || INBOX;
    const p = url.searchParams;
    picker.innerHTML = `<div class="tx-mp-inner">
        <button type="button" class="tx-close" aria-label="Close">${svg('<path d="M18 6 6 18M6 6l12 12"/>')}</button>
        <span class="tx-eyebrow">Email us</span>
        <h2 id="tx-mp-title">${esc(to)}</h2>
        <p>Choose how you want to write to us.</p>
        ${pickHTML(mailLinks(to, p.get('subject') || '', p.get('body') || ''), 'Copy address')}
      </div>`;
    picker.querySelector('.tx-close').addEventListener('click', () => picker.close());
    picker.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setTimeout(() => picker.close(), 150)));
    wireCopy(picker, to, 'Copy address');
    picker._trigger = trigger;
    lockScroll(true);
    picker.showModal();
  }
  picker.addEventListener('close', () => {
    if (!dlg.open) lockScroll(false);
    if (picker._trigger) picker._trigger.focus({ preventScroll: true });
  });
  picker.addEventListener('click', (e) => { if (e.target === picker) picker.close(); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a || a.hasAttribute('data-mail-app') || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openMailPicker(a.href, a);
  });

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
      send(form, 'contact', 'Contact form', (mode, fields, title) => {
        form.innerHTML = `<div class="tx-done" style="padding:20px 0">${doneHTML(mode, fields, title)}</div>`;
        wireDone(form);
      });
    });
  });

  window.TXPopup = { open };
})();
