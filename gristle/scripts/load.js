// Loads the browser-independent game logic into Node. Usage: const GG = require('./load.js');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'game', 'js');
const FILES = [
  'core/util.js', 'data/rules.js', 'data/items.js', 'data/creatures.js', 'core/mapgen.js', 'data/maps.js',
  'core/game.js', 'core/combat.js', 'core/acts.js', 'core/dialog.js', 'core/world.js', 'data/scripts.js', 'data/dialogues.js',
];
for (const f of FILES) require(path.join(ROOT, f));
module.exports = globalThis.GG;
module.exports.FILES = FILES;
