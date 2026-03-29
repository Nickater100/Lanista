import * as THREE from 'three';

export class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.loader = new THREE.AudioLoader();
        // Set crossOrigin if your sounds come from external CDNs
        this.loader.setCrossOrigin('anonymous');
        
        this.sounds = new Map();
        
        // Audio Assets (Public CDNs)
        this.assets = {
            ambient: 'https://freesound.org/data/previews/173/173859_2437358-lq.mp3', // Crowd cheer loop 
            slash: 'https://cdn.freesound.org/previews/118/118231_1762831-lq.mp3',    // Sword swing
            hit: 'https://cdn.freesound.org/previews/235/235911_3518703-lq.mp3',      // Sword hit clang
            victory: 'https://cdn.freesound.org/previews/277/277441_1203876-lq.mp3'  // Victory roar
        };

        this.isInitialized = false;
        this.ambientSound = null;
    }

    async init() {
        // Pre-initialize buffers if needed
        const loadPromises = Object.entries(this.assets).map(([key, url]) => {
            return new Promise((resolve) => {
                this.loader.load(url, (buffer) => {
                    console.log(`Audio loaded: ${key}`);
                    this.sounds.set(key, buffer);
                    resolve();
                }, undefined, (err) => {
                    console.warn(`Failed to load sound: ${key}`, err);
                    resolve(); // Continue anyway
                });
            });
        });

        await Promise.all(loadPromises);
        this.isInitialized = true;
        this.startAmbient();
    }

    startAmbient() {
        if (!this.sounds.has('ambient')) return;
        
        this.ambientSound = new THREE.Audio(this.listener);
        this.ambientSound.setBuffer(this.sounds.get('ambient'));
        this.ambientSound.setLoop(true);
        this.ambientSound.setVolume(0.1); 
        this.ambientSound.play();
    }

    play(key, volume = 0.5) {
        if (!this.isInitialized) return;
        
        if (this.sounds.has(key)) {
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(this.sounds.get(key));
            sound.setVolume(volume);
            sound.play();
        } else {
            // Fallback to synthetic sounds if assets failed to load
            this.playSynthetic(key, volume);
        }
    }

    playSynthetic(type, volume = 0.5) {
        // Simple Web Audio API synthesized sounds
        const context = this.listener.context;
        const osc = context.createOscillator();
        const gain = context.createGain();
        
        osc.connect(gain);
        gain.connect(context.destination);
        
        const now = context.currentTime;
        
        if (type === 'slash') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'victory') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
            gain.gain.setValueAtTime(volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }

    playVictory() {
        if (this.ambientSound) {
            this.ambientSound.setVolume(0.4); 
            setTimeout(() => {
                if (this.ambientSound) this.ambientSound.setVolume(0.1);
            }, 3000);
        }
        this.play('victory', 0.8);
    }
}
