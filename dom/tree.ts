export function isParentOf(parent: Element | null, child: any, { includeSelf = true } = {}) {
  if (!parent) {
    return false
  }
  let current = includeSelf ? child : child?.parentElement
  while (current) {
    if (current === parent) {
      return true
    }
    current = current.parentElement
  }
  return false
}

export function isChildOf(child: Element, parent: Element, { includeSelf = true } = {}) {
  return isParentOf(parent, child, { includeSelf })
}