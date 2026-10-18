import { describe, expect, it } from 'vitest'
import { cloneParams } from '../../src/sim/params'
import { findPath } from '../../src/sim/pathfind'
import { CellKind, World } from '../../src/sim/world'

/** A flat, all-grass world with no wander noise so paths are predictable. */
function flatWorld(w = 20, h = 20) {
  const world = new World(w, h)
  const params = cloneParams()
  params.wander = 0
  return { world, params }
}

describe('findPath', () => {
  it('walks a straight diagonal on flat ground', () => {
    const { world, params } = flatWorld()
    const path = findPath(world, params, world.index(0, 0), world.index(5, 5))
    expect(path).not.toBeNull()
    expect(path!.length).toBe(5)
    expect(path![4]).toBe(world.index(5, 5))
  })

  it('returns an empty path when start equals goal', () => {
    const { world, params } = flatWorld()
    expect(findPath(world, params, 7, 7)).toEqual([])
  })

  it('routes around a wall of water', () => {
    const { world, params } = flatWorld()
    // Vertical river at x=10 with a gap at y=18.
    for (let y = 0; y < 20; y++) if (y !== 18) world.kind[world.index(10, y)] = CellKind.Water
    const path = findPath(world, params, world.index(2, 2), world.index(17, 2))
    expect(path).not.toBeNull()
    expect(path).toContain(world.index(10, 18))
    for (const c of path!) expect(world.kind[c]).not.toBe(CellKind.Water)
  })

  it('returns null when the goal is unreachable', () => {
    const { world, params } = flatWorld()
    for (let y = 0; y < 20; y++) world.kind[world.index(10, y)] = CellKind.Water
    expect(findPath(world, params, world.index(2, 2), world.index(17, 2))).toBeNull()
  })

  it('does not cut corners between two water cells', () => {
    const { world, params } = flatWorld(5, 5)
    // Water at (1,0) and (0,1): the diagonal from (0,0) to (1,1) must be blocked.
    world.kind[world.index(1, 0)] = CellKind.Water
    world.kind[world.index(0, 1)] = CellKind.Water
    expect(findPath(world, params, world.index(0, 0), world.index(1, 1))).toBeNull()
  })

  it('prefers a worn trail over a shorter unworn route', () => {
    const { world, params } = flatWorld(30, 10)
    params.trailAttraction = 0.9
    // Worn detour: along y=0 from x=0..29, then nothing else. Direct route is y=5.
    for (let x = 0; x < 30; x++) world.wear[world.index(x, 0)] = 1
    const path = findPath(world, params, world.index(0, 5), world.index(29, 5))!
    const onTrail = path.filter((c) => world.yOf(c) === 0).length
    expect(onTrail).toBeGreaterThan(15)
  })

  it('takes the direct route when trails have no pull', () => {
    const { world, params } = flatWorld(30, 10)
    params.trailAttraction = 0
    for (let x = 0; x < 30; x++) world.wear[world.index(x, 0)] = 1
    const path = findPath(world, params, world.index(0, 5), world.index(29, 5))!
    expect(path.every((c) => world.yOf(c) === 5)).toBe(true)
  })

  it('hugs the contour around a steep ridge when slope is penalised', () => {
    const { world, params } = flatWorld(30, 30)
    // A tall ridge along y=15 except at the far right end.
    for (let x = 0; x < 28; x++) world.elevation[world.index(x, 15)] = 40
    const direct = cloneParams()
    direct.wander = 0
    direct.slopePenalty = 0
    const steep = findPath(world, direct, world.index(5, 5), world.index(5, 25))!
    expect(steep.some((c) => world.yOf(c) === 15 && world.xOf(c) < 28)).toBe(true)

    params.slopePenalty = 2
    const contour = findPath(world, params, world.index(5, 5), world.index(5, 25))!
    expect(contour.some((c) => world.yOf(c) === 15 && world.xOf(c) < 28)).toBe(false)
  })
})
