import * as THREE from 'three';
import { Projectile } from './Projectile.js?v=62';

export class CombatSystem {
    constructor(scene, envManager, camera) {
        this.scene = scene;
        this.envManager = envManager;
        this.camera = camera;
        this.projectiles = [];
    }

    findTarget(gladiator, entities) {
        let bestTarget = null;
        let minDist = Infinity;

        entities.forEach(e => {
            if (e === gladiator || e.isDying || e.teamId === gladiator.teamId) return;
            const d = gladiator.position.distanceTo(e.position);
            if (d < minDist) {
                minDist = d;
                bestTarget = e;
            }
        });
        return bestTarget;
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

    updateGlobal(dt) {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.camera = this.camera; 
            p.update(dt, (target, damage) => {
                if (target.state === 'DODGING') {
                    console.log('DODGED PROJECTILE!');
                } else {
                    target.takeDamage(damage);
                    this.spawnBlood(target.position);
                    console.log(`Spell hit ${target.name} for ${damage}`);
                }
            });
            if (p.hasHit) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateAI(gladiator, entities, dt) {
        if (gladiator.isDying || gladiator.state === 'VICTORY') return;
        
        const opponent = this.findTarget(gladiator, entities);
        
        if (!opponent) {
            if (gladiator.state !== 'VICTORY') gladiator.celebrate();
            return;
        }

        const dist = gladiator.position.distanceTo(opponent.position);
        const dir = new THREE.Vector3().subVectors(opponent.position, gladiator.position).normalize();
        const attackRange = gladiator.attackRange || 5.0; 

        // Hit Detection Logic Layer
        if (gladiator.state === 'ATTACKING' && (gladiator.frameIndex === 4 || gladiator.frameIndex === 5)) {
            if (!gladiator.hasDealtDamage) {
                if (gladiator.combatType === 'ranged') {
                    const dmg = gladiator.strength + Math.floor(Math.random() * 5);
                    const p = new Projectile(this.scene, gladiator, opponent, dmg);
                    this.projectiles.push(p);
                    console.log(`${gladiator.name} casted a spell!`);
                } else if (dist <= attackRange + 2.0) { // Slight hit leniency
                    if (opponent.state === 'DODGING') {
                        console.log('DODGED!');
                    } else {
                        const dmg = gladiator.strength + Math.floor(Math.random() * 5);
                        opponent.takeDamage(dmg);
                        this.spawnBlood(opponent.position);
                        console.log(`${gladiator.name} hit ${opponent.name} for ${dmg}`);
                    }
                }
                gladiator.hasDealtDamage = true;
            }
        }

        if (gladiator.state === 'ATTACKING' || gladiator.state === 'DODGING') return;

        if (dist > attackRange * 1.5) { // Run towards enemy if out of range widely
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);
        } else if (dist > attackRange && dist <= attackRange * 1.5) { 
            // In the approach zone
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < (gladiator.agility / 100)) {
                gladiator.dodge();
            }
        } else {
            // In attack range
            gladiator.velocity.set(0, 0, 0); // Stop moving
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < ((gladiator.agility/2) / 100)) {
                gladiator.dodge();
            } else if (gladiator.attackCooldown <= 0) {
                gladiator.attack();
            } else {
                // If waiting for cooldown, ranged could kite, but melee waits.
                if (gladiator.combatType === 'ranged' && dist < attackRange * 0.5) {
                    // Kiting (moving back)
                    gladiator.state = 'RUNNING';
                    gladiator.velocity.copy(dir.clone().negate());
                } else {
                    gladiator.state = 'IDLE';
                }
            }
        }
    }
}
