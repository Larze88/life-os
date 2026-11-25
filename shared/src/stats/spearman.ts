/** Ranks with ties averaged (1-based). */
export function ranks(values: readonly number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v);
  const result = new Array<number>(values.length);
  for (let start = 0; start < order.length;) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]!.v === order[start]!.v) end++;
    const rank = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) result[order[k]!.i] = rank;
    start = end + 1;
  }
  return result;
}

function pearson(x: readonly number[], y: readonly number[]): number | null {
  const n = x.length;
  if (n < 2) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Spearman rank correlation (Pearson on tie-averaged ranks); null without variance. */
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length) throw new Error('Series must have equal length');
  return pearson(ranks(x), ranks(y));
}

/** Plain-language strength of a correlation coefficient (descriptive only). */
export function correlationStrength(rho: number): 'none' | 'weak' | 'moderate' | 'strong' {
  const r = Math.abs(rho);
  if (r < 0.2) return 'none';
  if (r < 0.4) return 'weak';
  if (r < 0.6) return 'moderate';
  return 'strong';
}
