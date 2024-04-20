import { ConstructorOptions, Observable, SetValueOptions } from './observable'

/**
 * An observable that can switch between a set of values.
 * 
 * NOTE: still WIP
 */
class ObservableSwitch<Choices extends readonly Choice[] = any[], Choice = Choices[number]> extends Observable<Choice> {
  private _choices: Choices

  get choices() {
    return this._choices
  }

  get index() {
    return this._choices.indexOf(this.value)
  }
  set index(index: number) {
    this.setIndex(index)
  }

  constructor(choices: Choices, initialValue: Choice = choices[0], options?: ConstructorOptions<Choice>) {
    super(initialValue, options)
    this._choices = choices
  }

  override setValue(incomingValue: Choice, options?: SetValueOptions): boolean {
    const index = this._choices.indexOf(incomingValue)
    if (index === -1) {
      // Ignore invalid value
      return false
    }
    return super.setValue(incomingValue, options)
  }

  setIndex(index: number, options?: SetValueOptions & { indexMode?: 'loop' | 'clamp' | 'ignore' }): boolean {
    const { indexMode = 'loop', ...rest } = options ?? {}
    if (index < 0 || index >= this._choices.length) {
      switch (indexMode) {
        default:
        case 'ignore': {
          return false
        }
        case 'loop': {
          const len = this._choices.length
          index = (index % len + len) % len
          break
        }
        case 'clamp': {
          index = Math.max(0, Math.min(this._choices.length - 1, index))
          break
        }
      }
    }
    return this.setValue(this._choices[index], rest)
  }
}

export { ObservableSwitch }
