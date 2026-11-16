/** Capsule lens normals encoded as an SVG displacement texture (R=x, G=y).
 * The edge and flat centre are neutral; the curved band bends the backdrop.
 * This is a geometry map, never a coloured image painted inside the button.
 */
export function createLensPixels(width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  const radius = Math.min(width, height) / 2
  const band = Math.max(2, radius * .65)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + .5, py = y + .5
      const nearest = Math.max(radius, Math.min(width - radius, px))
      const dx = px - nearest, dy = py - height / 2
      const distance = Math.hypot(dx, dy)
      const depth = radius - distance
      const t = Math.max(0, Math.min(1, depth / band))
      // A single rounded shoulder, tapering to zero at the outermost pixels,
      // avoids the secondary ring produced by a strong sinusoidal profile.
      const bend = depth > 0 ? (1 - t) ** 2 * Math.min(1, depth / 1.5) * .72 : 0
      const index = (y * width + x) * 4
      pixels[index] = 128 + (distance ? dx / distance : 0) * bend * 124
      pixels[index + 1] = 128 + (distance ? dy / distance : 0) * bend * 124
      pixels[index + 2] = 128
      pixels[index + 3] = 255
    }
  }
  return pixels
}
