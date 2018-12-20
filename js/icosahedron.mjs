import {normalize, getMidPoint, tile2lat, tile2lon, lonLat2Pos} from './utils.mjs';
import {loadTexture} from './texture.mjs';

// http://blog.andreaskahler.com/2009/06/creating-icosphere-mesh-in-code.html
export const initBuffers = (gl, xtile, ytile, zoom) => {
    const n = tile2lat(ytile, zoom);
    const e = tile2lon(xtile + 1, zoom);
    const s = tile2lat(ytile + 1, zoom);
    const w = tile2lon(xtile, zoom);

    // Load texture
    const texture = loadTexture(gl, `img/osm/${zoom}/${xtile}/${ytile}.png`);

    // create mesh
    const positions = [
        ...normalize(lonLat2Pos([w, n])),
        ...normalize(lonLat2Pos([e, n])),
        ...normalize(lonLat2Pos([e, s])),
        ...normalize(lonLat2Pos([w, s])),
    ];
    let indices = [
        0, 1, 2,
        3, 0, 2,
    ];

    // refine mesh
    for (let detail = 0; detail < 3; detail++) {
        const newIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const vertIdxA = indices[i];
            const vertIdxB = indices[i + 1];
            const vertIdxC = indices[i + 2];
            const vertPosA = [positions[vertIdxA * 3], positions[vertIdxA * 3 + 1], positions[vertIdxA * 3 + 2]];
            const vertPosB = [positions[vertIdxB * 3], positions[vertIdxB * 3 + 1], positions[vertIdxB * 3 + 2]];
            const vertPosC = [positions[vertIdxC * 3], positions[vertIdxC * 3 + 1], positions[vertIdxC * 3 + 2]];

            // TODO: don't store duplicate midPoints
            const midPosA = normalize(getMidPoint(vertPosA, vertPosB));
            const midPosB = normalize(getMidPoint(vertPosB, vertPosC));
            const midPosC = normalize(getMidPoint(vertPosC, vertPosA));
            const midIdxA = positions.length / 3;
            Array.prototype.push.apply(positions, midPosA);
            const midIdxB = positions.length / 3;
            Array.prototype.push.apply(positions, midPosB);
            const midIdxC = positions.length / 3;
            Array.prototype.push.apply(positions, midPosC);

            Array.prototype.push.apply(newIndices, [vertIdxA, midIdxA, midIdxC]);
            Array.prototype.push.apply(newIndices, [vertIdxB, midIdxB, midIdxA]);
            Array.prototype.push.apply(newIndices, [vertIdxC, midIdxC, midIdxB]);
            Array.prototype.push.apply(newIndices, [midIdxA, midIdxB, midIdxC]);
        }
        indices = newIndices;
    }

    // normals
    const vertexNormals = [];
    for (let i = 0; i < positions.length; i += 3) {
        const vertPos = [positions[i], positions[i + 1], positions[i + 2]];
        const norm = normalize(vertPos);
        Array.prototype.push.apply(vertexNormals, norm);
    }

    // Texture coordinates
    const limit = Math.atan(Math.sinh(Math.PI)); // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
    const scale = ((Math.PI / 2 / limit) - 1) * 2 + 1;
    const textureCoordinates = [];
    for (let i = 0; i < positions.length; i += 3) {
        const vec = [positions[i], positions[i + 1], positions[i + 2]];
        // TODO: use actual mercator projection function here
        const lon = 1 - (Math.atan2(vec[2], vec[0]) + Math.PI) / Math.PI / 2.0;
        const scaledLat = (Math.acos(vec[1] / 1.0) - Math.PI / 2) * scale;
        const lat = (scaledLat + Math.PI / 2) / Math.PI;
        const texCoord = [lon, lat];
        Array.prototype.push.apply(textureCoordinates, texCoord);
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
        texture
    };
};
