const m = JSON.parse(require('fs').readFileSync('Lanista-arena/personajes/succubus/metadata.json', 'utf8'));
const anims = Object.keys(m.frames.animations);
console.log('All animations: ' + anims.join(', '));
for (const a of anims) {
  if (a.startsWith('lv')) {
    const dirs = Object.keys(m.frames.animations[a]);
    const firstDir = dirs[0];
    const frameCount = m.frames.animations[a][firstDir].length;
    console.log('  ' + a + ': ' + dirs.length + ' directions, ' + frameCount + ' frames each');
  }
}
