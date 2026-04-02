import * as THREE from 'three';

export class LayeredSpriteInspector {
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.metadata = assetLoader.metadata;
        
        // This group acts exactly like the 1 gladiator container
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Core State
        this.animationKey = 'IDLE';
        this.direction = 'south';
        this.frameIndex = 0;
        this.frameTimer = 0;
        
        // Settings
        this.speedMultiplier = 1.0;
        this.baseFrameDuration = 0.08;

        // Layer Pipeline initialization
        this.layers = [
            { id: 'base_body', sprite: this.createSprite(0) }
        ];

        this.hasTestArmor = false;
        
        this.updateTextures();
    }

    createSprite(renderOrderOffset) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
            transparent: true, 
            alphaTest: 0.5,
            depthWrite: false
        }));
        // Scale by 10 to make it huge and easy to inspect in the viewer
        sprite.scale.set(10, 10, 1); 
        // Force the draw order: 50 is base skin, 51 is clothes, 52 is weapon
        sprite.renderOrder = 50 + renderOrderOffset;
        this.group.add(sprite);
        return sprite;
    }

    toggleTestArmor() {
        this.hasTestArmor = !this.hasTestArmor;
        if (this.hasTestArmor) {
            // Append a new sprite mimicking modular armor
            const testLayer = this.createSprite(1); // Drawn perfectly ON TOP
            // Apply a red tint overlay since we don't have armor PNGs yet.
            // When real armor PNGs arrive, we just don't color it and we load the armor PNG Instead.
            testLayer.material.color.set(0xff0000);
            testLayer.material.opacity = 0.5;
            this.layers.push({ id: 'test_armor', sprite: testLayer });
        } else {
            // Remove the specific armor layer
            const testLayerObj = this.layers.find(l => l.id === 'test_armor');
            if (testLayerObj) {
                this.group.remove(testLayerObj.sprite);
                testLayerObj.sprite.material.dispose();
                this.layers = this.layers.filter(l => l.id !== 'test_armor');
            }
        }
        this.updateTextures();
        return this.hasTestArmor;
    }

    setDirection(dir) {
        this.direction = dir;
        this.updateTextures();
    }

    setAnimation(anim) {
        this.animationKey = anim;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.updateTextures();
    }

    setSpeed(mult) {
        this.speedMultiplier = mult;
    }

    update(dt) {
        if (this.animationKey === 'IDLE') return;

        this.frameTimer += dt * this.speedMultiplier;
        if (this.frameTimer >= this.baseFrameDuration) {
            this.frameTimer -= this.baseFrameDuration; 
            this.advanceFrame();
        }
    }

    advanceFrame() {
        const animations = this.metadata.frames.animations;
        const frames = animations[this.animationKey] ? animations[this.animationKey][this.direction] : null;

        if (frames && frames.length > 0) {
            this.frameIndex++;
            if (this.frameIndex >= frames.length) {
                this.frameIndex = 0; // Viewers should loop everything to make inspecting easy
            }
        } else {
            this.frameIndex = 0;
        }

        this.updateTextures();
    }

    updateTextures() {
        const rotations = this.metadata.frames.rotations;
        const animations = this.metadata.frames.animations;
        
        let targetTexturePath = '';

        if (this.animationKey === 'IDLE') {
            targetTexturePath = rotations[this.direction];
        } else {
            const dirFrames = animations[this.animationKey] ? animations[this.animationKey][this.direction] : null;
            if (dirFrames) {
                targetTexturePath = dirFrames[this.frameIndex];
            } else {
                targetTexturePath = rotations[this.direction];
            }
        }

        if (!targetTexturePath) return;

        // Apply visual texture updates to EVERY active layer.
        // Because "Armadura" uses exactly the same layout constraints and frame timing as "Personaje_base"
        // we can apply the exact same frame path (south-east/frame_004.png) to all layers.
        // 
        // Right now AssetLoader defaults to /Personaje_base/. In the production combat system,
        // we will adapt AssetLoader to take the base path as an argument.
        
        const texture = this.assetLoader.getTexture(targetTexturePath);
        if (texture) {
            this.layers.forEach(layer => {
                layer.sprite.material.map = texture;
                layer.sprite.material.needsUpdate = true;
            });
        }
    }
}
