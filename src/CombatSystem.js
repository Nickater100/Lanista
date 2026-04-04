import * as THREE from 'three';
import { Projectile } from './Projectile.js?v=63';
import { StatusEffect, StatusEffectSystem } from './StatusEffectSystem.js?v=1';

export class CombatSystem {
    constructor(scene, envManager, camera) {
        this.scene = scene;
        this.envManager = envManager;
        this.camera = camera;
        this.projectiles = [];
        this.decoys = []; // Señuelos activos de Sombra Seductora
    }

    findTarget(gladiator, entities) {
        let bestTarget = null;
        let minDist = Infinity;

        // Incluir señuelos como objetivos válidos
        const allTargets = [...entities, ...this.decoys.filter(d => !d.isDying && d.health > 0)];

        allTargets.forEach(e => {
            if (e === gladiator || e.isDying || e.teamId === gladiator.teamId) return;
            const d = gladiator.position.distanceTo(e.position);
            if (d < minDist) {
                minDist = d;
                bestTarget = e;
            }
        });
        return bestTarget;
    }

    /**
     * Encuentra enemigos en rango AOE.
     */
    findEnemiesInRange(gladiator, entities, range) {
        const targets = [];
        entities.forEach(e => {
            if (e === gladiator || e.isDying || e.teamId === gladiator.teamId) return;
            const d = gladiator.position.distanceTo(e.position);
            if (d <= range) {
                targets.push(e);
            }
        });
        return targets;
    }

    spawnBlood(pos) {
        const size = 2.0 + Math.random() * 3.0;
        const geo = new THREE.CircleGeometry(size, 8);
        const mat = new THREE.MeshStandardMaterial({ 
            map: this.envManager.bloodTextureBase, 
            transparent: true, 
            opacity: 0.8,
            depthWrite: false, 
            alphaTest: 0.05, 
            roughness: 1.0, 
            metalness: 0.0,
            color: new THREE.Color(0.8 + Math.random() * 0.2, 1, 1) 
        });
        const blood = new THREE.Mesh(geo, mat);
        blood.renderOrder = 1; 
        blood.rotation.x = -Math.PI / 2;
        blood.rotation.z = Math.random() * Math.PI * 2; 
        blood.position.set(pos.x + (Math.random() - 0.5) * 2, -2.75, pos.z + (Math.random() - 0.5) * 2);
        this.scene.add(blood);
    }

    // ==========================================
    // SKILL EFFECT EXECUTION
    // ==========================================

    /**
     * Ejecuta el efecto de Besos del Abismo (lv4).
     * Lanza proyectil de corazón oscuro que aplica debuff CHARM.
     */
    executeSkillLv4(caster, target) {
        const skill = caster.skills.lv4;
        if (!skill || !target) return;

        // Crear proyectil especial de corazón oscuro
        const p = new Projectile(this.scene, caster, target, 0, 'dark_heart');
        
        // Cuando impacta, aplica el debuff (pero no a señuelos)
        p.onHitEffect = (hitTarget) => {
            if (hitTarget.isDecoy) return; // Los señuelos no se pueden charmar
            const effect = new StatusEffect({
                type: 'CHARM',
                duration: skill.effect.duration,
                source: caster,
                params: {
                    damageReduction: skill.effect.damageReduction,
                    attackSpeedReduction: skill.effect.attackSpeedReduction
                },
                onApply: (t) => {
                    console.log(`💋 ${t.name} fue hechizado por Besos del Abismo!`);
                    t.flashColor(0xff69b4, 300); // Flash rosa
                },
                onTick: (t, dt) => {
                    // Efecto visual periódico: flash rosa leve
                    if (Math.random() < 0.05) {
                        t.flashColor(0xff69b4, 50);
                    }
                },
                onExpire: (t) => {
                    console.log(`💋 El hechizo de charm sobre ${t.name} expiró`);
                }
            });
            StatusEffectSystem.apply(hitTarget, effect);
        };

        this.projectiles.push(p);
        console.log(`🔮 ${caster.name} lanza Besos del Abismo!`);
    }

