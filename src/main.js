import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js?v=62';
import { SpriteEntity } from './SpriteEntity.js?v=62';
import { AudioManager } from './AudioManager.js?v=62';
import { UIManager } from './UIManager.js?v=62';
import { EnvironmentManager } from './EnvironmentManager.js?v=62';
import { CombatSystem } from './CombatSystem.js?v=62';

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
        
        // Modules
        this.uiManager = new UIManager();
        this.envManager = new EnvironmentManager(this.scene);
        this.combatSystem = new CombatSystem(this.scene, this.envManager);

        // Setup Scene
        this.envManager.setupEnvironment();

        this.loaders = {
            pelado: new AssetLoader('pelado'),
            goblin: new AssetLoader('goblin'),
            succubus: new AssetLoader('succubus')
        };
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

        this.uiManager.setupStartMenu(async (config) => {
            this.initCombat(config);
            this.isRunning = true;
            await this.audioManager.init();
        });

        this.init();
        
        window.addEventListener('resize', () => this.onResize());
    }

    async init() {
        await Promise.all([
            this.loaders.pelado.loadMetadata(),
            this.loaders.goblin.loadMetadata(),
            this.loaders.succubus.loadMetadata()
        ]);
        await Promise.all([
            this.loaders.pelado.preloadEssential(),
            this.loaders.goblin.preloadEssential(),
            this.loaders.succubus.preloadEssential()
        ]);
        this.animate();
    }

    initCombat({ t1, t2, ffa, ffaCount }) {
        this.combatMode = ffa ? 'FFA' : 'VS';
        this.entities.forEach(e => e.destroy());
        this.entities = [];
        
        this.uiManager.clearHealthBars();

        if (ffa) {
            const count = ffaCount || 12;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const r = 28; // Slightly larger circle for better spacing
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                const name = this.gladiatorNames[i % this.gladiatorNames.length];
                const classes = ['pelado', 'goblin', 'succubus'];
                const className = classes[Math.floor(Math.random() * classes.length)];
                this.createGladiator(x, z, name, i + 10, className); // Unique teamId per gladiator in FFA
            }
        } else {
            // Spawn Team 1 in a line
            for (let i = 0; i < t1; i++) {
                const x = -25;
                const z = (i - (t1 - 1) / 2) * 8;
                const name = this.gladiatorNames[Math.floor(Math.random() * 8)];
                const classes = ['pelado', 'goblin', 'succubus'];
                const className = classes[Math.floor(Math.random() * classes.length)];
                this.createGladiator(x, z, name, 1, className);
            }
            // Spawn Team 2
            for (let i = 0; i < t2; i++) {
                const x = 25;
                const z = (i - (t2 - 1) / 2) * 8;
                const name = this.gladiatorNames[Math.floor(Math.random() * 8) + 8];
                const classes = ['pelado', 'goblin', 'succubus'];
                const className = classes[Math.floor(Math.random() * classes.length)];
                this.createGladiator(x, z, name, 2, className);
            }
        }
    }

    createGladiator(x, z, name, teamId, className = 'pelado') {
        const loader = this.loaders[className];
        const gladiator = new SpriteEntity(loader, this.scene, this.audioManager, name, teamId);
        gladiator.position.set(x, 0.1, z); // Raise slightly to avoid Z-fighting with floor/blood
        const lookTarget = new THREE.Vector3(0, 0, 0);
        gladiator.setDirectionFromVector(lookTarget.sub(gladiator.position).normalize());
        this.entities.push(gladiator);
        
        this.uiManager.createHealthBar(gladiator, this.combatMode);
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
            this.uiManager.updateHealthBars(this.entities, this.camera);
        }

        if (!this.isRunning) return;

        this.entities.forEach(gladiator => {
            gladiator.update(dt);
            if (gladiator.isDying) return;
            this.combatSystem.updateAI(gladiator, this.entities, dt);
        });
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
