import * as THREE from 'three';

export class SpriteEntity {
    constructor(assetLoader, scene, audioManager, name = 'Gladiator', teamId = 0) {
        this.assetLoader = assetLoader;
        this.scene = scene;
        this.audioManager = audioManager;
        this.metadata = assetLoader.metadata;
        this.name = name;
        this.teamId = teamId;
        
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
        this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
            transparent: true, 
            alphaTest: 0.5,
            depthWrite: false
        }));
        // Base size is 56x56, we'll scale it to reasonable world units.
        this.sprite.scale.set(5.6, 5.6, 1); 
        this.scene.add(this.sprite);

        this.updateTexture();
        this.hpBar = null;
        this.hpContainer = null;
    }

    update(dt) {
        // Tick Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

        // Simple Physics
        this.position.addScaledVector(this.velocity, dt * this.speed);
        this.sprite.position.copy(this.position);
        
        // Depth sorting every frame based on position
        this.sprite.renderOrder = Math.floor((100 - this.position.z) * 10);
        
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
                animationKey = 'run';
                break;
            case 'ATTACKING':
                animationKey = 'attack_fast';
                isLooping = false;
                break;
            case 'DODGING':
                animationKey = 'dodge';
                isLooping = false;
                break;
            case 'DYING':
                animationKey = 'die';
                isLooping = false;
                break;
            case 'VICTORY':
                animationKey = 'cheer';
                isLooping = true;
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
                    } else if (this.state === 'DYING') {
                        // Stay on the last frame of death
                        this.frameIndex = frames.length - 1;
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
            const animationKey = this.state === 'RUNNING' ? 'run' :
                                 this.state === 'ATTACKING' ? 'attack_fast' :
                                 this.state === 'DYING' ? 'die' :
                                 this.state === 'VICTORY' ? 'cheer' :
                                 'dodge';
            
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
            this.sprite.material.alphaTest = 0.5;
            this.sprite.material.depthWrite = false;
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
        
        if (this.audioManager) this.audioManager.play('slash', 0.3);
    }

    dodge() {
        if (this.state === 'ATTACKING' || this.state === 'DODGING' || this.dodgeCooldown > 0 || this.isDying) return;
        this.state = 'DODGING';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.dodgeCooldown = 2.0; // Dodge every 2s max
    }

    celebrate() {
        if (this.isDying) return;
        this.state = 'VICTORY';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.velocity.set(0, 0, 0);
    }

    takeDamage(amount) {
        if (this.isDying) return;
        
        this.health -= amount;
        this.flashRed();
        
        if (this.audioManager) this.audioManager.play('hit', 0.5);

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
        if (this.isDying) return;
        this.isDying = true;
        this.state = 'DYING'; 
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.velocity.set(0, 0, 0);
        
        if (this.audioManager) {
            this.audioManager.play('death', 0.6);
            this.audioManager.playVictory();
        }

        // Optional: fade out after a long delay
        setTimeout(() => {
            let opacity = 1.0;
            const interval = setInterval(() => {
                opacity -= 0.05;
                this.sprite.material.opacity = opacity;
                this.sprite.material.transparent = true;
                if (opacity <= 0) {
                    clearInterval(interval);
                    this.destroy();
                }
            }, 50);
        }, 5000); // 5 seconds of lying on the ground
    }

    destroy() {
        this.scene.remove(this.sprite);
        this.sprite.material.dispose();
    }
}
