import express from 'express';
import fetch from 'node-fetch';
const app = express();

app.use(express.static('public'));

app.get(/\/img\/osm\/([0-9]*)\/([0-9]*)\/([0-9]*)\.png/, async (req, res) => {
    const zoom = parseInt(req.params[0]);
    const x = parseInt(req.params[1]);
    const y = parseInt(req.params[2]);
    const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    console.log('fetching ', url)
    const resp = await fetch(url);
    const buffer = await resp.arrayBuffer();
    console.log('got buffer ', buffer)
    res.contentType('image/png');
    res.end(Buffer.from(buffer))
});

const port = parseInt(process.env.PORT || 3000);
app.listen(port);
