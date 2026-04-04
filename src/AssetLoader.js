import * as THREE from 'three';

export class AssetLoader {
    constructor(className = 'pelado') {
        this.className = className;
        this.textureLoader = new THREE.TextureLoader();
        this.basePath = `./Lanista-arena/personajes/${className}/`;
        this.cache = new Map();
    }

    async loadMetadata() {
        const response = await fetch(`${this.basePath}metadata.json?v=${Date.now()}`);
        this.metadata = await response.json();
        return this.metadata;
    }

    async loadTexture(path) {
        if (this.cache.has(path)) return this.cache.get(path);

        return new Promise((resolve) => {
            this.textureLoader.load(`${this.basePath}${path}`, (texture) => {
                // Keep pixel art crisp
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.colorSpace = THREE.SRGBColorSpace;
                this.cache.set(path, texture);
                resolve(texture);
            });
        });
    }

    // Preload essential frames for a faster prototype
    async preloadEssential() {
        const framesToLoad = [];
        
        // Load all 8 directions (base rotations)
        for (const direction in this.metadata.frames.rotations) {
            framesToLoad.push(this.loadTexture(this.metadata.frames.rotations[direction]));
        }

        // Load ALL animation frames dynamically from metadata
        const animations = this.metadata.frames.animations;
        for (const animKey in animations) {
            const animGroup = animations[animKey];
            for (const dir in animGroup) {
                animGroup[dir].forEach(framePath => {
                    framesToLoad.push(this.loadTexture(framePath));
                });
            }
        }

        await Promise.all(framesToLoad);
        console.log(`Preloaded ${this.cache.size} textures for ${this.className}.`);
    }

    getTexture(path) {
        return this.cache.get(path);
    }
}
