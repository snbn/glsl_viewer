import { GLElement, GLWrapper } from "./gl_helper";
import { unwrap } from "./misc";
import { mat4 } from "gl-matrix";

const vshaderSkelton = '';
const fshaderSkelton = '';

class App {
    canvas: HTMLCanvasElement | null;
    gl: WebGLRenderingContext | null;
    shaderInfo: any;
    uniformLocations: WebGLUniformLocation[];
    glBuffers: any;
    renderLoopId: number;
    renderLastUpdated: number;
    squareRotation: number;
    constructor() {
        unwrap(document.getElementById("vshader-source")).setAttribute('value', vshaderSkelton);
        unwrap(document.getElementById("fshader-source")).setAttribute('value', fshaderSkelton);

        const self = this;
        unwrap(document.getElementById('run-button')).addEventListener('click', function () {
            self.reload();
        });

        this.canvas = null;
        this.gl = null;
        this.uniformLocations = [];
        this.renderLastUpdated = 0.0;
        this.renderLoopId = 0;
        this.squareRotation = 0;
        this.load();
    }
    reload() {
        this.clean();
        this.load();
    }
    clean() {
        const gl: WebGLRenderingContext | null = this.gl;

        if (gl == null) {
            return;
        }

        Object.values(this.glBuffers).forEach(function (b) {
            gl.deleteBuffer(b);
        });
        gl.deleteProgram(this.shaderInfo.program);

        const variablesElement = unwrap(document.getElementById('variables'));
        variablesElement.removeChild(unwrap(variablesElement.firstChild));

        this.renderLoopId += 1;
    }
    load() {
        const canvas = unwrap(document.querySelector('#glcanvas')) as HTMLCanvasElement;
        if (!this.gl) {
            this.gl = canvas.getContext('webgl');
        }
        const gl: WebGLRenderingContext | null = this.gl;

        if (gl === null) {
            alert('Unable to initialize WebGL. Your browser or machine may not support it.');
            return;
        } else {
            const app = this;
            const glw = new GLWrapper(gl);

            const vsSource = unwrap(this.shaderSourceFromEditor("vshader-source"));
            const fsSource = unwrap(this.shaderSourceFromEditor("fshader-source"));

            const shaderProgram = unwrap(glw.initShaderProgram(vsSource, fsSource));

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
            const uni_info: WebGLActiveInfo[] = [];
            const uni_locations: WebGLUniformLocation[] = [];
            for (let i = 0; i < uni_num; i++) {
                const info = unwrap(gl.getActiveUniform(shaderProgram, i));
                uni_locations.push(unwrap(gl.getUniformLocation(shaderProgram, info.name)));
                uni_info.push(info);
            }

            const uniformList = document.createElement('ol');
            uni_info.forEach(function (v, idx) {
                const itemElm = document.createElement('li');
                itemElm.id = `uniform-${v.name}`;
                uniformList.appendChild(itemElm);

                itemElm.addEventListener('change', function (ev) {
                    const row = Number.parseInt(unwrap(itemElm.getAttribute('data-row')));
                    const col = Number.parseInt(unwrap(itemElm.getAttribute('data-col')));
                    const elmType = Number.parseInt(unwrap(itemElm.getAttribute('data-elm_type')));
                    const isMatrix = row !== 1 && row === col;
                    const isFloat = elmType === GLElement.FLOAT;

                    let suffix = isFloat ? 'f' : 'i';
                    suffix += 'v';
                    suffix = col.toString() + suffix;
                    suffix = isMatrix ? 'Matrix' + suffix : suffix;
                    const funcName = 'uniform' + suffix;

                    const valuesElm = unwrap(document.querySelector(`#${itemElm.id} > .values`));
                    const data = new Float32Array(row * col);

                    let currRowElm = unwrap(valuesElm.firstChild);
                    for (let i = 0; i < row; i++) {
                        let currValElm = unwrap(currRowElm.firstChild) as Element;
                        for (let j = 0; j < col; j++) {
                            const v = unwrap(currValElm.getAttribute('value'));
                            const a = isFloat ?
                                Number.parseFloat(v) : Number.parseInt(v);
                            data[i * col + j] = a;
                            currValElm = currValElm.nextSibling! as Element;
                        }
                        currRowElm = currRowElm.nextSibling!;
                    }
                    gl[funcName](app.uniformLocations[idx], data);
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
                    rowElm.setAttribute('class', 'matrix-row');
                    valuesElm.appendChild(rowElm);
                    for (let j = 0; j < dim[1]; j++) {
                        const valueElm = document.createElement('input');
                        valueElm.type = 'text';
                        rowElm.appendChild(valueElm);
                        valueElm.value = '0';
                    }
                }
            });
            unwrap(document.getElementById('variables')).appendChild(uniformList);

            const buffers = glw.initBuffers();

            this.canvas = canvas;
            this.gl = gl;
            this.shaderInfo = programInfo;
            this.glBuffers = buffers;

            const renderLoopId = this.renderLoopId;
            this.squareRotation = 0.0;

            function render(now) {
                if (renderLoopId != app.renderLoopId) {
                    console.log(`render loop ${renderLoopId} has been finished`);
                    return;
                }
                now *= 0.001;
                const deltaTime = now - app.renderLastUpdated;
                app.renderLastUpdated = now;

                app.drawScene(gl!, programInfo, buffers, deltaTime);
                requestAnimationFrame(render);
            }
            requestAnimationFrame(render);
        }
    }

    drawScene(gl: WebGLRenderingContext, programInfo, buffers, deltaTime: number) {
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
            this.squareRotation,
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

        this.squareRotation += deltaTime;
    }

    shaderSourceFromEditor(id: string) {
        const sourceElement = document.getElementById(id);
        if (!sourceElement) {
            return null;
        }

        const source = sourceElement.getAttribute('value');
        return source;
    }

}

new App();