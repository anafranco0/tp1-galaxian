// função auxiliar para criar uma matriz de projeção ortográfica
// como um 1D array (column-major, como o WebGL espera)
export function ortho(left, right, bottom, top, near, far) {
  const tx = -(right + left)/(right - left)
  const ty = -(top + bottom)/(top - bottom)
  const tz = -(far + near  )/(far - near  )

  return new Float32Array([ // lembre-se, column-major
    2/(right-left), 0, 0, 0,
    0, 2/(top-bottom), 0, 0,
    0, 0, -2/(far-near),  0,
    tx, ty, tz,           1
  ])
}

export function perspective(fovInRadians, aspect, near, far) {
  const f = 1.0 / Math.tan(fovInRadians / 2)
  const rangeInv = 1 / (near - far)

  return new Float32Array([
    f / aspect, 0, 0,                             0,
    0,          f, 0,                             0,
    0,          0, (near + far) * rangeInv,    -1,
    0,          0, near * far * rangeInv * 2,   0
  ])
}

export function scale(scaleX, scaleY, scaleZ) {
  return new Float32Array([
    scaleX, 0,      0,      0,
    0,      scaleY, 0,      0,
    0,      0,      scaleZ, 0,
    0,      0,      0,      1
  ])
}

export function rotateZ(angleInRadians) {
  const c = Math.cos(angleInRadians)
  const s = Math.sin(angleInRadians)

  return new Float32Array([
    c, -s, 0, 0,
    s,  c, 0, 0,
    0,  0, 1, 0,
    0,  0, 0, 1
  ])
}

export function rotateY(angleInRadians) {
  const c = Math.cos(angleInRadians)
  const s = Math.sin(angleInRadians)

  return new Float32Array([
     c, 0, s, 0,
     0, 1, 0, 0,
    -s, 0, c, 0,
     0, 0, 0, 1
  ])
}

export function rotateX(angleInRadians) {
  const c = Math.cos(angleInRadians)
  const s = Math.sin(angleInRadians)

  return new Float32Array([
    1, 0, 0, 0,
    0, c,-s, 0,
    0, s, c, 0,
    0, 0, 0, 1
  ])
}

export function translate(tx, ty, tz) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1
  ])
}

export function mult(a, b) {
  const a00 = a[0*4+0]
  const a01 = a[0*4+1]
  const a02 = a[0*4+2]
  const a03 = a[0*4+3]
  const a10 = a[1*4+0]
  const a11 = a[1*4+1]
  const a12 = a[1*4+2]
  const a13 = a[1*4+3]
  const a20 = a[2*4+0]
  const a21 = a[2*4+1]
  const a22 = a[2*4+2]
  const a23 = a[2*4+3]
  const a30 = a[3*4+0]
  const a31 = a[3*4+1]
  const a32 = a[3*4+2]
  const a33 = a[3*4+3]
  const b00 = b[0*4+0]
  const b01 = b[0*4+1]
  const b02 = b[0*4+2]
  const b03 = b[0*4+3]
  const b10 = b[1*4+0]
  const b11 = b[1*4+1]
  const b12 = b[1*4+2]
  const b13 = b[1*4+3]
  const b20 = b[2*4+0]
  const b21 = b[2*4+1]
  const b22 = b[2*4+2]
  const b23 = b[2*4+3]
  const b30 = b[3*4+0]
  const b31 = b[3*4+1]
  const b32 = b[3*4+2]
  const b33 = b[3*4+3]
  return new Float32Array([
    b00*a00 + b01*a10 + b02*a20 + b03*a30,
    b00*a01 + b01*a11 + b02*a21 + b03*a31,
    b00*a02 + b01*a12 + b02*a22 + b03*a32,
    b00*a03 + b01*a13 + b02*a23 + b03*a33,
    b10*a00 + b11*a10 + b12*a20 + b13*a30,
    b10*a01 + b11*a11 + b12*a21 + b13*a31,
    b10*a02 + b11*a12 + b12*a22 + b13*a32,
    b10*a03 + b11*a13 + b12*a23 + b13*a33,
    b20*a00 + b21*a10 + b22*a20 + b23*a30,
    b20*a01 + b21*a11 + b22*a21 + b23*a31,
    b20*a02 + b21*a12 + b22*a22 + b23*a32,
    b20*a03 + b21*a13 + b22*a23 + b23*a33,
    b30*a00 + b31*a10 + b32*a20 + b33*a30,
    b30*a01 + b31*a11 + b32*a21 + b33*a31,
    b30*a02 + b31*a12 + b32*a22 + b33*a32,
    b30*a03 + b31*a13 + b32*a23 + b33*a33
  ])
}
