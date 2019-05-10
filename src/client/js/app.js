import "normalize.css";
import "../css/app.css";
import { GLElement, GLWrapper } from "./gl_helper.js";

const { mat4 } = require("gl-matrix");

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
uniform lowp float factor;
uniform lowp vec4 colOffset;
varying lowp vec4 vColor;

void main(void) {
    gl_FragColor = factor * (vColor + colOffset);
}`;

document.getElementById("vshader-source").value = vshaderSkelton;
document.getElementById("fshader-source").value = fshaderSkelton;

let squareRotation = 0.0;

const state = {
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

const runButton = document.getElementById('run-button');
runButton.addEventListener('click', reload);
load();

function reload() {
    clean();
    load();
}

function clean() {
    const gl = state.gl;

    Object.values(state.glBuffers).forEach(function (b) {
        gl.deleteBuffer(b);
    });
    gl.deleteProgram(state.shaderInfo.program);

    const variablesElement = document.getElementById('variables');
    variablesElement.removeChild(variablesElement.firstChild);

    state.renderLoopId += 1;
}

function load() {
    const canvas = document.querySelector('#glcanvas');
    if (!state.gl) {
        state.gl = canvas.getContext('webgl');
    }
    const gl = state.gl;

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    const glw = new GLWrapper(gl);

    const vsSource = shaderSourceFromEditor("vshader-source");
    const fsSource = shaderSourceFromEditor("fshader-source");

    const shaderProgram = glw.initShaderProgram(vsSource, fsSource);

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
        info.location = gl.getUniformLocation(shaderProgram, info.name);
        uni_info.push(info);
    }

    const uniformList = document.createElement('ol');
    uni_info.forEach(function (v) {
        const itemElm = document.createElement('li');
        itemElm.id = `uniform-${v.name}`;
        uniformList.appendChild(itemElm);

        itemElm.addEventListener('change', function (ev) {
            const row = itemElm.getAttribute('data-row');
            const col = itemElm.getAttribute('data-col');
            const elmType = Number.parseInt(itemElm.getAttribute('data-elm_type'));
            const isMatrix = row !== '1' && row === col;

            let suffix = elmType === GLElement.FLOAT ? 'f' : 'i';
            suffix = col.toString() + suffix;
            suffix = isMatrix ? 'Matrix' + suffix : suffix;
            const funcName = 'uniform' + suffix;

            const valuesElm = document.querySelector(`#${itemElm.id} > .values`);
            if (isMatrix) {

            } else {
                const data = [];
                const rowElm = valuesElm.firstChild;
                let currElm = rowElm.firstChild;
                for (let i = 0; i < col; i++) {
                    const a = elmType === GLElement.FLOAT ?
                        Number.parseFloat(currElm.value) : Number.parseInt(currElm.value);
                    data.push(a);

                    currElm = currElm.nextSibling;
                }
                gl[funcName](v.location, ...data);
            }
        });

        const nameElm = document.createElement('span');
        nameElm.textContent = `${v.name} :`;
        itemElm.appendChild(nameElm);

        const typeElm = document.createElement('span');
        typeElm.textContent = glw.typeIdToTypeName(v.type);
        itemElm.appendChild(typeElm);

        const dim = glw.TypeIdToDimension(v.type);
        if (!dim) {
            return;
        }
        const elmType = glw.TypeIdtoElementType(v.type);
        itemElm.setAttribute('data-row', dim[0]);
        itemElm.setAttribute('data-col', dim[1]);
        itemElm.setAttribute('data-elm_type', elmType);

        const valuesElm = document.createElement('div');
        valuesElm.className = 'values';
        itemElm.appendChild(valuesElm);

        for (let i = 0; i < dim[0]; i++) {
            const rowElm = document.createElement('div');
            rowElm.class = 'matrix-row';
            valuesElm.appendChild(rowElm);
            for (let j = 0; j < dim[1]; j++) {
                const valueElm = document.createElement('input');
                valueElm.type = 'text';
                rowElm.appendChild(valueElm);
                valueElm.value = 0;
            }
        }
    });
    document.getElementById('variables').appendChild(uniformList);

    const buffers = glw.initBuffers();

    state.canvas = canvas;
    state.gl = gl;
    state.shaderInfo = programInfo;
    state.glBuffers = buffers;

    const renderLoopId = state.renderLoopId;
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

function shaderSourceFromEditor(id) {
    const sourceElement = document.getElementById(id);
    if (!sourceElement) {
        return null;
    }

    const source = sourceElement.value;

    return source;
}
