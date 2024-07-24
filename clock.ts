import {
  onTick as _onTick,
  Tick as _Tick,
  ticker as _ticker,
  Ticker as _Ticker,
  tickerRequestUpdateOnUserInteraction as _tickerRequestUpdateOnUserInteraction,
  windowTicker as _windowTicker
} from './ticker'

/**
 * @deprecated Use `Tick` instead from 'some-utilz/ticker'.
 */
export type ClockState = _Tick

/**
 * @deprecated Use `ticker` instead from 'some-utilz/ticker'.
 */
export const clock = _ticker

/**
 * @deprecated Use `onTick` instead from 'some-utilz/ticker'.
 */
export const onTick = _onTick

/**
 * @deprecated Use `tickerRequestUpdateOnUserInteraction` instead from 'some-utilz/ticker'.
 */
export const requestUpdateOnUserInteraction = _tickerRequestUpdateOnUserInteraction

/**
 * @deprecated Use `windowTicker` instead from 'some-utilz/ticker'.
 */
export const appClock = _windowTicker

/**
 * @deprecated Use `Ticker` instead from 'some-utilz/ticker'.
 */
export const Clock = _Ticker