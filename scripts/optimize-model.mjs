// Builds the web copy of the office model from the full-size original.
//
// Usage: node scripts/optimize-model.mjs
// Reads source-assets/90s_retro_office_pack.glb (git-ignored) and writes
// public/models/office_pack.opt.glb. Almost all of the original's 56MB is
// textures, so this mainly shrinks those.
//
// Keep node names and transforms as they are. OfficePack.jsx finds the clock
// hands and fan blades by name and reads their baked positions, so this must
// not join, flatten, instance or quantize anything.

import { statSync } from 'node:fs'
import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dedup, prune, reorder, textureCompress } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const SOURCE = 'source-assets/90s_retro_office_pack.glb'
const OUTPUT = 'public/models/office_pack.opt.glb'
const MAX_TEXTURE = 1024

await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

const doc = await io.read(SOURCE)

await doc.transform(
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE] }),
  prune({ keepLeaves: true, keepAttributes: true, keepExtras: true }),
  reorder({ encoder: MeshoptEncoder }),
  // Normal maps show compression damage as lighting errors, so they get a
  // higher quality than color and roughness maps.
  textureCompress({
    encoder: sharp,
    targetFormat: 'webp',
    resize: [MAX_TEXTURE, MAX_TEXTURE],
    quality: 92,
    slots: /^normalTexture$/,
  }),
  textureCompress({
    encoder: sharp,
    targetFormat: 'webp',
    resize: [MAX_TEXTURE, MAX_TEXTURE],
    quality: 78,
    slots: /^(?!normalTexture$).*/,
  }),
)

doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER })

await io.write(OUTPUT, doc)

const mb = (f) => (statSync(f).size / 1e6).toFixed(2)
console.log(`${SOURCE}: ${mb(SOURCE)} MB`)
console.log(`${OUTPUT}: ${mb(OUTPUT)} MB (${statSync(OUTPUT).size} bytes)`)
