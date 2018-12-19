import {degToTile} from './utils.mjs';

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

test(`degToTile should convert 0,0`, () => {
    const expected = [0, 0];
    const actual = degToTile(0, 0, 0);
    assertEquals(actual, expected);
});