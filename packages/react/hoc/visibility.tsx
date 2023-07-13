import { ReactNode, useMemo, useRef, useState } from 'react'
import { handleTick } from '../../../dom/handle/misc'
import { Observable, ObservableNumber } from '../../../observables'
import { useEffects } from '../hooks/effects'

const statusOptions = [
	'visible',
	'fade-in',
	'fade-out',
] as const

type Status = (typeof statusOptions)[number]

const defaultProps = {
	visible: true,
	visibilityTransitionDuration: 1,
}

type Props = typeof defaultProps & {
	alphaObs: ObservableNumber
	visibilityObs: Observable<Status>
}

// NOTE: 'any' because typescript...
type WrappedComponent<T> = (props: T & Partial<Props>) => any

/**
 * Quite complex HOC that allow to animate 'visibility'. Thre 
 */
const withVisibility = <T extends {}>(Component: WrappedComponent<T>) => {
	const Wrapped = (props: T & { visible?: boolean }) => {
		const {
			visible,
			visibilityTransitionDuration,
		} = { ...defaultProps, ...props }

		const visibleProp = useRef(visible)
		visibleProp.current = visible
		const visibilityTransitionDurationProp = useRef(visibilityTransitionDuration)
		visibilityTransitionDurationProp.current = visibilityTransitionDuration

		const alphaObs = useMemo(() => new ObservableNumber(0, [0, 1]), [])
		const visibilityObs = useMemo(() => new Observable<Status>('fade-in'), [])
		const [isVisible, setIsVisible] = useState(visible)

		useEffects(function* () {
			yield handleTick(({ deltaTime }) => {
				alphaObs.value += (visibleProp.current ? deltaTime : -deltaTime) / visibilityTransitionDurationProp.current
			})

			yield alphaObs.onChange((value, { valueOld }) => {
				visibilityObs.setValue(
					value === 1 ? 'visible' :
						value > valueOld ? 'fade-in' : 'fade-out')
			})

			yield alphaObs.onDerivativeChange(
				alpha => alpha > 0,
				visible => setIsVisible(visible))
		}, [])

		return (
			isVisible
				? (
					<Component
						{...props}
						alphaObs={alphaObs}
						visible={visible}
						visibilityTransitionDuration={visibilityTransitionDuration}
						visibilityObs={visibilityObs}
					/>
				)
				: null
		)
	}
	Wrapped.displayName = `WithVisibility(${(Component as any).displayName ?? Component.name ?? 'Component'})`
	return Wrapped
}

export type {
	Props as WithVisibilityProps,
}

export {
	withVisibility,
}
