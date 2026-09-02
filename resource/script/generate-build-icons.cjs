/**
 * Regenerates the electron-builder icon set in build/ from resource/icon.png
 * (512px icon.png, icon.icns, icon.ico, and icons/<size>.png for Linux).
 * macOS only — it drives sips and iconutil. Run it after changing the source
 * icon and commit the results; CI never regenerates icons.
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..', '..')
const sourceIcon = path.join(projectRoot, 'resource', 'icon.png')
const buildDir = path.join(projectRoot, 'build')
const iconsDir = path.join(buildDir, 'icons')
const iconsetDir = path.join(buildDir, 'icon.iconset')
const pngSizes = [16, 32, 48, 64, 128, 256, 512, 1024]
const icoSizes = [16, 32, 48, 64, 128, 256]
const iconsetLabels = [16, 32, 128, 256, 512]

const run = (cmd, args) => {
  execFileSync(cmd, args, { stdio: 'inherit' })
}

const pngPath = (size) => {
  return path.join(iconsDir, `${String(size)}x${String(size)}.png`)
}

fs.mkdirSync(iconsDir, { recursive: true })

pngSizes.forEach((size) => {
  run('sips', ['-z', String(size), String(size), sourceIcon, '--out', pngPath(size)])
})

fs.copyFileSync(pngPath(512), path.join(buildDir, 'icon.png'))

fs.rmSync(iconsetDir, { recursive: true, force: true })
fs.mkdirSync(iconsetDir, { recursive: true })
iconsetLabels.forEach((label) => {
  fs.copyFileSync(pngPath(label), path.join(iconsetDir, `icon_${String(label)}x${String(label)}.png`))
  fs.copyFileSync(pngPath(label * 2), path.join(iconsetDir, `icon_${String(label)}x${String(label)}@2x.png`))
})
run('iconutil', ['-c', 'icns', iconsetDir, '-o', path.join(buildDir, 'icon.icns')])
fs.rmSync(iconsetDir, { recursive: true, force: true })

const pngBuffers = icoSizes.map((size) => {
  return fs.readFileSync(pngPath(size))
})
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoSizes.length, 4)
let dataOffset = 6 + 16 * icoSizes.length
const entries = icoSizes.map((size, index) => {
  const entry = Buffer.alloc(16)
  const dimensionByte = size === 256 ? 0 : size
  entry.writeUInt8(dimensionByte, 0)
  entry.writeUInt8(dimensionByte, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuffers[index].length, 8)
  entry.writeUInt32LE(dataOffset, 12)
  dataOffset += pngBuffers[index].length

  return entry
})
fs.writeFileSync(path.join(buildDir, 'icon.ico'), Buffer.concat([header, ...entries, ...pngBuffers]))

console.log('build icons regenerated in build/')
