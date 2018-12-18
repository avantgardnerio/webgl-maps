onload = async () => {
    const vsSource = await (await fetch(`shader/index.vert`)).text();
    const fsSource = await (await fetch(`shader/index.frag`)).text();

    const canvas = document.createElement(`canvas`);
    canvas.setAttribute(`width`, window.innerWidth);
    canvas.setAttribute(`height`, window.innerHeight);
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl');

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        },
    };

    const buffers = initBuffers(gl);
    const texture = loadTexture(gl, 'cubetexture.png');
    const start = performance.now();

    // Draw the scene repeatedly
    const render = (now) => {
        const deltaTime = (now - start) / 1000;
        drawScene(gl, programInfo, buffers, texture, deltaTime);
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
};

const getMidPoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const getLength = (v) => Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
const getNormal = (v) => {
    const len = getLength(v);
    return [v[0] / len, v[1] / len, v[2] / len];
};

// http://blog.andreaskahler.com/2009/06/creating-icosphere-mesh-in-code.html
const initBuffers = (gl) => {
    // create 12 vertices of a icosahedron
    var t = (1.0 + Math.sqrt(5.0)) / 2.0;
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

    // Face indices
    let indices = [
        // 5 faces around point 0
        0, 11, 5,
        0, 5, 1,
        0, 1, 7,
        0, 7, 10,
        0, 10, 11,

        // 5 adjacent faces
        1, 5, 9,
        5, 11, 4,
        11, 10, 2,
        10, 7, 6,
        7, 1, 8,

        // 5 faces around point 3
        3, 9, 4,
        3, 4, 2,
        3, 2, 6,
        3, 6, 8,
        3, 8, 9,

        // 5 adjacent faces
        4, 9, 5,
        2, 4, 11,
        6, 2, 10,
        8, 6, 7,
        9, 8, 1,
    ];

    // refine mesh
    // let dirty = true;
    // while(dirty) {
    //     const newIndices = [];
    //     for(let i = 0; i < indices.length; i += 3) {
    //         const vertIdxA = indices[i+0];
    //         const vertIdxB = indices[i+1];
    //         const vertIdxC = indices[i+2];
    //         const vertPosA = [positions[vertIdxA+0], positions[vertIdxA+1], positions[vertIdxA+2]];
    //         const vertPosB = [positions[vertIdxB+0], positions[vertIdxB+1], positions[vertIdxB+2]];
    //         const vertPosC = [positions[vertIdxC+0], positions[vertIdxC+1], positions[vertIdxC+2]];
    //
    //         const midPosA = getMidPoint(vertPosA, vertPosB);
    //         const midPosB = getMidPoint(vertPosB, vertPosC);
    //         const midPosC = getMidPoint(vertPosC, vertPosA);
    //         const midIdxA = positions.length; Array.prototype.push.apply(positions, midPosA);
    //         const midIdxB = positions.length; Array.prototype.push.apply(positions, midPosB);
    //         const midIdxC = positions.length; Array.prototype.push.apply(positions, midPosC);
    //
    //         Array.prototype.push.apply(newIndices, [vertPosA, midIdxA, midIdxC]);
    //         Array.prototype.push.apply(newIndices, [vertPosB, midIdxB, midIdxA]);
    //         Array.prototype.push.apply(newIndices, [vertPosC, midIdxC, midIdxB]);
    //         Array.prototype.push.apply(newIndices, [midIdxA, midIdxB, midIdxC]);
    //     }
    //     indices = newIndices;
    //     dirty = false;
    // }

    // normals
    const vertexNormals = [];
    for(let i = 0; i < positions.length; i += 3) {
        const vertPos = [positions[i+0], positions[i+1], positions[i+2]];
        const norm = getNormal(vertPos);
        Array.prototype.push.apply(vertexNormals, norm);
    }

    // Texture coordinates
    const textureCoordinates = [];
    for(let i = 0; i < positions.length; i += 3) {
        const texCoord = [0, 0]; // TODO: something better
        Array.prototype.push.apply(textureCoordinates, texCoord);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer,
        indexCount: indices.length
    };
};

const loadTexture = (gl, url) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Put a single pixel in the texture so we can use it immediately
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    // Begin download
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D); // Yes, it's a power of 2. Generate mips.
        } else {
            // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
};

const isPowerOf2 = (value) => (value & (value - 1)) === 0;

const drawScene = (gl, programInfo, buffers, texture, cubeRotation) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180; // Our field of view is 45 degrees
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; // width/height ratio that matches the display size
    const zNear = 0.1; // we only want to see objects between 0.1 units
    const zFar = 100.0; // and 100 units away from the camera
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * .7, [0, 1, 0]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // positions
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // texture coords
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // normals
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    // indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    // draw
    gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, 0);
};

const initShaderProgram = (gl, vsSource, fsSource) => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const msg = gl.getProgramInfoLog(shaderProgram);
        throw new Error(`Unable to initialize the shader program: ${msg}`);
    }
    return shaderProgram;
};

const loadShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        const msg = gl.getShaderInfoLog(shader);
        throw new Error(`An error occurred compiling the shaders: ${msg}`);
    }
    return shader;
};
