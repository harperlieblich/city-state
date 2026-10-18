import { minCostMultiplier, SQRT2, stepCost } from './cost'
import type { SimParams } from './params'
import type { World } from './world'

/**
 * A* over the 8-connected grid using stepCost(). Diagonal moves are not
 * allowed to cut the corner of an impassable cell (no squeezing between two
 * water cells).
 *
 * `tripSalt` seeds the per-trip wander noise in stepCost (see cost.ts).
 *
 * Returns the list of cell indices from `start` (exclusive) to `goal`
 * (inclusive), or null if the goal is unreachable.
 */
export function findPath(world: World, params: SimParams, start: number, goal: number, tripSalt = 0): number[] | null {
  if (start === goal) return []
  if (!world.isPassable(goal)) return null

  const n = world.size
  const w = world.width
  const h = world.height

  const g = scratch.g(n)
  const parent = scratch.parent(n)
  const closed = scratch.closed(n)
  g.fill(Infinity)
  closed.fill(0)

  const heur = minCostMultiplier(params)
  const gx = world.xOf(goal)
  const gy = world.yOf(goal)
  const heuristic = (i: number) => {
    const dx = Math.abs(world.xOf(i) - gx)
    const dy = Math.abs(world.yOf(i) - gy)
    // Octile distance: the true minimum length of an 8-connected path.
    const diag = Math.min(dx, dy)
    return (diag * SQRT2 + (Math.max(dx, dy) - diag)) * heur
  }

  const open = new MinHeap()
  g[start] = 0
  parent[start] = -1
  open.push(start, heuristic(start))

  while (open.size > 0) {
    const current = open.pop()
    if (current === goal) break
    if (closed[current]) continue
    closed[current] = 1

    const cx = current % w
    const cy = (current - cx) / w
    const gc = g[current]

    for (let k = 0; k < 8; k++) {
      const dx = DX[k]
      const dy = DY[k]
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const next = ny * w + nx
      if (closed[next]) continue

      const diagonal = dx !== 0 && dy !== 0
      if (diagonal) {
        // Both orthogonal neighbours must be passable to allow the diagonal.
        if (!world.isPassable(current + dx) || !world.isPassable(current + dy * w)) continue
      }

      const cost = stepCost(world, params, current, next, diagonal, tripSalt)
      if (cost === Infinity) continue

      const tentative = gc + cost
      if (tentative < g[next]) {
        g[next] = tentative
        parent[next] = current
        open.push(next, tentative + heuristic(next))
      }
    }
  }

  if (g[goal] === Infinity) return null

  const path: number[] = []
  for (let i = goal; i !== start; i = parent[i]) path.push(i)
  path.reverse()
  return path
}

const DX = [1, -1, 0, 0, 1, 1, -1, -1]
const DY = [0, 0, 1, -1, 1, -1, 1, -1]

/** Reusable typed arrays so we don't allocate per search. */
const scratch = {
  _g: new Float64Array(0),
  _parent: new Int32Array(0),
  _closed: new Uint8Array(0),
  g(n: number) {
    if (this._g.length !== n) this._g = new Float64Array(n)
    return this._g
  },
  parent(n: number) {
    if (this._parent.length !== n) this._parent = new Int32Array(n)
    return this._parent
  },
  closed(n: number) {
    if (this._closed.length !== n) this._closed = new Uint8Array(n)
    return this._closed
  },
}

/** Binary min-heap keyed on f-score. Duplicates are allowed; stale entries are skipped via `closed`. */
class MinHeap {
  private items: number[] = []
  private keys: number[] = []

  get size(): number {
    return this.items.length
  }

  push(item: number, key: number) {
    this.items.push(item)
    this.keys.push(key)
    let i = this.items.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.keys[p] <= this.keys[i]) break
      this.swap(i, p)
      i = p
    }
  }

  pop(): number {
    const top = this.items[0]
    const lastItem = this.items.pop()!
    const lastKey = this.keys.pop()!
    if (this.items.length > 0) {
      this.items[0] = lastItem
      this.keys[0] = lastKey
      let i = 0
      const n = this.items.length
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < n && this.keys[l] < this.keys[m]) m = l
        if (r < n && this.keys[r] < this.keys[m]) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }

  private swap(a: number, b: number) {
    const ti = this.items[a]
    this.items[a] = this.items[b]
    this.items[b] = ti
    const tk = this.keys[a]
    this.keys[a] = this.keys[b]
    this.keys[b] = tk
  }
}
