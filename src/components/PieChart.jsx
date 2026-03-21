import { h } from 'preact';

/**
 * PieChart — custom SVG pie chart (~80 lines, zero dependencies).
 * GPU-composited using SVG transforms; no canvas 2D rasterization.
 *
 * @param {{ label: string, value: number, color: string }[]} slices
 * @param {number} [size=200]
 */
export function PieChart({ slices = [], size = 200 }) {
  if (!slices.length || slices.every(s => s.value === 0)) {
    return h('div', { class: 'flex-center', style: 'height:200px;color:var(--text-3);font-size:0.85rem' },
      'No expense data yet'
    );
  }

  const total = slices.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.42;
  const gap = 0.02; // radians gap between slices

  // Build SVG path for each slice
  let startAngle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    if (slice.value === 0) return null;
    const angle  = (slice.value / total) * (2 * Math.PI) - gap;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      'Z',
    ].join(' ');

    const midAngle = startAngle + angle / 2;
    startAngle = endAngle + gap;

    return { d, color: slice.color, label: slice.label, pct: ((slice.value / total) * 100).toFixed(1), midAngle };
  }).filter(Boolean);

  return h('div', null,
    h('svg', {
      viewBox: `0 0 ${size} ${size}`,
      width: size,
      height: size,
      style: 'display:block;margin:0 auto;overflow:visible',
      role: 'img',
      'aria-label': 'Monthly expense breakdown chart',
    },
      // Donut hole
      h('circle', { cx, cy, r: r * 0.48, fill: 'var(--surface)', style: 'pointer-events:none' }),
      // Slices
      paths.map((p, i) =>
        h('path', {
          key: i,
          d: p.d,
          fill: p.color,
          opacity: '0.92',
          style: 'transition:opacity 200ms;cursor:default',
          'aria-label': `${p.label}: ${p.pct}%`,
        })
      )
    ),
    // Legend
    h('div', { class: 'pie-legend' },
      slices.filter(s => s.value > 0).map((s, i) =>
        h('div', { key: i, class: 'pie-legend-item' },
          h('span', {
            class: 'pie-legend-dot',
            style: `background:${s.color}`,
          }),
          h('span', { class: 'text-xs' },
            h('span', { class: 'font-semibold' }, s.label),
            ` ${((s.value / total) * 100).toFixed(0)}%`
          )
        )
      )
    )
  );
}
