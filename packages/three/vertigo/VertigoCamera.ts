import { Object3D, PerspectiveCamera, Vector3 } from 'three'
import { VertigoState, copyVertigoState, defaultVertigoState } from './state'
import { updateVertigoCamera } from './update'

export class VertigoCamera extends PerspectiveCamera {
  vertigo: VertigoState = { ...defaultVertigoState }

  setVertigo(vertigoProps: Partial<VertigoState>): this {
    Object.assign(this.vertigo, vertigoProps)
    return this
  }

  setVertigoFocus(focusX: number, focusY: number, focusZ: number): this
  setVertigoFocus(target: Vector3 | Object3D): this
  setVertigoFocus(...args: any[]): this {
    if (args.length === 3) {
      const [focusX, focusY, focusZ] = args
      this.vertigo.focusX = focusX
      this.vertigo.focusY = focusY
      this.vertigo.focusZ = focusZ
    } else {
      const [arg] = args as [Vector3 | Object3D]
      if (arg instanceof Vector3) {
        this.vertigo.focusX = arg.x
        this.vertigo.focusY = arg.y
        this.vertigo.focusZ = arg.z
      } else if (arg instanceof Object3D) {
        this.vertigo.focusX = arg.position.x
        this.vertigo.focusY = arg.position.y
        this.vertigo.focusZ = arg.position.z
      }
    }
    return this
  }

  copy(source: this, recursive?: boolean | undefined): this {
    super.copy(this, recursive)
    copyVertigoState(source.vertigo, this.vertigo)
    return this
  }

  cloneAsVertigoCamera(): VertigoCamera {
    return new VertigoCamera().copy(this)
  }

  updateVertigoCamera(aspect: number): this {
    updateVertigoCamera(this, aspect, this.vertigo)
    return this
  }
}