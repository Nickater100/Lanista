import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js?v=38';
import { SpriteEntity } from './SpriteEntity.js?v=38';
import { AudioManager } from './AudioManager.js?v=38';

console.log('Lanista Arena v38 - Booting...');

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
        this.audioManager = new AudioManager(this.camera);
        this.entities = [];
        this.isRunning = false;

        this.setupStartButton();
        this.init();
        
        window.addEventListener('resize', () => this.onResize());
    }

    setupStartButton() {
        const btn = document.getElementById('start-btn');
        const overlay = document.getElementById('start-overlay');
        const ui = document.getElementById('ui-container');
        
        if (!btn) {
            console.error('Start button NOT found!');
            return;
        }

        btn.addEventListener('click', async () => {
            console.log('ENTER THE ARENA clicked');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                if (ui) ui.style.display = 'block';
            }, 500);

            // Set running first so logic starts immediately
            this.isRunning = true;
            
            // Initialize audio (fails gracefully)
            await this.audioManager.init();
        });
    }

    async init() {
        await this.assetLoader.loadMetadata();
        await this.assetLoader.preloadEssential();
        
        // Player
        this.player = new SpriteEntity(this.assetLoader, this.scene, this.audioManager);
        this.player.position.set(-25, 0, 0);
        this.player.setDirectionFromVector(new THREE.Vector3(1, 0, 0));
        this.entities.push(this.player);
        this.createHealthBar(this.player);

        // Enemy (AI)
        this.enemy = new SpriteEntity(this.assetLoader, this.scene, this.audioManager);
        this.enemy.position.set(25, 0, 0);
        this.enemy.setDirectionFromVector(new THREE.Vector3(-1, 0, 0));
        this.entities.push(this.enemy);
        this.createHealthBar(this.enemy);

        // Start animation loop immediately, but logic won't run until isRunning is true
        this.animate();
    }

    createHealthBar(entity) {
        const container = document.getElementById('health-bars');
        if (!container) {
            console.error('Health bars container not found!');
            return;
        }
        const barWrap = document.createElement('div');
        barWrap.className = 'hp-bar-container';
        
        const barFill = document.createElement('div');
        barFill.className = 'hp-bar-fill';
        
        barWrap.appendChild(barFill);
        container.appendChild(barWrap);
        
        entity.hpBar = barFill;
        entity.hpContainer = barWrap;
    }

    updateHealthBars() {
        this.entities.forEach(entity => {
            if (entity.isDying && entity.health <= 0 && entity.frameIndex > 4) {
                entity.hpContainer.style.display = 'none';
                return;
            }

            // Project 3D position to 2D screen space
            const vector = entity.position.clone();
            vector.y += 4.5; // Positioning above the sprite's head
            vector.project(this.camera);

            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

            entity.hpContainer.style.left = `${x}px`;
            entity.hpContainer.style.top = `${y}px`;
            
            // Update fill width
            const healthPct = (entity.health / entity.maxHealth) * 100;
            entity.hpBar.style.width = `${healthPct}%`;
        });
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
        // Updated: Always update health bars even if paused, 
        // as long as entities are created
        if (this.entities.length > 0) {
            this.updateHealthBars();
        }

        if (!this.isRunning) return;

        // Unified Combat AI for all entities
        this.entities.forEach(gladiator => {
            gladiator.update(dt);
            if (gladiator.isDying) return;
            const opponent = this.entities.find(e => e !== gladiator);
            this.updateGladiatorAI(gladiator, opponent, dt);
        });

        this.updateHealthBars();
    }

    updateGladiatorAI(gladiator, opponent, dt) {
        if (gladiator.isDying || gladiator.state === 'VICTORY') return;
        
        // If opponent is dying and we are not already celebrating, start celebrating!
        if (opponent.isDying && gladiator.state !== 'VICTORY') {
            gladiator.celebrate();
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
                    console.log(`HIT! Damage: ${dmg}`);
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

window.addEventListener('load', () => {
    new ArenaGame();
});
