
type Direction = 'horizontal' | 'vertical'

type Info = {
	direction: Direction
	startPosition: DOMPoint
	position: DOMPoint
	movement: DOMPoint
	delta: DOMPoint
}

type Callback = (info: Info) => void

const defaultParams = {
	dragDistanceThreshold: 10,
}

const callbackNames = [
	'onDragStart',
	'onDragStop',
	'onDrag',
	'onVerticalDragStart',
	'onVerticalDragStop',
	'onVerticalDrag',
	'onHorizontalDragStart',
	'onHorizontalDragStop',
	'onHorizontalDrag',
] as const

type CallbackName = (typeof callbackNames)[number]

type Params = Partial<typeof defaultParams & Record<CallbackName, Callback>>

function hasDragCallback(params: Record<string, any>): boolean {
	return callbackNames.some(name => name in params)
}

function handleDrag(element: HTMLElement, params: Params): () => void {
	const {
		dragDistanceThreshold,
		onDragStart,
		onDragStop,
		onDrag,
		onVerticalDragStart,
		onVerticalDragStop,
		onVerticalDrag,
		onHorizontalDragStart,
		onHorizontalDragStop,
		onHorizontalDrag,
	} = { ...defaultParams, ...params }

	let down = false
	let drag = false
	let dragIsLongEnough = false
	let frameID = -1
	const pointer = new DOMPoint(0, 0)
	const startPosition = new DOMPoint(0, 0)
	const position = new DOMPoint(0, 0)
	const positionOld = new DOMPoint(0, 0)
	const movement = new DOMPoint(0, 0)
	const delta = new DOMPoint(0, 0)
	const info: Info = {
		direction: 'horizontal',
		startPosition,
		position,
		movement,
		delta,
	}

	const frameStart = (x: number, y: number) => {
		frameID = window.requestAnimationFrame(dragFrame)
		down = true
		startPosition.x = x
		startPosition.y = y
		pointer.x = x
		pointer.y = y
	}

	const dragStart = () => {
		drag = true
		delta.x = 0
		delta.y = 0
		movement.x = 0
		movement.y = 0
		position.x = startPosition.x
		position.y = startPosition.y

		onDragStart?.(info)
		switch (info.direction) {
			case 'horizontal': {
				onHorizontalDragStart?.(info)
				break
			}
			case 'vertical': {
				onVerticalDragStart?.(info)
				break
			}
		}
	}

	const dragStop = () => {
		drag = false

		onDragStop?.(info)
		switch (info.direction) {
			case 'horizontal': {
				onHorizontalDragStop?.(info)
				break
			}
			case 'vertical': {
				onVerticalDragStop?.(info)
				break
			}
		}
	}

	const updatePosition = (x: number, y: number) => {
		positionOld.x = position.x
		positionOld.y = position.y
		position.x += (x - position.x) * .2
		position.y += (y - position.y) * .2
		delta.x = position.x - positionOld.x
		delta.y = position.y - positionOld.y
		movement.x = position.x - startPosition.x
		movement.y = position.y - startPosition.y
	}

	const dragUpdate = () => {
		if (dragIsLongEnough) {
			updatePosition(pointer.x, pointer.y)
		} else {
			updatePosition(startPosition.x, startPosition.y)
		}

		onDrag?.(info)
		switch (info.direction) {
			case 'horizontal': {
				onHorizontalDrag?.(info)
				break
			}
			case 'vertical': {
				onVerticalDrag?.(info)
				break
			}
		}
	}

	const dragFrame = () => {
		if (down) {
			frameID = window.requestAnimationFrame(dragFrame)

			const dx = startPosition.x - pointer.x
			const dy = startPosition.y - pointer.y
			const distance = Math.sqrt(dx * dx + dy * dy)
			dragIsLongEnough = distance > dragDistanceThreshold

			if (drag === false) {
				if (dragIsLongEnough) {
					info.direction = Math.abs(dx / dy) >= 1 ? 'horizontal' : 'vertical'
					dragStart()
				}
			}

			if (drag) {
				dragUpdate()
			}
		}
	}

	const onMouseDown = (event: MouseEvent) => {
		window.addEventListener("mousemove", onMouseMove)
		window.addEventListener("mouseup", onMouseUp)
		frameStart(event.clientX, event.clientY)
	}

	const onMouseMove = (event: MouseEvent) => {
		pointer.x = event.clientX
		pointer.y = event.clientY
	}

	const onMouseUp = () => {
		window.removeEventListener("mousemove", onMouseMove)
		window.addEventListener("mouseup", onMouseUp)
		if (drag) {
			dragStop()
		}
		down = false
	}

	let firstTouch: Touch | null = null
	const onTouchStart = (event: TouchEvent) => {
		const touch = event.changedTouches[0]
		if (firstTouch === null) {
			firstTouch = touch
			window.addEventListener("touchmove", onTouchMove)
			window.addEventListener("touchend", onTouchEnd)
			frameID = window.requestAnimationFrame(dragFrame)
			down = true
			delta.x = 0
			delta.y = 0
			movement.x = 0
			movement.y = 0
			startPosition.x = touch.clientX
			startPosition.y = touch.clientY
			position.x = touch.clientX
			position.y = touch.clientY
			pointer.x = touch.clientX
			pointer.y = touch.clientY
		}
	}

	const onTouchMove = (event: TouchEvent) => {
		const touch = event.changedTouches[0]
		if (touch.identifier === firstTouch!.identifier) {
			pointer.x = touch.clientX
			pointer.y = touch.clientY
		}
	}

	const onTouchEnd = (event: TouchEvent) => {
		const touch = event.changedTouches[0]
		if (touch.identifier === firstTouch!.identifier) {
			window.removeEventListener("touchmove", onTouchMove)
			window.removeEventListener("touchend", onTouchEnd)
			if (drag) {
				dragStop()
			}
			down = false
			firstTouch = null
		}
	}

	element.addEventListener("mousedown", onMouseDown)
	element.addEventListener("touchstart", onTouchStart)

	return () => {
		element.removeEventListener("mousedown", onMouseDown)
		element.removeEventListener("touchstart", onTouchStart)

		window.removeEventListener("mousemove", onMouseMove)
		window.removeEventListener("mouseup", onMouseUp)
		window.removeEventListener("touchmove", onTouchMove)
		window.removeEventListener("touchend", onTouchEnd)

		window.cancelAnimationFrame(frameID)
	}
}

export type {
	Params as HandleDragParams,
}

export {
	handleDrag,
	hasDragCallback,
}
