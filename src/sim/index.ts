import { Agent } from './agent'
import { cloneParams, DEFAULT_PARAMS, type SimParams } from './params'
import { Rng } from './rng'
import { BuildingKind, placeSettlement, type Settlement } from './settlement'
import { generateTerrain } from './terrain'
import { DECAY_INTERVAL, decayWear } from './wear'
import type { World } from './world'

export { Agent, AgentState } from './agent'
export { DEFAULT_PARAMS, cloneParams, type SimParams } from './params'
export { Rng } from './rng'
export { BuildingKind, type Building, type Settlement } from './settlement'
export { CellKind, World } from './world'
export { findPath } from './pathfind'
export { stepCost } from './cost'

/**
 * One self-contained, deterministic simulation: terrain + settlement + agents.
 * `params` is held by reference so a UI can bind sliders directly to it; the
 * "live" params take effect immediately, the rest need a new Simulation.
 */
export class Simulation {
  readonly seed: number
  readonly params: SimParams
  readonly world: World
  readonly settlement: Settlement
  readonly agents: Agent[]
  private readonly rng: Rng
  /** Total ticks elapsed since creation. */
  tick = 0

  constructor(seed: number, params: SimParams = DEFAULT_PARAMS) {
    this.seed = seed
    this.params = params
    this.rng = new Rng(seed)
    this.world = generateTerrain(this.rng, params)
    this.settlement = placeSettlement(this.rng, this.world, params)
    this.agents = this.createAgents()
    for (const a of this.agents) a.planDay(this.rng, params)
  }

  get day(): number {
    return Math.floor(this.tick / this.params.ticksPerDay)
  }

  get tickOfDay(): number {
    return this.tick % this.params.ticksPerDay
  }

  /** Fraction of the current day elapsed, 0..1. */
  get timeOfDay(): number {
    return this.tickOfDay / this.params.ticksPerDay
  }

  /** Advance the world by one tick. */
  step() {
    const tickOfDay = this.tickOfDay
    if (tickOfDay === 0 && this.tick > 0) {
      for (const a of this.agents) a.planDay(this.rng, this.params)
    }
    const ctx = {
      world: this.world,
      params: this.params,
      rng: this.rng,
      tickOfDay,
      well: this.settlement.well,
    }
    for (const a of this.agents) a.update(ctx)
    if (this.tick % DECAY_INTERVAL === 0) decayWear(this.world, this.params)
    this.tick++
  }

  run(ticks: number) {
    for (let i = 0; i < ticks; i++) this.step()
  }

  runDays(days: number) {
    this.run(days * this.params.ticksPerDay)
  }

  private createAgents(): Agent[] {
    const { huts, worksites } = this.settlement
    // Fields employ most people; the forest and river are smaller crews.
    const weighted: number[] = []
    for (const site of worksites) {
      const w = site.kind === BuildingKind.Field ? 3 : 2
      for (let i = 0; i < w; i++) weighted.push(site.cell)
    }
    const agents: Agent[] = []
    for (let i = 0; i < this.params.citizens; i++) {
      const home = huts[i % huts.length]
      const work = weighted.length ? this.rng.pick(weighted) : this.settlement.hall
      agents.push(new Agent(i, home, work))
    }
    return agents
  }
}

export function createSimulation(seed: number, params?: Partial<SimParams>): Simulation {
  return new Simulation(seed, { ...cloneParams(), ...params })
}
