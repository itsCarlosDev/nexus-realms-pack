#!/usr/bin/env node

'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const WIDTH = 16
const HEIGHT = 16
const REPO_ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(REPO_ROOT, 'kubejs', 'assets', 'kubejs', 'textures', 'item')
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const OUTER_ROWS = [
  [6, 9], [4, 11], [3, 12], [2, 13],
  [1, 14], [1, 14], [0, 15], [0, 15],
  [0, 15], [0, 15], [1, 14], [1, 14],
  [2, 13], [3, 12], [4, 11], [6, 9]
]

const PALETTES = {
  bronze: {
    edge: '#34140e',
    shadow: '#6f2e1d',
    base: '#ad582b',
    light: '#df8844',
    shine: '#ffc27a',
    rune: '#52e4e7',
    accent: '#a75add'
  },
  silver: {
    edge: '#303642',
    shadow: '#596575',
    base: '#aeb9c8',
    light: '#e1edf3',
    shine: '#ffffff',
    rune: '#58e6ed',
    accent: '#a96ee7'
  },
  gold: {
    edge: '#5c3706',
    shadow: '#96630f',
    base: '#d6a01f',
    light: '#ffd45a',
    shine: '#fff1a5',
    rune: '#56e7e9',
    accent: '#a65add'
  }
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let value = n
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }
  crcTable[n] = value >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, checksum])
}

function rgba(hex, alpha = 255) {
  const value = Number.parseInt(hex.slice(1), 16)
  return [
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
    alpha
  ]
}

function setPixel(pixels, x, y, color) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return
  const index = (y * WIDTH + x) * 4
  pixels[index] = color[0]
  pixels[index + 1] = color[1]
  pixels[index + 2] = color[2]
  pixels[index + 3] = color[3]
}

function createCoinPixels(palette, denomination) {
  const colors = Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [key, rgba(value)])
  )
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4)

  for (let y = 0; y < HEIGHT; y += 1) {
    const [minimumX, maximumX] = OUTER_ROWS[y]
    for (let x = minimumX; x <= maximumX; x += 1) {
      const isOuterEdge = x === minimumX || x === maximumX || y === 0 || y === HEIGHT - 1
      let color = colors.base

      if (isOuterEdge) {
        color = colors.edge
      } else if (x + y >= 18) {
        color = colors.shadow
      } else if (x + y <= 10) {
        color = colors.light
      }

      setPixel(pixels, x, y, color)
    }
  }

  const innerRim = [
    [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2],
    [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [3, 11],
    [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9], [12, 10], [12, 11],
    [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [10, 13]
  ]
  for (const [x, y] of innerRim) {
    setPixel(pixels, x, y, x + y < 14 ? colors.light : colors.shadow)
  }

  for (const [x, y] of [[4, 3], [5, 3], [4, 4], [6, 2]]) {
    setPixel(pixels, x, y, colors.shine)
  }

  const runeOutline = [
    [7, 4], [8, 4],
    [6, 5], [9, 5],
    [5, 6], [10, 6],
    [5, 7], [10, 7],
    [5, 8], [10, 8],
    [6, 9], [9, 9],
    [7, 10], [8, 10]
  ]
  for (const [x, y] of runeOutline) {
    setPixel(pixels, x, y, colors.accent)
  }

  for (const [x, y] of [[7, 5], [8, 5], [6, 6], [9, 6], [7, 7], [8, 7], [7, 8], [8, 8], [6, 9], [9, 9]]) {
    setPixel(pixels, x, y, colors.rune)
  }

  const denominationMarks = {
    1: [[7, 12], [8, 12]],
    2: [[5, 12], [6, 12], [9, 12], [10, 12]],
    3: [[4, 12], [5, 12], [7, 12], [8, 12], [10, 12], [11, 12]]
  }
  for (const [x, y] of denominationMarks[denomination]) {
    setPixel(pixels, x, y, colors.rune)
  }

  return pixels
}

function encodePng(pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(WIDTH, 0)
  ihdr.writeUInt32BE(HEIGHT, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const scanlines = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT)
  for (let y = 0; y < HEIGHT; y += 1) {
    const targetOffset = y * (WIDTH * 4 + 1)
    scanlines[targetOffset] = 0
    pixels.copy(scanlines, targetOffset + 1, y * WIDTH * 4, (y + 1) * WIDTH * 4)
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function verifyPng(filePath) {
  const data = fs.readFileSync(filePath)
  if (!data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Firma PNG inválida: ${filePath}`)
  }
  if (data.readUInt32BE(16) !== WIDTH || data.readUInt32BE(20) !== HEIGHT) {
    throw new Error(`Dimensiones PNG inválidas: ${filePath}`)
  }
  if (data[24] !== 8 || data[25] !== 6) {
    throw new Error(`El PNG no es RGBA de 8 bits: ${filePath}`)
  }
  return crypto.createHash('sha256').update(data).digest('hex')
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const textures = [
  ['nexus_bronze_coin.png', PALETTES.bronze, 1],
  ['nexus_silver_coin.png', PALETTES.silver, 2],
  ['nexus_gold_coin.png', PALETTES.gold, 3]
]

for (const [filename, palette, denomination] of textures) {
  const filePath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(filePath, encodePng(createCoinPixels(palette, denomination)))
  console.log(`${path.relative(REPO_ROOT, filePath)} sha256=${verifyPng(filePath)}`)
}
