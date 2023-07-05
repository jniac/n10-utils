
type Direction = 'horizontal' | 'vertical'

type Info = {
	direction: Direction
	startPosition: DOMPoint
	position: DOMPoint
	movement: DOMPoint
	delta: DOMPoint
}

type DragCallback = (info: Info) => void

const defaultParams = {
	distanceThreshold: 10,
}

type Params = Partial<typeof defaultParams & {
	onDragStart: DragCallback
	onDragStop: DragCallback
	onDrag: DragCallback
	onVerticalDragStart: DragCallback
	onVerticalDragStop: DragCallback
	onVerticalDrag: DragCallback
	onHorizontalDragStart: DragCallback
	onHorizontalDragStop: DragCallback
	onHorizontalDrag: DragCallback
}>

export function handleDrag(element: HTMLElement, params: Params) {
	const {
		distanceThreshold,
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
	let frameID = -1
	const pointer = new DOMPoint(0, 0)
	const startPosition = new DOMPoint(0, 0)
	const position = new DOMPoint(0, 0)
	const movement = new DOMPoint(0, 0)
	const delta = new DOMPoint(0, 0)
	const info: Info = {
		direction: 'horizontal',
		startPosition,
		position,
		movement,
		delta,
	}

	const callbackStart = () => {
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

	const callback = () => {
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

	const callbackStop = () => {
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

	const dragFrame = () => {
		if (down) {
			frameID = window.requestAnimationFrame(dragFrame)
			delta.x = pointer.x - position.x
			delta.y = pointer.y - position.y
			position.x += delta.x
			position.y += delta.y

			if (drag === false) {
				const distance = Math.sqrt(movement.x * movement.x + movement.y * movement.y)
				if (distance > distanceThreshold) {
					drag = true
					info.direction = Math.abs(movement.x / movement.y) >= 1 ? 'horizontal' : 'vertical'
					callbackStart()
				}
			}

			if (drag) {
				callback()
			}
		}
	}

	const onMouseDown = (event: MouseEvent) => {
		window.addEventListener("mousemove", onMouseMove)
		window.addEventListener("mouseup", onMouseUp)
		frameID = window.requestAnimationFrame(dragFrame)
		down = true
		delta.x = 0
		delta.y = 0
		movement.x = 0
		movement.y = 0
		startPosition.x = event.clientX
		startPosition.y = event.clientY
		position.x = event.clientX
		position.y = event.clientY
		pointer.x = event.clientX
		pointer.y = event.clientY
	}

	const onMouseMove = (event: MouseEvent) => {
		pointer.x = event.clientX
		pointer.y = event.clientY
		movement.x = pointer.x - startPosition.x
		movement.y = pointer.y - startPosition.y
	}

	const onMouseUp = () => {
		window.removeEventListener("mousemove", onMouseMove)
		window.addEventListener("mouseup", onMouseUp)
		if (drag) {
			callbackStop()
		}
		drag = false
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
			movement.x = pointer.x - startPosition.x
			movement.y = pointer.y - startPosition.y
		}
	}

	const onTouchEnd = (event: TouchEvent) => {
		const touch = event.changedTouches[0]
		if (touch.identifier === firstTouch!.identifier) {
			window.removeEventListener("touchmove", onTouchMove)
			window.removeEventListener("touchend", onTouchEnd)
			if (drag) {
				callbackStop()
			}
			down = false
			drag = false
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
