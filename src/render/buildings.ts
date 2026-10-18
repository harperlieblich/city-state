import * as THREE from 'three'
import { BuildingKind, type Building, type World } from '../sim'
import type { TerrainMesh } from './terrainMesh'

const WALL = new THREE.MeshLambertMaterial({ color: 0xc9a977 })
const THATCH = new THREE.MeshLambertMaterial({ color: 0x8a6a3a })
const HALL_ROOF = new THREE.MeshLambertMaterial({ color: 0x7a3a2a })
const STONE = new THREE.MeshLambertMaterial({ color: 0x8d8a82 })
const CROP = new THREE.MeshLambertMaterial({ color: 0xc8b24a })
const TIMBER = new THREE.MeshLambertMaterial({ color: 0x5a3f22 })
const NET = new THREE.MeshLambertMaterial({ color: 0x4a7aa0 })

/** Simple placeholder meshes for the hall, huts, well and work sites. */
export class BuildingsView {
  readonly group = new THREE.Group()

  constructor(world: World, terrain: TerrainMesh, buildings: Building[]) {
    for (const b of buildings) {
      const x = world.xOf(b.cell)
      const z = world.yOf(b.cell)
      const y = terrain.heightAt(x, z)
      const obj = this.build(b.kind)
      obj.position.set(x, y, z)
      obj.traverse((o) => {
        o.castShadow = true
        o.receiveShadow = true
      })
      this.group.add(obj)
    }
  }

  private build(kind: BuildingKind): THREE.Object3D {
    const g = new THREE.Group()
    switch (kind) {
      case BuildingKind.Hall: {
        g.add(box(2.6, 1.4, 2.0, WALL, 0.7))
        g.add(cone(2.1, 1.3, 4, HALL_ROOF, 1.4 + 0.65))
        break
      }
      case BuildingKind.Hut: {
        g.add(cylinder(0.7, 0.8, WALL, 0.4))
        g.add(cone(0.95, 0.8, 7, THATCH, 0.8 + 0.4))
        break
      }
      case BuildingKind.Well: {
        g.add(cylinder(0.6, 0.6, STONE, 0.3))
        const beam = box(0.12, 1.4, 0.12, TIMBER, 0.7)
        beam.position.x = 0.5
        g.add(beam)
        break
      }
      case BuildingKind.Field: {
        // A patch of crops: a flat slab with a few rows.
        const slab = box(5, 0.15, 5, CROP, 0.08)
        g.add(slab)
        for (let i = -2; i <= 2; i++) {
          const row = box(4.6, 0.35, 0.3, THATCH, 0.3)
          row.position.z = i
          g.add(row)
        }
        break
      }
      case BuildingKind.Forest: {
        // Felled logs.
        for (let i = 0; i < 3; i++) {
          const log = cylinder(0.18, 1.8, TIMBER, 0.18)
          log.rotation.z = Math.PI / 2
          log.position.z = (i - 1) * 0.45
          g.add(log)
        }
        break
      }
      case BuildingKind.River: {
        // Drying rack by the water.
        const rack = box(1.6, 0.08, 0.08, TIMBER, 1.2)
        g.add(rack)
        const net = box(1.4, 0.9, 0.04, NET, 0.7)
        g.add(net)
        for (const dx of [-0.8, 0.8]) {
          const post = box(0.1, 1.2, 0.1, TIMBER, 0.6)
          post.position.x = dx
          g.add(post)
        }
        break
      }
    }
    return g
  }
}

function box(w: number, h: number, d: number, m: THREE.Material, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  mesh.position.y = y
  return mesh
}

function cone(r: number, h: number, segments: number, m: THREE.Material, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), m)
  mesh.position.y = y
  return mesh
}

function cylinder(r: number, h: number, m: THREE.Material, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), m)
  mesh.position.y = y
  return mesh
}
