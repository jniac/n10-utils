import { PointerTarget } from './type'

type FocusInfo = {
}

type Callback = (info: FocusInfo) => void

const defaultParams = {
}

const callbackNames = [
  'onFocusEnter',
  'onFocusLeave',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasFocusCallback(params: Record<string, any>): boolean {
  return callbackNames.some(name => name in params)
}

function handleFocus(element: PointerTarget, params: Params): () => void {
  const {
    onFocusEnter,
    onFocusLeave,
  } = { ...defaultParams, ...params }

  const _onFocus = () => {
    element.addEventListener('blur', _onBlur)
    onFocusEnter?.({})
  }

  const _onBlur = () => {
    element.removeEventListener('blur', _onBlur)
    onFocusLeave?.({})
  }

  element.addEventListener('focus', _onFocus)

  return () => {
    element.removeEventListener('focus', _onFocus)
    element.removeEventListener('blur', _onBlur)
  }
}

export type {
  FocusInfo, Params as HandleFocusParams
}

export {
  handleFocus, hasFocusCallback
}

