import {initBuffers} from './world.mjs';
import {initShaderProgram} from './shader.mjs';
import {deg2rad} from "./utils.mjs";

onload = async () => {
    const canvas = document.createElement(`canvas`);
    canvas.setAttribute(`width`, `${innerWidth}px`);
    canvas.setAttribute(`height`, `${innerHeight}px`);
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl');

    const shader = await initShaderProgram(gl);
    const tiles = [
        initBuffers(gl, 0, 1, 2),
        initBuffers(gl, 0, 2, 2),
        initBuffers(gl, 1, 1, 2),
        initBuffers(gl, 1, 2, 2),
        initBuffers(gl, 2, 1, 2),
        initBuffers(gl, 2, 2, 2),
        initBuffers(gl, 3, 1, 2),
        initBuffers(gl, 3, 2, 2),
    ];

    let lat = 0;
    let lon = 0;
    let alt = 6;
    const keys = [];
    onkeydown = (e) => keys[e.key] = true;
    onkeyup = (e) => keys[e.key] = false;

    // Draw the scene repeatedly
    const start = performance.now();
    let last = start;
    const render = (now) => {
        const deltaTime = (now - last) / 1000;
        if(keys['w'] === true) alt = Math.max(1, alt - deltaTime);
        if(keys['s'] === true) alt = Math.max(1, alt + deltaTime);
        if(keys['ArrowUp'] === true) lat += deltaTime * 10;
        if(keys['ArrowDown'] === true) lat -= deltaTime * 10;
        if(keys['ArrowLeft'] === true) lon += deltaTime * 10;
        if(keys['ArrowRight'] === true) lon -= deltaTime * 10;
        drawScene(gl, shader, tiles, lon, lat, alt);
        requestAnimationFrame(render);
        last = now;
    };
    requestAnimationFrame(render);
};

const drawScene = (gl, programInfo, models, lon, lat, alt) => {
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
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -alt]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, deg2rad(lat), [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, deg2rad(lon), [0, 1, 0]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // positions
    for (let model of models) {
        gl.bindBuffer(gl.ARRAY_BUFFER, model.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        // texture coords
        gl.bindBuffer(gl.ARRAY_BUFFER, model.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        // normals
        gl.bindBuffer(gl.ARRAY_BUFFER, model.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

        // indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indices);
        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, model.texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // draw
        gl.drawElements(gl.TRIANGLES, model.indexCount, gl.UNSIGNED_SHORT, 0);
    }
};
