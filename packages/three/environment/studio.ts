import { BackSide, BoxGeometry, CircleGeometry, DoubleSide, Mesh, MeshLambertMaterial, PMREMGenerator, PointLight, Scene, Texture, WebGLRenderer } from 'three'
import { ShaderForge } from '../shader-forge'
import { glsl_easings } from '../../../glsl/easings'
import { PRNG } from '../../../math/random'
import { lerp } from '@/n10-utils/math/basics'
import { glsl_utils } from '@/n10-utils/glsl/utils'

function createMandarine({
  emissiveIntensity = 10,
  scale = 1,
  gradientForce = 2 as 1 | 2 | 3 | 4 | 5,
} = {}) {
  const geometry = new CircleGeometry(1, 24).scale(scale, scale, scale)
  const material = new MeshLambertMaterial({
    transparent: true,
    emissive: '#ffffff',
    emissiveIntensity,
    side: DoubleSide,
    depthWrite: false,
    depthTest: false,
  })
  material.onBeforeCompile = shader => ShaderForge.with(shader)
    .defines({
      USE_UV: '',
    })
    .fragment.top(glsl_easings)
    .fragment.after('emissivemap_fragment', /* glsl */`
      float scalar = 1. - length(vUv - .5) * 2.;
      diffuseColor.a = easeInout${gradientForce}(scalar);
    `)
  return new Mesh(geometry, material)
}

function createBox() {
  const geometry = new BoxGeometry(10, 10, 10)
  const material = new MeshLambertMaterial({
    side: BackSide,
    color: '#bbb',
  })
  material.onBeforeCompile = shader => ShaderForge.with(shader)
    .varying({
      vPosition: 'vec3',
    })
    .vertex.mainAfterAll(/* glsl */`
      vPosition = (position + 10.) / 20.;
    `)
    .fragment.top(
      glsl_utils,
      glsl_easings,
    )
    .fragment.after('map_fragment', /* glsl */`
      diffuseColor.rgb *= easeInout3(vPosition.y) * 2.;
    `)
  return new Mesh(geometry, material)
}

export function createStudioEnvironmentTexture(renderer: WebGLRenderer): Texture {
  const pmremGenerator = new PMREMGenerator(renderer)
  pmremGenerator.compileCubemapShader()

  const scene = new Scene()

  const pointLight = new PointLight(16777215, 1.4, 12, 2)
  pointLight.position.set(0, 0, 1)
  scene.add(pointLight)

  const box = createBox()
  scene.add(box)

  const mandarine1 = createMandarine()
  mandarine1.position.set(3, 3, 0)
  mandarine1.rotation.set(0, Math.PI / 2, 0)
  scene.add(mandarine1)

  const mandarine2 = createMandarine({
    emissiveIntensity: 1,
    scale: 1.5,
  })
  mandarine2.position.set(-1, 2, 4)
  mandarine2.lookAt(0, 0, 0)
  scene.add(mandarine2)

  PRNG.init(23765478)
  for (let i = 0; i < 20; i++) {
    const x = PRNG.random()
    const y = PRNG.random()
    const z = PRNG.random()
    const mandarine = createMandarine({
      emissiveIntensity: PRNG.range(1, 4, x => x ** 4) * lerp(.33, 2, y),
      gradientForce: Math.round(PRNG.range(1, 5)) as any,
      scale: PRNG.random() * 1.25,
    })
    mandarine.position.set(lerp(-4, 4, x), lerp(-4, 4, y), lerp(-4, 4, z))
    mandarine.lookAt(0, 0, 0)
    scene.add(mandarine)
  }

  const generatedCubeRenderTarget = pmremGenerator.fromScene(scene, 1)
  return generatedCubeRenderTarget.texture
}
