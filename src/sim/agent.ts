import type { Rng } from './rng'
import type { SimParams } from './params'
import { findPath } from './pathfind'
import { addWear } from './wear'
import type { World } from './world'

export const AgentState = {
  AtHome: 0,
  ToWork: 1,
  Working: 2,
  ToWell: 3,
  AtWell: 4,
  ToHome: 5,
} as const
export type AgentState = (typeof AgentState)[keyof typeof AgentState]

/** How long a well visit takes, in ticks. */
const WELL_STAY_TICKS = 8

/**
 * A citizen with a home, a workplace and a daily routine:
 *
 *   atHome → toWork → working → (toWell → atWell)? → toHome → atHome
 *
 * Agents move one cell per tick along an A* path computed at the start of
 * each trip. Every step packs the ground a little (see wear.ts).
 */
export class Agent {
  readonly id: number
  readonly home: number
  readonly work: number
  state: AgentState = AgentState.AtHome
  /** Current cell and the cell before it, so the renderer can interpolate. */
  cell: number
  prevCell: number
  path: number[] = []
  pathIdx = 0
  /** Tick-of-day at which this agent leaves for work today. */
  leaveTick = 0
  /** Tick-of-day until which the agent lingers (well visit). */
  waitUntil = 0

  constructor(id: number, home: number, work: number) {
    this.id = id
    this.home = home
    this.work = work
    this.cell = home
    this.prevCell = home
  }

  get moving(): boolean {
    return this.pathIdx < this.path.length
  }

  /** Pick today's departure time within the leave window. */
  planDay(rng: Rng, params: SimParams) {
    this.leaveTick = Math.floor(rng.range(params.leaveStart, params.leaveEnd) * params.ticksPerDay)
  }

  update(ctx: AgentContext) {
    const { world, params, rng, tickOfDay } = ctx
    switch (this.state) {
      case AgentState.AtHome:
        if (tickOfDay >= this.leaveTick && tickOfDay < params.workEnd * params.ticksPerDay) {
          if (this.startTrip(world, params, rng, this.work)) this.state = AgentState.ToWork
          else this.leaveTick = Infinity // unreachable today; try again tomorrow
        }
        break

      case AgentState.ToWork:
        if (this.step(world, params)) this.state = AgentState.Working
        break

      case AgentState.Working:
        if (tickOfDay >= params.workEnd * params.ticksPerDay) {
          if (rng.chance(params.wellVisitChance) && this.startTrip(world, params, rng, ctx.well)) {
            this.state = AgentState.ToWell
          } else if (this.startTrip(world, params, rng, this.home)) {
            this.state = AgentState.ToHome
          }
        }
        break

      case AgentState.ToWell:
        if (this.step(world, params)) {
          this.state = AgentState.AtWell
          this.waitUntil = tickOfDay + WELL_STAY_TICKS
        }
        break

      case AgentState.AtWell:
        if (tickOfDay >= this.waitUntil || tickOfDay === 0) {
          if (this.startTrip(world, params, rng, this.home)) this.state = AgentState.ToHome
        }
        break

      case AgentState.ToHome:
        if (this.step(world, params)) this.state = AgentState.AtHome
        break
    }
  }

  private startTrip(world: World, params: SimParams, rng: Rng, target: number): boolean {
    const path = findPath(world, params, this.cell, target, rng.int(1, 1 << 30))
    if (path === null) return false
    this.path = path
    this.pathIdx = 0
    return true
  }

  /** Advance one cell. Returns true once the destination is reached. */
  private step(world: World, params: SimParams): boolean {
    if (this.pathIdx < this.path.length) {
      this.prevCell = this.cell
      this.cell = this.path[this.pathIdx++]
      addWear(world, this.cell, params)
    }
    if (this.pathIdx >= this.path.length) {
      this.prevCell = this.cell
      return true
    }
    return false
  }
}

export interface AgentContext {
  world: World
  params: SimParams
  rng: Rng
  tickOfDay: number
  well: number
}
