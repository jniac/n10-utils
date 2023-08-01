import { Object3D } from 'three'

type Options = Partial<{
  excludeSelf: boolean
  walkStrategy: 'horizontal' | 'vertical'
}>

function traverseAndFind(node: Object3D, predicate: (child: Object3D) => boolean, options?: Options): Object3D
function traverseAndFind<T extends object>(node: Object3D, predicate: (child: Object3D) => T | null, options?: Options): T | null
function traverseAndFind(node: Object3D, predicate: (child: Object3D) => any, options: Options = {}): any {
  const {
    excludeSelf = false, walkStrategy = 'horizontal',
  } = options
  const queue: Object3D[] = excludeSelf ? [...node.children] : [node]
  while (queue.length > 0) {
    const current = queue.shift()!
    const result = predicate(current)
    if (result === true || typeof result === 'object') {
      return result === true ? current : result
    }
    if (walkStrategy === 'horizontal') {
      queue.push(...current.children)
    } else {
      queue.unshift(...current.children)
    }
  }
  return null
}

function traverseAndFindAll(node: Object3D, predicate: (child: Object3D) => boolean, options?: Options): Generator<Object3D, void, unknown>
function traverseAndFindAll<T extends object>(node: Object3D, predicate: (child: Object3D) => T | null, options?: Options): Generator<T | null, void, unknown>
function* traverseAndFindAll(node: Object3D, predicate: (child: Object3D) => any, options: Options = {}): Generator<any, void, unknown> {
  const {
    excludeSelf = false, walkStrategy = 'horizontal',
  } = options
  const queue: Object3D[] = excludeSelf ? [...node.children] : [node]
  while (queue.length > 0) {
    const current = queue.shift()!
    const result = predicate(current)
    if (result === true || typeof result === 'object') {
      yield result === true ? current : result
    }
    if (walkStrategy === 'horizontal') {
      queue.push(...current.children)
    } else {
      queue.unshift(...current.children)
    }
  }
}

export {
  traverseAndFind,
  traverseAndFindAll,
}