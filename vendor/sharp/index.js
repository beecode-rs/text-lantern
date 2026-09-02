'use strict'

// Stub package mapped into app.asar/node_modules/sharp by electron-builder.
// @huggingface/transformers does `import * as sharp from 'sharp'` at the top of
// transformers.node.mjs, so the package has to exist for the import to resolve —
// but it is only ever *called* for image pipelines, which this TTS app never
// runs. Calling it anyway fails loudly instead of corrupting anything.

function sharp() {
  throw new Error('sharp is not bundled with Text Lantern - image processing is not supported')
}

module.exports = sharp
