import * as THREE from 'three';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.bloodTextureBase = this.createBloodTexture();
    }

    setupEnvironment() {
        // Floor
        const sandTexture = this.createSandTexture();
        const floorGeometry = new THREE.CircleGeometry(50, 64);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: sandTexture,
            color: 0xffffff, 
            roughness: 0.9
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.8;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const stoneTexture = this.createStoneTexture();
        const wallGeometry = new THREE.CylinderGeometry(51, 51, 10, 64, 1, true); 
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            map: stoneTexture,
            side: THREE.BackSide,
            color: 0xaaaaaa 
        });
        const walls = new THREE.Mesh(wallGeometry, wallMaterial);
        walls.position.y = 2.2; 
        this.scene.add(walls);

        const outerWallGeo = new THREE.CylinderGeometry(52, 52, 10, 64, 1, true);
        const outerWallMat = new THREE.MeshStandardMaterial({ map: stoneTexture, side: THREE.FrontSide, color: 0x666666 });
        const outerWaves = new THREE.Mesh(outerWallGeo, outerWallMat);
        outerWaves.position.y = 2.2;
        this.scene.add(outerWaves);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7); 
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(20, 50, 30);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        
        // Fog
        this.scene.fog = new THREE.Fog(0x1a1a1a, 60, 150);
    }

    createSandTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#dbb07b';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#d4a36a' : '#e4bc8c';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10);
        return tex;
    }

    createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 4;
        for (let y = 0; y < 512; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
            const offset = (y / 64) % 2 === 0 ? 0 : 64;
            for (let x = 0; x < 512; x += 128) {
                ctx.beginPath();
                ctx.moveTo(x + offset, y);
                ctx.lineTo(x + offset, y + 64);
                ctx.stroke();
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(20, 1);
        return tex;
    }

    createBloodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);
        ctx.fillStyle = '#8B0000'; 
        for (let i = 0; i < 15; i++) {
            const x = 64 + (Math.random() - 0.5) * 60;
            const y = 64 + (Math.random() - 0.5) * 60;
            const r = 2 + Math.random() * 20;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        return new THREE.CanvasTexture(canvas);
    }
}
