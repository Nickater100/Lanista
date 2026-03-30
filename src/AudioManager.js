import * as THREE from 'three';

export class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        this.loader = new THREE.AudioLoader();
        this.loader.setCrossOrigin('anonymous');
        
        this.sounds = new Map();
        
        // Audio Assets (User-provided in /sounds)
        this.assets = {
            ambient: './sounds/multitud.mp3', 
            slash: './sounds/espada.mp3',    
            hit: './sounds/espada.mp3',      
            death: './sounds/muerte.mp3',
            victory: './sounds/multitud.mp3'  
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
            console.log(`Fallback: playing synthetic ${key}`);
            this.playSynthetic(key, volume);
        }
    }

    playSynthetic(type, volume = 0.5) {
        const context = this.listener.context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        
        oscillator.connect(gain);
        gain.connect(context.destination);
        
        if (type === 'slash') {
            // Metallic FM Synthesis: Modulator -> Carrier
            const mod = context.createOscillator();
            const modGain = context.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            
            mod.type = 'square';
            mod.frequency.setValueAtTime(1200, now);
            mod.connect(modGain);
            modGain.connect(oscillator.frequency);
            modGain.gain.setValueAtTime(400, now);
            
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            
            mod.start(now);
            oscillator.start(now);
            mod.stop(now + 0.15);
            oscillator.stop(now + 0.15);
        } else if (type === 'death') {
            // Formant Synthesis for "Aarrgg" (Human pain grunt)
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(120, now); 
            oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.5);
            
            // F1: First Formant (Vowel 'A' -> ~700Hz)
            const f1 = context.createBiquadFilter();
            f1.type = 'bandpass';
            f1.frequency.setValueAtTime(700, now);
            f1.Q.setValueAtTime(5, now);
            
            // F2: Second Formant (~1100Hz)
            const f2 = context.createBiquadFilter();
            f2.type = 'bandpass';
            f2.frequency.setValueAtTime(1100, now);
            f2.Q.setValueAtTime(5, now);
            
            oscillator.disconnect(gain);
            oscillator.connect(f1);
            oscillator.connect(f2);
            f1.connect(gain);
            f2.connect(gain);
            
            gain.gain.setValueAtTime(volume * 0.4, now);
            gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            
            oscillator.start(now);
            oscillator.stop(now + 0.5);
        } else if (type === 'hit') {
            // Impact with White Noise Crunch
            const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.05, context.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < context.sampleRate * 0.05; i++) output[i] = Math.random() * 2 - 1;
            
            const noise = context.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const noiseFilter = context.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(1000, now);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.05);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(gain);
            oscillator.connect(gain);
            
            gain.gain.setValueAtTime(volume * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            
            noise.start(now);
            oscillator.start(now);
            noise.stop(now + 0.05);
            oscillator.stop(now + 0.05);
        } else if (type === 'victory') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.5);
            gain.gain.setValueAtTime(volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
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
