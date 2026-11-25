/**
 * Page scroll mapped to an "error stack" from 0% to 100%, shared by the telemetry rail and the stress
 * field. Purely illustrative: the 44% break line echoes the published Panda joint-2 result
 * (RMD-X12 breaks at about 44% stacked error), it is not computed here.
 */
export const BREAK_AT = 0.44;

export function pageProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}
