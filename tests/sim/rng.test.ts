import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/sim/rng'

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Rng(42)
    const b = new Rng(42)
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next())
  })

  it('produces different sequences for different seeds', () => {
    const a = new Rng(1)
    const b = new Rng(2)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('stays within [0, 1)', () => {
    const r = new Rng(7)
    for (let i = 0; i < 10000; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int() stays within [min, max)', () => {
    const r = new Rng(3)
    for (let i = 0; i < 1000; i++) {
      const v = r.int(5, 8)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(8)
    }
  })
})
