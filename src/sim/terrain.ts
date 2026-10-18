import { Rng } from './rng'
import type { SimParams } from './params'
import { CellKind, World } from './world'

/**
 * Procedural terrain: layered value noise for rolling hills, a meandering
 * river carved through the low ground, forest patches on the mid-slopes and
 * bare rock on the peaks.
 */
export function generateTerrain(rng: Rng, params: SimParams): World {
  const { width, height } = params
  const world = new World(width, height)

  const noise = new ValueNoise(rng)
  const raw = new Float32Array(world.size)
  let min = Infinity
  let max = -Infinity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Four octaves of value noise; the first is a broad feature, the rest add detail.
      let e = 0
      let amp = 1
      let freq = 1 / 48
      for (let o = 0; o < 4; o++) {
        e += amp * noise.sample(x * freq, y * freq)
        amp *= 0.5
        freq *= 2
      }
      const i = world.index(x, y)
      raw[i] = e
      if (e < min) min = e
      if (e > max) max = e
    }
  }

  // Normalise to 0..1 and apply a gentle curve so there are broad lowlands and a few peaks.
  // (Clamp: raw is float32 while min/max are float64, so the extremes can round past them.)
  for (let i = 0; i < world.size; i++) {
    const n = Math.min(1, Math.max(0, (raw[i] - min) / (max - min)))
    raw[i] = Math.pow(n, 1.4)
  }

  carveRiver(rng, world, raw, noise)

  for (let i = 0; i < world.size; i++) {
    world.elevation[i] = raw[i] * params.heightScale
  }

  // Classify cells. Forest uses a separate noise field so patches don't just follow contours.
  const forestNoise = new ValueNoise(rng)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = world.index(x, y)
      if (world.kind[i] === CellKind.Water || world.kind[i] === CellKind.Ford) continue
      const n = raw[i]
      if (n > 0.82) {
        world.kind[i] = CellKind.Rock
      } else if (n > 0.22 && forestNoise.sample(x / 14, y / 14) > 0.66) {
        world.kind[i] = CellKind.Forest
      } else {
        world.kind[i] = CellKind.Grass
      }
    }
  }

  return world
}

/**
 * Lay a river from the top edge to the bottom edge, wandering left and right
 * with noise, with a few fords where it can be crossed. The channel is lowered a little so the banks slope toward it.
 */
function carveRiver(rng: Rng, world: World, raw: Float32Array, noise: ValueNoise) {
  const { width, height } = world
  let x = rng.range(width * 0.3, width * 0.7)
  const wander = rng.range(1.6, 2.6)
  const phase = rng.range(0, 100)
  const radius = 1.6

  // A few shallow fords (two rows deep) so the river can be crossed, slowly.
  const fordRows = new Set<number>()
  const fordCount = Math.max(1, Math.round(height / 48))
  for (let f = 0; f < fordCount; f++) {
    const y0 = Math.floor(((f + 0.5) / fordCount) * height + rng.range(-8, 8))
    fordRows.add(y0)
    fordRows.add(y0 + 1)
  }

  for (let y = 0; y < height; y++) {
    // Meander: smooth noise drives the horizontal drift.
    x += (noise.sample(phase + y / 18, 7.3) - 0.5) * 2 * wander
    x = Math.max(4, Math.min(width - 5, x))

    const cx = Math.round(x)
    const ford = fordRows.has(y)
    for (let dx = -3; dx <= 3; dx++) {
      const px = cx + dx
      if (!world.inBounds(px, y)) continue
      const i = world.index(px, y)
      const d = Math.abs(dx)
      if (d <= radius) {
        world.kind[i] = ford ? CellKind.Ford : CellKind.Water
        raw[i] = Math.min(raw[i], ford ? 0.06 : 0.04)
      } else {
        // Banks: pull nearby ground down toward the water level.
        const t = (d - radius) / (3 - radius)
        raw[i] = Math.min(raw[i], 0.04 + t * 0.25 + raw[i] * t)
      }
    }
  }
}

/** Smooth value noise over a lattice of seeded random values. */
class ValueNoise {
  private readonly lattice = new Map<number, number>()
  private readonly rng: Rng
  private readonly salt: number

  constructor(rng: Rng) {
    this.rng = rng
    this.salt = rng.int(0, 1 << 30)
  }

  private at(ix: number, iy: number): number {
    const key = ix * 73856093 ^ iy * 19349663 ^ this.salt
    let v = this.lattice.get(key)
    if (v === undefined) {
      v = this.rng.next()
      this.lattice.set(key, v)
    }
    return v
  }

  sample(x: number, y: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = smooth(x - ix)
    const fy = smooth(y - iy)
    const a = this.at(ix, iy)
    const b = this.at(ix + 1, iy)
    const c = this.at(ix, iy + 1)
    const d = this.at(ix + 1, iy + 1)
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy)
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
