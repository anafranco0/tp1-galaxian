// cria os vértices de um quadrado centrado em (x,y) e com o tamanho 'size'
// x, y: coordenadas do centro do quadrado
// z: coordenada z dos vértices
// size: comprimento do lado do quadrado
export function square(x=0, y=0, z=0, size=1) {
  const halfSize = size / 2
  return new Float32Array([
    x - halfSize, y - halfSize, z, // ↙️   v3----v2
    x + halfSize, y - halfSize, z, // ↘️   |   / |
    x + halfSize, y + halfSize, z, // ↗️   | /   |
    x - halfSize, y + halfSize, z  // ↖️   v0----v1
  ])
}
