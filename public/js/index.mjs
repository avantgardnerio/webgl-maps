import {initBuffers} from './world.mjs';
import {initDefaultShader, initDrawingShader} from './shader.mjs';
import {
    deg2rad, lonLat2Pos,
    tile2lat,
    tile2lon,
    getBounds,
    intersectBounds,
    lerp,
    pos2LonLat,
    getRandomColor,
    intersectRayWithSphere
} from "./utils.mjs";

const TILE_SIZE = 256;

function getPowerOfTwo(value, pow) {
    pow = pow || 1;
    while (pow < value) {
        pow *= 2;
    }
    return pow;
}

let first = true;
onload = async () => {
    // 3d webgl canvas
    const canvas = document.createElement(`canvas`);
    canvas.setAttribute(`width`, `${innerWidth}px`);
    canvas.setAttribute(`height`, `${innerHeight}px`);
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl');

    // 2d drawing canvas
    const cnv2d = document.createElement(`canvas`);
    const cnvWidth = getPowerOfTwo(innerWidth);
    const cnvHeight = getPowerOfTwo(innerHeight);
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

    // shaders
    const defaultShader = await initDefaultShader(gl);
    const drawingShader = await initDrawingShader(gl);
    const tileCache = {};

    // state
    let mat = mat4.create();
    let lat = 0;
    let lon = 0;
    let alt = 3;
    let downPos;
    let downMat;
    let downLonLat;
    const keys = [];
    onkeydown = (e) => keys[e.key] = true;
    onkeyup = (e) => keys[e.key] = false;
    onmousedown = (e) => {
        downPos = [
            (e.clientX - gl.canvas.clientWidth / 2) / (gl.canvas.clientWidth / 2),
            (e.clientY - gl.canvas.clientHeight / 2) / (gl.canvas.clientHeight / 2),
            1
        ];
        downMat = mat;
        const inv = mat4.invert(mat4.create(), downMat);
        const clickPoint = vec3.transformMat4(vec3.create(), downPos, inv);
        const center = vec3.create();
        const radius = 1;
        const origin = vec3.transformMat4(vec3.create(), vec3.create(), inv);
        const dir = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), clickPoint, origin));
        const t = intersectRayWithSphere(center, radius, origin, dir);
        console.log(`t=${t} clickPoint=${clickPoint} origin=${origin} direction=${dir}`);
        if(isNaN(t) || !isFinite(t)) return;
        const worldPos = lerp(origin, dir, t);
        downLonLat = pos2LonLat(vec3.normalize(vec3.create(), worldPos));
        console.log(`mouseDown on ${downLonLat} worldPos=${worldPos}`)
    };
    onmouseup = () => {
        downPos = undefined;
        downMat = undefined;
        downLonLat = undefined;
    };
    onmousemove = (e) => {
        if (downLonLat === undefined) return;
        const curPos = [
            (e.clientX - gl.canvas.clientWidth / 2) / (gl.canvas.clientWidth / 2),
            (e.clientY - gl.canvas.clientHeight / 2) / (gl.canvas.clientHeight / 2),
            1
        ];
        const inv = mat4.invert(mat4.create(), downMat);
        const clickPoint = vec3.transformMat4(vec3.create(), curPos, inv);
        const center = vec3.create();
        const radius = 1;
        const origin = vec3.transformMat4(vec3.create(), vec3.create(), inv);
        const dir = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), clickPoint, origin));
        const t = intersectRayWithSphere(center, radius, origin, dir);
        console.log(`t=${t} clickPoint=${clickPoint} origin=${origin} direction=${dir}`);
        if(isNaN(t) || !isFinite(t)) return;
        const worldPos = lerp(origin, dir, t);
        const curLonLat = pos2LonLat(vec3.normalize(vec3.create(), worldPos));

        lon = curLonLat[0] - downLonLat[0];
        lat = curLonLat[1] - downLonLat[1];
    };

    // Draw the scene repeatedly
    const start = performance.now();
    let last = start;
    const render = (now) => {
        const deltaTime = (now - last) / 1000;
        ctx.fillStyle = `rgba(1, 0, 0, 1)`;
        ctx.clearRect(0, 0, cnvWidth, cnvHeight);

        // controls
        if (keys['w'] === true) alt = Math.max(1.0002, alt - deltaTime / 10);
        if (keys['s'] === true) alt = Math.max(1, alt + deltaTime / 10);
        if (keys['ArrowUp'] === true) lat += deltaTime;
        if (keys['ArrowDown'] === true) lat -= deltaTime;
        if (keys['ArrowLeft'] === true) lon += deltaTime;
        if (keys['ArrowRight'] === true) lon -= deltaTime;

        // perspective
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; 
        const projMat = mat4.create();
        mat4.perspective(projMat, 45 * Math.PI / 180, aspect, 0.0001, 100.0);
        mat4.translate(projMat, projMat, [-0.0, 0.0, -alt]);
        mat4.rotate(projMat, projMat, deg2rad(lat), [1, 0, 0]);
        mat4.rotate(projMat, projMat, deg2rad(lon), [0, 1, 0]);

        // model position
        const modelViewMatrix = mat4.create();

        // tiles
        let maxZoom = 0;
        const getTiles = (zoom, tileX, tileY, mat, tiles) => {
            maxZoom = Math.max(maxZoom, zoom);
            const n = tile2lat(tileY, zoom);
            const e = tile2lon(tileX + 1, zoom);
            const s = tile2lat(tileY + 1, zoom);
            const w = tile2lon(tileX, zoom);
            const nw = vec3.transformMat4([0, 0, 0], lonLat2Pos([w, n]), mat);
            const ne = vec3.transformMat4([0, 0, 0], lonLat2Pos([e, n]), mat);
            const se = vec3.transformMat4([0, 0, 0], lonLat2Pos([e, s]), mat);
            const sw = vec3.transformMat4([0, 0, 0], lonLat2Pos([w, s]), mat);
            let bounds = getBounds([nw, ne, se, sw]);
            bounds[0] = bounds[0] * cnvWidth / 2 + cnvWidth / 2;
            bounds[1] = bounds[1] * cnvHeight / 2 + cnvHeight / 2;
            bounds[2] = bounds[2] * cnvWidth / 2 + cnvWidth / 2;
            bounds[3] = bounds[3] * cnvHeight / 2 + cnvHeight / 2;
            bounds = intersectBounds(screenBounds, bounds);
            // ctx.strokeStyle = getRandomColor(zoom + tileX + tileY);
            // ctx.fillStyle = "white";
            // ctx.strokeWidth = 2;
            // ctx.beginPath();
            // ctx.moveTo(bounds[0], bounds[1]);
            // ctx.lineTo(bounds[2], bounds[1]);
            // ctx.lineTo(bounds[2], bounds[3]);
            // ctx.lineTo(bounds[0], bounds[3]);
            // ctx.lineTo(bounds[0], bounds[1]);
            // ctx.stroke();

            const width = Math.round(bounds[2] - bounds[0]);
            const height = Math.round(bounds[3] - bounds[1]);
            if (first) {
                console.log(`zoom=${zoom} ${width}x${height} ${bounds}`);
            }

            if (zoom < 18 && (zoom < 2 || (width > TILE_SIZE && height > 5) || (height > TILE_SIZE && width > 5))) {
                let loaded = true;
                loaded &= getTiles(zoom + 1, tileX * 2, tileY * 2, mat, tiles);
                loaded &= getTiles(zoom + 1, tileX * 2 + 1, tileY * 2, mat, tiles);
                loaded &= getTiles(zoom + 1, tileX * 2, tileY * 2 + 1, mat, tiles);
                loaded &= getTiles(zoom + 1, tileX * 2 + 1, tileY * 2 + 1, mat, tiles);
                if (loaded) {
                    return true;
                }
            }

            const key = `${zoom}/${tileX}/${tileY}`;
            if (tileCache[key] === undefined) {
                tileCache[key] = initBuffers(gl, tileX, tileY, zoom);
            }
            if (tileCache[key].texture.loaded) {
                // ctx.fillStyle = "white";
                // for(let i = 0; i < tileCache[key].positions.length; i += 3) {
                //     const x = tileCache[key].positions[i];
                //     const y = tileCache[key].positions[i + 1];
                //     const z = tileCache[key].positions[i + 2];
                //     const pos = vec3.transformMat4([0, 0, 0], [x, y, z], mat);
                //     pos[0] = pos[0] * cnvWidth / 2 + cnvWidth / 2;
                //     pos[1] = pos[1] * cnvHeight / 2 + cnvHeight / 2;
                //     ctx.fillRect(pos[0], pos[1], 2, 2);
                // }
                tiles.push(tileCache[key]);
                return true;
            }

            return false;
        };
        mat = mat4.multiply(mat4.create(), projMat, modelViewMatrix);
        const tiles = [];
        getTiles(0, 0, 0, mat, tiles);
        first = false;

        // rendering
        drawScene(gl, defaultShader, tiles, projMat, modelViewMatrix);

        // 2d overlay
        ctx.fillStyle = `white`;
        ctx.fillText(`lon: ${lon}`, 10, 50);
        ctx.fillText(`lat: ${lat}`, 10, 75);
        ctx.fillText(`zoom: ${maxZoom}`, 10, 100);
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
        gl.vertexAttribPointer(drawingShader.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(drawingShader.attribLocations.vertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadTexBuffer);
        gl.vertexAttribPointer(drawingShader.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(drawingShader.attribLocations.textureCoord);
        gl.useProgram(drawingShader.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
        gl.uniform1i(drawingShader.samplerUniform, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
        last = now;
    };
    requestAnimationFrame(render);
};

const drawScene = (gl, programInfo, models, projectionMatrix, modelViewMatrix) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
        gl.bindTexture(gl.TEXTURE_2D, model.texture.texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        // draw
        gl.drawElements(gl.TRIANGLES, model.indexCount, gl.UNSIGNED_SHORT, 0);
    }
};
