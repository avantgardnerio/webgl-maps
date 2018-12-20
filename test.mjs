import {tile2lon, tile2lat, pos2LonLat} from './public/js/utils.mjs';
import {lonLat2Pos} from "./public/js/utils";

const assert = (msg, condition) => {
    if (!condition) {
        throw new Error(msg);
    }
};

const approxEqual = (a, b, e = 0.0001) => {
    if (!isNaN(a) && !isNaN(b)) {
        return Math.abs(a - b) < e;
    }
    return a === b;
};

const assertEquals = (expected, actual) => {
    if (Array.isArray(expected) && Array.isArray(actual)) {
        const msg = `[${actual}] did not equal [${expected}]`;
        assert(msg, expected.length === actual.length);
        [...Array(expected.length).keys()].forEach(i => assert(msg, approxEqual(expected[i], actual[i])));
        return true;
    }
    assert(`${actual} did not equal ${expected}`, expected === actual);
};

let status = true;
const test = (desc, func) => {
    try {
        func();
        console.log(`\t${desc} [passed]`);
    } catch (e) {
        console.log(`\t${desc} [failed] with ${e}`);
        status = false;
    }
};

const group = (name, func) => {
    console.log(`${name}`);
    func();
    if(!status) {
        process.exit(-1);
    }
};

group(`tile2lon`, () => {
    test(`should convert 0,0`, () => {
        const expected = -180;
        const actual = tile2lon(0, 0);
        assertEquals(expected, actual);
    });

    test(`should convert 1,0`, () => {
        const expected = 180;
        const actual = tile2lon(1, 0);
        assertEquals(expected, actual);
    });

    test(`should convert 0,1`, () => {
        const expected = -180;
        const actual = tile2lon(0, 1);
        assertEquals(expected, actual);
    });

    test(`should convert 1,1`, () => {
        const expected = 0;
        const actual = tile2lon(1, 1);
        assertEquals(expected, actual);
    });
});

group(`tile2lat`, () => {
    test(`should convert 0,0`, () => {
        const expected = 85.0511287798066;
        const actual = tile2lat(0, 0);
        assertEquals(expected, actual);
    });

    test(`should convert 1,0`, () => {
        const expected = -85.0511287798066;
        const actual = tile2lat(1, 0);
        assertEquals(expected, actual);
    });

    test(`should convert 0,1`, () => {
        const expected = 85.0511287798066;
        const actual = tile2lat(0, 1);
        assertEquals(expected, actual);
    });

    test(`should convert 1,1`, () => {
        const expected = 0;
        const actual = tile2lat(1, 1);
        assertEquals(expected, actual);
    });
});

group(`pos2LonLat`, () => {
    test(`should convert 0,0,1`, () => {
        const expected = [0, 0];
        const actual = pos2LonLat([0, 0, 1]);
        assertEquals(expected, actual);
    });

    test(`should convert 1,0,0`, () => {
        const expected = [90, 0];
        const actual = pos2LonLat([1, 0, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert -1,0,0`, () => {
        const expected = [-90, 0];
        const actual = pos2LonLat([-1, 0, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert 0,-1,0`, () => {
        const expected = [0, -90];
        const actual = pos2LonLat([0, -1, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert 0,1,0`, () => {
        const expected = [0, 90];
        const actual = pos2LonLat([0, 1, 0]);
        assertEquals(expected, actual);
    });
});

group(`lonLat2Pos`, () => {
    test(`should convert 0, 0`, () => {
        const expected = [0, 0, 1];
        const actual = lonLat2Pos([0, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert 0, 90`, () => {
        const expected = [0, 1, 0];
        const actual = lonLat2Pos([0, 90]);
        assertEquals(expected, actual);
    });

    test(`should convert 0, -90`, () => {
        const expected = [0, -1, 0];
        const actual = lonLat2Pos([0, -90]);
        assertEquals(expected, actual);
    });

    test(`should convert -90, 0`, () => {
        const expected = [-1, 0, 0];
        const actual = lonLat2Pos([-90, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert 90, 0`, () => {
        const expected = [1, 0, 0];
        const actual = lonLat2Pos([90, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert 45, 0`, () => {
        const pos = Math.cos(45 * Math.PI / 180);
        const expected = [pos, 0, pos];
        const actual = lonLat2Pos([45, 0]);
        assertEquals(expected, actual);
    });

    test(`should convert 180, 0`, () => {
        const expected = [0, 0, -1];
        const actual = lonLat2Pos([180, 0]);
        assertEquals(expected, actual);
    });
});
