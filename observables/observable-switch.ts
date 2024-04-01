import { ConstructorOptions, Observable } from './observable'

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

  constructor(choices: Choices, initialValue: Choice = choices[0], options?: ConstructorOptions<Choice>) {
    super(initialValue, options)
    this._choices = choices
  }
}

export { ObservableSwitch }
