import {getRandomColor, tile2lat, tile2lon, lonLat2Pos, pos2LonLat} from './utils.mjs';
import {loadTexture} from './texture.mjs';

// http://blog.andreaskahler.com/2009/06/creating-icosphere-mesh-in-code.html
export const initBuffers = (gl, tileX, tileY, zoom) => {
    const n = tile2lat(tileY, zoom);
    const e = tile2lon(tileX + 1, zoom);
    const s = tile2lat(tileY + 1, zoom);
    const w = tile2lon(tileX, zoom);
    console.log(`generating tile [${w},${n}] - [${e},${s}]`);

    // Load texture
    const texture = loadTexture(gl, `img/osm/${zoom}/${tileX}/${tileY}.png`);

    // positions & Texture coordinates
    const positions = [];
    const textureCoordinates = [];
    const resolution = 16;
    const yInc = (n - s) / resolution;
    const xInc = (e - w) / resolution;
    for(let y = 0; y <= resolution; y++) {
        for(let x = 0; x <= resolution; x++) {
            const lon = x * xInc + w;
            const lat = y * yInc + s;
            const pos = lonLat2Pos([lon, lat]);
            positions.push(...pos);

            const u = (lon - w) / (e - w);
            const v = (n - lat) / (n - s);
            const texCoord = [u, v];
            textureCoordinates.push(...texCoord);
        }
    }

    // indices
    let indices = [];
    for(let y = 1; y <= resolution; y++) {
        for(let x = 1; x <= resolution; x++) {
            const sw = (y - 1) * (resolution+1) + (x - 1);
            const se = (y - 1) * (resolution+1) + x;
            const nw = y * (resolution+1) + (x - 1);
            const ne = y * (resolution+1) + x;
            indices.push(sw, nw, se);
            indices.push(se, nw, ne);
        }
    }

    // normals
    const vertexNormals = [];
    for (let i = 0; i < positions.length; i += 3) {
        const vertPos = [positions[i], positions[i + 1], positions[i + 2]];
        const norm = vec3.normalize(vertPos, vertPos);
        Array.prototype.push.apply(vertexNormals, norm);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer,
        indexCount: indices.length,
        positions,
        color: getRandomColor(),
        texture
    };
};
