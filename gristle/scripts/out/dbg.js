const GG = require('../load.js'); const { G } = GG;
G.newGame({ name: 'x', stats: { grit: 5, nerve: 5, wits: 5, charm: 5, reflex: 5, gut: 5 }, knacks: ['guns', 'gab', 'doctor'], quirks: [] }, 3);
G.S.mode = 'world'; G.S.map = null; G.enterMap('sump', 'front');
const k = G.ent('keeper'); console.log('keeper inv', JSON.stringify(k.inv));
const cage = G.S.map.objs.find(o => o.id === 'moecage'); console.log('cage', JSON.stringify(cage));
G.addItem(G.S.pc, 'cagekey', 1);
console.log('has', G.has('cagekey'), G.count(G.S.pc, 'cagekey'));
GG.Act.useObj(cage);
console.log('cage after', JSON.stringify(cage), G.S.log.slice(-3).map(l => l.t));
