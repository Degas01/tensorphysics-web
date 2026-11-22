/**
 * Interactive Gap Margin estimate for the website sandbox.
 *
 * NOT a simulation. It interpolates the real Panda study:
 *  - u0      utilisation with no error (nominal run)
 *  - margins single-factor margins m_k: the error, as a share of its plausible range,
 *            at which u reached 1.0 when that factor was swept alone
 *  - uc      utilisation with all 8 errors at the top of their range (the corner)
 * Model: u(z) = u0 + sum_k a_k z_k + r * mean(z)^2,  a_k = (1 - u0) / m_k,
 * with r chosen so that u(1,...,1) = uc. z_k in [0, 1] = share of factor k's plausible range.
 * Single-factor crossings and the corner match the study exactly; points in between are an estimate.
 */
export interface MarginSource {
  u: number;
  u_corner: number;
  margins: readonly (number | null)[];
}

export function linearTerms(src: MarginSource): number[] {
  return src.margins.map((m) => (m === null || m <= 0 ? 0 : (1 - src.u) / m));
}

export function estimateU(src: MarginSource, z: readonly number[]): number {
  const a = linearTerms(src);
  const sumA = a.reduce((s, v) => s + v, 0);
  const r = src.u_corner - src.u - sumA;
  const mean = z.reduce((s, v) => s + v, 0) / z.length;
  return src.u + a.reduce((s, ak, k) => s + ak * z[k], 0) + r * mean * mean;
}

/** Factor contributing most at the current setting (for "breaks first"). */
export function biggestContributor(src: MarginSource, z: readonly number[]): number {
  const a = linearTerms(src);
  let best = 0;
  let bestV = -Infinity;
  a.forEach((ak, k) => {
    const v = ak * z[k] + (z[k] > 0 ? 1e-9 * z[k] : 0);
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  });
  return best;
}

/**
 * Leave-one-out contribution of each factor at the current setting:
 * c_k = u(z) - u(z with factor k set to zero). Captures the interaction term too,
 * so it still ranks factors when single-error margins are large.
 */
export function contributions(src: MarginSource, z: readonly number[]): number[] {
  const u = estimateU(src, z);
  return z.map((_, k) => {
    const zk = z.slice();
    zk[k] = 0;
    return u - estimateU(src, zk);
  });
}
