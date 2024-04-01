export function svgFactory(
  targetOrTagName: string | SVGElement,
  props: Record<string, any> = {},
): SVGElement {
  const element = typeof targetOrTagName === 'string'
    ? document.createElementNS('http://www.w3.org/2000/svg', targetOrTagName)
    : targetOrTagName

  const {
    parent,
    ...attributes
  } = props

  if (parent) {
    parent.appendChild(element)
  }

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttributeNS(null, key, value)
  }

  return element
}