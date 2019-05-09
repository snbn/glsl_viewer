
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

export class GLWrapper {
    constructor(glContext) {
        let gl = glContext;

        this.glContext = gl;
        this.typeToNameMapping = {};

        const self = this;
        glTypeName.forEach(function (typeName) {
            self.typeToNameMapping[gl[typeName]] = typeName;
        });
    }
    get context() {
        return this.glContext;
    }
    typeIdToTypeName(typeId) {
        return this.typeToNameMapping[typeId];
    }
    initShaderProgram(vsSource, fsSource) {
        const gl = this.glContext;

        const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource);

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
    loadShader(type, source) {
        const gl = this.glContext;

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
    initBuffers() {
        const gl = this.glContext;

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
}
