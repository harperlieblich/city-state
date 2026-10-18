import GUI from 'lil-gui'
import type { AppState } from './main'

/**
 * The tuning panel. Sim params are bound directly to the params object the
 * simulation reads from, so sliders take effect on the next tick. Settings
 * that change the world shape (size, citizens, seed) need a Reset.
 */
export function buildUi(state: AppState, onColorModeChange: () => void) {
  const gui = new GUI({ title: 'City-State · trail sim', width: 300 })
  const p = state.params

  const run = gui.addFolder('Run')
  run.add(state, 'playing').name('Playing  (space)')
  run.add(state, 'speed', 5, 3000, 1).name('Speed (ticks/s)')
  run.add(state, 'seed', 1, 9999, 1).name('Seed')
  run.add(state, 'reset').name('↻  Reset world')

  const trails = gui.addFolder('Trails')
  trails.add(p, 'wearPerStep', 0.001, 0.05, 0.001).name('Wear per step')
  trails.add(p, 'wearDecayPerDay', 0, 0.5, 0.005).name('Regrowth per day')
  trails.add(p, 'trailAttraction', 0, 0.95, 0.01).name('Trail attraction')
  trails.add(p, 'wander', 0, 2, 0.05).name('Wander')

  const cost = gui.addFolder('Terrain cost')
  cost.add(p, 'slopePenalty', 0, 6, 0.1).name('Slope penalty')
  cost.add(p, 'forestCost', 1, 5, 0.1).name('Forest')
  cost.add(p, 'rockCost', 1, 8, 0.1).name('Rock')
  cost.add(p, 'fordCost', 1, 8, 0.1).name('Ford')

  const life = gui.addFolder('Daily life')
  life.add(p, 'wellVisitChance', 0, 1, 0.05).name('Well visit chance')
  life.add(p, 'leaveStart', 0, 0.5, 0.01).name('Earliest departure')
  life.add(p, 'leaveEnd', 0, 0.6, 0.01).name('Latest departure')
  life.add(p, 'workEnd', 0.3, 0.95, 0.01).name('Work ends')
  life.add(p, 'citizens', 10, 400, 10).name('Citizens (reset)')

  const world = gui.addFolder('World (reset)')
  world.add(p, 'width', 64, 256, 32).name('Width')
  world.add(p, 'height', 64, 256, 32).name('Height')
  world.add(p, 'heightScale', 4, 60, 1).name('Hill height')
  world.close()

  const viewFolder = gui.addFolder('View')
  viewFolder.add(state, 'colorMode', { Natural: 'natural', 'Wear heatmap': 'heatmap' }).name('Ground').onChange(onColorModeChange)
  viewFolder.add(state, 'showAgents').name('Show citizens')

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault()
      state.playing = !state.playing
    }
  })

  return {
    /** Keep checkbox/slider displays in sync with state changed elsewhere (e.g. the space bar). */
    refresh() {
      run.controllers[0].updateDisplay()
    },
  }
}
