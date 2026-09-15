"use strict";

// PWA di sola lettura: legge rosa.json, formazione.json e accuratezza.json
// (generati da esporta_dati_app.py nel repo privato) e li rende con lo
// stesso stile del mockup di design. Nessuna logica di scoring/calcolo qui
// dentro: solo formattazione di dati gia' calcolati.

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

// Dal campo rischio_squalifica di un giocatore in rosa.json (vedi design.md
// sez. 16 nel repo privato: {ammonizioni, prossima_soglia, distanza,
// a_rischio, affidabile}) allo stato del badge da mostrare sulla card.
//
// Tre stati distinti, mai due, e il terzo NON e' un sinonimo del secondo:
// - 'rischio'  -> a_rischio true: badge pieno, il giocatore e' diffidato.
// - null       -> a_rischio false, o l'intero campo assente (es. esordiente
//                 senza ancora righe nella fonte): nessun badge.
// - 'incerto'  -> a_rischio null perche' affidabile e' false. Il motore ha
//                 smesso di giudicare (un azzeramento cartellini di Lega
//                 Serie A non ancora configurato rende il conteggio grezzo
//                 non piu' affidabile - vedi statistiche_stagione.py nel
//                 repo privato), NON "nessun rischio": va reso in modo
//                 visibilmente diverso sia dal pieno sia dal niente.
//
// Pura, nessun accesso al DOM: testabile in isolamento.
function statoBadgeSqualifica(rischio) {
  if (!rischio) return null;

  if (rischio.affidabile === false) {
    return {
      tipo: 'incerto',
      testo: 'dato incerto',
      titolo: `Rischio squalifica non aggiornato dopo un azzeramento cartellini non ancora configurato (${rischio.ammonizioni} ammonizioni registrate).`,
    };
  }

  if (rischio.a_rischio === true) {
    return {
      tipo: 'rischio',
      testo: 'diffidato',
      titolo: `A un cartellino dalla squalifica: ${rischio.ammonizioni}/${rischio.prossima_soglia} ammonizioni.`,
    };
  }

  return null;
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
      const chipChildren = [
        textEl('span', 'avatar avatar-28', iniz(p.nome)),
        el('div', 'player-chip-body', [
          textEl('div', 'player-chip-nome', p.nome),
          textEl('div', 'player-chip-meta', sottoParti.join(' · ')),
        ]),
      ];

      const badgeInfo = statoBadgeSqualifica(p.rischio_squalifica);
      if (badgeInfo) {
        const badge = textEl('span', `badge-squalifica badge-squalifica-${badgeInfo.tipo}`, badgeInfo.testo);
        badge.title = badgeInfo.titolo;
        chipChildren.push(badge);
      }

      const chip = el('div', 'player-chip', chipChildren);
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

// Costruisce un blocco "formazione-layout" completo (campo + colonna
// laterale con modulo/punteggio atteso/panchina/esclusi) per UNA vista
// (una delle due chiavi migliore_assoluto/quattro_tre_tre di formazione.json,
// vedi esporta_dati_app.py). Usata sia per il caso "una sola formazione"
// che per il confronto affiancato, cosi' la card non e' duplicata nel codice.
function renderBloccoFormazione(vista, { titolo, badge, giornata } = {}) {
  const repartiByRole = {};
  for (const rep of vista.reparti || []) repartiByRole[rep.ruolo] = rep.titolari || [];

  const fieldEl = el('div', 'field', []);
  for (const ruolo of ROLE_ORDER_CAMPO) {
    const titolari = repartiByRole[ruolo] || [];
    if (titolari.length === 0) continue;
    fieldEl.appendChild(el('div', 'reparto', titolari.map(playerCardCampo)));
  }

  const fieldCard = el('div', 'card field-card', [
    el('div', 'field-header', [
      textEl('div', 'card-title', 'Schierala così'),
      textEl('div', 'badge-verdetto', 'formazione pronta'),
    ]),
    fieldEl,
  ]);

  const panchinaEl = el('div', 'panchina', []);
  const panchina = Array.isArray(vista.panchina) ? vista.panchina : [];
  panchina.forEach((p, i) => {
    const sotto = [ROLE_META[p.ruolo] ? ROLE_META[p.ruolo].singolare : p.ruolo,
                   p.fantamedia != null ? `fm ${n1(p.fantamedia)}` : null].filter(Boolean).join(' · ');
    panchinaEl.appendChild(el('div', 'panchina-row', [
      textEl('span', 'panchina-n', String(i + 1)),
      textEl('span', 'panchina-nome', p.nome),
      textEl('span', 'panchina-sotto', sotto),
    ]));
  });

  const esclusi = Array.isArray(vista.esclusi) ? vista.esclusi : [];
  const esclusiCard = esclusi.length === 0 ? null : el('div', 'card', [
    textEl('div', 'card-title small', 'Fuori, e il motivo'),
    el('div', 'esclusi', esclusi.map(p => el('div', 'escluso-row', [
      textEl('span', 'avatar avatar-30', iniz(p.nome)),
      el('div', null, [
        textEl('div', 'escluso-nome', p.nome),
        textEl('div', 'escluso-motivo', p.motivo || ''),
      ]),
    ]))),
  ]);

  const sideCol = el('div', 'side-col', [
    el('div', 'card-dark', [
      textEl('div', 'dark-label', 'Modulo'),
      textEl('div', 'dark-modulo', vista.modulo || '—'),
      el('div', 'dark-stats', [
        el('div', 'dark-stat', [
          textEl('div', 'dark-stat-label', 'Punteggio atteso'),
          textEl('div', 'dark-stat-value', vista.punteggio_atteso != null ? n1(vista.punteggio_atteso) : '—'),
        ]),
        el('div', 'dark-stat', [
          textEl('div', 'dark-stat-label', 'Giornata'),
          textEl('div', 'dark-stat-value', giornata != null ? String(giornata) : '—'),
        ]),
      ]),
    ]),
    el('div', 'card', [
      textEl('div', 'card-title small', 'Panchina, in ordine'),
      panchinaEl,
    ]),
    esclusiCard,
  ]);

  const blocco = el('div', 'formazione-blocco', []);
  if (titolo) {
    blocco.appendChild(el('div', 'formazione-blocco-titolo', [
      textEl('span', null, titolo),
      badge ? textEl('span', 'formazione-blocco-badge', badge) : null,
    ]));
  }
  blocco.appendChild(el('div', 'formazione-layout', [fieldCard, sideCol]));
  return blocco;
}

function renderFormazione(data) {
  const root = document.getElementById('formazione-root');
  root.innerHTML = '';

  const principale = data && data.migliore_assoluto;
  if (!principale) {
    root.appendChild(el('div', 'card field-card', [
      textEl('div', 'card-title', 'Schierala così'),
      textEl('div', 'card-meta', 'Formazione non ancora calcolata per questa giornata.'),
    ]));
    return;
  }

  const giornata = data.giornata;

  if (data.coincidono) {
    root.appendChild(renderBloccoFormazione(principale, {
      titolo: 'Il 4-3-3 è già la scelta migliore',
      giornata,
    }));
    return;
  }

  if (data.quattro_tre_tre) {
    const diff = data.differenza_punteggio_atteso;
    root.appendChild(el('div', 'card confronto-banner', [
      textEl('div', 'card-title small', `Il modulo migliore è il ${principale.modulo}`),
      textEl('div', 'card-meta', diff != null
        ? `Batte il 4-3-3 di ${n1(Math.abs(diff))} punti attesi.`
        : 'Confronto con il 4-3-3 classico.'),
    ]));
    root.appendChild(renderBloccoFormazione(principale, { titolo: 'Modulo migliore', badge: principale.modulo, giornata }));
    root.appendChild(renderBloccoFormazione(data.quattro_tre_tre, { titolo: '4-3-3 classico', giornata }));
  } else {
    root.appendChild(renderBloccoFormazione(principale, { titolo: 'Modulo migliore', badge: principale.modulo, giornata }));
    root.appendChild(el('div', 'card confronto-banner', [
      textEl('div', 'card-meta', data.quattro_tre_tre_motivo || 'Il modulo 4-3-3 non è calcolabile con la rosa attuale.'),
    ]));
  }
}

// ---------------------------------------------------------------------------
// L'accuratezza storica (MAE per giornata)
// ---------------------------------------------------------------------------
// accuratezza.json (vedi design.md sez. 16 nel repo privato):
// {stagione, generato_il, giornate: [{giornata, mae, count}, ...]}.
// Nessun calcolo qui: solo formattazione di un MAE gia' calcolato da
// scripts/backtesting.py::calcola_mae_per_giornata.

function scalaLineare(valore, dominioMin, dominioMax, rangeMin, rangeMax) {
  if (dominioMax === dominioMin) return (rangeMin + rangeMax) / 2;
  const t = (valore - dominioMin) / (dominioMax - dominioMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

// Dalle giornate {giornata, mae, count} ai punti del grafico a linee SVG.
// Pura, nessun accesso al DOM: testabile in isolamento. Null se non c'e'
// nessuna giornata (il chiamante decide cosa mostrare in quel caso).
//
// L'asse Y e' invertito rispetto ai dati (MAE piu' basso, cioe' migliore,
// sta piu' in alto nel grafico): e' la lettura naturale di un grafico
// "andamento dell'errore", non un dettaglio implementativo da nascondere.
function costruisciGraficoMae(giornate, { larghezza = 600, altezza = 200, padding = 28 } = {}) {
  if (!Array.isArray(giornate) || giornate.length === 0) return null;

  const maeValori = giornate.map(g => g.mae);
  const maeMinDati = Math.min(...maeValori);
  const maeMaxDati = Math.max(...maeValori);
  // Se tutte le giornate hanno lo stesso MAE il dominio sarebbe degenere
  // (dominioMin === dominioMax): un margine simbolico mantiene la linea
  // leggibile a meta' altezza invece di schiacciarla su un bordo per un
  // effetto di scalaLineare che non ha nulla a che fare col dato reale.
  const yMin = maeMinDati === maeMaxDati ? maeMinDati - 0.5 : maeMinDati;
  const yMax = maeMinDati === maeMaxDati ? maeMaxDati + 0.5 : maeMaxDati;

  const giornataMin = giornate[0].giornata;
  const giornataMax = giornate[giornate.length - 1].giornata;

  const punti = giornate.map(g => ({
    giornata: g.giornata,
    mae: g.mae,
    count: g.count,
    x: scalaLineare(g.giornata, giornataMin, giornataMax, padding, larghezza - padding),
    // MAE piu' basso (migliore) -> y piu' piccola (piu' in alto nell'SVG,
    // dove y cresce verso il basso): yMin (il migliore) mappa a `padding`
    // (in alto), yMax (il peggiore) mappa a `altezza - padding` (in basso).
    y: scalaLineare(g.mae, yMin, yMax, padding, altezza - padding),
  }));

  return {
    larghezza, altezza, padding,
    puntiPolilinea: punti.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    punti,
    maeMin: maeMinDati,
    maeMax: maeMaxDati,
  };
}

function svgEl(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
  return node;
}

function renderAccuratezza(data) {
  const root = document.getElementById('accuratezza-root');
  root.innerHTML = '';

  const giornate = data && Array.isArray(data.giornate) ? data.giornate : [];

  if (giornate.length === 0) {
    root.appendChild(el('div', 'card', [
      textEl('div', 'card-title', 'Accuratezza delle previsioni'),
      textEl('div', 'card-meta', 'Dati non ancora disponibili: si popolano dopo che post_giornata.py gira sulla prima giornata giocata.'),
    ]));
    return;
  }

  const grafico = costruisciGraficoMae(giornate);
  const media = giornate.reduce((s, g) => s + g.mae, 0) / giornate.length;
  const ultima = giornate[giornate.length - 1];

  const svg = svgEl('svg', {
    viewBox: `0 0 ${grafico.larghezza} ${grafico.altezza}`,
    class: 'mae-chart-svg',
    role: 'img',
    'aria-label': `Andamento del MAE dalla giornata ${giornate[0].giornata} alla ${ultima.giornata}: da ${n1(giornate[0].mae)} a ${n1(ultima.mae)}`,
  });

  svg.appendChild(svgEl('line', {
    x1: grafico.padding, x2: grafico.larghezza - grafico.padding,
    y1: grafico.altezza / 2, y2: grafico.altezza / 2,
    class: 'mae-chart-asse',
  }));

  svg.appendChild(svgEl('polyline', { points: grafico.puntiPolilinea, class: 'mae-chart-linea' }));

  for (const p of grafico.punti) {
    const punto = svgEl('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 3.5, class: 'mae-chart-punto' });
    const titolo = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titolo.textContent = `Giornata ${p.giornata}: MAE ${n1(p.mae)} (${p.count} giocatori)`;
    punto.appendChild(titolo);
    svg.appendChild(punto);
  }

  const chartCard = el('div', 'card', [
    el('div', 'field-header', [
      textEl('div', 'card-title', 'Accuratezza delle previsioni'),
      textEl('div', 'card-meta', `Media stagionale ${n1(media)} · ultima giornata ${n1(ultima.mae)}`),
    ]),
    textEl('div', 'card-meta mae-chart-nota', 'Errore medio (MAE) fra punteggio atteso e voto reale, giornata per giornata — più basso è meglio.'),
    el('div', 'mae-chart-wrap', [svg]),
    el('div', 'mae-lista', giornate.map(g => el('div', 'mae-row', [
      textEl('span', 'mae-row-giornata', `G${g.giornata}`),
      textEl('span', 'mae-row-valore', n1(g.mae)),
      textEl('span', 'mae-row-count', `${g.count} giocatori`),
    ]))),
  ]);

  root.appendChild(chartCard);
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
  document.getElementById('tab-accuratezza').addEventListener('click', () => mostraSchermata('accuratezza'));

  let schermataIniziale = 'rosa';
  if (location.hash === '#formazione') {
    // Arrivo dal tap su una notifica push (vedi sw.js/notificationclick).
    schermataIniziale = 'formazione';
  } else {
    try {
      const salvata = localStorage.getItem('fo:schermata');
      if (['rosa', 'formazione', 'accuratezza'].includes(salvata)) schermataIniziale = salvata;
    } catch (e) { /* privacy mode: usa il default */ }
  }
  mostraSchermata(schermataIniziale);

  const [rosa, formazione, accuratezza] = await Promise.all([
    fetchJSON('./rosa.json'),
    fetchJSON('./formazione.json'),
    fetchJSON('./accuratezza.json'),
  ]);

  if (!rosa && !formazione && !accuratezza) {
    document.getElementById('empty-state').hidden = false;
  }

  renderRosa(rosa);
  renderFormazione(formazione);
  renderAccuratezza(accuratezza);

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

// Solo in un vero browser: caricare questo file con `require` da un test
// Node (vedi tests/app.test.js) non deve toccare il DOM.
if (typeof document !== 'undefined') {
  init();
}

// Espone le funzioni pure per i test (node:test, nessuna dipendenza).
// Non ha effetto nel browser: un semplice <script> non definisce `module`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    n1, pct, iniz,
    statoBadgeSqualifica,
    scalaLineare, costruisciGraficoMae,
  };
}
