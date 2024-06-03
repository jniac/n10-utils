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

export type Vector2Like = {
  x: number
  y: number
}

/**
 * @deprecated Use `Point2Like` instead.
 */
export type PointLike = Vector2Like

export type Point2Like = Vector2Like

export type Vector3Like = {
  x: number
  y: number
  z: number
}

export type Point3Like = Vector3Like

export type RectangleLike = {
  x: number
  y: number
  width: number
  height: number
}

export type Ray2Like = {
  origin: Vector2Like
  direction: Vector2Like
}
