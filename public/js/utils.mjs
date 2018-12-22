export const getMidPoint = (a, b) => [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0, (a[2] + b[2]) / 2.0];
export const getLength = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
export const normalize = (v) => {
    const len = getLength(v);
    return [v[0] / len, v[1] / len, v[2] / len];
};
export const multiply = (v, f) => [v[0] * f, v[1] * f, v[2] * f];
export const sec = (theta) => 1.0 / Math.cos(theta);
export const deg2rad = (deg) => deg * Math.PI / 180.0;
export const rad2deg = (rad) => rad * 180.0 / Math.PI;
export const isPowerOf2 = (value) => (value & (value - 1)) === 0;
export const centroid = (a, b, c) => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
export const getBounds = (vecs) => {
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
    const lon = Math.atan2(vec[0], vec[2]) * 180 / Math.PI;
    const lat = Math.acos(-vec[1]) * 180 / Math.PI - 90;
    return [lon, lat];
};

export const lonLat2Pos = (vec) => {
    const lon = deg2rad(vec[0] + 90);
    const lat = deg2rad(vec[1]);
    const x = -Math.cos(lon) * Math.cos(lat);
    const y = Math.sin(lat);
    const z = Math.sin(lon) * Math.cos(lat);
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