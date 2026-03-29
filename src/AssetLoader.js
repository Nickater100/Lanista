import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.basePath = './Lanista-arena/Personaje_base/';
        this.cache = new Map();
    }

    async loadMetadata() {
        const response = await fetch(`${this.basePath}metadata.json`);
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

        // Load running animation frames (essential for movement)
        const running = this.metadata.frames.animations['running-4-frames'];
        for (const dir in running) {
            running[dir].forEach(framePath => {
                framesToLoad.push(this.loadTexture(framePath));
            });
        }

        // Load combat frames
        const attack = this.metadata.frames.animations['custom-fast sword slash, quick horizo'];
        for (const dir in attack) {
            attack[dir].forEach(framePath => {
                framesToLoad.push(this.loadTexture(framePath));
            });
        }

        const dodge = this.metadata.frames.animations['custom-backward dodge jump, quick lea'];
        for (const dir in dodge) {
            dodge[dir].forEach(framePath => {
                framesToLoad.push(this.loadTexture(framePath));
            });
        }

        await Promise.all(framesToLoad);
        console.log(`Preloaded ${this.cache.size} textures.`);
    }

    getTexture(path) {
        return this.cache.get(path);
    }
}
