import {normalize, getMidPoint, tileToDeg, pos2Ang, vec2rad} from './utils.mjs';

// http://blog.andreaskahler.com/2009/06/creating-icosphere-mesh-in-code.html
export const initBuffers = (gl, xtile, ytile, zoom) => {
    let nw = tileToDeg(xtile, ytile, zoom);
    let se = tileToDeg(xtile+1, ytile+1, zoom);
    console.log(`nw=${nw} se=${se}`);
    nw = vec2rad(nw);
    se = vec2rad(se);

    // refine mesh
    const positions = [...INITIAL_POSITIONS];
    let indices = [...INITIAL_INDICES];
    for (let detail = 0; detail < 3; detail++) {
        const newIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const vertIdxA = indices[i];
            const vertIdxB = indices[i + 1];
            const vertIdxC = indices[i + 2];
            const vertPosA = [positions[vertIdxA * 3], positions[vertIdxA * 3 + 1], positions[vertIdxA * 3 + 2]];
            const vertPosB = [positions[vertIdxB * 3], positions[vertIdxB * 3 + 1], positions[vertIdxB * 3 + 2]];
            const vertPosC = [positions[vertIdxC * 3], positions[vertIdxC * 3 + 1], positions[vertIdxC * 3 + 2]];
            const vertAngA = pos2Ang(vertPosA);
            const vertAngB = pos2Ang(vertPosB);
            const vertAngC = pos2Ang(vertPosC);
            // if(
            //     (vertAngA[0] < nw[0] || vertAngA[1] < nw[1] || vertAngA[0] > se[0] || vertAngA[1] > se[1]) &&
            //     (vertAngB[0] < nw[0] || vertAngB[1] < nw[1] || vertAngB[0] > se[0] || vertAngB[1] > se[1]) &&
            //     (vertAngC[0] < nw[0] || vertAngC[1] < nw[1] || vertAngC[0] > se[0] || vertAngC[1] > se[1])
            // ) {
            //     console.log(`a=${vertAngA} b=${vertAngB} c=${vertAngC}`);
            //     continue;
            // }

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
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    const textureCoordinates = [];
    for (let i = 0; i < positions.length; i += 3) {
        const vec = [positions[i], positions[i + 1], positions[i + 2]];
        // TODO: use actual mercator projection function here
        const lon = 1 - (Math.atan2(vec[2], vec[0]) + Math.PI) / Math.PI / 2.0;
        const scaledLat = (Math.acos(vec[1] / 1.0) - Math.PI / 2) * scale;
        const lat = (scaledLat + Math.PI / 2) / Math.PI;
        min = Math.min(min, lon);
        max = Math.max(max, lon);
        const texCoord = [lon, lat];
        Array.prototype.push.apply(textureCoordinates, texCoord);
    }
    console.log(`min=${min} max=${max} scale=${scale}`);

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
        indexCount: indices.length
    };
};

// create 12 vertices of a icosahedron
const T = (1.0 + Math.sqrt(5.0)) / 2.0;
const INITIAL_POSITIONS = [
    ...normalize([-1, T, 0]),
    ...normalize([1, T, 0]),
    ...normalize([-1, -T, 0]),
    ...normalize([1, -T, 0]),

    ...normalize([0, -1, T]),
    ...normalize([0, 1, T]),
    ...normalize([0, -1, -T]),
    ...normalize([0, 1, -T]),

    ...normalize([T, 0, -1]),
    ...normalize([T, 0, 1]),
    ...normalize([-T, 0, -1]),
    ...normalize([-T, 0, 1]),
];

// Face indices
const INITIAL_INDICES = [
    // 5 faces around point 0
    0, 11, 5,
    0, 5, 1,
    0, 1, 7,
    0, 7, 10,
    0, 10, 11,

    // 5 adjacent faces
    1, 5, 9,
    5, 11, 4,
    11, 10, 2,
    10, 7, 6,
    7, 1, 8,

    // 5 faces around point 3
    3, 9, 4,
    3, 4, 2,
    3, 2, 6,
    3, 6, 8,
    3, 8, 9,

    // 5 adjacent faces
    4, 9, 5,
    2, 4, 11,
    6, 2, 10,
    8, 6, 7,
    9, 8, 1,
];
