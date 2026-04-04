const fs = require('fs');
const path = require('path');

const basePath = 'c:/Users/nicos/OneDrive/Escritorio/Lanista-arena/Lanista-arena/personajes/succubus';
const metadataPath = path.join(basePath, 'metadata.json');
const animationsPath = path.join(basePath, 'animations');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

const animationDirs = fs.readdirSync(animationsPath).filter(d => fs.statSync(path.join(animationsPath, d)).isDirectory());

let changed = false;

if (!metadata.frames.animations) {
    metadata.frames.animations = {};
}

animationDirs.forEach(anim => {
    // If the animation is missing or we just want to update it
    if (!metadata.frames.animations[anim]) {
        metadata.frames.animations[anim] = {};
        changed = true;
    }
    
    const animPath = path.join(animationsPath, anim);
    const directions = fs.readdirSync(animPath).filter(d => fs.statSync(path.join(animPath, d)).isDirectory());
    
    directions.forEach(dir => {
        const dirPath = path.join(animPath, dir);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png')).sort();
        
        const framePaths = files.map(f => `animations/${anim}/${dir}/${f}`);
        
        // Always enforce so it picks up all frames exactly as they are in the folder
        metadata.frames.animations[anim][dir] = framePaths;
        changed = true;
    });
});

if (changed) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('Metadata updated successfully.');
} else {
    console.log('No metadata changes needed.');
}
