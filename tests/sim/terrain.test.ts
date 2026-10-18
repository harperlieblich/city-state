import { describe, expect, it } from 'vitest'
import { cloneParams } from '../../src/sim/params'
import { Rng } from '../../src/sim/rng'
import { generateTerrain } from '../../src/sim/terrain'
import { CellKind } from '../../src/sim/world'

describe('generateTerrain', () => {
  it('produces finite elevations within the height scale', () => {
    for (const seed of [1, 2, 3, 17, 99]) {
      const params = cloneParams()
      const world = generateTerrain(new Rng(seed), params)
      for (let i = 0; i < world.size; i++) {
        expect(Number.isFinite(world.elevation[i])).toBe(true)
        expect(world.elevation[i]).toBeGreaterThanOrEqual(0)
        expect(world.elevation[i]).toBeLessThanOrEqual(params.heightScale)
      }
    }
  })

  it('has a river that spans top to bottom with at least one ford', () => {
    const world = generateTerrain(new Rng(4), cloneParams())
    const rowHasRiver = (y: number) => {
      for (let x = 0; x < world.width; x++) {
        const k = world.kind[world.index(x, y)]
        if (k === CellKind.Water || k === CellKind.Ford) return true
      }
      return false
    }
    expect(rowHasRiver(0)).toBe(true)
    expect(rowHasRiver(world.height - 1)).toBe(true)
    expect(Array.from(world.kind).some((k) => k === CellKind.Ford)).toBe(true)
  })

  it('is mostly walkable grass', () => {
    const world = generateTerrain(new Rng(1), cloneParams())
    const grass = Array.from(world.kind).filter((k) => k === CellKind.Grass).length
    expect(grass / world.size).toBeGreaterThan(0.5)
  })
})
