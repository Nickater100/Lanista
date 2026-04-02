import * as THREE from 'three';
import { AssetLoader } from './AssetLoader.js?v=49';
import { LayeredSpriteInspector } from './LayeredSpriteInspector.js?v=1';

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

        this.assetLoader = new AssetLoader();
        this.inspector = null;

        this.init();
        window.addEventListener('resize', () => this.onResize());
    }

    async init() {
        // Aprovechamos los preloads de la base principal
        await this.assetLoader.loadMetadata();
        await this.assetLoader.preloadEssential();
        
        this.inspector = new LayeredSpriteInspector(this.scene, this.assetLoader);
        this.setupUI();
        
        this.animate();
    }

    setupUI() {
        const dirSelect = document.getElementById('dir-select');
        const animSelect = document.getElementById('anim-select');
        const speedRange = document.getElementById('speed-range');
        const equipperBtn = document.getElementById('equipper-btn');

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
