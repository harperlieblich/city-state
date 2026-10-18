/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * Every random decision in the simulation goes through one of these so a run
 * is fully reproducible from its seed. Never use Math.random() in src/sim.
 */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  /** Uniform integer in [min, max) . */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min))
  }

  /** True with the given probability. */
  chance(p: number): boolean {
    return this.next() < p
  }

  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length)]
  }

  /** In-place Fisher–Yates shuffle. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1)
      const tmp = items[i]
      items[i] = items[j]
      items[j] = tmp
    }
    return items
  }
}
