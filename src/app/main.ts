import { AgentsView } from '../render/agents'
import { BuildingsView } from '../render/buildings'
import { SceneView } from '../render/scene'
import { TerrainMesh, type ColorMode } from '../render/terrainMesh'
import { cloneParams, Simulation } from '../sim'
import { buildUi } from './ui'

/** Everything the UI can poke at. Sim params live in `params`; the rest is view state. */
export interface AppState {
  params: ReturnType<typeof cloneParams>
  seed: number
  playing: boolean
  /** Simulation ticks per real second. */
  speed: number
  colorMode: ColorMode
  showAgents: boolean
  reset: () => void
}

const container = document.getElementById('app')!
const hud = document.getElementById('hud')!
const view = new SceneView(container)

const state: AppState = {
  params: cloneParams(),
  seed: 1,
  playing: true,
  speed: 60,
  colorMode: 'natural',
  showAgents: true,
  reset: () => rebuild(),
}

let sim!: Simulation
let terrain!: TerrainMesh
let agentsView!: AgentsView
let buildingsView!: BuildingsView

let accumulator = 0
let lastTime = performance.now()

function rebuild() {
  if (terrain) {
    view.scene.remove(terrain.mesh, agentsView.mesh, buildingsView.group)
    terrain.dispose()
    agentsView.dispose()
  }
  // The sim holds params by reference, so slider changes apply live.
  sim = new Simulation(state.seed, state.params)
  terrain = new TerrainMesh(sim.world)
  agentsView = new AgentsView(sim.world, terrain, sim.agents.length)
  buildingsView = new BuildingsView(sim.world, terrain, sim.settlement.buildings)
  view.scene.add(terrain.mesh, agentsView.mesh, buildingsView.group)
  const hall = sim.settlement.hall
  view.frame(sim.world.xOf(hall), terrain.heightAt(sim.world.xOf(hall), sim.world.yOf(hall)), sim.world.yOf(hall), Math.max(sim.world.width, sim.world.height))
  terrain.updateColors(state.colorMode)
  accumulator = 0
}

rebuild()
const ui = buildUi(state, () => terrain.updateColors(state.colorMode))

// Debug hook: poke at the live sim from the browser console.
declare global {
  interface Window { city: { sim: () => Simulation; view: SceneView; state: AppState } }
}
window.city = { sim: () => sim, view, state }

function frame(now: number) {
  const dt = Math.min(0.25, (now - lastTime) / 1000)
  lastTime = now

  if (state.playing) {
    accumulator += dt * state.speed
    // Cap the work per frame so a huge speed can't freeze the page.
    const maxTicks = 2000
    let n = Math.min(maxTicks, Math.floor(accumulator))
    accumulator -= n
    if (n === maxTicks) accumulator = 0
    const ran = n > 0
    while (n-- > 0) sim.step()
    // Recolour the ground once per frame, not per tick.
    if (ran) terrain.updateColors(state.colorMode)
  }

  // Fraction of the current tick that has elapsed, for smooth agent motion.
  const alpha = state.playing ? Math.min(1, accumulator) : 1
  agentsView.update(sim.agents, alpha, state.showAgents)

  const hours = Math.floor(sim.timeOfDay * 24)
  const minutes = Math.floor((sim.timeOfDay * 24 - hours) * 60)
  hud.textContent = `Day ${sim.day + 1}  ·  ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}  ·  ${sim.agents.length} citizens`
  ui.refresh()

  view.render()
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
