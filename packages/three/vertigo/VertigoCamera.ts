import { Object3D, PerspectiveCamera, Vector3 } from 'three'
import { Vector3Declaration, solveVector3Declaration } from '../declaration'
import { VertigoState, VertigoStateDeclaration, copyVertigoState, defaultVertigoState, solveVertigoStateDeclaration } from './state'
import { updateVertigoCamera } from './update'

export class VertigoCamera extends PerspectiveCamera {
  vertigo: VertigoState = { ...defaultVertigoState }

  setVertigo(vertigoProps: VertigoStateDeclaration): this {
    Object.assign(this.vertigo, solveVertigoStateDeclaration(vertigoProps))
    return this
  }

  setVertigoFocus(focusX: number, focusY: number, focusZ: number): this
  setVertigoFocus(target: Vector3Declaration | Object3D): this
  setVertigoFocus(...args: any[]): this {
    if (args.length === 3) {
      const [focusX, focusY, focusZ] = args
      this.vertigo.focusX = focusX
      this.vertigo.focusY = focusY
      this.vertigo.focusZ = focusZ
    } else {
      const [arg] = args as [Vector3 | Object3D]
      const [x, y, z] = solveVector3Declaration(arg instanceof Object3D ? arg.position : arg)
      this.vertigo.focusX = x
      this.vertigo.focusY = y
      this.vertigo.focusZ = z
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