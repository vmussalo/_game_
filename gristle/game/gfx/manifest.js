// Optional replacement graphics. Every key listed here replaces the procedural drawing.
// Format:  'key': { file: 'path/in/gfx.png', ax: 0.5, ay: 0.95, s: 1 }   (ax/ay = anchor, s = scale)
// Keys: char/<template>  dead/<template>  obj/<type or object id>  ground/<map id>  portrait/<template or object type>  icon/<item id>
// See GRAFIIKKA.md for sizes and ComfyUI prompts.
GG.GFX_BASE = 'gfx/';
GG.GFX_MANIFEST = {
  // 'char/agnes': { file: 'char/agnes.png', ax: 0.5, ay: 0.96, s: 0.5 },
  // 'portrait/agnes': { file: 'portrait/agnes.png' },
  // 'obj/mother': { file: 'obj/mother.png', ax: 0.5, ay: 0.85, s: 0.6 },
};
