export type DestroyableObject<V = any> = { destroy: () => void, value?: V }
export type Destroyable = DestroyableObject | (() => void)

export type StringFilter = '*' | string | RegExp | ((str: string) => boolean)

export type OneOrMany<T> = T | T[]

/**
 * Makes all properties of an object type mutable. Reverse of `Readonly<T>`.
 */
export type Editable<T> = {
  -readonly [P in keyof T]: T[P]
}

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

export type PointLike = {
  x: number
  y: number
}

export type RectangleLike = {
  x: number
  y: number
  width: number
  height: number
}
