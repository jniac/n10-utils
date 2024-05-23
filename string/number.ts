
export function removeTrailingZeros(str: string): string {
  const [i, f] = str.split('.')
  if (f === undefined) {
    return i
  }
  let index = f.length - 1
  while (f[index] === '0') {
    index--
  }
  if (f[index] === '.') {
    index--
  }
  return index === -1 ? i : i + '.' + f.slice(0, index + 1)
}

export function formatNumber(num: number, {
  maxDigits = 6,
} = {}): string {
  if (maxDigits < 6) {
    throw new Error('maxDigits must be at least 6')
  }

  const str = num.toString()
  const [i, f] = str.split('.')
  const ilen = i.length
  let flen = maxDigits - ilen - 1

  const usePrecision =
    ilen > maxDigits ||
    flen < 0
  console.log('usePrecision', usePrecision, ilen, maxDigits, flen)
  if (usePrecision) {
    let [b, e] = num.toExponential().split('e')
    b = b.slice(0, maxDigits - e.length - 1)
    return `${removeTrailingZeros(b)}e${e}`
  }

  const useExpontential =
    num < 1 / Math.pow(10, maxDigits - 2)
  if (useExpontential) {
    return removeTrailingZeros(num.toExponential(maxDigits - 5))
  }

  if (f === undefined) {
    return i
  }

  return removeTrailingZeros(num.toFixed(flen))
}