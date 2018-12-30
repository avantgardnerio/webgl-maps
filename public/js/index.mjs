import {getTiles, tileCache} from './world.mjs';
import {deg2rad, lonLat2Pos, getPowerOfTwo, device2LonLat} from "./utils.mjs";
import {EQUATOR_RADIUS_KM, FOV} from "./constants.mjs";

onload = async () => {
    const canvas = document.createElement(`canvas`);
    canvas.setAttribute(`width`, `${innerWidth}px`);
    canvas.setAttribute(`height`, `${innerHeight}px`);
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // state
    let mat = mat4.create();
    let lat = 0;
    let lon = 0;
    let alt = 18000;
    let ang = 0;
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
        downLonLat = device2LonLat(downMat, e.clientX, e.clientY, canvas.width, canvas.height);
    };
    onmousemove = (e) => {
        if (downLonLat === undefined) return;
        const curLonLat = device2LonLat(downMat, e.clientX, e.clientY, canvas.width, canvas.height);
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
        ctx.fillStyle = `rgba(1, 0, 0, 1)`;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // controls
        if (keys['ArrowUp'] === true) ang += deltaTime * 10;
        if (keys['ArrowDown'] === true) ang -= deltaTime * 10;

        // perspective
        const kmVisible = (alt - EQUATOR_RADIUS_KM) * Math.tan(FOV / 2) * 2; // how much ground are we looking at?
        const projMat = mat4.create();
        mat4.perspective(projMat, FOV, canvas.width / canvas.height, kmVisible / 1000, kmVisible * 10);
        mat4.rotate(projMat, projMat, deg2rad(-ang), [1, 0, 0]);
        mat4.translate(projMat, projMat, [-0.0, 0.0, -alt]);
        mat4.rotate(projMat, projMat, deg2rad(lat), [1, 0, 0]);
        mat4.rotate(projMat, projMat, deg2rad(lon), [0, 1, 0]);

        // model position
        const modelViewMatrix = mat4.create();
        mat = mat4.multiply(mat4.create(), projMat, modelViewMatrix);
        const tiles = [];
        getTiles(0, 0, 0, mat, [0, 0, canvas.width, canvas.height], tiles);

        // rendering
        drawScene(ctx, canvas, tiles, projMat, modelViewMatrix);

        // 2d overlay
        ctx.fillStyle = `white`;
        ctx.fillText(`lon: ${lon.toFixed(6)}`, 10, 50);
        ctx.fillText(`lat: ${lat.toFixed(6)}`, 10, 75);
        ctx.fillText(`alt: ${(alt - EQUATOR_RADIUS_KM).toFixed(2)}km`, 10, 100);

        requestAnimationFrame(render);
        last = now;
    };
    requestAnimationFrame(render);
};

const drawScene = (ctx, canvas, models, projectionMatrix, modelViewMatrix) => {
    ctx.fillStyle = `rgba(0, 0, 0, 1)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let model of models) {
        model.draw(ctx, canvas, projectionMatrix, modelViewMatrix);
    }
};
