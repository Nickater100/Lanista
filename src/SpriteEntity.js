import * as THREE from 'three';

export class SpriteEntity {
    constructor(assetLoader, scene) {
        this.assetLoader = assetLoader;
        this.scene = scene;
        this.metadata = assetLoader.metadata;
        
        // State
        this.state = 'IDLE'; // IDLE, RUNNING, ATTACKING, DODGING
        this.direction = 'south'; // south, north, east, west, etc.
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDuration = 0.08; // Slightly faster for combat feel
        
        // Cooldowns (in seconds)
        this.attackCooldown = 0;
        this.dodgeCooldown = 0;
        
        // Transform
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.speed = 5.0; // Faster for less wait time
        this.isFlipped = false;
        
        // Stats
        this.maxHealth = 100;
        this.health = 100;
        this.strength = 15;
        this.agility = 10; // % chance to auto-dodge
        this.hasDealtDamage = false; // To prevent multi-hits in one swing
        this.isDying = false;

        // Visuals
        this.sprite = new THREE.Sprite();
        // Base size is 56x56, we'll scale it to reasonable world units.
        this.sprite.scale.set(5.6, 5.6, 1); 
        this.scene.add(this.sprite);

        this.updateTexture();
    }

    update(dt) {
        // Tick Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

        // Simple Physics
        this.position.addScaledVector(this.velocity, dt * this.speed);
        this.sprite.position.copy(this.position);
        
        // Animation Loop
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.advanceFrame();
        }
    }

    advanceFrame() {
        const animations = this.metadata.frames.animations;
        let animationKey = null;
        let isLooping = true;

        switch (this.state) {
            case 'RUNNING':
                animationKey = 'running-4-frames';
                break;
            case 'ATTACKING':
                animationKey = 'custom-fast sword slash, quick horizo';
                isLooping = false;
                break;
            case 'DODGING':
                animationKey = 'custom-backward dodge jump, quick lea';
                isLooping = false;
                break;
            default:
                // IDLE
                animationKey = null;
                break;
        }

        if (animationKey) {
            const frames = animations[animationKey][this.direction];
            if (frames) {
                this.frameIndex++;
                if (this.frameIndex >= frames.length) {
                    if (isLooping) {
                        this.frameIndex = 0;
                    } else {
                        // Return to IDLE after non-looping animation
                        this.state = 'IDLE';
                        this.frameIndex = 0;
                        this.hasDealtDamage = false; // Reset for next attack
                    }
                }
            }
        } else {
            // IDLE: static frame
            this.frameIndex = 0;
        }

        this.updateTexture();
    }

    updateTexture() {
        const rotations = this.metadata.frames.rotations;
        const animations = this.metadata.frames.animations;
        let texturePath = '';

        if (this.state === 'IDLE') {
            texturePath = rotations[this.direction];
        } else {
            const animationKey = this.state === 'RUNNING' ? 'running-4-frames' :
                                 this.state === 'ATTACKING' ? 'custom-fast sword slash, quick horizo' :
                                 'custom-backward dodge jump, quick lea';
            
            const dirFrames = animations[animationKey][this.direction];
            if (dirFrames) {
                texturePath = dirFrames[this.frameIndex];
            } else {
                // Fallback to idle if animation direction is missing
                texturePath = rotations[this.direction];
            }
        }

        const texture = this.assetLoader.getTexture(texturePath);
        if (texture) {
            this.sprite.material.map = texture;
            this.sprite.material.needsUpdate = true;
        }
    }

    setDirectionFromVector(vec) {
        if (vec.lengthSq() < 0.001) return;

        // In Three.js: +X is East, +Z is South
        // atan2(x, z) gives 0 at South, PI/2 at East, PI at North, -PI/2 at West
        const angle = Math.atan2(vec.x, vec.z); 
        const sector = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
        
        // Correct 8-direction mapping based on Math.atan2(x, z)
        const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
        this.direction = directions[sector];
        
        if (this.state === 'IDLE') {
            this.updateTexture();
        }
    }

    attack() {
        if (this.state === 'ATTACKING' || this.state === 'DODGING' || this.attackCooldown > 0 || this.isDying) return;
        this.state = 'ATTACKING';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.attackCooldown = 1.2; // Attack every 1.2s max
        this.hasDealtDamage = false;
    }

    dodge() {
        if (this.state === 'ATTACKING' || this.state === 'DODGING' || this.dodgeCooldown > 0 || this.isDying) return;
        this.state = 'DODGING';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.dodgeCooldown = 2.0; // Dodge every 2s max
    }

    takeDamage(amount) {
        if (this.isDying) return;
        
        this.health -= amount;
        this.flashRed();
        
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    flashRed() {
        const originalColor = this.sprite.material.color.clone();
        this.sprite.material.color.set(0xff0000);
        setTimeout(() => {
            if (this.sprite.material) {
                this.sprite.material.color.copy(originalColor);
            }
        }, 100);
    }

    die() {
        this.isDying = true;
        this.state = 'IDLE'; // Stop all actions
        this.velocity.set(0, 0, 0);
        
        // Simple fade out
        let opacity = 1.0;
        const interval = setInterval(() => {
            opacity -= 0.1;
            this.sprite.material.opacity = opacity;
            this.sprite.material.transparent = true;
            if (opacity <= 0) {
                clearInterval(interval);
                this.destroy();
            }
        }, 50);
    }

    destroy() {
        this.scene.remove(this.sprite);
        this.sprite.material.dispose();
    }
}
