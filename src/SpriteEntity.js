import * as THREE from 'three';
import { UnitDatabase } from './UnitDatabase.js?v=2';
import { StatusEffectSystem } from './StatusEffectSystem.js?v=1';

export class SpriteEntity {
    constructor(assetLoader, scene, audioManager, name = 'Gladiator', teamId = 0) {
        this.assetLoader = assetLoader;
        this.scene = scene;
        this.audioManager = audioManager;
        this.metadata = assetLoader.metadata;
        this.name = name;
        this.teamId = teamId;
        
        // State
        this.state = 'IDLE'; // IDLE, RUNNING, ATTACKING, DODGING, DYING, VICTORY, SKILL_LV4, SKILL_LV8, SKILL_LV12
        this.direction = 'south';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDuration = 0.08;
        
        // Cooldowns (in seconds)
        this.attackCooldown = 0;
        this.dodgeCooldown = 0;
        
        // Transform
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isFlipped = false;
        
        this.className = assetLoader.className;
        const stats = UnitDatabase[this.className] || UnitDatabase['pelado'];

        // Stats from UnitDatabase (base values)
        this.maxHealth = stats.maxHealth;
        this.health = stats.maxHealth;
        this.strength = stats.damage;
        this.baseStrength = stats.damage;
        this.agility = stats.agility;
        this.baseAgility = stats.agility;
        this.speed = stats.speed;
        this.baseSpeed = stats.speed;
        this.attackRange = stats.attackRange;
        this.baseCooldown = stats.attackCooldown;
        this.baseAttackCooldown = stats.attackCooldown;
        this.combatType = stats.type;

        this.hasDealtDamage = false; 
        this.isDying = false;

        // === SKILL SYSTEM ===
        this.level = 12; // Simulamos nivel 12 por ahora (todas las skills desbloqueadas)
        this.skills = stats.skills || {};
        this.skillCooldowns = {};
        this.skillTriggered = {}; // Track if skill effect was triggered this cast
        
        // Inicializar cooldowns de skills en 0
        for (const key in this.skills) {
            this.skillCooldowns[key] = 0;
            this.skillTriggered[key] = false;
        }

        // === STATUS EFFECTS ===
        this.activeEffects = [];

        // === DECOY SYSTEM ===
        this.isDecoy = false; // Si es true, es un señuelo (no un gladiador real)

        // Visuals
        this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
            transparent: true, 
            alphaTest: 0.5,
            depthWrite: false
        }));
        this.sprite.scale.set(5.6, 5.6, 1); 
        this.scene.add(this.sprite);

        this.updateTexture();
        this.hpBar = null;
        this.hpContainer = null;
    }

    /**
     * Verifica si una skill está desbloqueada dado el nivel actual.
     */
    isSkillUnlocked(skillKey) {
        const skill = this.skills[skillKey];
        if (!skill) return false;
        return this.level >= (skill.unlockLevel || 0);
    }

    /**
     * Verifica si una skill está lista para usar (desbloqueada + cooldown listo).
     */
    canUseSkill(skillKey) {
        if (!this.isSkillUnlocked(skillKey)) return false;
        if (this.skillCooldowns[skillKey] > 0) return false;
        if (this.isDying || this.state === 'DYING' || this.state === 'VICTORY') return false;
        // No puede usar skills mientras está en otra animación que no sea IDLE o RUNNING
        if (this.state !== 'IDLE' && this.state !== 'RUNNING') return false;
        // No puede usar skills si está bajo charm ultimate
        if (StatusEffectSystem.has(this, 'CHARMED_ULTIMATE')) return false;
        return true;
    }

    /**
     * Ejecuta una skill. Cambia estado, resetea frame, aplica cooldown.
     */
    useSkill(skillKey) {
        const skill = this.skills[skillKey];
        if (!skill) return;

        const stateMap = { lv4: 'SKILL_LV4', lv8: 'SKILL_LV8', lv12: 'SKILL_LV12' };
        this.state = stateMap[skillKey] || 'IDLE';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.velocity.set(0, 0, 0);
        this.skillCooldowns[skillKey] = skill.cooldown;
        this.skillTriggered[skillKey] = false;
    }

    /**
     * Obtiene la key de la skill actual basándose en el estado.
     */
    getCurrentSkillKey() {
        switch (this.state) {
            case 'SKILL_LV4': return 'lv4';
            case 'SKILL_LV8': return 'lv8';
            case 'SKILL_LV12': return 'lv12';
            default: return null;
        }
    }

    update(dt) {
        // Tick Cooldowns
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;

        // Tick Skill Cooldowns
        for (const key in this.skillCooldowns) {
            if (this.skillCooldowns[key] > 0) {
                this.skillCooldowns[key] -= dt;
            }
        }

        // Tick Status Effects
        StatusEffectSystem.update(this, dt);

        // Recalcular stats efectivos basados en efectos activos
        this.recalculateStats();

        // Si está inmóvil por charm ultimate, forzar velocity 0
        if (StatusEffectSystem.has(this, 'CHARMED_ULTIMATE')) {
            this.velocity.set(0, 0, 0);
        }

        // Simple Physics
        this.position.addScaledVector(this.velocity, dt * this.speed);
        this.sprite.position.copy(this.position);
        
        // Depth sorting
        this.sprite.renderOrder = Math.floor((100 - this.position.z) * 10);
        
        // Animation Loop
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.advanceFrame();
        }
    }

    /**
     * Recalcula stats teniendo en cuenta debuffs/buffs activos.
     */
    recalculateStats() {
        // Resetear a base
        this.strength = this.baseStrength;
        this.agility = this.baseAgility;
        this.baseCooldown = this.baseAttackCooldown;

        if (!this.activeEffects) return;

        for (const effect of this.activeEffects) {
            if (effect.type === 'CHARM' && effect.params) {
                // Charm lv4: reduce daño y velocidad de ataque
                if (effect.params.damageReduction) {
                    this.strength = this.baseStrength * (1 - effect.params.damageReduction);
                }
                if (effect.params.attackSpeedReduction) {
                    this.baseCooldown = this.baseAttackCooldown / (1 - effect.params.attackSpeedReduction);
                }
            }
            if (effect.type === 'EVASION_BOOST' && effect.params) {
                // Boost de evasión
                if (effect.params.evasionBonus) {
                    this.agility = this.baseAgility + effect.params.evasionBonus;
                }
            }
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
            case 'SKILL_LV4':
                animationKey = 'lv4';
                isLooping = false;
                break;
            case 'SKILL_LV8':
                animationKey = 'lv8';
                isLooping = false;
                break;
            case 'SKILL_LV12':
                animationKey = 'lv12';
                isLooping = false;
                break;
            default:
                animationKey = null;
                break;
        }

        if (animationKey) {
            const animGroup = animations[animationKey];
            const frames = animGroup ? animGroup[this.direction] : null;
            
            if (frames) {
                this.frameIndex++;
                if (this.frameIndex >= frames.length) {
                    if (isLooping) {
                        this.frameIndex = 0;
                    } else if (this.state === 'DYING') {
                        this.frameIndex = frames.length - 1;
                    } else {
                        this.state = 'IDLE';
                        this.frameIndex = 0;
                        this.hasDealtDamage = false;
                    }
                }
            } else {
                this.state = 'IDLE';
                this.frameIndex = 0;
                this.hasDealtDamage = false;
            }
        } else {
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
                                 this.state === 'SKILL_LV4' ? 'lv4' :
                                 this.state === 'SKILL_LV8' ? 'lv8' :
                                 this.state === 'SKILL_LV12' ? 'lv12' :
                                 'dodge';
            
            if (animations[animationKey] && animations[animationKey][this.direction]) {
                texturePath = animations[animationKey][this.direction][this.frameIndex];
            } else {
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

        const angle = Math.atan2(vec.x, vec.z); 
        const sector = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
        
        const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
        this.direction = directions[sector];
        
        if (this.state === 'IDLE') {
            this.updateTexture();
        }
    }

    attack() {
        if (this.state === 'ATTACKING' || this.state === 'DODGING' || this.attackCooldown > 0 || this.isDying) return;
        if (this.state.startsWith('SKILL_')) return; // No atacar mientras usa skill
        if (StatusEffectSystem.has(this, 'CHARMED_ULTIMATE')) return; // No puede atacar bajo charm
        
        this.state = 'ATTACKING';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.attackCooldown = this.baseCooldown;
        this.hasDealtDamage = false;
        
        if (this.audioManager) this.audioManager.play('slash', 0.3);
    }

    dodge() {
        if (this.state === 'ATTACKING' || this.state === 'DODGING' || this.dodgeCooldown > 0 || this.isDying) return;
        if (this.state.startsWith('SKILL_')) return;
        if (StatusEffectSystem.has(this, 'CHARMED_ULTIMATE')) return;
        
        this.state = 'DODGING';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.dodgeCooldown = 2.0;
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

    /**
     * Cura HP (usado por drain de vida del ultimate).
     */
    heal(amount) {
        if (this.isDying) return;
        this.health = Math.min(this.health + amount, this.maxHealth);
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

    flashColor(hexColor, durationMs = 100) {
        const originalColor = this.sprite.material.color.clone();
        this.sprite.material.color.set(hexColor);
        setTimeout(() => {
            if (this.sprite.material) {
                this.sprite.material.color.copy(originalColor);
            }
        }, durationMs);
    }

    die() {
        if (this.isDying) return;
        this.isDying = true;
        this.state = 'DYING'; 
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.velocity.set(0, 0, 0);

        // Limpiar todos los efectos al morir
        StatusEffectSystem.clearAll(this);
        
        if (this.audioManager) {
            this.audioManager.play('death', 0.6);
            this.audioManager.playVictory();
        }

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
        }, 5000);
    }

    destroy() {
        this.scene.remove(this.sprite);
        this.sprite.material.dispose();
    }
}