    /**
     * Ejecuta el efecto de Sombra Seductora (lv8).
     * Dash + afterimage señuelo + boost de evasión.
     */
    executeSkillLv8(caster, target, entities) {
        const skill = caster.skills.lv8;
        if (!skill) return;

        // Guardar posición original para el señuelo
        const originalPos = caster.position.clone();

        // Calcular dirección de dash (alejarse del opponent más cercano)
        let dashDir;
        if (target) {
            dashDir = new THREE.Vector3().subVectors(caster.position, target.position).normalize();
        } else {
            // Si no hay target, dash aleatorio
            dashDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        }

        // Ejecutar teleport
        const dashDist = skill.dashDistance || 15;
        caster.position.addScaledVector(dashDir, dashDist);
        caster.sprite.position.copy(caster.position);

        // Aplicar boost de evasión
        const evasionEffect = new StatusEffect({
            type: 'EVASION_BOOST',
            duration: skill.effect.duration,
            source: caster,
            params: {
                evasionBonus: skill.effect.evasionBonus
            },
            onApply: (t) => {
                console.log(`🌀 ${t.name} ganó boost de evasión (+${skill.effect.evasionBonus}%)`);
            },
            onExpire: (t) => {
                console.log(`🌀 Boost de evasión de ${t.name} expiró`);
            }
        });
        StatusEffectSystem.apply(caster, evasionEffect);

        // Crear señuelo (afterimage) en la posición original
        this.spawnDecoy(caster, originalPos, skill.decoy.duration);

        console.log(`🌀 ${caster.name} usó Sombra Seductora! Dash + señuelo creado`);
    }

    /**
     * Crea un señuelo visual que atrae ataques.
     */
    spawnDecoy(caster, position, duration) {
        // Crear un sprite fantasma semi-transparente
        const decoySprite = new THREE.Sprite(new THREE.SpriteMaterial({
            transparent: true,
            alphaTest: 0.1,
            depthWrite: false,
            opacity: 0.6,
            color: new THREE.Color(0x8B00FF) // Tinte púrpura
        }));
        decoySprite.scale.set(5.6, 5.6, 1);
        decoySprite.position.copy(position);
        this.scene.add(decoySprite);

        // Copiar la textura actual del caster
        if (caster.sprite.material.map) {
            decoySprite.material.map = caster.sprite.material.map;
            decoySprite.material.needsUpdate = true;
        }

        // Crear un "falso entity" para que la IA lo targetee
        const decoy = {
            isDecoy: true,
            isDying: false,
            health: 1, // Muere de un golpe
            maxHealth: 1,
            teamId: caster.teamId,
            position: position.clone(),
            sprite: decoySprite,
            name: `${caster.name} (señuelo)`,
            activeEffects: [],
            skills: {},
            skillCooldowns: {},
            level: 0,
            state: 'IDLE',
            velocity: new THREE.Vector3(0, 0, 0),
            strength: 0,
            agility: 0,
            attackCooldown: 999,
            combatType: 'melee',
            frameIndex: 0,
            takeDamage: function(amount) {
                this.health -= amount;
                if (this.health <= 0) {
                    this.isDying = true;
                    this.health = 0;
                }
            },
            // Stubs para que no crashee cuando efectos/proyectiles intentan llamar estos métodos
            flashColor: function() {},
            flashRed: function() {},
            heal: function() {},
            setDirectionFromVector: function() {},
            attack: function() {},
            dodge: function() {},
            celebrate: function() {},
            useSkill: function() {},
            canUseSkill: function() { return false; },
            getCurrentSkillKey: function() { return null; },
            isSkillUnlocked: function() { return false; },
            recalculateStats: function() {},
            update: function() {},
            destroy: function() {
                if (this.sprite && this.sprite.parent) {
                    this.sprite.parent.remove(this.sprite);
                }
            }
        };

        this.decoys.push(decoy);

        // Fade out y destruir después de duration
        let elapsed = 0;
        const fadeInterval = setInterval(() => {
            elapsed += 0.05;
            const progress = elapsed / duration;
            decoySprite.material.opacity = 0.6 * (1 - progress);
            
            if (elapsed >= duration || decoy.isDying) {
                clearInterval(fadeInterval);
                this.scene.remove(decoySprite);
                decoySprite.material.dispose();
                this.decoys = this.decoys.filter(d => d !== decoy);
            }
        }, 50);
    }

