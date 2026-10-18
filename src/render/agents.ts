import * as THREE from 'three'
import { AgentState, type Agent, type World } from '../sim'
import type { TerrainMesh } from './terrainMesh'

const COLOR_BY_STATE: Record<number, THREE.Color> = {
  [AgentState.AtHome]: new THREE.Color(0xe6d3a8),
  [AgentState.ToWork]: new THREE.Color(0xe8a040),
  [AgentState.Working]: new THREE.Color(0xd8c070),
  [AgentState.ToWell]: new THREE.Color(0x50b0e0),
  [AgentState.AtWell]: new THREE.Color(0x50b0e0),
  [AgentState.ToHome]: new THREE.Color(0xc06090),
}

/**
 * Citizens as one instanced mesh. Positions are interpolated between the
 * agent's previous and current cell by `alpha` (fraction of the current
 * tick elapsed) so motion looks smooth at low speeds.
 */
export class AgentsView {
  readonly mesh: THREE.InstancedMesh
  private readonly world: World
  private readonly terrain: TerrainMesh
  private readonly dummy = new THREE.Object3D()

  constructor(world: World, terrain: TerrainMesh, count: number) {
    this.world = world
    this.terrain = terrain
    const geometry = new THREE.CapsuleGeometry(0.22, 0.5, 3, 6)
    geometry.translate(0, 0.5, 0)
    const material = new THREE.MeshLambertMaterial()
    this.mesh = new THREE.InstancedMesh(geometry, material, count)
    this.mesh.castShadow = true
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }

  update(agents: Agent[], alpha: number, visible: boolean) {
    this.mesh.visible = visible
    if (!visible) return
    const { world, terrain, dummy, mesh } = this
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i]
      const x0 = world.xOf(a.prevCell)
      const y0 = world.yOf(a.prevCell)
      const x1 = world.xOf(a.cell)
      const y1 = world.yOf(a.cell)
      const t = a.moving ? alpha : 1
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      dummy.position.set(x, terrain.heightAt(x, y), y)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, COLOR_BY_STATE[a.state])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
