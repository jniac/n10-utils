
/**
 * https://iquilezles.org/articles/functions/
 */
export const pcurve = (x: number, a: number, b: number): number => {
  const k = Math.pow(a + b, a + b) / (Math.pow(a, a) * Math.pow(b, b))
  return k * Math.pow(x, a) * Math.pow(1.0 - x, b)
}