    /**
     * Ejecuta el efecto de Dominio del Deseo (lv12).
     * AOE que encanta enemigos cercanos, los inmoviliza y drena vida.
     */
    executeSkillLv12(caster, entities) {
        const skill = caster.skills.lv12;
        if (!skill) return;

        const targets = this.findEnemiesInRange(caster, entities, skill.range)
            .filter(t => !t.isDecoy); // No charmar señuelos
        
        if (targets.length === 0) {
            console.log(`🔥 ${caster.name} usó Dominio del Deseo pero no hay enemigos en rango!`);
            return;
        }

        // Efecto visual: onda expansiva AOE
        this.spawnAOERing(caster.position, skill.range);

        // Aplicar charm a cada enemigo en rango
        targets.forEach(target => {
            const charmEffect = new StatusEffect({
                type: 'CHARMED_ULTIMATE',
                duration: skill.effect.duration,
                source: caster,
                params: {
                    drainPerSecond: skill.effect.drainPerSecond,
                    immobilize: skill.effect.immobilize
                },
                onApply: (t) => {
                    console.log(`🔥 ${t.name} fue dominado por ${caster.name}!`);
                    t.velocity.set(0, 0, 0);
                    t.state = 'IDLE';
                    // Flash magenta
                    t.flashColor(0xFF00FF, 500);
                },
                onTick: (t, dt) => {
                    // Inmovilizar
                    if (skill.effect.immobilize) {
                        t.velocity.set(0, 0, 0);
                        if (t.state === 'RUNNING') t.state = 'IDLE';
                        // Bloquear ataques
                        if (t.state === 'ATTACKING') {
                            t.state = 'IDLE';
                            t.frameIndex = 0;
                        }
                    }

                    // Mirar hacia la succubus
                    if (caster && !caster.isDying) {
                        const lookDir = new THREE.Vector3().subVectors(caster.position, t.position).normalize();
                        t.setDirectionFromVector(lookDir);
                    }

                    // Drenar vida
                    const drain = skill.effect.drainPerSecond * dt;
                    t.takeDamage(drain);
                    
                    // Curar a la caster
                    if (caster && !caster.isDying) {
                        caster.heal(drain);
                    }

                    // Flash visual periódico
                    if (Math.random() < 0.08) {
                        t.flashColor(0xFF00FF, 80);
                    }
                },
                onExpire: (t) => {
                    console.log(`🔥 ${t.name} se liberó del dominio`);
                }
            });

            StatusEffectSystem.apply(target, charmEffect);
        });

        console.log(`🔥 ${caster.name} usó Dominio del Deseo! ${targets.length} enemigos afectados`);
    }

    /**
     * Efecto visual de onda expansiva AOE.
     */
    spawnAOERing(pos, maxRadius) {
        const ringGeo = new THREE.RingGeometry(0.5, 1.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xFF00FF,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, -2.5, pos.z);
        this.scene.add(ring);

        let currentRadius = 0.5;
        const expandSpeed = maxRadius * 2; // Expande en 0.5 seconds
        const expandInterval = setInterval(() => {
            currentRadius += expandSpeed * 0.016; // ~60fps
            ring.scale.set(currentRadius, currentRadius, 1);
            ringMat.opacity -= 0.02;

            if (currentRadius >= maxRadius || ringMat.opacity <= 0) {
                clearInterval(expandInterval);
                this.scene.remove(ring);
                ringGeo.dispose();
                ringMat.dispose();
            }
        }, 16);
    }

    // ==========================================
    // MAIN UPDATE LOOPS
    // ==========================================

    updateGlobal(dt) {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.camera = this.camera; 
            p.update(dt, (target, damage) => {
                if (target.state === 'DODGING') {
                    console.log('DODGED PROJECTILE!');
                } else {
                    if (damage > 0) {
                        target.takeDamage(damage);
                        this.spawnBlood(target.position);
                        console.log(`Spell hit ${target.name} for ${damage}`);
                    }
                    // Ejecutar efecto especial del proyectil (ej: charm de lv4)
                    if (p.onHitEffect) {
                        p.onHitEffect(target);
                    }
                }
            });
            if (p.hasHit) {
                this.projectiles.splice(i, 1);
            }
        }

