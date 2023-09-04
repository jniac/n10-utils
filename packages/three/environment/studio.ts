import { BackSide, BoxGeometry, CircleGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PMREMGenerator, PointLight, Scene, ShapeGeometry, WebGLRenderTarget, WebGLRenderer } from 'three'
import { PRNG } from '../../../math/random'
import { lerp } from '../../../math/basics'
import { ShaderForge } from '../shader-forge'
import { glsl_easings } from '../../../glsl/easings'
import { glsl_utils } from '../../../glsl/utils'

function createDebugTexts() {
  const texts = new Group()
  const dash = (parent: Group, quarter: number, length: number, color: string) => {
    const mesh = new Mesh(
      new BoxGeometry(length, .04, .04),
      new MeshBasicMaterial({ color }),
    )
    mesh.rotation.z = Math.PI / 2 * quarter
    parent.add(mesh)
    return mesh
  }
  const dot = (parent: Group, color: string) => {
    const mesh = new Mesh(
      new CircleGeometry(.03),
      new MeshBasicMaterial({ color }),
    )
    parent.add(mesh)
    return mesh
  }
  
  const px = new Group()
  px.position.set(1, 0, 0)
  px.rotation.set(0, -Math.PI / 2, 0)
  texts.add(px)
  dash(px, 0, .2, 'red').position.set(-.1, 0, 0)
  dash(px, 1, .2, 'red').position.set(-.1, 0, 0)
  dash(px, .5, .3, 'red').position.set(.1, 0, 0)
  dash(px, -.5, .3, 'red').position.set(.1, 0, 0)
  dot(px, 'red').position.set(0, -.25, 0)

  const nx = new Group()
  nx.position.set(-1, 0, 0)
  nx.rotation.set(0, Math.PI / 2, 0)
  texts.add(nx)
  dash(nx, 0, .2, 'red').position.set(-.1, 0, 0)
  dash(nx, .5, .3, 'red').position.set(.1, 0, 0)
  dash(nx, -.5, .3, 'red').position.set(.1, 0, 0)
  dot(nx, 'red').position.set(0, -.25, 0)

  const py = new Group()
  py.position.set(0, 1, 0)
  py.rotation.set(Math.PI / 2, 0, 0)
  texts.add(py)
  dash(py, 0, .2, 'green').position.set(-.1, 0, 0)
  dash(py, 1, .2, 'green').position.set(-.1, 0, 0)
  dash(py, .5, .15, 'green').position.set(.15, .066, 0)
  dash(py, -.5, .15, 'green').position.set(.05, .066, 0)
  dash(py, 1, .15, 'green').position.set(.1, -.05, 0)
  dot(py, 'green').position.set(0, -.25, 0)
  
  const ny = new Group()
  ny.position.set(0, -1, 0)
  ny.rotation.set(-Math.PI / 2, 0, 0)
  texts.add(ny)
  dash(ny, 0, .2, 'green').position.set(-.1, 0, 0)
  dash(ny, .5, .15, 'green').position.set(.15, .066, 0)
  dash(ny, -.5, .15, 'green').position.set(.05, .066, 0)
  dash(ny, 1, .15, 'green').position.set(.1, -.05, 0)
  dot(ny, 'green').position.set(0, -.25, 0)

  const pz = new Group()
  pz.position.set(0, 0, 1)
  pz.rotation.set(0, Math.PI, 0)
  texts.add(pz)
  dash(pz, 0, .2, 'blue').position.set(-.1, 0, 0)
  dash(pz, 1, .2, 'blue').position.set(-.1, 0, 0)
  dash(pz, 0, .2, 'blue').position.set(.1, .1, 0)
  dash(pz, 0, .2, 'blue').position.set(.1, -.1, 0)
  dash(pz, .5, .24, 'blue').position.set(.1, 0, 0)
  dot(pz, 'blue').position.set(0, -.25, 0)

  const nz = new Group()
  nz.position.set(0, 0, -1)
  texts.add(nz)
  dash(nz, 0, .2, 'blue').position.set(-.1, 0, 0)
  dash(nz, 0, .2, 'blue').position.set(.1, .1, 0)
  dash(nz, 0, .2, 'blue').position.set(.1, -.1, 0)
  dash(nz, .5, .24, 'blue').position.set(.1, 0, 0)
  dot(nz, 'blue').position.set(0, -.25, 0)

  // const fontLoader = new FontLoader()
  // fontLoader.load(config.publicAssets('misc/helvetiker_bold.typeface.json'), font => {
  //   const shapes = font.generateShapes('+X', 1)
  //   const geometry = new ShapeGeometry(shapes)
  //   geometry.computeBoundingBox()
  //   console.log(geometry.boundingBox)
  //   const material = new MeshBasicMaterial({ color: 'red' })
  //   const mesh = new Mesh(geometry, material)
  //   mesh.position.set(0, 0, -2)
  //   texts.add(mesh)
  // })
  return texts
}

function createBox({ lightIntensity = 1 } = {}) {
  const geometry = new BoxGeometry(10, 10, 10)
  const material = new MeshLambertMaterial({
    side: BackSide,
    color: '#ffffff',
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

function createScene(props: Partial<typeof defaultStudioEnvironmentProps> = {}): Scene {
  const {
    randomSeed,
    lightIntensity,
    debugText,
  } = { ...defaultStudioEnvironmentProps, ...props }

  const scene = new Scene()

  const pointLight = new PointLight(0xffffff, 10)
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

  PRNG.init(randomSeed)
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

  if (debugText) {
    const texts = createDebugTexts()
    scene.add(texts)
  }

  return scene
}

const defaultStudioEnvironmentProps = {
  // randomSeed: 580853521,
  // randomSeed: 1112670572,
  // randomSeed: 955841903,
  randomSeed: 1166253372,
  lightIntensity: 1,
  debugText: false,
}

type Props = Partial<typeof defaultStudioEnvironmentProps>

function createStudioEnvironment(
  renderer: WebGLRenderer, 
  props: Props = {},
): {
  renderTarget: WebGLRenderTarget
  scene: Scene
} {
  const pmremGenerator = new PMREMGenerator(renderer)
  pmremGenerator.compileCubemapShader()

  const scene = createScene(props)

  const renderTarget = pmremGenerator.fromScene(scene, 0)
  
  return {
    renderTarget,
    scene,
  }
}

export type {
  Props as StudioEnvProps,
}

export {
  defaultStudioEnvironmentProps as defaultStudioEnvProps,
  createStudioEnvironment,
}
