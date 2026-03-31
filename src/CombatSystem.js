import * as THREE from 'three';

export class CombatSystem {
    constructor(scene, envManager) {
        this.scene = scene;
        this.envManager = envManager;
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

    updateAI(gladiator, entities, dt) {
        if (gladiator.isDying || gladiator.state === 'VICTORY') return;
        
        const opponent = this.findTarget(gladiator, entities);
        
        if (!opponent) {
            if (gladiator.state !== 'VICTORY') gladiator.celebrate();
            return;
        }

        const dist = gladiator.position.distanceTo(opponent.position);
        const dir = new THREE.Vector3().subVectors(opponent.position, gladiator.position).normalize();
        const attackRange = 5.0; 
        const approachRange = 60.0;

        // Hit Detection Logic
        if (gladiator.state === 'ATTACKING' && (gladiator.frameIndex === 4 || gladiator.frameIndex === 5)) {
            if (!gladiator.hasDealtDamage && dist <= attackRange) {
                if (opponent.state === 'DODGING') {
                    console.log('DODGED!');
                } else {
                    const dmg = gladiator.strength + Math.floor(Math.random() * 5);
                    opponent.takeDamage(dmg);
                    this.spawnBlood(opponent.position);
                    console.log(`${gladiator.name} hit ${opponent.name} for ${dmg}`);
                }
                gladiator.hasDealtDamage = true;
            }
        }

        if (gladiator.state === 'ATTACKING' || gladiator.state === 'DODGING') return;

        if (dist > approachRange) {
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);
        } else if (dist <= approachRange && dist > attackRange) {
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < 0.01) {
                gladiator.dodge();
            }
        } else {
            gladiator.velocity.set(0, 0, 0);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < 0.02) {
                gladiator.dodge();
            } else if (gladiator.attackCooldown <= 0) {
                gladiator.attack();
            } else {
                gladiator.state = 'IDLE';
            }
        }
    }
}
