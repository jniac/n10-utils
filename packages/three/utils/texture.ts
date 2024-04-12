import { Texture, Vector2 } from 'three'

export function getTextureSize(texture: Texture): Vector2 {
  const { image } = texture
  if (image instanceof HTMLImageElement) {
    return new Vector2(image.width, image.height)
  }
  if (image instanceof HTMLVideoElement) {
    return new Vector2(image.videoWidth, image.videoHeight)
  }
  throw new Error('Unsupported texture image type')
}