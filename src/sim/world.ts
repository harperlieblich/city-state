/**
 * The world is a grid of cells. Each cell has an elevation, a terrain kind and
 * a wear value (0 = untouched grass, 1 = fully packed earth). Cells are
 * addressed by a single index (y * width + x) so hot loops can use typed arrays.
 */
export const CellKind = {
  Grass: 0,
  Water: 1,
  Forest: 2,
  Rock: 3,
  /** Shallow river crossing: passable but slow. */
  Ford: 4,
} as const
export type CellKind = (typeof CellKind)[keyof typeof CellKind]

export class World {
  readonly width: number
  readonly height: number
  /** Elevation in height units (0 = lowest point). */
  readonly elevation: Float32Array
  readonly kind: Uint8Array
  /** Trail wear per cell, 0..1. */
  readonly wear: Float32Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    const n = width * height
    this.elevation = new Float32Array(n)
    this.kind = new Uint8Array(n)
    this.wear = new Float32Array(n)
  }

  get size(): number {
    return this.width * this.height
  }

  index(x: number, y: number): number {
    return y * this.width + x
  }

  xOf(i: number): number {
    return i % this.width
  }

  yOf(i: number): number {
    return Math.floor(i / this.width)
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  isPassable(i: number): boolean {
    return this.kind[i] !== CellKind.Water
  }

  /** Mean absolute elevation difference to the 4 orthogonal neighbours. */
  slopeAt(i: number): number {
    const x = this.xOf(i)
    const y = this.yOf(i)
    const e = this.elevation[i]
    let sum = 0
    let count = 0
    if (x > 0) { sum += Math.abs(this.elevation[i - 1] - e); count++ }
    if (x < this.width - 1) { sum += Math.abs(this.elevation[i + 1] - e); count++ }
    if (y > 0) { sum += Math.abs(this.elevation[i - this.width] - e); count++ }
    if (y < this.height - 1) { sum += Math.abs(this.elevation[i + this.width] - e); count++ }
    return count ? sum / count : 0
  }
}

/** Chebyshev distance between two cell indices. */
export function cellDistance(world: World, a: number, b: number): number {
  const dx = Math.abs(world.xOf(a) - world.xOf(b))
  const dy = Math.abs(world.yOf(a) - world.yOf(b))
  return Math.max(dx, dy)
}

/** Euclidean distance between two cell indices. */
export function cellEuclid(world: World, a: number, b: number): number {
  const dx = world.xOf(a) - world.xOf(b)
  const dy = world.yOf(a) - world.yOf(b)
  return Math.sqrt(dx * dx + dy * dy)
}