        // Limpiar señuelos muertos
        this.decoys = this.decoys.filter(d => !d.isDying);
    }

    updateAI(gladiator, entities, dt) {
        if (gladiator.isDying || gladiator.state === 'VICTORY') return;
        if (gladiator.isDecoy) return; // Los señuelos no tienen IA
        
        // Si está bajo charm ultimate, no puede hacer nada
        if (StatusEffectSystem.has(gladiator, 'CHARMED_ULTIMATE')) {
            gladiator.velocity.set(0, 0, 0);
            return;
        }

        const opponent = this.findTarget(gladiator, entities);
        
        if (!opponent) {
            if (gladiator.state !== 'VICTORY') gladiator.celebrate();
            return;
        }

        const dist = gladiator.position.distanceTo(opponent.position);
        const dir = new THREE.Vector3().subVectors(opponent.position, gladiator.position).normalize();
        const attackRange = gladiator.attackRange || 5.0; 

        // === SKILL HIT DETECTION (frame-based, como el ataque normal) ===
        const currentSkillKey = gladiator.getCurrentSkillKey();
        if (currentSkillKey) {
            const skill = gladiator.skills[currentSkillKey];
            if (skill && gladiator.frameIndex === skill.triggerFrame && !gladiator.skillTriggered[currentSkillKey]) {
                gladiator.skillTriggered[currentSkillKey] = true;
                this.triggerSkillEffect(gladiator, currentSkillKey, opponent, entities);
            }
            return; // No hacer nada más mientras ejecuta una skill
        }

        // === NORMAL HIT DETECTION ===
        if (gladiator.state === 'ATTACKING' && (gladiator.frameIndex === 4 || gladiator.frameIndex === 5)) {
            if (!gladiator.hasDealtDamage) {
                if (gladiator.combatType === 'ranged') {
                    const dmg = gladiator.strength + Math.floor(Math.random() * 5);
                    const p = new Projectile(this.scene, gladiator, opponent, dmg);
                    this.projectiles.push(p);
                } else if (dist <= attackRange + 2.0) {
                    if (opponent.state === 'DODGING') {
                        console.log('DODGED!');
                    } else {
                        const dmg = gladiator.strength + Math.floor(Math.random() * 5);
                        opponent.takeDamage(dmg);
                        this.spawnBlood(opponent.position);
                    }
                }
                gladiator.hasDealtDamage = true;
            }
        }

        if (gladiator.state === 'ATTACKING' || gladiator.state === 'DODGING') return;

        // === SKILL AI DECISION (antes del comportamiento normal) ===
        if (this.tryUseSkills(gladiator, opponent, entities, dist)) return;

        // === NORMAL BEHAVIOR ===
        if (dist > attackRange * 1.5) {
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);
        } else if (dist > attackRange && dist <= attackRange * 1.5) { 
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < (gladiator.agility / 100)) {
                gladiator.dodge();
            }
        } else {
            gladiator.velocity.set(0, 0, 0);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < ((gladiator.agility/2) / 100)) {
                gladiator.dodge();
            } else if (gladiator.attackCooldown <= 0) {
                gladiator.attack();
            } else {
                if (gladiator.combatType === 'ranged' && dist < attackRange * 0.5) {
                    gladiator.state = 'RUNNING';
                    gladiator.velocity.copy(dir.clone().negate());
                } else {
                    gladiator.state = 'IDLE';
                }
            }
        }
    }

    /**
     * Intenta usar skills basado en prioridades de IA.
     * Retorna true si se decidió usar una skill.
     */
    tryUseSkills(gladiator, opponent, entities, dist) {
        const skills = gladiator.skills;
        if (!skills || Object.keys(skills).length === 0) return false;

        // Prioridad 1: Ultimate (lv12) si hay ≥2 enemigos en rango
        if (skills.lv12 && gladiator.canUseSkill('lv12')) {
            const enemiesInRange = this.findEnemiesInRange(gladiator, entities, skills.lv12.range);
            if (enemiesInRange.length >= 2) {
                gladiator.setDirectionFromVector(
                    new THREE.Vector3().subVectors(opponent.position, gladiator.position).normalize()
                );
                gladiator.useSkill('lv12');
                return true;
            }
        }

        // Prioridad 2: Escape (lv8) si HP < 40%
        if (skills.lv8 && gladiator.canUseSkill('lv8')) {
            if (gladiator.health < gladiator.maxHealth * 0.4) {
                gladiator.useSkill('lv8');
                return true;
            }
        }

        // Prioridad 3: Debuff (lv4) si hay enemigo en rango y no tiene charm ya
        if (skills.lv4 && gladiator.canUseSkill('lv4')) {
            const range = skills.lv4.range || gladiator.attackRange;
            if (dist <= range && !opponent.isDecoy && !StatusEffectSystem.has(opponent, 'CHARM')) {
                gladiator.setDirectionFromVector(
                    new THREE.Vector3().subVectors(opponent.position, gladiator.position).normalize()
                );
                gladiator.useSkill('lv4');
                return true;
            }
        }

        return false;
    }

    /**
     * Ejecuta el efecto de una skill cuando llega al triggerFrame.
     */
    triggerSkillEffect(gladiator, skillKey, opponent, entities) {
        switch (skillKey) {
            case 'lv4':
                this.executeSkillLv4(gladiator, opponent);
                break;
            case 'lv8':
                this.executeSkillLv8(gladiator, opponent, entities);
                break;
            case 'lv12':
                this.executeSkillLv12(gladiator, entities);
                break;
        }
    }
}
