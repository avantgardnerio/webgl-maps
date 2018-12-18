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

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Pseudo-code
export const degToTile = (lon_deg, lat_deg, zoom) => {
    const lon_rad = deg2rad(lon_deg);
    const lat_rad = deg2rad(lat_deg);
    return radToTile(lon_rad, lat_rad, zoom);
};

export const radToTile = (lon_rad, lat_rad, zoom) => {
    const lon_deg = rad2deg(lon_rad);
    const n = Math.pow(2, zoom);
    const xtile = n * ((lon_deg + 180) / 360);
    const ytile = n * (1 - (Math.log(Math.tan(lat_rad) + sec(lat_rad)) / Math.PI)) / 2;
    return [xtile, ytile];
};

export const tileToDeg = (xtile, ytile, zoom) => {
    const n = Math.pow(2, zoom);
    const lon_deg = xtile / n * 360.0 - 180.0;
    const lat_rad = Math.atan(Math.sinh(Math.PI * (-1.0 * ytile / n)));
    const lat_deg = lat_rad * 180.0 / Math.PI;
    return [lon_deg, lat_deg];
};

export const tileToRad = (xtile, ytile, zoom) => {
    const deg = tileToDeg(xtile, ytile, zoom);
    const rad = [deg2rad(deg[0]), deg2rad(deg[1])];
    return rad;
};
