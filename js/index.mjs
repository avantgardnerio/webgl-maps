window.onload = () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL
    const cnvMain = document.createElement(`canvas`);
    cnvMain.setAttribute(`width`, window.innerWidth);
    cnvMain.setAttribute(`height`, window.innerHeight);
    document.body.appendChild(cnvMain);

    const gl = cnvMain.getContext(`webgl`);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}