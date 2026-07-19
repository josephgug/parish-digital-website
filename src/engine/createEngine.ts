import { Engine } from './Engine'

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
  const { Composite } = await import('./systems/Composite')

  engine.add(new MeshNet(engine))
  engine.add(new Particles(engine))
  engine.add(new Composite(engine))

  await engine.init()

  return {
    engine,
    destroy: () => engine.dispose(),
  }
}
