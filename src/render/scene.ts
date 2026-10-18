import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Renderer, camera, lights and a tilted city-builder orbit camera.
 * World cell (x, y) maps to scene (x, elevation, y): the grid lies in XZ.
 */
export class SceneView {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xbfd4e6)
    this.scene.fog = new THREE.Fog(0xbfd4e6, 220, 420)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1000)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.maxPolarAngle = Math.PI * 0.44 // never below the horizon
    this.controls.minPolarAngle = Math.PI * 0.05
    this.controls.minDistance = 15
    this.controls.maxDistance = 320
    this.controls.screenSpacePanning = false

    const hemi = new THREE.HemisphereLight(0xdfe9f3, 0x5a6b3a, 0.9)
    this.scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xfff2dd, 1.6)
    sun.position.set(-60, 110, 40)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.3
    this.scene.add(sun)
    this.sun = sun

    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  private readonly sun: THREE.DirectionalLight

  /** Look at a point of interest (the settlement) from a tilted city-builder angle. */
  frame(cx: number, cy: number, cz: number, worldSize: number) {
    this.controls.target.set(cx, cy, cz)
    this.camera.position.set(cx + worldSize * 0.1, cy + worldSize * 0.55, cz + worldSize * 0.6)
    this.controls.update()

    const s = this.sun.shadow.camera
    const r = worldSize * 0.75
    s.left = -r
    s.right = r
    s.top = r
    s.bottom = -r
    s.near = 1
    s.far = 400
    this.sun.target.position.set(cx, 0, cz)
    this.sun.position.set(cx - 60, 110, cz + 40)
    this.scene.add(this.sun.target)
    s.updateProjectionMatrix()
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  render() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
