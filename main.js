import { createProgram, createShader } from '../utils/code/gl-utils.js';
import { ortho, translate } from './utils/code/math-utils.js';

// ---- Ajustando tamanho do canvas para ficar maior sem distorção ----
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
    
    //Guardando gl e program dentro de sceneObjects para usar ele em outras funções
    sceneObjects.gl = gl;
    sceneObjects.program = program;

    // ---- Inicializando a nave ----
    //Textura da nave
    const naveTexture = loadTextura(gl, "images/naveTeste2.png");
    //Criando a nave
    sceneObjects.nave = new Sprite(gl, program, "nave",naveTexture, 40, 0, 10 , 10);

    //---- Inicializando os inimigos ----
    //Textura do alien
    const alienTexture = loadTextura(gl, "images/alien.png");

    //array de inimigos
    sceneObjects.inimigos = [];

    //parametros do bloco
    const linhas = 5;
    const colunas = 8;
    const espacamentoX = 8;
    const espacamentoY = 8;
    const largura = 5;
    const altura = 5;

    //cria inimigos
    for (let linha = 0; linha < linhas; linha++) {
      for (let col = 0; col < colunas; col++) {
        const x = 10 + col * espacamentoX;
        const y = 80 + linha * espacamentoY;
        const inimigo =  new Sprite(gl, program, "alien", alienTexture, x, y, largura, altura);
        
        sceneObjects.inimigos.push(inimigo);
      }
      
    }

    //----Inicializando tiros nave ----
    //textura tiro
    const tiroNaveTexture = loadTextura(gl, "images/tiroNave.png");
    sceneObjects.tiroNaveTexture = tiroNaveTexture;

    //array de tiros
    sceneObjects.tiros = [];

    
  
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

    if (!jogoAtivo || jogoPausado) {
      return;
    }

    // apaga a tela
    gl.clear(gl.COLOR_BUFFER_BIT)

    atualizaNaveETiros()
    atualizaInimigoETiros();

    //desenha objetos
    if (sceneObjects.nave) {
      sceneObjects.nave.desenha();
    }
    sceneObjects.inimigos.forEach(inimigo => {
      inimigo.desenha();
    });
    sceneObjects.tiros.forEach(tiro =>{
      tiro.desenha();
    });

    //Tiro inimigo aleatório
    if (Math.random() < 0.005) { // chance pequena a cada frame
      disparaTiroInimigo();
    }

    //colisão tiros do jogador com inimigos
    sceneObjects.tiros.forEach((tiro, tiroIndex) => {
      sceneObjects.inimigos.forEach((inimigo, inimigoIndex) => {
        if (checkColison(tiro, inimigo)) {
          sceneObjects.inimigos.splice(inimigoIndex, 1);
          sceneObjects.tiros.splice(tiroIndex, 1);
          console.log("Alien atingido!");
        }
      });  
    });

    
    //checa regras do jogo
    checkVitoria();
    checkDerrota();
}

// ---- Input do teclado ----
const pressedKeys = {};
document.addEventListener("keydown", (event) => {
  console.log("Tecla pressionada:", event.key);

  pressedKeys[event.code] = true;

  if (event.code === "Escape") {
    jogoPausado = !jogoPausado;
    console.log(jogoPausado ? "Jogo pausado" : "Jogo retomado");
  }

  if (event.code === "KeyR") {
   if (confirm("Deseja reiniciar o jogo?")) {
    reiniciaJogo();
   } 
  }
});

document.addEventListener("keyup", (event) => {
  console.log("Tecla liberada:", event.key);

  pressedKeys[event.code] = false;
});

// ---- Funções de atualização ----

//Atualiza nave e os tiros das naves
function atualizaNaveETiros() {
    //atualiza posição da nave para a esquerda
   if(pressedKeys["ArrowLeft"]){
    sceneObjects.nave.x -= 1;

    if (sceneObjects.nave.x < 0) {
      sceneObjects.nave.x = 0;
    }

    sceneObjects.nave.vao = sceneObjects.nave.criaVAO()
  }

  //atualiza posição da nave para a direita
  if(pressedKeys["ArrowRight"]){
    sceneObjects.nave.x += 1;

    if (sceneObjects.nave.x + sceneObjects.nave.width > 100) {
      sceneObjects.nave.x = 100 - sceneObjects.nave.width;
    }

    sceneObjects.nave.vao = sceneObjects.nave.criaVAO()
  }

  //tiro
  if (pressedKeys["Space"] || pressedKeys["Spacebar"]) {
    console.log("Espaço tiro - pow!");
    //evita tiros contínuos
    if (!sceneObjects.lastShot || Date.now() - sceneObjects.lastShot > 300) {
      disparaTiro();
      sceneObjects.lastShot = Date.now();
    }
    
  }

  //atualiza tiros
  sceneObjects.tiros.forEach(tiro =>{
      tiro.y += 1; //movimento para cima
      tiro.vao = tiro.criaVAO();
      
    });

    //remove os tiros da tela
    sceneObjects.tiros = sceneObjects.tiros.filter(tiro => tiro.y <= 100);
    console.log("Tiros ativos:", sceneObjects.tiros.length); //Garantindo que foi apagado mesmo e não só tá fora da tela

}

