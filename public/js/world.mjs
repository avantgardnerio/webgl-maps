import {getRandomColor, tile2lat, tile2lon, lonLat2Pos, pos2LonLat} from './utils.mjs';
import {loadTexture} from './texture.mjs';
import {getBounds, intersectBounds} from "./utils.mjs";
import {TILE_SIZE} from "./constants.mjs";

export const tileCache = {};
export const getTiles = (zoom, tileX, tileY, mat, screenBounds, tiles) => {
    const n = tile2lat(tileY, zoom);
    const e = tile2lon(tileX + 1, zoom);
    const s = tile2lat(tileY + 1, zoom);
    const w = tile2lon(tileX, zoom);
    const nw = vec3.transformMat4([0, 0, 0], lonLat2Pos([w, n]), mat);
    const ne = vec3.transformMat4([0, 0, 0], lonLat2Pos([e, n]), mat);
    const se = vec3.transformMat4([0, 0, 0], lonLat2Pos([e, s]), mat);
    const sw = vec3.transformMat4([0, 0, 0], lonLat2Pos([w, s]), mat);
    let bounds = getBounds([nw, ne, se, sw]);
    bounds[0] = bounds[0] * screenBounds[2] / 2 + screenBounds[2] / 2;
    bounds[1] = bounds[1] * screenBounds[3] / 2 + screenBounds[3] / 2;
    bounds[2] = bounds[2] * screenBounds[2] / 2 + screenBounds[2] / 2;
    bounds[3] = bounds[3] * screenBounds[3] / 2 + screenBounds[3] / 2;
    bounds = intersectBounds(screenBounds, bounds);

    const width = Math.round(bounds[2] - bounds[0]);
    const height = Math.round(bounds[3] - bounds[1]);
    if (zoom < 18 && (
        zoom < 2
        || (width > TILE_SIZE * 1.5 && height > TILE_SIZE * 0.5)
        || (height > TILE_SIZE * 1.5 && width > TILE_SIZE * 0.5))
    ) {
        let loaded = true;
        loaded &= getTiles(zoom + 1, tileX * 2, tileY * 2, mat, screenBounds, tiles);
        loaded &= getTiles(zoom + 1, tileX * 2 + 1, tileY * 2, mat, screenBounds, tiles);
        loaded &= getTiles(zoom + 1, tileX * 2, tileY * 2 + 1, mat, screenBounds, tiles);
        loaded &= getTiles(zoom + 1, tileX * 2 + 1, tileY * 2 + 1, mat, screenBounds, tiles);
        if (loaded) return true;
    }

    const key = `${zoom}/${tileX}/${tileY}`;
    if (tileCache[key] === undefined) tileCache[key] = initBuffers(tileX, tileY, zoom);
    if (tileCache[key].isLoaded()) {
        tiles.push(tileCache[key]);
        return true;
    }
    return false;
};

// http://blog.andreaskahler.com/2009/06/creating-icosphere-mesh-in-code.html
export const initBuffers = (tileX, tileY, zoom) => {
    const n = tile2lat(tileY, zoom);
    const e = tile2lon(tileX + 1, zoom);
    const s = tile2lat(tileY + 1, zoom);
    const w = tile2lon(tileX, zoom);

    // Load texture
    const texture = loadTexture(`img/osm/${zoom}/${tileX}/${tileY}.png`);
    const resolution = 16;
    let loaded = false;

    // load terrain
    const positions = [];
    const textureCoordinates = [];
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.setAttribute('width', img.width);
        canvas.setAttribute('height', img.height);
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);

        // positions & Texture coordinates
        const yInc = (n - s) / resolution;
        const xInc = (e - w) / resolution;
        for(let y = 0; y <= resolution; y++) {
            for(let x = 0; x <= resolution; x++) {
                const imgX = x * 16;
                const imgY = y * 16;
                const elevation = getMetersAboveSea(imgData, imgX, imgY);

                const lon = x * xInc + w;
                const lat = y * yInc + s;
                const pos = lonLat2Pos([lon, lat], elevation / 1000);
                positions.push(...pos);

                const u = (lon - w) / (e - w);
                const v = (n - lat) / (n - s);
                const texCoord = [u, v];
                textureCoordinates.push(...texCoord);
            }
        }

        // normals
        const vertexNormals = [];
        for (let i = 0; i < positions.length; i += 3) {
            const vertPos = [positions[i], positions[i + 1], positions[i + 2]];
            const norm = vec3.normalize(vertPos, vertPos);
            vertexNormals.push(...norm);
        }

        loaded = true;
    };
    img.src = `img/mapbox/terrain/${zoom}/${tileX}/${tileY}.png`;

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

    const draw = (ctx, canvas, projMat, modelViewMatrix) => {
        const mat = mat4.multiply(mat4.create(), projMat, modelViewMatrix);
        ctx.fillStyle = "white";
        for(let i = 0; i < positions.length; i += 3) {
            const pos = vec4.transformMat4(vec4.create(), [positions[i], positions[i+1], positions[i+2], 1], mat);
            pos[0] = pos[0] / pos[3];
            pos[1] = pos[1] / pos[3];
            pos[0] = pos[0] * canvas.width / 2 + canvas.width / 2;
            pos[1] = pos[1] * canvas.height / 2 + canvas.height / 2;
            ctx.fillRect(pos[0], pos[1], 2, 2);
        }
    };

    return {
        n, e, s, w,
        draw,
        texture,
        isLoaded: () => texture.loaded && loaded
    };
};

// https://www.mapbox.com/help/access-elevation-data/
const getMetersAboveSea = (imgData, x, y) => {
    const R = imgData.data[y * imgData.width + x * 4];
    const G = imgData.data[y * imgData.width + x * 4 + 1];
    const B = imgData.data[y * imgData.width + x * 4 + 2];
    const height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1);
    return height;
};
