import { createProgram, createShader } from '../utils/code/gl-utils.js';
import { ortho, translate } from '../utils/code/math-utils.js';


function resizeCanvasToDisplaySize(canvas) {
  const displayWidth  = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
  return true;
}


// ℹ️ objeto global para armazenar os objetos da cena
// agora é necessário para armazenarmos os VAOs de cada objeto,
// para poder ativá-los na função de renderização
const sceneObjects = {
    // inicialmente vazio, mas depois terá os VAOs do quadrado e triângulo
}


export function setupWebGL() {
    // inicializa o WebGL2
    const canvas = document.querySelector('.glCanvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      console.error('WebGL2 não está disponível');
      throw new Error('WebGL2 não suportado');
    }

      // Ajusta logo no início
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Atualiza automaticamente quando a janela muda de tamanho
    window.addEventListener("resize", () => {
        resizeCanvasToDisplaySize(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
    });


    return gl
}

export function initialize(gl) {
    // inicializa o shader the vértice e fragmento e em seguida os compila
    // são programas executados pela GPU sempre que algo precisa ser desenhado
    const vertexShaderCode = document.querySelector('[type="shader/vertex"]').textContent;
    const fragmentShaderCode = document.querySelector('[type="shader/fragment"]').textContent;

    
    // finaliza a combinação (compila + link) dos shaders em um programa
    const program = createProgram(gl,
      createShader(gl, 'vs', gl.VERTEX_SHADER, vertexShaderCode),
      createShader(gl, 'fs', gl.FRAGMENT_SHADER, fragmentShaderCode)
    );
    gl.useProgram(program);
    gl.program = program

    //Habilita o blending para lidar com transparências da textura (canal alpha)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const texUniformLocation = gl.getUniformLocation(program, "u_texture");
    gl.uniform1i(texUniformLocation, 0);
    
    const naveTexture = loadTextura(gl, "naveTeste2.png");
    sceneObjects.nave = new Sprite(gl, program, "nave",naveTexture, 40, 0, 20 , 20);
   
    
    // encontra a localização da variável 'projection' do shader e 
    // define a matriz de projeção ortográfica
    const projectionUniformLocation = gl.getUniformLocation(program, 'projection')
    const projectionMatrix = ortho(0, 100, 0, 100, -1, 1)
    gl.uniformMatrix4fv(projectionUniformLocation, false, projectionMatrix)

    gl.colorLoc = gl.getUniformLocation(program, "u_color");
    
    gl.clearColor( 1.0, 1.0, 1.0, 1.0) 
}

export function render(gl) {
    if (resizeCanvasToDisplaySize(gl.canvas)) {
        // IMPORTANTE: Atualize o viewport se o tamanho mudar
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Atualize suas matrizes de projeção/câmera aqui
    }

    // apaga a tela
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (sceneObjects.nave) {
      sceneObjects.nave.desenha();
    }
    

  
}

document.addEventListener("keydown", (event) => {
  console.log("Tecla pressionada:", event.key);
  if(event.key === "ArrowLeft"){
    sceneObjects.nave.x -= 2;
    sceneObjects.nave.vao = sceneObjects.nave.criaVAO()
  }
  if(event.key === "ArrowRight"){
    sceneObjects.nave.x += 2;
    sceneObjects.nave.vao = sceneObjects.nave.criaVAO()
  }
});

document.addEventListener("keyup", (event) => {
  console.log("Tecla liberada:", event.key);
});


class Sprite {
  constructor(gl, program, nome, textura, x, y, width, height) {
    this.gl = gl;
    this.program = program;
    this.nome = nome;  

    this.textura = textura;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.vao = this.criaVAO();
  }

  criaVAO(){
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertices = new Float32Array([
      // posição X,Y              // texCoord U,V
      this.x, this.y,               0.0, 1.0,
      this.x + this.width, this.y,  1.0, 1.0,
      this.x + this.width, this.y + this.height, 1.0, 0.0,
      this.x, this.y + this.height, 0.0, 0.0
    ]);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(this.program, 'position');
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    const texLoc = gl.getAttribLocation(this.program, 'texCoord');
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(texLoc);

    this.vao = vao;
    this.vbo = vbo;

    return this.vao;
  }

  desenha(){
    const gl = this.gl;

    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textura);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  }
}

function loadTextura(gl, url){
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);


  const image = new Image();
  image.onload = ()  => {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
     gl.generateMipmap(gl.TEXTURE_2D)
  }
  image.src = url;

  return texture;

}