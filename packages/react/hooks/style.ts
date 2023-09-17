import { useEffects } from './effects'

export function useStyle(css: string) {
  useEffects(function* () {
    const style = document.createElement('style')
    style.innerHTML = css
    document.head.appendChild(style)
    yield () => {
      style.remove()
    }
  }, [css], {
    useDigestProps: false,
  })
}
