import type { SimParams } from './params'
import { CellKind, type World } from './world'

export const SQRT2 = Math.SQRT2

/** Upper bound on trail attraction so step cost never reaches zero. */
export const MAX_TRAIL_ATTRACTION = 0.95

/**
 * Cost of stepping from cell `from` onto neighbouring cell `to`.
 *
 *   distance × terrain multiplier × (1 + slopePenalty·|Δelevation|) × (1 − trailAttraction·wear) × wander
 *
 * Returns Infinity for impassable cells. The trail term is what makes the
 * whole simulation work: worn ground is cheaper, so routes that people use
 * become routes that more people use.
 */
export function stepCost(
  world: World,
  params: SimParams,
  from: number,
  to: number,
  diagonal: boolean,
  tripSalt = 0,
): number {
  const kind = world.kind[to]
  if (kind === CellKind.Water) return Infinity

  let mult = 1
  if (kind === CellKind.Forest) mult = params.forestCost
  else if (kind === CellKind.Rock) mult = params.rockCost
  else if (kind === CellKind.Ford) mult = params.fordCost

  const rise = Math.abs(world.elevation[to] - world.elevation[from])
  const slope = 1 + params.slopePenalty * rise

  const wear = world.wear[to]
  const attraction = Math.min(params.trailAttraction, MAX_TRAIL_ATTRACTION)
  const trail = 1 - attraction * wear

  // Fresh ground is uncertain: add per-trip noise that fades as the trail wears in.
  const wander = 1 + params.wander * (1 - wear) * hash01(to, tripSalt)

  return (diagonal ? SQRT2 : 1) * mult * slope * trail * wander
}

/** Cheap deterministic hash of (cell, salt) to [0, 1). */
export function hash01(cell: number, salt: number): number {
  let h = Math.imul(cell, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/**
 * The smallest multiplier any step can have, used to keep the A* heuristic
 * admissible: no step can ever cost less than distance × this.
 */
export function minCostMultiplier(params: SimParams): number {
  return 1 - Math.min(params.trailAttraction, MAX_TRAIL_ATTRACTION)
}
