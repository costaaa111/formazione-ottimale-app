"use strict";

// PWA di sola lettura: legge rosa.json e formazione.json (generati da
// esporta_dati_app.py) e li rende con lo stesso stile del mockup di design.
// Nessuna logica di scoring qui dentro: solo formattazione di dati gia' calcolati.

const ROLE_META = {
  P: { label: 'Portieri', singolare: 'Portiere', max: 3 },
  D: { label: 'Difensori', singolare: 'Difensore', max: 8 },
  C: { label: 'Centrocampisti', singolare: 'Centrocampista', max: 8 },
  A: { label: 'Attaccanti', singolare: 'Attaccante', max: 6 },
};
const ROLE_ORDER_ROSA = ['P', 'D', 'C', 'A'];
const ROLE_ORDER_CAMPO = ['A', 'C', 'D', 'P']; // attacco in alto, portiere in basso

function iniz(nome) {
  return (nome || '')
    .replace(/[^A-Za-zÀ-ÿ' -]/g, '')
    .split(/[ -]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function n1(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  return x.toFixed(1).replace('.', ',');
}

function pct(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return null;
  return Math.round(x * 100);
}

async function fetchJSON(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`Impossibile leggere ${path}:`, e);
    return null;
  }
}

function el(tag, className, children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const c of children || []) {
    if (c) node.appendChild(c);
  }
  return node;
}

function textEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------
// La rosa
// ---------------------------------------------------------------------------

function renderRosa(data) {
  const metaEl = document.getElementById('rosa-meta');
  const gruppiEl = document.getElementById('rosa-gruppi');
  gruppiEl.innerHTML = '';

  if (!data || !Array.isArray(data.giocatori) || data.giocatori.length === 0) {
    metaEl.textContent = 'Nessun giocatore in rosa ancora.';
    return;
  }

  const giocatori = data.giocatori;
  metaEl.textContent = `${giocatori.length} giocatori · rosa ${giocatori.length >= 25 ? 'completa' : 'incompleta'}`;

  for (const ruolo of ROLE_ORDER_ROSA) {
    const meta = ROLE_META[ruolo];
    const delRuolo = giocatori.filter(p => p.ruolo === ruolo);
    if (delRuolo.length === 0) continue;

    const head = el('div', 'gruppo-head', [
      textEl('span', 'gruppo-label', meta.label),
      textEl('span', 'gruppo-count', `${delRuolo.length}/${meta.max}`),
    ]);

    const gruppo = el('div', 'gruppo', [head]);

    for (const p of delRuolo) {
      const sottoParti = [p.squadra, p.fantamedia != null ? `fm ${n1(p.fantamedia)}` : null].filter(Boolean);
      const chip = el('div', 'player-chip', [
        textEl('span', 'avatar avatar-28', iniz(p.nome)),
        el('div', 'player-chip-body', [
          textEl('div', 'player-chip-nome', p.nome),
          textEl('div', 'player-chip-meta', sottoParti.join(' · ')),
        ]),
      ]);
      gruppo.appendChild(chip);
    }

    gruppiEl.appendChild(gruppo);
  }
}

// ---------------------------------------------------------------------------
// La formazione
// ---------------------------------------------------------------------------

function playerCardCampo(p) {
  const sottoParti = [p.fantamedia != null ? `fm ${n1(p.fantamedia)}` : null,
                      p.prob_titolarita != null ? `${pct(p.prob_titolarita)}%` : null]
    .filter(Boolean);
  const avvParti = [];
  if (p.avversario) {
    avvParti.push((p.casa_trasferta === 'casa' ? 'casa ' : 'fuori ') + p.avversario);
  }

  const children = [
    textEl('div', 'avatar avatar-46', iniz(p.nome)),
    textEl('div', 'field-player-nome', p.nome),
  ];
  if (sottoParti.length) children.push(textEl('div', 'field-player-sotto', sottoParti.join(' · ')));
  if (avvParti.length) children.push(textEl('div', 'field-player-sotto', avvParti.join('')));
  children.push(textEl('div', 'field-player-score', n1(p.score_finale)));
  if (p.flag) children.push(textEl('div', 'field-player-flag', p.flag));

  return el('div', 'field-player', children);
}

function renderFormazione(data) {
  const fieldEl = document.getElementById('field');
  const panchinaEl = document.getElementById('panchina');
  const escludiCard = document.getElementById('esclusi-card');
  const escludiEl = document.getElementById('esclusi');
  fieldEl.innerHTML = '';
  panchinaEl.innerHTML = '';
  escludiEl.innerHTML = '';

  if (!data || !Array.isArray(data.reparti) || data.reparti.length === 0) {
    document.getElementById('modulo').textContent = '—';
    document.getElementById('punteggio-atteso').textContent = '—';
    document.getElementById('giornata-valore').textContent = '—';
    document.getElementById('verdetto').textContent = '';
    fieldEl.appendChild(textEl('div', 'card-meta', 'Formazione non ancora calcolata per questa giornata.'));
    escludiCard.hidden = true;
    return;
  }

  document.getElementById('modulo').textContent = data.modulo || '—';
  document.getElementById('punteggio-atteso').textContent = data.punteggio_atteso != null ? n1(data.punteggio_atteso) : '—';
  document.getElementById('giornata-valore').textContent = data.giornata != null ? data.giornata : '—';
  document.getElementById('verdetto').textContent = 'formazione pronta';

  const repartiByRole = {};
  for (const rep of data.reparti) repartiByRole[rep.ruolo] = rep.titolari || [];

  for (const ruolo of ROLE_ORDER_CAMPO) {
    const titolari = repartiByRole[ruolo] || [];
    if (titolari.length === 0) continue;
    const riga = el('div', 'reparto', titolari.map(playerCardCampo));
    fieldEl.appendChild(riga);
  }

  const panchina = Array.isArray(data.panchina) ? data.panchina : [];
  panchina.forEach((p, i) => {
    const sotto = [ROLE_META[p.ruolo] ? ROLE_META[p.ruolo].singolare : p.ruolo,
                   p.fantamedia != null ? `fm ${n1(p.fantamedia)}` : null].filter(Boolean).join(' · ');
    const row = el('div', 'panchina-row', [
      textEl('span', 'panchina-n', String(i + 1)),
      textEl('span', 'panchina-nome', p.nome),
      textEl('span', 'panchina-sotto', sotto),
    ]);
    panchinaEl.appendChild(row);
  });

  const esclusi = Array.isArray(data.esclusi) ? data.esclusi : [];
  if (esclusi.length === 0) {
    escludiCard.hidden = true;
  } else {
    escludiCard.hidden = false;
    for (const p of esclusi) {
      const row = el('div', 'escluso-row', [
        textEl('span', 'avatar avatar-30', iniz(p.nome)),
        el('div', null, [
          textEl('div', 'escluso-nome', p.nome),
          textEl('div', 'escluso-motivo', p.motivo || ''),
        ]),
      ]);
      escludiEl.appendChild(row);
    }
  }
}

// ---------------------------------------------------------------------------
// Navigazione a tab + avvio
// ---------------------------------------------------------------------------

function mostraSchermata(nome) {
  for (const el of document.querySelectorAll('.screen')) {
    el.hidden = el.dataset.screen !== nome;
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.setAttribute('aria-selected', String(tab.dataset.screen === nome));
  }
  try { localStorage.setItem('fo:schermata', nome); } catch (e) { /* privacy mode: ignora */ }
}

async function init() {
  document.getElementById('tab-rosa').addEventListener('click', () => mostraSchermata('rosa'));
  document.getElementById('tab-formazione').addEventListener('click', () => mostraSchermata('formazione'));

  let schermataIniziale = 'rosa';
  if (location.hash === '#formazione') {
    // Arrivo dal tap su una notifica push (vedi sw.js/notificationclick).
    schermataIniziale = 'formazione';
  } else {
    try {
      const salvata = localStorage.getItem('fo:schermata');
      if (salvata === 'rosa' || salvata === 'formazione') schermataIniziale = salvata;
    } catch (e) { /* privacy mode: usa il default */ }
  }
  mostraSchermata(schermataIniziale);

  const [rosa, formazione] = await Promise.all([
    fetchJSON('./rosa.json'),
    fetchJSON('./formazione.json'),
  ]);

  if (!rosa && !formazione) {
    document.getElementById('empty-state').hidden = false;
  }

  renderRosa(rosa);
  renderFormazione(formazione);

  const giornata = formazione && formazione.giornata != null ? formazione.giornata : (rosa && rosa.giornata);
  document.getElementById('brand-sub').textContent = giornata != null
    ? `Serie A · giornata ${giornata}`
    : 'Serie A';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('Service worker non registrato:', e));
  }

  initNotifiche();
}

