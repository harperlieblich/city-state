# City-State

A city-planning game where the city plans itself. Citizens walk to work, their
footsteps wear paths into the ground, paths become roads; people build where it
makes sense to build; the player leads rather than places. Each age leaves its
mark on the city like growth rings on a tree.

This repository currently holds the **first proof of concept**: the simulation
layer that etches trails. A tribe of citizens lives in huts around a hall on
procedural terrain with a river, walks to fields, a forest clearing and a
fishing spot every day, and the routes they prefer slowly become a visible
road network — curving around hills, converging at fords.

## Running it

```bash
npm install
npm run dev
```

Open the URL Vite prints. Drag to orbit, right-drag to pan, scroll to zoom,
space to pause. The panel on the right is the whole point: every slider is
live, so you can tune the trail behaviour by feel.

- **Trails** — how fast ground wears, how fast grass regrows, how strongly
  people prefer an existing trail, and how much they wander on fresh ground.
- **Terrain cost** — the penalty for slopes, forest, rock and fording the river.
  Raise the slope penalty and routes hug the contours.
- **Daily life** — when people leave, when work ends, how often they stop at
  the well.
- **View** — switch the ground to a wear heatmap to see the network clearly.

Speed is in simulation ticks per second; a day is 240 ticks. Run at a few
thousand ticks/s to watch weeks pass and the trunk routes lock in.

```bash
npm test        # headless simulation tests (Vitest)
npm run typecheck
```

## Technology

- **TypeScript** everywhere, **Vite** for the dev loop, **Three.js** for the
  3D heightmap terrain, **lil-gui** for the tuning panel, **Vitest** for tests.
- Web-first: runs in any browser on Mac, Windows or Linux. A desktop wrapper
  (Tauri/Electron) is a packaging step, not a rewrite, if ever wanted.
- **The simulation is a pure library** (`src/sim`). It has no DOM or Three.js
  imports, every random choice goes through a seeded RNG, and a run is fully
  reproducible from its seed. That boundary keeps the renderer replaceable and
  makes a later port of the core (e.g. Rust → WASM) a mechanical job checked
  against the same tests.

## How the trail mechanic works

Each cell of the world has an elevation, a kind (grass, forest, rock, water,
ford) and a *wear* value 0..1. Moving onto a cell costs

```
distance × terrain × (1 + slopePenalty·|Δelevation|) × (1 − trailAttraction·wear) × wander
```

Citizens plan each trip with A* over that cost. Every step adds wear to the
cell; grass regrowth removes a fraction each day. Worn ground is cheaper, so
routes people use become routes more people use, while unused ones fade. The
`wander` term adds per-trip noise *only on unworn ground*, so early routes
spread out and the wear mechanic picks the winners instead of everyone
following one deterministic line from day one.

## Layout

```
src/sim      pure simulation: rng, params, terrain, world, cost, pathfind, wear, agent, settlement
src/render   Three.js: scene/camera, terrain mesh, instanced citizens, placeholder buildings
src/app      game loop and the lil-gui tuning panel
tests/sim    Vitest: determinism, pathfinding, terrain, trail convergence
```
