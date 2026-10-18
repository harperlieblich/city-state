import type { Rng } from './rng'
import type { SimParams } from './params'
import { CellKind, cellDistance, type World } from './world'

export const BuildingKind = {
  Hall: 0,
  Hut: 1,
  Well: 2,
  Field: 3,
  Forest: 4,
  River: 5,
} as const
export type BuildingKind = (typeof BuildingKind)[keyof typeof BuildingKind]

export interface Building {
  kind: BuildingKind
  cell: number
}

export interface Settlement {
  hall: number
  well: number
  huts: number[]
  /** Work sites: fields, a forest clearing and a fishing spot on the river. */
  worksites: Building[]
  buildings: Building[]
}

/**
 * Place the tribe. The hall goes on flat grass a short walk from the river;
 * huts cluster around it; work sites are scattered further out so the daily
 * commute has real distance to etch trails into.
 */
export function placeSettlement(rng: Rng, world: World, params: SimParams): Settlement {
  const waterDist = distanceToWater(world)
  const hall = chooseHallSite(rng, world, waterDist)
  const reachable = reachableFrom(world, hall)

  const huts = placeHuts(rng, world, hall, Math.max(1, Math.ceil(params.citizens / 3)))
  const well = placeNear(rng, world, hall, 3, 5, huts)

  const worksites: Building[] = []
  for (const cell of placeFields(rng, world, hall, reachable, 3)) worksites.push({ kind: BuildingKind.Field, cell })
  const forest = nearestOfKind(world, hall, reachable, CellKind.Forest, 14)
  if (forest >= 0) worksites.push({ kind: BuildingKind.Forest, cell: forest })
  const river = nearestBank(world, hall, reachable, waterDist, 10)
  if (river >= 0) worksites.push({ kind: BuildingKind.River, cell: river })

  const buildings: Building[] = [
    { kind: BuildingKind.Hall, cell: hall },
    { kind: BuildingKind.Well, cell: well },
    ...huts.map((cell) => ({ kind: BuildingKind.Hut, cell })),
    ...worksites,
  ]

  return { hall, well, huts, worksites, buildings }
}

/** Flood fill over passable cells from `origin` (8-connected, no corner cutting). */
function reachableFrom(world: World, origin: number): Uint8Array {
  const seen = new Uint8Array(world.size)
  const queue = [origin]
  seen[origin] = 1
  let head = 0
  while (head < queue.length) {
    const i = queue[head++]
    const x = world.xOf(i)
    const y = world.yOf(i)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (!world.inBounds(nx, ny)) continue
        const j = world.index(nx, ny)
        if (seen[j] || !world.isPassable(j)) continue
        if (dx !== 0 && dy !== 0 && (!world.isPassable(i + dx) || !world.isPassable(i + dy * world.width))) continue
        seen[j] = 1
        queue.push(j)
      }
    }
  }
  return seen
}

/** Multi-source BFS: Chebyshev distance from every cell to the nearest water cell. */
function distanceToWater(world: World): Int32Array {
  const dist = new Int32Array(world.size).fill(-1)
  const queue: number[] = []
  for (let i = 0; i < world.size; i++) {
    if (world.kind[i] === CellKind.Water) {
      dist[i] = 0
      queue.push(i)
    }
  }
  let head = 0
  while (head < queue.length) {
    const i = queue[head++]
    const x = world.xOf(i)
    const y = world.yOf(i)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (!world.inBounds(nx, ny)) continue
        const j = world.index(nx, ny)
        if (dist[j] === -1) {
          dist[j] = dist[i] + 1
          queue.push(j)
        }
      }
    }
  }
  return dist
}

function chooseHallSite(rng: Rng, world: World, waterDist: Int32Array): number {
  const margin = Math.floor(Math.min(world.width, world.height) * 0.2)
  let best = -1
  let bestScore = -Infinity
  for (let y = margin; y < world.height - margin; y++) {
    for (let x = margin; x < world.width - margin; x++) {
      const i = world.index(x, y)
      if (world.kind[i] !== CellKind.Grass) continue
      const d = waterDist[i]
      if (d < 8 || d > 20) continue
      // Flat ground near (but not on) the river, with a little randomness so seeds differ.
      const score = -world.slopeAt(i) * 4 - Math.abs(d - 12) * 0.3 + rng.next() * 0.5
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    }
  }
  if (best < 0) throw new Error('No suitable hall site found on this terrain')
  return best
}

