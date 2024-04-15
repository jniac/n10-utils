export enum PointerButton {
  // From the "mouse" specs:
  // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
  Main = 1 << 0,
  Aux = 1 << 1,
  Second = 1 << 2,
  Fourth = 1 << 3,
  Fifth = 1 << 4,

  // Custom
  DoubleTouch = 1 << 5,
}

export type PointerTarget =
  | HTMLElement
  | SVGElement
  | any // any because of NodeList & compilation subtleties

const eventPhases = [
  'start',
  'continue',
  'end',
] as const

export type EventPhase = (typeof eventPhases)[number]
