function cloneValue(value: any): any {
  if (typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(cloneValue)
  }

  switch (value.constructor) {
    case DOMPoint: {
      return DOMPoint.fromPoint(value)
    }
    case DOMRect: {
      return DOMRect.fromRect(value)
    }
    case Object: {
      const instance = Object.create(value)
      for (const key of Object.keys(value)) {
        instance[key] = cloneValue(value[key])
      }
      return instance
    }
  }

  throw new Error(`Unsupported value type: ${value.constructor}`)
}

/**
 * The base class for all info classes. "Info" classes are used to store 
 * information about an event or a state. They should be considered as read-only.
 * If some information needs to saved somewhere (eg. for comparison), it should
 * be cloned first since the source may change.
 */
export class InfoBase {
  clone(): Readonly<this> {
    const instance = Object.create(this)
    for (const [key, value] of Object.entries(this)) {
      instance[key] = cloneValue(value)
    }
    return Object.freeze(instance)
  }
}