import * as THREE from 'three';

export class Projectile {
    // We repurpose Projectile to act as an instant Laser Beam
    constructor(scene, attacker, target, damage) {
        this.scene = scene;
        this.attacker = attacker;
        this.target = target;
        this.damage = damage;

        const start = attacker.position.clone();
        start.y -= 0.5; // hand height (center is at 0, feet at -2.75, hand is slightly below center)
        const end = target.position.clone();
        end.y -= 0.2; // torso height

        const distance = start.distanceTo(end);
        
        this.mesh = new THREE.Group();

        // Material for the lightning
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x8A2BE2, // True Violet (Blue-Violet)
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        // Construct 6 jagged segments for the lightning bolt
        const numSegments = 6;
        const segmentLen = distance / numSegments;
        const mainDir = new THREE.Vector3().subVectors(end, start).normalize();
        
        // Find perpendicular vectors to offset the zig-zags
        const perp1 = new THREE.Vector3(-mainDir.z, 0, mainDir.x).normalize();
        const perp2 = new THREE.Vector3(0, 1, 0); 
        
        let lastPoint = start.clone();
        for (let i = 1; i <= numSegments; i++) {
            let nextPoint;
            if (i === numSegments) {
                nextPoint = end.clone();
            } else {
                nextPoint = start.clone().addScaledVector(mainDir, segmentLen * i);
                // Introduce random jagged offsets
                nextPoint.addScaledVector(perp1, (Math.random() - 0.5) * 4.0);
                nextPoint.addScaledVector(perp2, (Math.random() - 0.5) * 4.0);
            }

            const d = lastPoint.distanceTo(nextPoint);
            const segGeo = new THREE.CylinderGeometry(0.04, 0.04, d, 4); // Much thinner bolts
            segGeo.rotateX(Math.PI / 2);
            
            const segMesh = new THREE.Mesh(segGeo, mat);
            const mid = new THREE.Vector3().addVectors(lastPoint, nextPoint).multiplyScalar(0.5);
            segMesh.position.copy(mid);
            segMesh.lookAt(nextPoint);
            
            this.mesh.add(segMesh);
            lastPoint = nextPoint;
        }

        // Add a glow light at the impact point
        this.light = new THREE.PointLight(0x8A2BE2, 4, 20);
        this.light.position.copy(end); 
        this.mesh.add(this.light);

        this.scene.add(this.mesh);

        // Control variables
        this.hasHit = false;
        this.lifeTime = 0.4; // The beam lingers for 0.4 seconds before vanishing
        
        // Deal damage instantly!
        this.instantHit = true; 
    }

    update(dt, onHitCallback) {
        if (this.instantHit) {
            this.instantHit = false;
            // Instantly apply damage on the first frame
            if (this.target && !this.target.isDying) {
                onHitCallback(this.target, this.damage);
            }
        }

        // Fade out & Strobe effect for lightning
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.destroy();
        } else {
            // Flicker opacity wildly like an electrical arc
            const strobeOpacity = (Math.random() * 0.7 + 0.3) * (this.lifeTime * 2.25);
            this.mesh.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = strobeOpacity;
                }
            });
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        // Clean up group
        this.mesh.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        this.hasHit = true; 
    }
}
