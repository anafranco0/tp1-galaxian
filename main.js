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

let numLados = 3;
window.addEventListener('keydown', (event) => {

    // Aumentar
    if (event.key === '+' || event.code === 'Equal' && event.shiftKey) {
        if (numLados < 100) {
            numLados++;
            console.log("Aumentando nº de lados:", numLados);
        } else {
            console.log("Não é possível aumentar mais que 100 lados!");
            alert("⚠️ Aviso: você tentou ultrapassar o limite máximo permitido. Não é possível aumentar mais que 100 lados!");
            numLados = 100;
        }       
        
    }
    // Diminuir
    if (event.key === '-' || event.code === 'Minus') {
        if (numLados > 3) {
            numLados--;
            console.log("Diminuindo nº de lados:", numLados);
        } else {
            console.log("Não é possível diminuir mais que 3 lados!");
             alert("⚠️ Aviso: você tentou ultrapassar o limite mínimo permitido. Não é possível diminuir mais que 3 lados!");
            numLados = 3;
        }
        
    }
});



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
    
    // -----------------------------
    // CRIAÇÃO DO VAO + VBO
    // -----------------------------

    
    // ℹ️ criando o VAO + VBO para ser preenchido dinâmicamente
    sceneObjects.poliVAO = gl.createVertexArray()
    gl.bindVertexArray(sceneObjects.poliVAO)

    sceneObjects.poliVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneObjects.poliVBO)

    gl.bufferData(gl.ARRAY_BUFFER, 100*2*4, gl.DYNAMIC_DRAW) //Alocando um buffer que permita fazer desenhos dinâmicos até 100 lados 

    const positionAttributeLocation = gl.getAttribLocation(program, 'position')
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionAttributeLocation)
   
    
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

    //Calculando a posição dos novos vértices
    const novosVertices =  geraPoligono(50, 50, 30);

    //Atualizando dinâmicamente os vértices do VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneObjects.poliVBO);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, novosVertices);

    // ℹ️ ativa o VAO do polígono e desenha ele
    gl.uniform4f(gl.colorLoc, 0, 0, 1, 1);
    gl.bindVertexArray(sceneObjects.poliVAO)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numLados)

  
}

//Função que faz a conta do posicionamento dos vértices
function geraPoligono(cx, cy, raio) {
    const verts = []
    for (let i = 0; i < numLados; i++) {
        const ang = i * (2*Math.PI)/numLados;
        verts.push(cx + raio * Math.cos(ang));
        verts.push(cy + raio * Math.sin(ang));
    }
    return new Float32Array(verts);

}

