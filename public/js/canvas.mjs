import {getPowerOfTwo} from "./utils.mjs";

export const createCanvas = (gl, shader, width, height) => {
    const cnv2d = document.createElement(`canvas`);
    const cnvWidth = getPowerOfTwo(width);
    const cnvHeight = getPowerOfTwo(height);
    cnv2d.setAttribute(`width`, `${cnvWidth}px`);
    cnv2d.setAttribute(`height`, `${cnvHeight}px`);
    const ctx = cnv2d.getContext('2d');
    ctx.font = "24px monospace";
    const quadVertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, 1.0, 1.0, 1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0, -1.0, -1.0, -1.0
    ]), gl.STATIC_DRAW);
    const quadTexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 1, 1, 1, 1, 0,
        0, 1, 1, 0, 0, 0,
    ]), gl.STATIC_DRAW);
    const canvasTexture = gl.createTexture();
    const screenBounds = [0, 0, cnvWidth, cnvHeight];

    return {
        clear: () => {
            ctx.fillStyle = `rgba(1, 0, 0, 1)`;
            ctx.clearRect(0, 0, cnvWidth, cnvHeight);
        },
        draw: () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv2d);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            gl.bindBuffer(gl.ARRAY_BUFFER, quadVertBuffer);
            gl.vertexAttribPointer(shader.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shader.attribLocations.vertexPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, quadTexBuffer);
            gl.vertexAttribPointer(shader.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(shader.attribLocations.textureCoord);
            gl.useProgram(shader.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
            gl.uniform1i(shader.samplerUniform, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        },
        ctx,
        width: cnvWidth,
        height: cnvHeight
    }
};