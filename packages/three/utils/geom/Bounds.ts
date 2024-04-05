import { Vector3 } from 'three'

/**
 * A class that represents a 3D bounding box, similar to the one in Unity.
 */
export class Bounds {
  public minX: number = 0
  public minY: number = 0
  public minZ: number = 0
  public maxX: number = 0
  public maxY: number = 0
  public maxZ: number = 0

  public getMin(out = new Vector3()): Vector3 {
    return out.set(this.minX, this.minY, this.minZ)
  }

  public getMax(out = new Vector3()): Vector3 {
    return out.set(this.maxX, this.maxY, this.maxZ)
  }

  public getCenter(out = new Vector3()): Vector3 {
    return out.set(
      (this.minX + this.maxX) / 2,
      (this.minY + this.maxY) / 2,
      (this.minZ + this.maxZ) / 2,
    )
  }

  public getSize(out = new Vector3()): Vector3 {
    return out.set(
      this.maxX - this.minX,
      this.maxY - this.minY,
      this.maxZ - this.minZ,
    )
  }

  public setCenterSize(centerX: number, centerY: number, centerZ: number, sizeX: number, sizeY: number, sizeZ: number): this {
    const halfSizeX = sizeX / 2
    const halfSizeY = sizeY / 2
    const halfSizeZ = sizeZ / 2
    this.minX = centerX - halfSizeX
    this.minY = centerY - halfSizeY
    this.minZ = centerZ - halfSizeZ
    this.maxX = centerX + halfSizeX
    this.maxY = centerY + halfSizeY
    this.maxZ = centerZ + halfSizeZ
    return this
  }
}