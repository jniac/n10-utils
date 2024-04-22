
/**
 * A sine curve that goes from 0 to 1, with a period of 1.
 */
export const sin01 = (x: number) => .5 + .5 * Math.sin(x * Math.PI * 2)

/**
 * A cosine curve that goes from 0 to 1, with a period of 1.
 */
export const cos01 = (x: number) => .5 + .5 * Math.cos(x * Math.PI * 2)

/**
 * https://iquilezles.org/articles/functions/
 */
export const pcurve = (x: number, a: number, b: number): number => {
  const k = Math.pow(a + b, a + b) / (Math.pow(a, a) * Math.pow(b, b))
  return k * Math.pow(x, a) * Math.pow(1.0 - x, b)
}

/**
 * Power Sine
 * https://jniac.github.io/some-curves/curves/psine/
 */
export const psine = (x: number, p = 3) => {
  const s = Math.sin(x)
  const sign = s < 0 ? -1 : 1
  const r = 1 - Math.pow(1 - sign * s, p)
  return r * sign
}

/**
 * Power Cosine
 * https://jniac.github.io/some-curves/curves/psine/
 */
export const pcosine = (x: number, p = 3) => {
  const s = Math.cos(x)
  const sign = s < 0 ? -1 : 1
  const r = 1 - Math.pow(1 - sign * s, p)
  return r * sign
}
