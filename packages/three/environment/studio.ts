import { BackSide, BoxGeometry, CircleGeometry, DoubleSide, Mesh, MeshLambertMaterial, PMREMGenerator, PointLight, Scene, Texture, WebGLRenderer } from 'three'
import { PRNG } from '../../../math/random'
import { lerp } from '../../../math/basics'
import { ShaderForge } from '../shader-forge'
import { glsl_easings } from '../../../glsl/easings'
import { glsl_utils } from '../../../glsl/utils'

function createBox({ lightIntensity = 1 } = {}) {
  const geometry = new BoxGeometry(10, 10, 10)
  const material = new MeshLambertMaterial({
    side: BackSide,
    color: '#bbb',
  })
  material.onBeforeCompile = shader => ShaderForge.with(shader)
    .uniforms({
      uLightIntensity: { value: lightIntensity },
    })
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
      diffuseColor.rgb *= uLightIntensity * easeInout3(vPosition.y) * 3.;
    `)
  return new Mesh(geometry, material)
}

function createMandarine({
  lightIntensity = 10,
  scale = 1,
  gradientForce = 2 as 1 | 2 | 3 | 4 | 5,
} = {}) {
  const geometry = new CircleGeometry(1, 24).scale(scale, scale, scale)
  const material = new MeshLambertMaterial({
    transparent: true,
    color: 'black',
    emissive: '#ffffff',
    emissiveIntensity: lightIntensity,
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

const defaultSceneProps = {
  lightIntensity: 1,
}

function createScene(props: Partial<typeof defaultSceneProps> = {}): Scene {
  const {
    lightIntensity,
  } = { ...defaultSceneProps, ...props }

  const scene = new Scene()

  const pointLight = new PointLight(16777215, 1.4, 12, 2)
  pointLight.position.set(0, 0, 1)
  scene.add(pointLight)

  const box = createBox({
    lightIntensity,
  })
  scene.add(box)

  const mandarine1 = createMandarine({
    lightIntensity,
  })
  mandarine1.position.set(3, 3, 0)
  mandarine1.rotation.set(0, Math.PI / 2, 0)
  scene.add(mandarine1)

  const mandarine2 = createMandarine({
    lightIntensity,
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
      lightIntensity: lightIntensity * PRNG.range(1, 4, x => x ** 4) * lerp(.33, 2, y),
      gradientForce: Math.round(PRNG.range(1, 5)) as any,
      scale: PRNG.random() * 1.25,
    })
    mandarine.position.set(lerp(-4, 4, x), lerp(-4, 4, y), lerp(-4, 4, z))
    mandarine.lookAt(0, 0, 0)
    scene.add(mandarine)
  }

  return scene
}

type Props = Partial<typeof defaultSceneProps>

function createStudioEnvTexture(renderer: WebGLRenderer, props: Props = {}): Texture {
  const pmremGenerator = new PMREMGenerator(renderer)
  pmremGenerator.compileCubemapShader()

  const scene = createScene(props)

  const generatedCubeRenderTarget = pmremGenerator.fromScene(scene, 1)
  return generatedCubeRenderTarget.texture
}

export type {
  Props as StudioEnvProps,
}

export {
  createStudioEnvTexture,
}
