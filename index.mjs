import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
const app = express();

app.use(express.static('public'));
app.use('/lib/gl-matrix', express.static('node_modules/gl-matrix/dist'));

app.get(/\/img\/osm\/([0-9]*)\/([0-9]*)\/([0-9]*)\.png/, async (req, res) => {
    const zoom = parseInt(req.params[0]);
    const x = parseInt(req.params[1]);
    const y = parseInt(req.params[2]);

    const fileBase = `data/osm`;
    const urlBase = `https://tile.openstreetmap.org`;
    serve(zoom, x, y, res, fileBase, urlBase);
});

app.get(/\/img\/mapbox\/terrain\/([0-9]*)\/([0-9]*)\/([0-9]*)\.png/, async (req, res) => {
    const zoom = parseInt(req.params[0]);
    const x = parseInt(req.params[1]);
    const y = parseInt(req.params[2]);

    const fileBase = `data/mapbox/terrain`;
    const urlBase = `https://api.mapbox.com/v4/mapbox.terrain-rgb`;
    const queryString = `raw?access_token=${process.env.MAPBOX_TOKEN}`;
    serve(zoom, x, y, res, fileBase, urlBase, queryString);
});

const port = parseInt(process.env.PORT || 3000);
app.listen(port);

const serve = async (zoom, x, y, res, fileBase, urlBase, queryString = '') => {
    res.set('Cache-Control', 'immutable');
    res.contentType('image/png');
    const path = `${fileBase}/${zoom}/${x}`;
    mkDirByPathSync(path);
    const filename = `${path}/${y}.png`;
    if (fs.existsSync(filename)) {
        // load
        console.log('found ', filename);
        fs.readFile(filename, (err, data) => {
            if (err) throw err;
            res.end(data);
        });
    } else {
        // fetch
        const url = `${urlBase}/${zoom}/${x}/${y}.png${queryString}`;
        console.log('fetching ', url);
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFile(filename, buffer, () => {});
        console.log('got buffer ', arrayBuffer);
        res.end(buffer);
    }
};

function mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    return targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            fs.mkdirSync(curDir);
        } catch (err) {
            if (err.code === 'EEXIST') { // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
            }

            const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
            if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
                throw err; // Throw if it's just the last created dir.
            }
        }

        return curDir;
    }, initDir);
}
