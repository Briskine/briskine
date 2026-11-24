/*
 * Carry values over to loop items whose text was edited.
 *
 * Fields without an id are keyed by where they're written and by the loop
 * items they render for, so a value follows its item when items are added,
 * removed or reordered. When the text of an item changes ("Gm" to "Gma"), its
 * key changes too, and the field would come back empty.
 *
 * After a render that followed a text edit, a field that disappeared gives its
 * value to a field that appeared at the same place in the template and the
 * same position in its loops. An edited outer item keeps the positions of all
 * the fields inside it, so they follow it too.
 *
 * Every field is a record: {key, site, indexes}, where site is where it's
 * written, and indexes its position in its loops, outermost first.
 *
 * Returns the moves, as [fromKey, toKey] pairs.
 *
 */

export default function carryOver (previous = [], current = []) {
  const previousKeys = new Set(previous.map((record) => record.key))
  const currentKeys = new Set(current.map((record) => record.key))
  const position = (record) => `${record.site}\n${record.indexes}`

  const gone = new Map()
  for (const record of previous) {
    // only fields in loops change keys this way
    if (record.indexes && !currentKeys.has(record.key)) {
      gone.set(position(record), record.key)
    }
  }

  const moves = []
  for (const record of current) {
    const from = gone.get(position(record))
    if (from !== undefined && !previousKeys.has(record.key)) {
      moves.push([from, record.key])
    }
  }

  return moves
}
