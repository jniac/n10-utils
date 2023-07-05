export type DestroyableObject = { destroy: () => void; }
export type Destroyable = DestroyableObject | (() => void);
