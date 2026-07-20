import { Engine } from './Engine'
import { RIG_ENABLED } from './rig'

export type EngineHandle = {
  engine: Engine
  destroy: () => void
}

/**
 * Builds the engine and registers every world system in draw order.
 * Systems are added here (and only here) so the frame order is one readable list.
 */
export async function createEngine(
  canvas: HTMLCanvasElement,
  content: HTMLElement | null,
): Promise<EngineHandle> {
  const engine = new Engine(canvas, content)

  const { MeshNet } = await import('./systems/MeshNet')
  const { Particles } = await import('./systems/Particles')
  const { Headlines } = await import('./systems/Headlines')
  const { Fluid } = await import('./systems/Fluid')
  const { Composite } = await import('./systems/Composite')

  const composite = new Composite(engine)

  engine.add(new Fluid(composite)) // order 5
  engine.add(new MeshNet(engine)) // order 10
  engine.add(new Particles(engine)) // order 20
  engine.add(new Headlines(engine)) // order 30
  engine.add(composite) // order 90 — owns the draw

  await engine.init()

  if (RIG_ENABLED) window.__ENGINE = engine

  return {
    engine,
    destroy: () => engine.dispose(),
  }
}
