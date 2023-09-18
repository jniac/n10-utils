/**
 * Ok, simple util function to declare a map over an array but with "separators".
 * 
 * Example:
 * ```
 * mapWithSeparator(
 *   ['a', 'b', 'c'], 
 *   (item, index) => (
 *     <div key={index}>itm-{index}-{item}</div>
 *   ),
 *   index => <div key={index}>sep-{index}</div>,
 * )
 * ```
 * will return:
 * ```html
 * <div>itm-0-a</div>
 * <div>sep-1</div>
 * <div>itm-2-b</div>
 * <div>sep-3</div>
 * <div>itm-4-c</div>
 * ```
 */
export function mapWithSeparator<T, S, M>(
  source: T[], 
  item: (item: T, index: number) => M,
  separator: (index: number) => S, 
): (M | S)[] {
  const length = source.length
  const result: (M | S)[] = []
  if (length > 0) {
    result.push(item(source[0], 0))
    for (let i = 1; i < length; i++) {
      result.push(separator(i * 2 - 1))
      result.push(item(source[i], i * 2))
    }
  }
  return result
}
