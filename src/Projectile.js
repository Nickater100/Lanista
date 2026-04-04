import * as THREE from 'three';

export class Projectile {
    /**
     * @param {THREE.Scene} scene
     * @param {SpriteEntity} attacker
     * @param {SpriteEntity} target
     * @param {number} damage
     * @param {string} projectileType - 'lightning' (default) or 'dark_heart'
     */
    constructor(scene, attacker, target, damage, projectileType = 'lightning') {
        this.scene = scene;
        this.attacker = attacker;
        this.target = target;
        this.damage = damage;
        this.projectileType = projectileType;
        this.onHitEffect = null; // Callback para efectos adicionales al impactar

        const start = attacker.position.clone();
        start.y -= 0.5;
        const end = target.position.clone();
        end.y -= 0.2;

        this.mesh = new THREE.Group();
        this.hasHit = false;

        if (projectileType === 'dark_heart') {
            this.buildDarkHeart(start, end);
            this.instantHit = false; // El corazón viaja
            this.travelSpeed = 30;
            this.currentPos = start.clone();
            this.targetPos = end.clone();
            this.lifeTime = 3.0; // Max lifetime
        } else {
            this.buildLightning(start, end);
            this.instantHit = true;
            this.lifeTime = 0.4;
        }

        this.scene.add(this.mesh);
    }

    /**
     * Rayo eléctrico violeta (ataque básico ranged).
     */
    buildLightning(start, end) {
        const distance = start.distanceTo(end);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x8A2BE2,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const numSegments = 6;
        const segmentLen = distance / numSegments;
        const mainDir = new THREE.Vector3().subVectors(end, start).normalize();
        const perp1 = new THREE.Vector3(-mainDir.z, 0, mainDir.x).normalize();
        const perp2 = new THREE.Vector3(0, 1, 0); 
        
        let lastPoint = start.clone();
        for (let i = 1; i <= numSegments; i++) {
            let nextPoint;
            if (i === numSegments) {
                nextPoint = end.clone();
            } else {
                nextPoint = start.clone().addScaledVector(mainDir, segmentLen * i);
                nextPoint.addScaledVector(perp1, (Math.random() - 0.5) * 4.0);
                nextPoint.addScaledVector(perp2, (Math.random() - 0.5) * 4.0);
            }

            const d = lastPoint.distanceTo(nextPoint);
            const segGeo = new THREE.CylinderGeometry(0.04, 0.04, d, 4);
            segGeo.rotateX(Math.PI / 2);
            
            const segMesh = new THREE.Mesh(segGeo, mat);
            const mid = new THREE.Vector3().addVectors(lastPoint, nextPoint).multiplyScalar(0.5);
            segMesh.position.copy(mid);
            segMesh.lookAt(nextPoint);
            
            this.mesh.add(segMesh);
            lastPoint = nextPoint;
        }

        this.light = new THREE.PointLight(0x8A2BE2, 4, 20);
        this.light.position.copy(end); 
        this.mesh.add(this.light);
    }

    /**
     * Proyectil corazón oscuro (Besos del Abismo - lv4).
     * Esfera magenta/rosa que viaja hacia el objetivo.
     */
    buildDarkHeart(start, end) {
        // Esfera principal
        const sphereGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xFF1493, // Deep Pink
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        this.coreMesh = new THREE.Mesh(sphereGeo, sphereMat);
        this.mesh.add(this.coreMesh);

        // Halo exterior
        const haloGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0xFF69B4, // Hot Pink
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
        this.mesh.add(this.haloMesh);

        // Luz puntual
        this.light = new THREE.PointLight(0xFF1493, 3, 15);
        this.mesh.add(this.light);

        // Posicionar en el inicio
        this.mesh.position.copy(start);
    }

    update(dt, onHitCallback) {
        if (this.projectileType === 'dark_heart') {
            this.updateDarkHeart(dt, onHitCallback);
        } else {
            this.updateLightning(dt, onHitCallback);
        }
    }

    updateLightning(dt, onHitCallback) {
        if (this.instantHit) {
            this.instantHit = false;
            if (this.target && !this.target.isDying) {
                onHitCallback(this.target, this.damage);
            }
        }

        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.destroy();
        } else {
            const strobeOpacity = (Math.random() * 0.7 + 0.3) * (this.lifeTime * 2.25);
            this.mesh.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = strobeOpacity;
                }
            });
        }
    }

    updateDarkHeart(dt, onHitCallback) {
        if (this.hasHit) return;

        // Mover hacia el target
        const targetPos = this.target.position.clone();
        targetPos.y -= 0.2;
        
        const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
        this.mesh.position.addScaledVector(dir, this.travelSpeed * dt);

        // Pulsar el halo
        const pulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.2;
        if (this.haloMesh) {
            this.haloMesh.scale.set(pulse, pulse, pulse);
        }

        // Rotar ligeramente
        this.mesh.rotation.y += dt * 3;

        // Verificar impacto
        const dist = this.mesh.position.distanceTo(targetPos);
        if (dist < 1.5) {
            // Impactó
            if (this.target && !this.target.isDying) {
                onHitCallback(this.target, this.damage);
            }
            this.destroy();
        }

        // Timeout
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        this.hasHit = true; 
    }
}
