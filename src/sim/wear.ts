import type { SimParams } from './params'
import type { World } from './world'

/** An agent stepped on this cell: pack the earth a little more. */
export function addWear(world: World, cell: number, params: SimParams) {
  const w = world.wear[cell] + params.wearPerStep
  world.wear[cell] = w > 1 ? 1 : w
}

/** How often (in ticks) the grass regrows. Cheaper than decaying every tick. */
export const DECAY_INTERVAL = 10

/**
 * Grass regrowth: every cell loses a fraction of its wear. Called every
 * DECAY_INTERVAL ticks with a factor compounded so that the total loss over a
 * day equals wearDecayPerDay.
 */
export function decayWear(world: World, params: SimParams) {
  const perDay = 1 - params.wearDecayPerDay
  const factor = Math.pow(perDay, DECAY_INTERVAL / params.ticksPerDay)
  const wear = world.wear
  for (let i = 0; i < wear.length; i++) {
    const w = wear[i]
    if (w > 0) {
      const next = w * factor
      wear[i] = next < 1e-4 ? 0 : next
    }
  }
}
