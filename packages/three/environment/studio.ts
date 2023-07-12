import { BackSide, BoxGeometry, CircleGeometry, DoubleSide, Mesh, MeshLambertMaterial, PMREMGenerator, PointLight, Scene, Texture, WebGLRenderer } from 'three'

export const createStudioEnvironmentTexture = (renderer: WebGLRenderer): Texture => {
  const pmremGenerator = new PMREMGenerator(renderer)
  pmremGenerator.compileCubemapShader()

  const scene = new Scene()

  const pointLight = new PointLight(16777215, 1, 15, 2)
  pointLight.position.set(0, 0, -2)
  scene.add(pointLight)

  const box = new Mesh(
    new BoxGeometry(10, 10, 10),
    new MeshLambertMaterial({
      side: BackSide,
    }))
  scene.add(box)

  const mandarine = new Mesh(
    new CircleGeometry(1, 24),
    new MeshLambertMaterial({
      emissive: '#ffffff',
      emissiveIntensity: 10,
      side: DoubleSide,
    })
  )
  mandarine.position.set(3, 3, 0)
  mandarine.rotation.set(0, Math.PI / 2, 0)
  scene.add(mandarine)

  const generatedCubeRenderTarget = pmremGenerator.fromScene(scene)
  return generatedCubeRenderTarget.texture
}
