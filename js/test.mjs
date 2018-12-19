import {tile2lon, tile2lat, pos2LatLon} from './utils.mjs';

const assert = (msg, condition) => {
    if(!condition) {
        throw new Error(msg);
    }
};

const assertEquals = (expected, actual) => {
    if(Array.isArray(expected) && Array.isArray(actual)) {
        const msg = `[${actual}] did not equal [${expected}]`;
        assert(msg, expected.length === actual.length);
        [...Array(expected.length).keys()].forEach(i => assert(msg, expected[i] === actual[i]));
        return true;
    }
    assert(`${actual} did not equal ${expected}`, expected === actual);
};

const test = (desc, func) => {
    try {
        func();
        console.log(`${desc} passed`);
    } catch (e) {
        console.log(`${desc} failed with ${e}`);
        process.exit(-1);
    }
};

test(`tile2lon should convert 0,0`, () => {
    const expected = -180;
    const actual = tile2lon(0, 0);
    assertEquals(expected, actual);
});

test(`tile2lon should convert 1,0`, () => {
    const expected = 180;
    const actual = tile2lon(1, 0);
    assertEquals(expected, actual);
});

test(`tile2lat should convert 0,0`, () => {
    const expected = 85.0511287798066;
    const actual = tile2lat(0, 0);
    assertEquals(expected, actual);
});

test(`tile2lat should convert 1,0`, () => {
    const expected = -85.0511287798066;
    const actual = tile2lat(1, 0);
    assertEquals(expected, actual);
});

test(`tile2lon should convert 0,1`, () => {
    const expected = -180;
    const actual = tile2lon(0, 1);
    assertEquals(expected, actual);
});

test(`tile2lon should convert 1,1`, () => {
    const expected = 0;
    const actual = tile2lon(1, 1);
    assertEquals(expected, actual);
});

test(`tile2lat should convert 0,1`, () => {
    const expected = 85.0511287798066;
    const actual = tile2lat(0, 1);
    assertEquals(expected, actual);
});

test(`tile2lat should convert 1,1`, () => {
    const expected = 0;
    const actual = tile2lat(1, 1);
    assertEquals(expected, actual);
});

test(`pos2LatLon should convert 0,0,1`, () => {
    const expected = [0, 0];
    const actual = pos2LatLon([0, 0, 1]);
    assertEquals(expected, actual);
});

test(`pos2LatLon should convert 1,0,0`, () => {
    const expected = [0, 90];
    const actual = pos2LatLon([1, 0, 0]);
    assertEquals(expected, actual);
});

test(`pos2LatLon should convert -1,0,0`, () => {
    const expected = [0, -90];
    const actual = pos2LatLon([-1, 0, 0]);
    assertEquals(expected, actual);
});

test(`pos2LatLon should convert 0,-1,0`, () => {
    const expected = [-90, 0];
    const actual = pos2LatLon([0, -1, 0]);
    assertEquals(expected, actual);
});

test(`pos2LatLon should convert 0,1,0`, () => {
    const expected = [90, 0];
    const actual = pos2LatLon([0, 1, 0]);
    assertEquals(expected, actual);
});
