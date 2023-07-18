import { Camera, Vector3 } from 'three'
import { updateVertigoCamera } from './update'

export class VertigoController {
  props = {
    focusPoint: new Vector3(0, 0, 0),
    height: 10,
    perspective: 1,
  }
  camera: Camera
  constructor(camera: Camera) {
    this.camera = camera
    Object.assign(window, {updateVertigoCamera, camera})
  }
}
