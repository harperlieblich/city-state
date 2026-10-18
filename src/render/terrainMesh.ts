import * as THREE from 'three'
import { CellKind, type World } from '../sim'

export type ColorMode = 'natural' | 'heatmap'

const GRASS = new THREE.Color(0x6a9a3c)
const GRASS_DRY = new THREE.Color(0x9bb05a)
const FOREST = new THREE.Color(0x2f6b2f)
const ROCK = new THREE.Color(0x8a8378)
const SNOW = new THREE.Color(0xdcdcd6)
const WATER = new THREE.Color(0x3a74b8)
const FORD = new THREE.Color(0x7a9ab0)
const TRAMPLED = new THREE.Color(0x9c9050)
const EARTH = new THREE.Color(0x7a5a38)
const HEAT_BASE = new THREE.Color(0x3a3a3a)
const HEAT_LOW = new THREE.Color(0x2b4a9a)
const HEAT_MID = new THREE.Color(0xe8c030)
const HEAT_HIGH = new THREE.Color(0xd8302a)

/**
 * One vertex per world cell, displaced by elevation, coloured by terrain kind
 * and trail wear. Colours are refreshed on demand (every few sim ticks), not
 * every frame.
 */
export class TerrainMesh {
  readonly mesh: THREE.Mesh
  private readonly world: World
  private readonly colors: Float32Array
  private readonly tmp = new THREE.Color()

  constructor(world: World) {
    this.world = world
    const { width, height } = world
    const n = width * height

    const positions = new Float32Array(n * 3)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = world.index(x, y)
        positions[i * 3] = x
        positions[i * 3 + 1] = this.surfaceHeight(i)
        positions[i * 3 + 2] = y
      }
    }

    const indices = new Uint32Array((width - 1) * (height - 1) * 6)
    let k = 0
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const a = world.index(x, y)
        const b = a + 1
        const c = a + width
        const d = c + 1
        indices[k++] = a; indices[k++] = c; indices[k++] = b
        indices[k++] = b; indices[k++] = c; indices[k++] = d
      }
    }

    this.colors = new Float32Array(n * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeVertexNormals()

    const material = new THREE.MeshLambertMaterial({ vertexColors: true })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.receiveShadow = true
    this.mesh.castShadow = true
    this.updateColors('natural')
  }

  /** Water sits a touch below its banks so the river reads as a channel. */
  private surfaceHeight(i: number): number {
    const e = this.world.elevation[i]
    return this.world.kind[i] === CellKind.Water ? e - 0.25 : e
  }

  updateColors(mode: ColorMode) {
    const { world, colors, tmp } = this
    const maxElev = world.elevation.reduce((m, v) => (v > m ? v : m), 0) || 1
    for (let i = 0; i < world.size; i++) {
      const kind = world.kind[i]
      const wear = world.wear[i]
      if (mode === 'heatmap') {
        if (kind === CellKind.Water) tmp.copy(WATER).multiplyScalar(0.5)
        else if (wear < 0.15) tmp.copy(HEAT_BASE).lerp(HEAT_LOW, wear / 0.15)
        else if (wear < 0.5) tmp.copy(HEAT_LOW).lerp(HEAT_MID, (wear - 0.15) / 0.35)
        else tmp.copy(HEAT_MID).lerp(HEAT_HIGH, (wear - 0.5) * 2)
      } else {
        switch (kind) {
          case CellKind.Water:
            tmp.copy(WATER)
            break
          case CellKind.Ford:
            tmp.copy(FORD)
            break
          case CellKind.Rock: {
            const t = world.elevation[i] / maxElev
            tmp.copy(ROCK).lerp(SNOW, Math.max(0, (t - 0.85) / 0.15))
            break
          }
          case CellKind.Forest:
            tmp.copy(FOREST)
            break
          default: {
            const t = world.elevation[i] / maxElev
            tmp.copy(GRASS).lerp(GRASS_DRY, t * 0.7)
          }
        }
        if (wear > 0 && kind !== CellKind.Water) {
          // Grass → trampled → packed earth as the trail wears in.
          if (wear < 0.4) tmp.lerp(TRAMPLED, wear / 0.4)
          else tmp.copy(TRAMPLED).lerp(EARTH, (wear - 0.4) / 0.6)
        }
      }
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    const attr = this.mesh.geometry.getAttribute('color') as THREE.BufferAttribute
    attr.needsUpdate = true
  }

  /** Bilinear surface height at fractional cell coordinates, for placing things on the ground. */
  heightAt(fx: number, fy: number): number {
    const w = this.world
    const x0 = Math.max(0, Math.min(w.width - 2, Math.floor(fx)))
    const y0 = Math.max(0, Math.min(w.height - 2, Math.floor(fy)))
    const tx = Math.max(0, Math.min(1, fx - x0))
    const ty = Math.max(0, Math.min(1, fy - y0))
    const e = (x: number, y: number) => w.elevation[w.index(x, y)]
    const top = e(x0, y0) * (1 - tx) + e(x0 + 1, y0) * tx
    const bottom = e(x0, y0 + 1) * (1 - tx) + e(x0 + 1, y0 + 1) * tx
    return top * (1 - ty) + bottom * ty
  }

  dispose() {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
