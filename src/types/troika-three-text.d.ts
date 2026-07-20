declare module 'troika-three-text' {
  import type { Texture } from 'three'

  export type TroikaTextRenderInfo = {
    /** [minX, minY, maxX, maxY] quad bounds per glyph */
    glyphBounds: Float32Array
    /** each glyph's index into the SDF atlas (4 glyphs per texel square) */
    glyphAtlasIndices: Float32Array
    sdfTexture: Texture
    sdfGlyphSize: number
    sdfExponent: number
    blockBounds: Float32Array
  }

  export function getTextRenderInfo(
    args: Record<string, unknown>,
    callback: (info: TroikaTextRenderInfo) => void,
  ): void

  export function preloadFont(
    args: { font?: string; characters?: string | string[]; sdfGlyphSize?: number },
    callback: () => void,
  ): void
}
