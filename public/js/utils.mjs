import {EQUATOR_RADIUS_KM, POLAR_RADIUS_KM} from "./constants.mjs";

export const sq = v => v * v;
export const multiply = (v, f) => [v[0] * f, v[1] * f, v[2] * f];
export const sec = theta => 1.0 / Math.cos(theta);
export const deg2rad = deg => deg * Math.PI / 180.0;
export const rad2deg = rad => rad * 180.0 / Math.PI;
export const isPowerOf2 = value => (value & (value - 1)) === 0;
export const centroid = (a, b, c) => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
export const getBounds = vecs => {
    return vecs.reduce((acc, cur) => {
            acc[0] = Math.min(acc[0], cur[0]);
            acc[1] = Math.min(acc[1], cur[1]);
            acc[2] = Math.max(acc[2], cur[0]);
            acc[3] = Math.max(acc[3], cur[1]);
            return acc;
        }, [Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY]
    );
};
export const intersectBounds = (a, b) => {
    return [
        Math.max(a[0], b[0]),
        Math.max(a[1], b[1]),
        Math.min(a[2], b[2]),
        Math.min(a[3], b[3])
    ];
};

export const pos2LonLat = (vec) => {
    const v = vec3.normalize(vec3.create(), vec);
    const lon = Math.atan2(v[0], v[2]) * 180 / Math.PI;
    const lat = Math.acos(-v[1]) * 180 / Math.PI - 90;
    return [lon, lat];
};

export const lonLat2Pos = (vec) => {
    const lon = deg2rad(vec[0] + 90);
    const lat = deg2rad(vec[1]);
    const x = -EQUATOR_RADIUS_KM * Math.cos(lon) * Math.cos(lat);
    const y = POLAR_RADIUS_KM * Math.sin(lat);
    const z = EQUATOR_RADIUS_KM * Math.sin(lon) * Math.cos(lat);
    return [x, y, z];
};

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Pseudo-code
export const lon2tile = (lon, zoom) => {
    return (lon + 180) / 360 * Math.pow(2, zoom);
};

export const lat2tile = (lat, zoom) => {
    return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
};

export const tile2lon = (x, zoom) => {
    return x / Math.pow(2, zoom) * 360 - 180;
};

export const tile2lat = (y, zoom) => {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export const getRandomColor = (seed = Math.random()) => {
    return Math.floor((Math.abs(Math.sin(seed) * 16777215)) % 16777215).toString(16);
};

export const lerp = (origin, dir, t) => {
    return [
        origin[0] + dir[0] * t,
        origin[1] + dir[1] * t,
        origin[2] + dir[2] * t,
    ]
};

// http://kylehalladay.com/blog/tutorial/math/2013/12/24/Ray-Sphere-Intersection.html
export const intersectRayWithSphere = (center, radius, origin, dir) => {
    const L = vec3.subtract(vec3.create(), center, origin);
    const tc = vec3.dot(L, dir);
    if (tc < 0) return NaN; // behind origin
    const dSq = vec3.sqrLen(L) - sq(tc);
    const radiusSq = sq(radius);
    if (dSq > radiusSq) return NaN; // ray passes sphere farther than radius (miss)
    const t1c = Math.sqrt(radiusSq - dSq);
    const isecs = [tc - t1c, tc + t1c];
    console.log(`isecs=${isecs} t1c=${t1c} rad2=${radiusSq} d2=${dSq}`);
    const t = isecs
        .filter(t => t >= 0)
        .reduce((acc, cur) => Math.min(acc, cur), Number.POSITIVE_INFINITY);
    return t;
};

export const getPowerOfTwo = (value, pow) => {
    pow = pow || 1;
    while (pow < value) {
        pow *= 2;
    }
    return pow;
};

export const screen2world = (x, y, cnvWidth, cnvHeight) => {
    return [
        (x - cnvWidth / 2) / (cnvWidth / 2),
        -(y - cnvHeight / 2) / (cnvHeight / 2),
        1
    ]
};