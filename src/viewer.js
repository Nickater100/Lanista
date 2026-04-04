import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js?v=71';
import { LayeredSpriteInspector } from './LayeredSpriteInspector.js?v=70';

class ViewerApp {
    constructor() {
        console.log("Starting Viewer API...");
        
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x333333); 
        document.body.appendChild(this.renderer.domElement);

        const aspect = window.innerWidth / window.innerHeight;
        const d = 10; 
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        this.scene = new THREE.Scene();

        const gridHelper = new THREE.GridHelper(100, 100, 0x555555, 0x222222);
        gridHelper.position.y = -4.5;
        this.scene.add(gridHelper);

        this.loaders = {
            pelado: new AssetLoader('pelado'),
            goblin: new AssetLoader('goblin'),
            succubus: new AssetLoader('succubus')
        };
        this.currentLoader = this.loaders.pelado;
        this.inspector = null;

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
        
        this.inspector = new LayeredSpriteInspector(this.scene, this.currentLoader);
        this.setupUI();
        
        this.animate();
    }

    setupUI() {
        const classSelect = document.getElementById('class-select');
        const dirSelect = document.getElementById('dir-select');
        const animSelect = document.getElementById('anim-select');
        const speedRange = document.getElementById('speed-range');
        const equipperBtn = document.getElementById('equipper-btn');

        classSelect.addEventListener('change', (e) => {
            this.currentLoader = this.loaders[e.target.value];
            if (this.inspector) {
                this.scene.remove(this.inspector.group);
            }
            this.inspector = new LayeredSpriteInspector(this.scene, this.currentLoader);
            this.inspector.setDirection(dirSelect.value);
            this.inspector.setAnimation(animSelect.value);
            this.inspector.setSpeed(parseFloat(speedRange.value));
        });

        dirSelect.addEventListener('change', (e) => {
            if (this.inspector) this.inspector.setDirection(e.target.value);
        });

        animSelect.addEventListener('change', (e) => {
            if (this.inspector) this.inspector.setAnimation(e.target.value);
        });

        speedRange.addEventListener('input', (e) => {
            document.getElementById('speed-val').innerText = `${Math.round(e.target.value * 100)}%`;
            if (this.inspector) this.inspector.setSpeed(parseFloat(e.target.value));
        });

        equipperBtn.addEventListener('click', () => {
            if (this.inspector) {
                const isActive = this.inspector.toggleTestArmor();
                if (isActive) {
                    equipperBtn.classList.add('active');
                    equipperBtn.innerText = 'Equipar Capa "Armadura Temporal" [ON]';
                } else {
                    equipperBtn.classList.remove('active');
                    equipperBtn.innerText = 'Equipar Capa "Armadura Temporal" [OFF]';
                }
            }
        });
    }

    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 10;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        const clock = new THREE.Clock();
        const loop = () => {
            requestAnimationFrame(loop);
            const dt = clock.getDelta();
            if (this.inspector) this.inspector.update(dt);
            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }
}

window.addEventListener('load', () => {
    new ViewerApp();
});
