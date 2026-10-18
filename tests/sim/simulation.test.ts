import { describe, expect, it } from 'vitest'
import { AgentState, CellKind, createSimulation } from '../../src/sim'

/** Share of total wear held by the most-worn `fraction` of worn cells. */
function concentration(wear: Float32Array, fraction: number): number {
  const worn = Array.from(wear).filter((w) => w > 0).sort((a, b) => b - a)
  const total = worn.reduce((a, b) => a + b, 0)
  const top = worn.slice(0, Math.ceil(worn.length * fraction)).reduce((a, b) => a + b, 0)
  return top / total
}

describe('Simulation', () => {
  it('is deterministic for a given seed', () => {
    const a = createSimulation(1, { citizens: 40 })
    const b = createSimulation(1, { citizens: 40 })
    a.runDays(5)
    b.runDays(5)
    expect(Array.from(a.world.wear)).toEqual(Array.from(b.world.wear))
    expect(a.agents.map((x) => x.cell)).toEqual(b.agents.map((x) => x.cell))
  })

  it('differs between seeds', () => {
    const a = createSimulation(1, { citizens: 40 })
    const b = createSimulation(2, { citizens: 40 })
    a.runDays(2)
    b.runDays(2)
    expect(Array.from(a.world.wear)).not.toEqual(Array.from(b.world.wear))
  })

  it('places the settlement on land with huts, a well and work sites', () => {
    const sim = createSimulation(3)
    const { hall, well, huts, worksites } = sim.settlement
    expect(sim.world.kind[hall]).toBe(CellKind.Grass)
    expect(sim.world.kind[well]).toBe(CellKind.Grass)
    expect(huts.length).toBeGreaterThan(0)
    expect(worksites.length).toBeGreaterThanOrEqual(3)
    for (const a of sim.agents) expect(huts).toContain(a.home)
  })

  it('sends citizens to work and brings them home', () => {
    const sim = createSimulation(1, { citizens: 40 })
    // Mid-day: most people should be at work or walking.
    sim.run(Math.floor(sim.params.ticksPerDay * 0.5))
    const atWorkOrWalking = sim.agents.filter((a) => a.state !== AgentState.AtHome).length
    expect(atWorkOrWalking).toBeGreaterThan(sim.agents.length * 0.8)
    // End of day: everyone is home again.
    sim.run(sim.params.ticksPerDay - sim.tickOfDay)
    expect(sim.agents.every((a) => a.state === AgentState.AtHome)).toBe(true)
    expect(sim.day).toBe(1)
  })

  it('etches wear into the ground and concentrates it into trails', () => {
    const sim = createSimulation(1)
    sim.runDays(20)
    const wear = sim.world.wear
    const wornCells = Array.from(wear).filter((w) => w > 0).length
    expect(wornCells).toBeGreaterThan(100)
    // A real trail network: a minority of worn cells carry most of the wear.
    expect(concentration(wear, 0.3)).toBeGreaterThan(0.5)
    // And some cells are fully packed earth.
    expect(Math.max(...wear)).toBeGreaterThan(0.9)
  })

  it('lets trails fade when nobody walks them', () => {
    const sim = createSimulation(1, { citizens: 40 })
    sim.runDays(5)
    const before = Array.from(sim.world.wear).reduce((a, b) => a + b, 0)
    // Nobody leaves home any more (work ends before anyone would leave).
    sim.params.leaveStart = 0.9
    sim.params.leaveEnd = 0.95
    sim.params.workEnd = 0.5
    sim.runDays(10)
    const after = Array.from(sim.world.wear).reduce((a, b) => a + b, 0)
    expect(after).toBeLessThan(before * 0.5)
  })

  it('never lets anyone walk on water', () => {
    const sim = createSimulation(5, { citizens: 60 })
    for (let t = 0; t < sim.params.ticksPerDay * 2; t++) {
      sim.step()
      for (const a of sim.agents) expect(sim.world.kind[a.cell]).not.toBe(CellKind.Water)
    }
  })
})
