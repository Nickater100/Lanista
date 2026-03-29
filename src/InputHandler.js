import * as THREE from 'three';

export class InputHandler {
    constructor() {
        this.keys = {};
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    update() {
        this.velocity.set(0, 0, 0);

        // Move
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.velocity.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.velocity.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.velocity.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.velocity.x += 1;

        if (this.velocity.lengthSq() > 0) {
            this.velocity.normalize();
        }

        return {
            velocity: this.velocity,
            attack: this.keys['Space'],
            dodge: this.keys['ShiftLeft'] || this.keys['ShiftRight']
        };
    }
}
