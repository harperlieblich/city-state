/**
 * Every tunable in the simulation lives here so the UI can bind sliders
 * directly to one object. Values marked "live" can be changed while the sim
 * runs; the others only take effect on reset.
 */
export interface SimParams {
  // --- World (reset) ---
  width: number
  height: number
  /** Vertical exaggeration: elevation 0..1 is multiplied by this to get "height units" (≈ metres). */
  heightScale: number
  /** How many citizens live in the settlement. */
  citizens: number

  // --- Time (reset) ---
  ticksPerDay: number

  // --- Movement cost (live) ---
  /** Extra cost per unit of elevation change between neighbouring cells. */
  slopePenalty: number
  /** 0..0.95: how much a fully worn trail reduces step cost. Higher = faster convergence. */
  trailAttraction: number
  /** Cost multiplier for walking through forest cells. */
  forestCost: number
  /** Cost multiplier for walking over rock cells. */
  rockCost: number
  /** Cost multiplier for wading through a ford. */
  fordCost: number
  /**
   * 0..1: how unpredictable routes over unworn ground are. Each trip sees
   * random extra cost on fresh grass (but not on worn trails), so early
   * routes spread out and the wear mechanic picks the winners.
   */
  wander: number

  // --- Wear (live) ---
  /** Wear added to a cell each time an agent steps on it (wear is clamped to 0..1). */
  wearPerStep: number
  /** Fraction of wear lost per day to grass regrowth. */
  wearDecayPerDay: number

  // --- Daily schedule (live) ---
  /** Probability a citizen visits the well on the way home each day. */
  wellVisitChance: number
  /** Fraction of the day (0..1) when the earliest citizen leaves for work. */
  leaveStart: number
  /** Fraction of the day when the last citizen leaves for work. */
  leaveEnd: number
  /** Fraction of the day when work ends and people head home. */
  workEnd: number
}

export const DEFAULT_PARAMS: SimParams = {
  width: 128,
  height: 128,
  heightScale: 24,
  citizens: 120,

  ticksPerDay: 240,

  slopePenalty: 1.5,
  trailAttraction: 0.6,
  forestCost: 1.8,
  rockCost: 3.0,
  fordCost: 2.5,
  wander: 0.5,

  wearPerStep: 0.008,
  wearDecayPerDay: 0.1,

  wellVisitChance: 0.5,
  leaveStart: 0.1,
  leaveEnd: 0.3,
  workEnd: 0.65,
}

export function cloneParams(p: SimParams = DEFAULT_PARAMS): SimParams {
  return { ...p }
}
