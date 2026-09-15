"use strict";

// Test delle sole funzioni pure di app.js (nessun accesso al DOM): app.js
// si guarda dall'eseguire init() fuori da un browser (`typeof document`) ed
// espone le funzioni pure via module.exports solo quando `module` esiste,
// quindi puo' essere richiesto qui senza jsdom o altre dipendenze.
//
// Esegui con: node --test tests/   (oppure: npm test)

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  n1,
  statoBadgeSqualifica,
  scalaLineare,
  costruisciGraficoMae,
} = require('../app.js');

// ---------------------------------------------------------------------------
// statoBadgeSqualifica: i tre stati del badge "rischio squalifica"
// ---------------------------------------------------------------------------

test('a_rischio true produce il badge pieno "rischio"', () => {
  const stato = statoBadgeSqualifica({
    ammonizioni: 4, prossima_soglia: 5, distanza: 1, a_rischio: true, affidabile: true,
  });
  assert.equal(stato.tipo, 'rischio');
  assert.equal(stato.testo, 'diffidato');
  assert.match(stato.titolo, /4\/5/);
});

test('a_rischio false non produce alcun badge', () => {
  const stato = statoBadgeSqualifica({
    ammonizioni: 2, prossima_soglia: 5, distanza: 3, a_rischio: false, affidabile: true,
  });
  assert.equal(stato, null);
});

test('rischio_squalifica null (giocatore assente dalla fonte) non produce alcun badge', () => {
  assert.equal(statoBadgeSqualifica(null), null);
  assert.equal(statoBadgeSqualifica(undefined), null);
});

test('affidabile false produce il terzo stato "incerto", non il badge pieno ne\' il niente', () => {
  const stato = statoBadgeSqualifica({
    ammonizioni: 4, prossima_soglia: 5, distanza: 1, a_rischio: null, affidabile: false,
  });
  assert.equal(stato.tipo, 'incerto');
  assert.notEqual(stato.tipo, 'rischio');
  assert.equal(stato.testo, 'dato incerto');
  assert.match(stato.titolo, /azzeramento/);
});

test('affidabile false vince anche se a_rischio fosse true per errore nei dati a monte', () => {
  // Difesa in profondita': lo schema documentato garantisce a_rischio=null
  // quando affidabile=false, ma il rendering non deve MAI mostrare "diffidato"
  // pieno su un dato che il motore stesso segnala come non affidabile.
  const stato = statoBadgeSqualifica({
    ammonizioni: 4, prossima_soglia: 5, distanza: 1, a_rischio: true, affidabile: false,
  });
  assert.equal(stato.tipo, 'incerto');
});

// ---------------------------------------------------------------------------
// costruisciGraficoMae: dati -> punti del grafico SVG
// ---------------------------------------------------------------------------

test('array vuoto ritorna null (il chiamante decide lo stato vuoto)', () => {
  assert.equal(costruisciGraficoMae([]), null);
});

test('due giornate producono due punti in ordine, con coordinate nel range atteso', () => {
  const grafico = costruisciGraficoMae(
    [{ giornata: 1, mae: 0.9, count: 23 }, { giornata: 2, mae: 0.7, count: 25 }],
    { larghezza: 600, altezza: 200, padding: 28 }
  );
  assert.equal(grafico.punti.length, 2);
  assert.deepEqual(grafico.punti.map(p => p.giornata), [1, 2]);

  for (const p of grafico.punti) {
    assert.ok(p.x >= 28 && p.x <= 572, `x fuori range: ${p.x}`);
    assert.ok(p.y >= 28 && p.y <= 172, `y fuori range: ${p.y}`);
  }

  // MAE piu' basso (giornata 2, migliore) deve stare PIU' IN ALTO nel
  // grafico (y minore): l'asse e' invertito rispetto al dato.
  assert.ok(grafico.punti[1].y < grafico.punti[0].y);
});

test('puntiPolilinea contiene tutte le coordinate nel formato SVG "x,y x,y"', () => {
  const grafico = costruisciGraficoMae([
    { giornata: 1, mae: 1.0, count: 10 },
    { giornata: 2, mae: 0.5, count: 12 },
    { giornata: 3, mae: 0.8, count: 15 },
  ]);
  const coppie = grafico.puntiPolilinea.split(' ');
  assert.equal(coppie.length, 3);
  for (const coppia of coppie) {
    assert.match(coppia, /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
  }
});

test('MAE identico su tutte le giornate non produce un dominio degenere (nessun NaN)', () => {
  const grafico = costruisciGraficoMae([
    { giornata: 1, mae: 0.8, count: 10 },
    { giornata: 2, mae: 0.8, count: 12 },
  ]);
  for (const p of grafico.punti) {
    assert.ok(Number.isFinite(p.x));
    assert.ok(Number.isFinite(p.y));
  }
  // Con MAE piatto i due punti devono restare alla stessa altezza.
  assert.equal(grafico.punti[0].y, grafico.punti[1].y);
});

test('una sola giornata non solleva (dominio giornata degenere)', () => {
  const grafico = costruisciGraficoMae([{ giornata: 1, mae: 0.8, count: 10 }]);
  assert.equal(grafico.punti.length, 1);
  assert.ok(Number.isFinite(grafico.punti[0].x));
  assert.ok(Number.isFinite(grafico.punti[0].y));
});

// ---------------------------------------------------------------------------
// scalaLineare: helper di proiezione usato dal grafico
// ---------------------------------------------------------------------------

test('scalaLineare proietta linearmente dentro il range di destinazione', () => {
  assert.equal(scalaLineare(5, 0, 10, 0, 100), 50);
  assert.equal(scalaLineare(0, 0, 10, 0, 100), 0);
  assert.equal(scalaLineare(10, 0, 10, 0, 100), 100);
});

test('scalaLineare con dominio degenere ritorna il centro del range (nessuna divisione per zero)', () => {
  assert.equal(scalaLineare(5, 5, 5, 0, 100), 50);
});

// ---------------------------------------------------------------------------
// n1: sanity check sul formato italiano (virgola, non punto)
// ---------------------------------------------------------------------------

test('n1 usa la virgola decimale', () => {
  assert.equal(n1(6.5), '6,5');
  assert.equal(n1(null), '—');
});
