import { DEFAULT_SEED, MAX, init, map, next } from './algorithm/parkmiller-c-iso'

let state = 123456

const identity = (x: number) => x

/**
 * Pseudo Random Number Generator
 */
export class PRNG {
  static readonly defaultSeed = DEFAULT_SEED
  static readonly seedMax = MAX

  static init(seed: number | string = DEFAULT_SEED): typeof PRNG {
    if (typeof seed === 'string') {
      seed = seed.split('').reduce((acc, char) => acc * 7 + char.charCodeAt(0), 0)
    }
    state = init(seed)
    return PRNG
  }

  static random(): number {
    state = next(state)
    return map(state)
  }

  // sugar-syntax:
  private static solveRangeParameters(parameters: any[]): [number, number, (x: number) => number] {
    switch (parameters.length) {
      default: {
        return [0, 1, identity]
      }
      case 1: {
        return [0, parameters[0], identity]
      }
      case 2: {
        return [parameters[0], parameters[1], identity]
      }
      case 3: {
        return [parameters[0], parameters[1], parameters[2]]
      }
    }
  }
  static range(max: number): number
  static range(min: number, max: number): number
  static range(min: number, max: number, distribution: (x: number) => number): number
  static range(...args: any[]): number {
    const [min, max, distribution] = PRNG.solveRangeParameters(args)
    return min + (max - min) * distribution(PRNG.random())
  }

  static among<T>(args: T[]): T {
    return args[Math.floor(PRNG.random() * args.length)]
  }
}
