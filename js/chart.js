// One restrained context chart: trailing-30-day performance, rebased.
// Thin lines, no fill, no dots, no grid — hidden entirely if no series data.
export function renderChart(data, config) {
  const el = document.getElementById('chart');
  const cap = document.getElementById('chartCap');
  if (!el) return;
  const series = (data || [])
    .map((d, i) => ({ i, values: d && d.series, color: config[i] && config[i].color }))
    .filter((s) => s.values && s.values.length > 2 && s.color);
  if (!series.length) {
    el.innerHTML = '';
    el.hidden = true;
    if (cap) cap.hidden = true;
    return;
  }
  const W = 600;
  const H = 132;
  const P = 8;
  let lo = 0;
  let hi = 0;
  series.forEach((s) =>
    s.values.forEach((v) => {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }),
  );
  const span = hi - lo || 1;
  lo -= span * 0.1;
  hi += span * 0.1;
  const x = (i, n) => P + (n < 2 ? 0 : (i / (n - 1)) * (W - 2 * P));
  const y = (v) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
  const paths = series
    .map(
      (s) =>
        '<path data-i="' +
        s.i +
        '" d="M' +
        s.values.map((v, i) => x(i, s.values.length).toFixed(1) + ',' + y(v).toFixed(1)).join(' L') +
        '" fill="none" stroke="' +
        s.color +
        '" stroke-width="1.25"/>',
    )
    .join('');
  el.innerHTML =
    '<svg viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '" role="img" aria-label="Last 30 days performance, rebased">' +
    '<line x1="0" x2="' +
    W +
    '" y1="' +
    y(0).toFixed(1) +
    '" y2="' +
    y(0).toFixed(1) +
    '" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 4"/>' +
    paths +
    '</svg>';
  el.hidden = false;
  if (cap) cap.hidden = false;
}