// ---------------------------------------------------------------------------
// Notifiche push (Web Push / VAPID)
// ---------------------------------------------------------------------------
// La PWA genera la subscription lato browser e la mostra da copiare a mano:
// non c'e' nessun backend live che la riceva, quindi va incollata come
// GitHub Secret PUSH_SUBSCRIPTION (vedi DEVELOPMENT.md). L'invio vero e
// proprio parte dal workflow GitHub Actions (scripts/notifiche_webpush.py).

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function initNotifiche() {
  const btnToggle = document.getElementById('btn-notifiche');
  const panel = document.getElementById('notifiche-panel');
  const stato = document.getElementById('notifiche-stato');
  const btnAttiva = document.getElementById('btn-attiva-notifiche');
  const subBox = document.getElementById('notifiche-sub-box');
  const subText = document.getElementById('notifiche-sub-text');
  const btnCopia = document.getElementById('btn-copia-sub');

  btnToggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });

  const supportato = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supportato) {
    stato.textContent = 'Le notifiche push non sono supportate da questo browser.';
    return;
  }

  const configurato = typeof VAPID_PUBLIC_KEY === 'string' && !VAPID_PUBLIC_KEY.startsWith('REPLACE_');
  if (!configurato) {
    stato.textContent = 'Notifiche non ancora configurate (manca la chiave VAPID pubblica in push-config.js).';
    return;
  }

  stato.textContent = 'Non ancora attivate su questo dispositivo.';
  btnAttiva.hidden = false;

  btnAttiva.addEventListener('click', async () => {
    btnAttiva.disabled = true;
    try {
      const permesso = await Notification.requestPermission();
      if (permesso !== 'granted') {
        stato.textContent = 'Permesso negato: attivalo dalle impostazioni di notifiche del browser/telefono.';
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      subText.value = JSON.stringify(subscription.toJSON(), null, 2);
      subBox.hidden = false;
      stato.textContent = "Sottoscrizione generata. Incollala come mostrato qui sotto per completare l'attivazione.";
    } catch (e) {
      console.error('Sottoscrizione push fallita:', e);
      stato.textContent = 'Errore nella sottoscrizione: ' + (e && e.message ? e.message : String(e));
    } finally {
      btnAttiva.disabled = false;
    }
  });

  btnCopia.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(subText.value);
      btnCopia.textContent = 'Copiato!';
      setTimeout(() => { btnCopia.textContent = 'Copia'; }, 2000);
    } catch (e) {
      subText.select();
    }
  });
}

init();
