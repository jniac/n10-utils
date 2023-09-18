/**
 * Ok, simple util function to declare a map over an array but with "separators".
 * 
 * ## Usage:
 * ```
 * mapWithSeparator(
 *   ['a', 'b', 'c'], 
 *   (item, index) => (
 *     <div key={`itm-${index}`}>itm-{index}-{item}</div>
 *   ),
 *   index => <div key={`sep-${index}`}>sep-{index}</div>,
 * )
 * ```
 * will return:
 * ```html
 *   <div>itm-0-a</div>
 *   <div>sep-0</div>
 *   <div>itm-1-b</div>
 *   <div>sep-1</div>
 *   <div>itm-2-c</div>
 * ```
 * 
 * ## NOTE:
 * There is also a "unique" index option:
 * ```
 * mapWithSeparator(
 *   ['a', 'b', 'c'], 
 *   (item, _, uniqueIndex) => (
 *     <div key={uniqueIndex}>itm-{uniqueIndex}-{item}</div>
 *   ),
 *   (_, uniqueIndex) => <div key={uniqueIndex}>sep-{uniqueIndex}</div>,
 * )
 * ```
 * will return:
 * ```html
 *   <div>itm-0-a</div>
 *   <div>sep-1</div>
 *   <div>itm-2-b</div>
 *   <div>sep-3</div>
 *   <div>itm-4-c</div>
 * ```
 */
export function mapWithSeparator<T, S, M>(
  source: T[], 
  item: (item: T, index: number, uniqueIndex: number) => M,
  separator: (index: number, uniqueIndex: number) => S, 
): (M | S)[] {
  const length = source.length
  const result: (M | S)[] = []
  if (length > 0) {
    result.push(item(source[0], 0, 0))
    for (let i = 1; i < length; i++) {
      result.push(separator(i - 1, i * 2 - 1))
      result.push(item(source[i], i, i * 2))
    }
  }
  return result
}
