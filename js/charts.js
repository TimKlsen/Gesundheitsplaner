/* =====================================================================
 *  charts.js – einfache Liniendiagramme als SVG (ohne Bibliothek)
 *
 *  Farben und Linienstärken stehen in css/app.css (Klassen chart-*),
 *  damit sie im hellen und dunklen Modus automatisch passen.
 * ===================================================================== */
const Charts = (() => {
  'use strict';

  // Größe des Diagramms (viewBox) und Ränder
  const W = 480, H = 220, LEFT = 40, RIGHT = 12, TOP = 14, BOTTOM = 28;

  // Welche Werte gehören zu welcher Ansicht?
  const SERIES = {
    bp:     [{ key: 'sys', cls: 'a' }, { key: 'dia', cls: 'b' }],
    pulse:  [{ key: 'pulse', cls: 'a' }],
    weight: [{ key: 'weight', cls: 'a' }],
  };

  const LABELS = { bp: 'Blutdruck', pulse: 'Puls', weight: 'Gewicht' };

  /**
   * @param {Array}  rows    Messungen, zeitlich aufsteigend sortiert
   * @param {string} metric  'bp' | 'pulse' | 'weight'
   * @returns {string} HTML/SVG
   */
  function line(rows, metric) {
    const defs = SERIES[metric];
    const data = rows.filter((r) => defs.some((d) => r[d.key] != null));

    if (data.length < 2) {
      return '<p class="py-6 text-center text-slate-500 dark:text-slate-400">Für die Kurve braucht es mindestens zwei Messungen.</p>';
    }

    // Wertebereich bestimmen
    const all = [];
    data.forEach((r) => defs.forEach((d) => { if (r[d.key] != null) all.push(r[d.key]); }));
    let min = Math.min(...all);
    let max = Math.max(...all);
    if (min === max) { min -= 1; max += 1; }
    const margin = (max - min) * 0.12;
    min -= margin;
    max += margin;

    const n = data.length;
    const x = (i) => LEFT + ((W - LEFT - RIGHT) * i) / (n - 1);
    const y = (v) => TOP + (H - TOP - BOTTOM) * (1 - (v - min) / (max - min));

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf ${LABELS[metric]}">`;

    // Hilfslinien und Zahlen links
    for (let g = 0; g <= 3; g++) {
      const value = min + ((max - min) * g) / 3;
      const gy = y(value).toFixed(1);
      svg += `<line class="chart-grid" x1="${LEFT}" x2="${W - RIGHT}" y1="${gy}" y2="${gy}"/>`;
      svg += `<text class="chart-text" x="${LEFT - 6}" y="${(+gy + 4).toFixed(1)}" text-anchor="end">${Math.round(value)}</text>`;
    }

    // Linien und Punkte
    defs.forEach((d) => {
      const points = [];
      let dots = '';
      data.forEach((r, i) => {
        if (r[d.key] == null) return;
        const px = x(i).toFixed(1);
        const py = y(r[d.key]).toFixed(1);
        points.push(`${px},${py}`);
        dots += `<circle class="chart-dot-${d.cls}" cx="${px}" cy="${py}" r="3.5"/>`;
      });
      if (points.length > 1) svg += `<polyline class="chart-line-${d.cls}" points="${points.join(' ')}"/>`;
      svg += dots;
    });

    // Datum links und rechts unten
    const short = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.';
    svg += `<text class="chart-text" x="${LEFT}" y="${H - 8}">${short(data[0].date)}</text>`;
    svg += `<text class="chart-text" x="${W - RIGHT}" y="${H - 8}" text-anchor="end">${short(data[n - 1].date)}</text>`;
    svg += '</svg>';

    // Legende nur beim Blutdruck (zwei Linien)
    if (metric === 'bp') {
      svg += '<p class="mt-2 text-sm text-slate-600 dark:text-slate-300">'
        + '<span class="text-orange-700 dark:text-orange-400">●</span> oben (systolisch) &nbsp; '
        + '<span class="text-teal-700 dark:text-teal-400">●</span> unten (diastolisch)</p>';
    }
    return svg;
  }

  return { line };
})();
