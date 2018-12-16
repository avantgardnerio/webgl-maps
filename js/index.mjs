window.onload = async () => {
    const vsSource = await (await fetch(`shader/index.vert`)).text();
    const fsSource = await (await fetch(`shader/index.frag`)).text();

    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL
    const cnvMain = document.createElement(`canvas`);
    cnvMain.setAttribute(`width`, window.innerWidth);
    cnvMain.setAttribute(`height`, window.innerHeight);
    document.body.appendChild(cnvMain);

    const gl = cnvMain.getContext(`webgl`);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };
    const vertexBuffer = initBuffers(gl);
    const start = new Date().getTime();
    const render = () => {
        const now = new Date().getTime();
        const delta = (now - start) / 1000;
        drawScene(gl, programInfo, vertexBuffer, delta);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

const initShaderProgram = (gl, vsSource, fsSource) => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(shaderProgram);
        throw new Error(`Unable to initialize the shader program: ${info}`);
    }
    return shaderProgram;
}

const loadShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        const info = gl.getShaderInfoLog(shader);
        throw new Error(`An error occurred compiling the shaders: ${info}`)
    }
    return shader;
}

const initBuffers = (gl) => {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;
    const positions = [
        -1,  t,  0,
        1,  t,  0,
        -1, -t,  0,
        1, -t,  0,

        0, -1,  t,
        0,  1,  t,
        0, -1, -t,
        0,  1, -t,

        t,  0, -1,
        t,  0,  1,
        -t,  0, -1,
        -t,  0,  1,
    ];

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
    );
    return { 
        position: positionBuffer,
        vertexCount: positions.length / 3
    };
}

const drawScene = (gl, programInfo, vertexBuffer, delta) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix
    const fieldOfView = 45 * Math.PI / 180; // field of view is 45 degrees
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1; // we only want to see objects between 0.1 units
    const zFar = 100.0; // and 100 units away from the camera
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to "identity", which is the center of the scene
    const modelViewMatrix = mat4.create();

    // Now move the drawing position to where we want to start drawing the square.
    mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        [-0.0, 0.0, -6.0] // amount to translate
    );  
    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI / 8, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI * delta / 4, [0, 1, 0]);

    // pull out the positions from the position buffer into the vertexPosition attribute
    const numComponents = 3;  // pull out 2 values per iteration
    const normalize = false;  // don't normalize
    const stride = 0;         // how many bytes to get from one set of values to the next
    const offset = 0;         // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        gl.FLOAT,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );

    gl.drawArrays(gl.LINE_STRIP, offset, vertexBuffer.vertexCount);
}

