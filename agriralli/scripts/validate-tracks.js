// Tarkistaa ratojen geometrian Nodella: node scripts/validate-tracks.js
global.window = global; global.location = { search: '' }; global.document = undefined;
const path = require('path');
for (const f of ['util', 'data', 'track']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
AR.TRACKS.forEach((t, i) => console.log(i, JSON.stringify(AR.Track.validate(AR.Track.build(i)))));
