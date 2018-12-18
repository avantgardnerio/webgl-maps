import {isPowerOf2} from './utils.mjs';
import {initBuffers} from './icosahedron.mjs';
import {initShaderProgram} from './shader.mjs';

onload = async () => {
    const canvas = document.createElement(`canvas`);
    canvas.setAttribute(`width`, `${innerWidth}px`);
    canvas.setAttribute(`height`, `${innerHeight}px`);
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl');

    const shader = await initShaderProgram(gl);
    const icosahedron = initBuffers(gl);
    
    const texture = loadTexture(gl, 'img/osm/0/0/0.png');
    const start = performance.now();

    // Draw the scene repeatedly
    const render = (now) => {
        const deltaTime = (now - start) / 1000;
        drawScene(gl, shader, icosahedron, texture, deltaTime);
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
};

const loadTexture = (gl, url) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Put a single pixel in the texture so we can use it immediately
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    // Begin download
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D); // Yes, it's a power of 2. Generate mips.
        } else {
            // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
};

const drawScene = (gl, programInfo, buffers, texture, cubeRotation) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180; // Our field of view is 45 degrees
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; // width/height ratio that matches the display size
    const zNear = 0.1; // we only want to see objects between 0.1 units
    const zFar = 100.0; // and 100 units away from the camera
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
    //mat4.rotate(modelViewMatrix, modelViewMatrix, -Math.PI/4, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * .7, [0, 1, 0]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // positions
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // texture coords
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // normals
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    // indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    // draw
    gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, 0);
};
