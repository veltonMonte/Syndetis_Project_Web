import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLensPixels } from '../src/components/echo/hardware-button/lens-map.ts'

const width = 180, height = 52
const map = createLensPixels(width, height)
const pixel = (x: number, y: number) => [...map.slice((y * width + x) * 4, (y * width + x) * 4 + 4)]

test('flat centre and outside corners do not displace the backdrop', () => {
  assert.deepEqual(pixel(90, 26), [128, 128, 128, 255])
  assert.deepEqual(pixel(0, 0), [128, 128, 128, 255])
})
test('opposite curved edges bend the backdrop in opposite directions', () => {
  const left = pixel(3, 25)[0], right = pixel(176, 25)[0]
  const top = pixel(90, 3)[1], bottom = pixel(90, 48)[1]
  assert.ok(left < 100 && right > 156)
  assert.ok(top < 100 && bottom > 156)
  assert.ok(Math.abs(left + right - 256) <= 1)
  assert.ok(Math.abs(top + bottom - 256) <= 1)
})
test('the optical field is finite and contains no coloured or transparent holes', () => {
  assert.equal(map.length, width * height * 4)
  for (let offset = 0; offset < map.length; offset += 4) {
    assert.equal(map[offset + 2], 128)
    assert.equal(map[offset + 3], 255)
  }
})
