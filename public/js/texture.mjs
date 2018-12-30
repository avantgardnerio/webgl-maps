import {isPowerOf2} from './utils.mjs';

export const loadTexture = (url) => {
    // Begin download
    const image = new Image();
    const result = {
        image,
        url,
        //loaded: false
        loaded: true
    };
    image.onload = function () {
        result.loaded = true;
    };
    //image.src = url;

    return result;
};