function placeHuts(rng: Rng, world: World, hall: number, count: number): number[] {
  const huts: number[] = []
  const taken = new Set<number>([hall])
  let attempts = 0
  while (huts.length < count && attempts < count * 200) {
    attempts++
    const r = rng.range(2.5, 4 + Math.sqrt(count) * 1.6)
    const a = rng.range(0, Math.PI * 2)
    const x = Math.round(world.xOf(hall) + Math.cos(a) * r)
    const y = Math.round(world.yOf(hall) + Math.sin(a) * r)
    if (!world.inBounds(x, y)) continue
    const i = world.index(x, y)
    if (world.kind[i] !== CellKind.Grass || taken.has(i)) continue
    if (world.slopeAt(i) > 1.2) continue
    // Keep a one-cell gap between huts so paths can thread between them.
    let crowded = false
    for (const h of huts) {
      if (cellDistance(world, h, i) < 2) { crowded = true; break }
    }
    if (crowded) continue
    huts.push(i)
    taken.add(i)
  }
  return huts
}

/** A passable cell between minR and maxR cells from `origin`, avoiding `occupied`. */
function placeNear(rng: Rng, world: World, origin: number, minR: number, maxR: number, occupied: number[]): number {
  const taken = new Set(occupied)
  taken.add(origin)
  for (let attempt = 0; attempt < 500; attempt++) {
    const r = rng.range(minR, maxR)
    const a = rng.range(0, Math.PI * 2)
    const x = Math.round(world.xOf(origin) + Math.cos(a) * r)
    const y = Math.round(world.yOf(origin) + Math.sin(a) * r)
    if (!world.inBounds(x, y)) continue
    const i = world.index(x, y)
    if (world.kind[i] !== CellKind.Grass || taken.has(i)) continue
    return i
  }
  return origin
}

/**
 * Fields go on flat grass 18–34 cells out, one per angular sector so they
 * fan out around the settlement instead of bunching up.
 */
function placeFields(rng: Rng, world: World, hall: number, reachable: Uint8Array, count: number): number[] {
  const hx = world.xOf(hall)
  const hy = world.yOf(hall)
  const sectorOffset = rng.range(0, Math.PI * 2)
  const fields: number[] = []
  for (let s = 0; s < count; s++) {
    const a0 = sectorOffset + (s / count) * Math.PI * 2
    const a1 = a0 + (Math.PI * 2) / count
    let best = -1
    let bestScore = -Infinity
    for (let i = 0; i < world.size; i++) {
      if (world.kind[i] !== CellKind.Grass || !reachable[i]) continue
      const dx = world.xOf(i) - hx
      const dy = world.yOf(i) - hy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 18 || d > 34) continue
      let a = Math.atan2(dy, dx) - a0
      a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      if (a > a1 - a0) continue
      const score = -world.slopeAt(i) * 3 + rng.next() * 0.3
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    }
    if (best >= 0) fields.push(best)
  }
  return fields
}

function nearestOfKind(world: World, origin: number, reachable: Uint8Array, kind: CellKind, minDist: number): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < world.size; i++) {
    if (world.kind[i] !== kind || !reachable[i]) continue
    const d = cellDistance(world, origin, i)
    if (d < minDist || d >= bestD) continue
    bestD = d
    best = i
  }
  return best
}

/** Nearest grass cell that touches the water, at least minDist from the origin. */
function nearestBank(world: World, origin: number, reachable: Uint8Array, waterDist: Int32Array, minDist: number): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < world.size; i++) {
    if (world.kind[i] !== CellKind.Grass || waterDist[i] !== 1 || !reachable[i]) continue
    const d = cellDistance(world, origin, i)
    if (d < minDist || d >= bestD) continue
    bestD = d
    best = i
  }
  return best
}
