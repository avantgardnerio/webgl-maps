import {tile2lon, tile2lat} from './utils.mjs';

const assertEquals = (expected, actual) => {
    if(expected !== actual) {
        throw new Error(`${actual} did not equal ${expected}`);
    }
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

