import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js?v=49';
import { SpriteEntity } from './SpriteEntity.js?v=49';
import { AudioManager } from './AudioManager.js?v=49';

console.log('Lanista Arena v58 - Booting (Multi-Gladiator Systems)...');
console.log('DEBUG: Script loaded at ' + new Date().toISOString());

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
        
        const textureLoader = new THREE.TextureLoader();
        
        // Procedural Texture Generators
        const createSandTexture = () => {
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
        };

        const createStoneTexture = () => {
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
        };

        const createBloodTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 128, 128);
            // Darker red for realism
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
        };

        this.bloodTextureBase = createBloodTexture();

        // Arena Floor (Procedural Sand)
        const sandTexture = createSandTexture();
        
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

        // Coliseum Walls (Procedural Stone)
        const stoneTexture = createStoneTexture();
        
        const wallGeometry = new THREE.CylinderGeometry(51, 51, 10, 64, 1, true); 
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            map: stoneTexture,
            side: THREE.BackSide, // Only visible from inside
            color: 0xaaaaaa 
        });
        const walls = new THREE.Mesh(wallGeometry, wallMaterial);
        walls.position.y = 2.2; 
        this.scene.add(walls);

        // Outer rim for thickness
        const outerWallGeo = new THREE.CylinderGeometry(52, 52, 10, 64, 1, true);
        const outerWallMat = new THREE.MeshStandardMaterial({ map: stoneTexture, side: THREE.FrontSide, color: 0x666666 });
        const outerWaves = new THREE.Mesh(outerWallGeo, outerWallMat);
        outerWaves.position.y = 2.2;
        this.scene.add(outerWaves);

        // Lighting System
        const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7); 
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(20, 50, 30);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        
        // Environment Fog
        this.scene.fog = new THREE.Fog(0x1a1a1a, 60, 150);

        this.assetLoader = new AssetLoader();
        this.audioManager = new AudioManager(this.camera);
        this.entities = [];
        this.isRunning = false;
        this.combatMode = 'VS';

        this.gladiatorNames = [
            'Spartacus', 'Crixus', 'Gannicus', 'Agron', 'Oenomaus', 
            'Marcus', 'Flamma', 'Verus', 'Priscus', 'Spiculus', 
            'Carpophorus', 'Hermes', 'Tetraites', 'Dama', 'Scaeva',
            'Batiatus', 'Varro', 'Ilithyia', 'Glaber', 'Ashur'
        ];

        this.setupStartButton();
        this.init();
        
        window.addEventListener('resize', () => this.onResize());
    }

    setupStartButton() {
        console.log('DEBUG: Setting up start button...');
        const overlay = document.getElementById('start-overlay');
        const startContent = document.getElementById('start-content');
        const ui = document.getElementById('ui-container');
        
        if (!startContent) {
            console.error('FATAL: #start-content not found in DOM!');
            return;
        }

        console.log('DEBUG: Injecting HTML into #start-content');
        startContent.innerHTML = `
            <h1>LANISTA ARENA</h1>
            <p>Gladiatorial Combat Simulator</p>
            
            <div class="setup-panel">
                <div class="setup-row">
                    <label>Team 1:</label>
                    <input type="number" id="t1-count" value="3" min="1" max="6">
                </div>
                <div class="setup-row">
                    <label>Team 2:</label>
                    <input type="number" id="t2-count" value="3" min="1" max="6">
                </div>
                <button class="mode-btn" id="btn-vs">VS COMBAT</button>
                <hr style="width: 100%; border: 0.5px solid #333; margin: 15px 0;">
                <div class="setup-row">
                    <label>FFA Gladiators:</label>
                    <input type="number" id="ffa-count" value="12" min="2" max="15">
                </div>
                <button class="mode-btn" id="btn-ffa" style="background: #f1c40f; color: #000;">STAGED FFA</button>
            </div>
        `;

        const startCombat = async (config) => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                if (ui) ui.style.display = 'block';
            }, 500);

            this.initCombat(config);
            this.isRunning = true;
            await this.audioManager.init();
        };

        document.getElementById('btn-vs').addEventListener('click', () => {
            const t1 = parseInt(document.getElementById('t1-count').value) || 1;
            const t2 = parseInt(document.getElementById('t2-count').value) || 1;
            startCombat({ t1, t2, ffa: false });
        });

        document.getElementById('btn-ffa').addEventListener('click', () => {
            const count = parseInt(document.getElementById('ffa-count').value) || 12;
            startCombat({ t1: 0, t2: 0, ffa: true, ffaCount: count });
        });
    }

    async init() {
        await this.assetLoader.loadMetadata();
        await this.assetLoader.preloadEssential();
        this.animate();
    }

    initCombat({ t1, t2, ffa, ffaCount }) {
        this.combatMode = ffa ? 'FFA' : 'VS';
        this.entities.forEach(e => e.destroy());
        this.entities = [];
        
        const hbContainer = document.getElementById('health-bars');
        if (hbContainer) hbContainer.innerHTML = '';

        if (ffa) {
            const count = ffaCount || 12;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const r = 28; // Slightly larger circle for better spacing
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                const name = this.gladiatorNames[i % this.gladiatorNames.length];
                this.createGladiator(x, z, name, i + 10); // Unique teamId per gladiator in FFA
            }
        } else {
            // Spawn Team 1 in a line or triangle
            for (let i = 0; i < t1; i++) {
                const x = -25;
                const z = (i - (t1 - 1) / 2) * 8;
                const name = this.gladiatorNames[Math.floor(Math.random() * 8)];
                this.createGladiator(x, z, name, 1);
            }
            // Spawn Team 2
            for (let i = 0; i < t2; i++) {
                const x = 25;
                const z = (i - (t2 - 1) / 2) * 8;
                const name = this.gladiatorNames[Math.floor(Math.random() * 8) + 8];
                this.createGladiator(x, z, name, 2);
            }
        }
    }

    createGladiator(x, z, name, teamId) {
        const gladiator = new SpriteEntity(this.assetLoader, this.scene, this.audioManager, name, teamId);
        gladiator.position.set(x, 0.1, z); // Raise slightly to avoid Z-fighting with floor/blood
        const lookTarget = new THREE.Vector3(0, 0, 0);
        gladiator.setDirectionFromVector(lookTarget.sub(gladiator.position).normalize());
        this.entities.push(gladiator);
        this.createHealthBar(gladiator);
    }

    createHealthBar(entity) {
        const container = document.getElementById('health-bars');
        if (!container) {
            console.error('Health bars container not found!');
            return;
        }
        const barWrap = document.createElement('div');
        barWrap.className = 'hp-bar-container';
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'gladiator-name';
        
        // Team identifier dot
        const teamDot = document.createElement('div');
        let teamClass = 'team-ffa';
        if (this.combatMode === 'VS') {
            teamClass = entity.teamId === 1 ? 'team-1' : 'team-2';
        }
        teamDot.className = `team-dot ${teamClass}`;
        
        nameLabel.appendChild(teamDot);
        const nameText = document.createTextNode(entity.name);
        nameLabel.appendChild(nameText);
        
        const barFill = document.createElement('div');
        barFill.className = 'hp-bar-fill';
        
        barWrap.appendChild(nameLabel);
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
            vector.y += 5.5; // Slightly higher for names
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
        if (this.entities.length > 0) {
            this.updateHealthBars();
        }

        if (!this.isRunning) return;

        this.entities.forEach(gladiator => {
            gladiator.update(dt);
            if (gladiator.isDying) return;
            this.updateGladiatorAI(gladiator, dt);
        });
    }

    spawnBlood(pos) {
        const size = 2.0 + Math.random() * 3.0; // Randomized splatter sizes
        const geo = new THREE.CircleGeometry(size, 8);
        const mat = new THREE.MeshStandardMaterial({ 
            map: this.bloodTextureBase, 
            transparent: true, 
            opacity: 0.8,
            depthWrite: false, 
            alphaTest: 0.05, // Added to prevent invisible quad culling
            roughness: 1.0, 
            metalness: 0.0,
            color: new THREE.Color(0.8 + Math.random() * 0.2, 1, 1) // Slight color variance
        });
        const blood = new THREE.Mesh(geo, mat);
        blood.renderOrder = 1; // Always below gladiators (renderOrder > 700)
        blood.rotation.x = -Math.PI / 2;
        blood.rotation.z = Math.random() * Math.PI * 2; // Random rotation for uniqueness
        blood.position.set(pos.x + (Math.random() - 0.5) * 2, -2.75, pos.z + (Math.random() - 0.5) * 2);
        this.scene.add(blood);
    }

    findTarget(gladiator) {
        let bestTarget = null;
        let minDist = Infinity;

        this.entities.forEach(e => {
            if (e === gladiator || e.isDying || e.teamId === gladiator.teamId) return;
            const d = gladiator.position.distanceTo(e.position);
            if (d < minDist) {
                minDist = d;
                bestTarget = e;
            }
        });
        return bestTarget;
    }

    updateGladiatorAI(gladiator, dt) {
        if (gladiator.isDying || gladiator.state === 'VICTORY') return;
        
        const opponent = this.findTarget(gladiator);
        
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
    console.log('DEBUG: Window Load event triggered');
    try {
        window.arenaGameInstance = new ArenaGame();
        console.log('DEBUG: ArenaGame instance created successfully');
    } catch (e) {
        console.error('FATAL: Fail to create ArenaGame!', e);
    }
});
