import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js';
import { SpriteEntity } from './SpriteEntity.js';

class ArenaGame {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // Nearest Filter looks better with no antialiasing
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x1a1a1a);
        document.body.appendChild(this.renderer.domElement);

        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(20, 20, 20); // Isometric perspective
        this.camera.lookAt(0, 0, 0);

        this.scene = new THREE.Scene();
        
        // Arena Floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.8; // Slightly below sprites
        this.scene.add(floor);

        // Simple grid for sense of space
        const grid = new THREE.GridHelper(100, 20, 0x444444, 0x333333);
        grid.position.y = -2.7;
        this.scene.add(grid);

        this.assetLoader = new AssetLoader();
        this.entities = [];
        this.isRunning = false;

        this.init();
        
        window.addEventListener('resize', () => this.onResize());
    }

    async init() {
        await this.assetLoader.loadMetadata();
        await this.assetLoader.preloadEssential();
        
        // Player
        this.player = new SpriteEntity(this.assetLoader, this.scene);
        this.player.position.set(-25, 0, 0);
        this.player.setDirectionFromVector(new THREE.Vector3(1, 0, 0));
        this.entities.push(this.player);

        // Enemy (AI)
        this.enemy = new SpriteEntity(this.assetLoader, this.scene);
        this.enemy.position.set(25, 0, 0);
        this.enemy.setDirectionFromVector(new THREE.Vector3(-1, 0, 0));
        this.entities.push(this.enemy);

        this.isRunning = true;
        this.animate();
    }

    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(dt) {
        if (!this.isRunning) return;

        // Unified Combat AI for all entities
        this.entities.forEach(gladiator => {
            const opponent = this.entities.find(e => e !== gladiator);
            this.updateGladiatorAI(gladiator, opponent, dt);
            gladiator.update(dt);
        });
    }

    updateGladiatorAI(gladiator, opponent, dt) {
        if (gladiator.state === 'ATTACKING' || gladiator.state === 'DODGING') return;

        const dist = gladiator.position.distanceTo(opponent.position);
        const dir = new THREE.Vector3().subVectors(opponent.position, gladiator.position).normalize();

        const attackRange = 3.5; // Slightly larger for better visual match
        const approachRange = 60.0; // Far enough for extreme starts

        if (dist > approachRange) {
            // Target is far, approach
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);
        } else if (dist <= approachRange && dist > attackRange) {
            // In approach zone, keep moving or dodge if opponent is attacking
            gladiator.state = 'RUNNING';
            gladiator.velocity.copy(dir);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < 0.05) {
                gladiator.dodge();
            }
        } else {
            // In combat range
            gladiator.velocity.set(0, 0, 0);
            gladiator.setDirectionFromVector(dir);

            if (opponent.state === 'ATTACKING' && Math.random() < 0.15) {
                gladiator.dodge();
            } else if (gladiator.attackCooldown <= 0) {
                gladiator.attack();
            } else {
                gladiator.state = 'IDLE';
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        const clock = new THREE.Clock();
        const loop = () => {
            requestAnimationFrame(loop);
            const dt = clock.getDelta();
            this.update(dt);
            this.render();
        };
        loop();
    }
}

new ArenaGame();