//Atualiza inimigos e os tiros dos
let blocoDirecao = 1;       //1=direita, -1 = esquerda
let blocoVelocidade = 0.4;

function atualizaInimigoETiros() {
  sceneObjects.inimigos.forEach(inimigo => {
    inimigo.x += blocoDirecao * blocoVelocidade;
    inimigo.vao = inimigo.criaVAO();
  });

  const atingiuDireita = sceneObjects.inimigos.some(i => i.x + i.width > 100);
  const atingiuEsquerda = sceneObjects.inimigos.some(i=> i.x < 0);

  if (atingiuDireita || atingiuEsquerda) {
    blocoDirecao *= -1  //inverte a direção
    sceneObjects.inimigos.forEach(inimigo => {
      inimigo.y -= 5; //descendo o bloco
      inimigo.vao = inimigo.criaVAO();
    });
  }

  //Atualiza tiros inimigos
  if (sceneObjects.tirosInimigos) {
    sceneObjects.tirosInimigos.forEach((tiro, i) =>{
      tiro.y -= 0.5; //tiro descendo
      tiro.vao = tiro.criaVAO();
      tiro.desenha();

      //remove se sair da tela
      if (tiro.y< 0) {
        sceneObjects.tirosInimigos = sceneObjects.tirosInimigos.filter(tiro => tiro.y >= 0);
        console.log("Tiros inimigos ativos:", sceneObjects.tirosInimigos.length); //Garantindo que foi apagado mesmo e não só tá fora da tela

      }
    })
  }
}

// ---- Funções de disparos ----

//Disparo jogador
function disparaTiro(){
  const gl =sceneObjects.gl;
  const program = sceneObjects.program;
  const tiroNaveTexture = sceneObjects.tiroNaveTexture;

  const x = sceneObjects.nave.x + sceneObjects.nave.width / 2 - 1;
  const y = sceneObjects.nave.y + sceneObjects.nave.height;
  const largura = 2;
  const altura = 2;

  const tiro = new Sprite(gl, program, "tiro", tiroNaveTexture, x, y, largura, altura);

  sceneObjects.tiros.push(tiro);
}


//Disparo inimigo
function disparaTiroInimigo() {
  const gl =sceneObjects.gl;
  const program = sceneObjects.program;
  const tiroAlienTexture = loadTextura(gl, "images/tiroAlien.jpg");

  //escolhe um inimigo aleatório
  const inimigo = sceneObjects.inimigos[Math.floor(Math.random()*sceneObjects.inimigos.length)];

  if (!inimigo) {
    return;
  }

  const x = inimigo.x + inimigo.width / 2 - 1;
  const y = inimigo.y + inimigo.height;
  const largura = 3;
  const altura = 3;

  const tiro = new Sprite(gl, program, "tiroInimigo", tiroAlienTexture, x, y, largura, altura);

  if (!sceneObjects.tirosInimigos) {
    sceneObjects.tirosInimigos = [];
  }
  sceneObjects.tirosInimigos.push(tiro);
}

// ---- Objetos do jogo ----

//Classe Sprite
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

//Função para carregar textura
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

//Função de colisão
function checkColison(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
}

// ---- Funções com as regras do jogo ----

let jogoAtivo = true;
let jogoPausado = false;

function checkVitoria() {
  if (sceneObjects.inimigos.length === 0) {
    jogoAtivo = false;
    console.log("Vitória! Todos os alienígenas foram destruídos.");
    alert("Vitória! Todos os alienígenas foram destruídos.  Clique em R para jogar de novo!");
  }
}

function checkDerrota() {
  const inimigoNoSolo = sceneObjects.inimigos.some(inimigo => inimigo.y <=0);

  if (inimigoNoSolo) {
    jogoAtivo=false;
    console.log("Derrota! Um alienígena chegou ao solo.");
    alert("Derrota! Um alienígena chegou ao solo.  Clique em R para jogar de novo!");
  }

  //colisão tiros dos inimigos com jogador
    if (sceneObjects.tirosInimigos && sceneObjects.tirosInimigos.length > 0) {
    sceneObjects.tirosInimigos.forEach((tiro, tiroIndex) => {
      if (checkColison(tiro, sceneObjects.nave)) {
        sceneObjects.tirosInimigos.splice(tiroIndex, 1);
        jogoAtivo = false;
        console.log("Derrota! A nave foi atingida.");
        alert("Derrota! A nave foi atingida.  Clique em R para jogar de novo!");
      }
    });
  }
}

function reiniciaJogo() {
  initialize(sceneObjects.gl);
  jogoAtivo=true;
  jogoPausado=false;

  sceneObjects.tiros = [];
  sceneObjects.tirosInimigos = [];
}

// ---- Tela cheia ----

function toggleFullscreen() {
  const canvas = document.querySelector('.glCanvas');
  if (!document.fullscreenElement) {
    canvas.requestFullscreen().catch(err => {
      console.error(`Erro ao entrar em tela cheia: ${err.message}`);
    })
  }
  else{
    document.exitFullscreen();
  }
}