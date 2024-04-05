export type DestroyableObject = { destroy: () => void }
export type Destroyable = DestroyableObject | (() => void)

export type StringFilter = '*' | string | RegExp | ((str: string) => boolean)

export type OneOrMany<T> = T | T[]
