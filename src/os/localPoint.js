// -----------------------------------------------------------------------------
// Maps a pointer's clientX/clientY to an element's own (untransformed) pixel
// coordinates, under the OS's 3D transform.
//
// The OS is projected onto the CRT by drei's <Html transform> (perspective +
// matrix3d) on top of the EMBED_SCALE upscale. Under that stack, both
// clientX - getBoundingClientRect() and the browser's own offsetX/offsetY
// come out wrong (offsetX measured about -2500 for a point mid-canvas).
//
// A flat rectangle seen through any perspective camera is a projective map
// (homography), which 4 point pairs pin down exactly. So: put four zero-size
// markers at the element's corners, read where they land on screen, solve
// screen -> local from those four pairs, and apply it to the pointer.
//
// Usage: render an absolutely positioned container covering the same box as
// the target, holding four zero-size children pinned to its corners in the
// order top-left, top-right, bottom-right, bottom-left (.corner-markers in
// os.css), then call
// clientToLocal(container, e.clientX, e.clientY, width, height).
// -----------------------------------------------------------------------------

// Solves the 8 homography coefficients mapping src[i] -> dst[i] (4 pairs).
function solveHomography(src, dst) {
  const A = []
  const b = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]
    const [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  // Gaussian elimination with partial pivoting.
  const n = 8
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    if (Math.abs(A[p][c]) < 1e-12) return null
    ;[A[c], A[p]] = [A[p], A[c]]
    ;[b[c], b[p]] = [b[p], b[c]]
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c]
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]
      b[r] -= f * b[c]
    }
  }
  const h = new Array(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * h[k]
    h[r] = s / A[r][r]
  }
  return h
}

/**
 * @param {HTMLElement} markers the .corner-markers container
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} width  the target's layout width (e.g. clientWidth)
 * @param {number} height the target's layout height
 * @returns {{x:number, y:number} | null}
 */
export function clientToLocal(markers, clientX, clientY, width, height) {
  if (!markers) return null
  const screen = [...markers.children].map((m) => {
    const r = m.getBoundingClientRect()
    return [r.left, r.top]
  })
  const local = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ]
  const h = solveHomography(screen, local)
  if (!h) return null
  const w = h[6] * clientX + h[7] * clientY + 1
  return {
    x: (h[0] * clientX + h[1] * clientY + h[2]) / w,
    y: (h[3] * clientX + h[4] * clientY + h[5]) / w,
  }
}
