import "normalize.css";
import "../css/app.css";

var { mat4 } = require("gl-matrix");

const glTypeName = [
    'FLOAT',
    'FLOAT_VEC2',
    'FLOAT_VEC3',
    'FLOAT_VEC4',
    'INT',
    'INT_VEC2',
    'INT_VEC3',
    'INT_VEC4',
    'BOOL',
    'BOOL_VEC2',
    'BOOL_VEC3',
    'BOOL_VEC4',
    'FLOAT_MAT2',
    'FLOAT_MAT3',
    'FLOAT_MAT4',
    'SAMPLER_2D',
    'SAMPLER_CUBE'
];


const vshaderSkelton = `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vColor = aVertexColor;
}`;

const fshaderSkelton = `
varying lowp vec4 vColor;

void main(void) {
    gl_FragColor = vColor;
}`;

document.getElementById("vshader-source").value = vshaderSkelton;
document.getElementById("fshader-source").value = fshaderSkelton;

var squareRotation = 0.0;

var state = {
    canvas: null,
    gl: null,
    shaderInfo: {
        program: null,
        attribLocations: {
            vertexPosition: null,
            vertexColor: null,
        },
        uniformLocations: {
            projectionMatrix: null,
            modelViewMatrix: null,
        },
    },
    glBuffers: {
        position: null,
        color: null
    },
    renderLoopId: 0,
    renderLastUpdated: 0.0
};

var runButton = document.getElementById('run-button');
runButton.addEventListener('click', reload);
load();

function reload() {
    clean();
    load();
}

function clean() {
    let gl = state.gl;

    Object.values(state.glBuffers).forEach(function (b) {
        gl.deleteBuffer(b);
    });
    gl.deleteProgram(state.shaderInfo.program);

    const variablesElement = document.getElementById('variables');
    variablesElement.removeChild(variablesElement.firstChild);

    state.renderLoopId += 1;
}

function load() {
    let canvas = document.querySelector('#glcanvas');
    if (!state.gl) {
        state.gl = canvas.getContext('webgl');
    }
    let gl = state.gl;

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }
    const glIntToTypeName = {};
    glTypeName.forEach(function (typeName) {
        glIntToTypeName[gl[typeName]] = typeName;
    });
    console.log(glIntToTypeName);


    var vsSource = shaderSourceFromEditor("vshader-source");
    var fsSource = shaderSourceFromEditor("fshader-source");

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    const uni_num = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
    const uni_info = [];
    for (let i = 0; i < uni_num; i++) {
        const info = gl.getActiveUniform(shaderProgram, i);
        uni_info.push(info);
    }

    const uniformList = document.createElement('ol');
    uni_info.forEach(function (v) {
        const itemElm = document.createElement('li');
        const nameElm = document.createElement('div');
        const typeElm = document.createElement('div');
        const valueElm = document.createElement('div');
        uniformList.appendChild(itemElm);
        itemElm.appendChild(nameElm);
        itemElm.appendChild(typeElm);
        itemElm.appendChild(valueElm);

        nameElm.textContent = `${v.name} :`;
        typeElm.textContent = glIntToTypeName[v.type];
        valueElm.textContent = 0;
    });
    document.getElementById('variables').appendChild(uniformList);

    const buffers = initBuffers(gl);

    state.canvas = canvas;
    state.gl = gl;
    state.shaderInfo = programInfo;
    state.glBuffers = buffers;

    var renderLoopId = state.renderLoopId;
    squareRotation = 0.0;

    function render(now) {
        if (renderLoopId != state.renderLoopId) {
            console.log(`render loop ${renderLoopId} has been finished`);
            return;
        }
        now *= 0.001;
        const deltaTime = now - state.renderLastUpdated;
        state.renderLastUpdated = now;

        drawScene(gl, programInfo, buffers, deltaTime);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function initBuffers(gl) {

    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        -1.0, -1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const colors = [
        1.0, 1.0, 1.0, 1.0,    // white
        1.0, 0.0, 0.0, 1.0,    // red
        0.0, 1.0, 0.0, 1.0,    // green
        0.0, 0.0, 1.0, 1.0,    // blue
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function drawScene(gl, programInfo, buffers, deltaTime) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);

    const modelViewMatrix = mat4.create();

    mat4.translate(modelViewMatrix,
        modelViewMatrix,
        [-0.0, 0.0, -6.0]);
    mat4.rotate(modelViewMatrix,
        modelViewMatrix,
        squareRotation,
        [0, 0, 1]);

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }

    squareRotation += deltaTime;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);


    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function shaderSourceFromEditor(id) {
    var sourceElement = document.getElementById(id);
    if (!sourceElement) {
        return null;
    }

    var source = sourceElement.value;

    return source;
}
