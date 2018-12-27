import {getTiles} from './world.mjs';
import {initDefaultShader, initDrawingShader} from './shader.mjs';
import {deg2rad, lonLat2Pos, getPowerOfTwo, device2LonLat} from "./utils.mjs";
import {EQUATOR_RADIUS_KM, FOV} from "./constants.mjs";
import {createCanvas} from "./canvas.mjs";

onload = async () => {
    // 3d webgl canvas
    const canvas = document.createElement(`canvas`);
    canvas.setAttribute(`width`, `${innerWidth}px`);
    canvas.setAttribute(`height`, `${innerHeight}px`);
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl');

    // shaders
    const defaultShader = await initDefaultShader(gl);
    const drawingShader = await initDrawingShader(gl);

    // 2d drawing canvas
    const cnv2d = createCanvas(gl, drawingShader, innerWidth, innerHeight);

    // state
    let mat = mat4.create();
    let lat = 0;
    let lon = 0;
    let alt = 18000;
    let downMat;
    let downLonLat;
    let lonLat;
    const keys = [];
    onkeydown = (e) => keys[e.key] = true;
    onkeyup = (e) => keys[e.key] = false;
    onwheel = (e) => {
        const kmVisible = (alt - EQUATOR_RADIUS_KM) * Math.tan(FOV / 2) * 2; // how much ground are we looking at?
        alt += e.deltaY * kmVisible / 100;
        e.preventDefault();
    };
    onmousedown = (e) => {
        downMat = mat;
        lonLat = [lon, lat];
        downLonLat = device2LonLat(downMat, e.clientX, e.clientY, cnv2d.width, cnv2d.height);
    };
    onmousemove = (e) => {
        if (downLonLat === undefined) return;
        const curLonLat = device2LonLat(downMat, e.clientX, e.clientY, cnv2d.width, cnv2d.height);
        lon = curLonLat[0] - downLonLat[0] + lonLat[0];
        lat = downLonLat[1] - curLonLat[1] + lonLat[1];
    };
    onmouseup = () => {
        downMat = undefined;
        downLonLat = undefined;
    };

    // Draw the scene repeatedly
    const start = performance.now();
    let last = start;
    const render = (now) => {
        const deltaTime = (now - last) / 1000;
        cnv2d.clear();

        // controls
        if (keys['w'] === true) alt = Math.max(1.0002, alt - deltaTime * 100);
        if (keys['s'] === true) alt = Math.max(1, alt + deltaTime * 100);
        if (keys['ArrowUp'] === true) lat += deltaTime;
        if (keys['ArrowDown'] === true) lat -= deltaTime;
        if (keys['ArrowLeft'] === true) lon += deltaTime;
        if (keys['ArrowRight'] === true) lon -= deltaTime;

        // perspective
        const kmVisible = (alt - EQUATOR_RADIUS_KM) * Math.tan(FOV / 2) * 2; // how much ground are we looking at?
        const projMat = mat4.create();
        mat4.perspective(projMat, FOV, cnv2d.width / cnv2d.height, kmVisible / 1000, kmVisible * 10);
        mat4.translate(projMat, projMat, [-0.0, 0.0, -alt]);
        mat4.rotate(projMat, projMat, deg2rad(lat), [1, 0, 0]);
        mat4.rotate(projMat, projMat, deg2rad(lon), [0, 1, 0]);

        // model position
        const modelViewMatrix = mat4.create();
        mat = mat4.multiply(mat4.create(), projMat, modelViewMatrix);
        const tiles = [];
        getTiles(gl, defaultShader, 0, 0, 0, mat, [0, 0, cnv2d.width, cnv2d.height], tiles);

        // rendering
        drawScene(gl, defaultShader, tiles, projMat, modelViewMatrix);

        // 2d overlay
        cnv2d.ctx.fillStyle = `white`;
        cnv2d.ctx.fillText(`lon: ${lon.toFixed(6)}`, 10, 50);
        cnv2d.ctx.fillText(`lat: ${lat.toFixed(6)}`, 10, 75);
        cnv2d.ctx.fillText(`alt: ${(alt - EQUATOR_RADIUS_KM).toFixed(2)}km`, 10, 100);
        if (downLonLat !== undefined) {
            const pos = vec3.transformMat4(vec3.create(), lonLat2Pos(downLonLat), mat);
            pos[0] = pos[0] * cnv2d.width / 2 + cnv2d.width / 2;
            pos[1] = -pos[1] * cnv2d.height / 2 + cnv2d.height / 2;
            cnv2d.ctx.fillRect(pos[0], pos[1], 2, 2);
        }
        cnv2d.draw();

        requestAnimationFrame(render);
        last = now;
    };
    requestAnimationFrame(render);
};

const drawScene = (gl, shader, models, projectionMatrix, modelViewMatrix) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    gl.useProgram(shader.program);
    gl.uniformMatrix4fv(shader.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(shader.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(shader.uniformLocations.normalMatrix, false, normalMatrix);

    for (let model of models) model.draw();
};
