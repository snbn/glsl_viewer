uniform lowp float factor;
uniform lowp vec4 colOffset;
varying lowp vec4 vColor;

void main(void) {
    gl_FragColor = vec4((factor * vColor + colOffset).xyz, 1.0);
}