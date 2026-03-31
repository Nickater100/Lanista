export class UIManager {
    constructor() {
        this.overlay = document.getElementById('start-overlay');
        this.startContent = document.getElementById('start-content');
        this.ui = document.getElementById('ui-container');
        this.hbContainer = document.getElementById('health-bars');
    }

    setupStartMenu(onStart) {
        if (!this.startContent) return;

        this.startContent.innerHTML = `
            <h1>LANISTA ARENA</h1>
            <p>Gladiatorial Combat Simulator</p>
            <div class="setup-panel">
                <div class="setup-row"><label>Team 1:</label><input type="number" id="t1-count" value="3" min="1" max="6"></div>
                <div class="setup-row"><label>Team 2:</label><input type="number" id="t2-count" value="3" min="1" max="6"></div>
                <button class="mode-btn" id="btn-vs">VS COMBAT</button>
                <hr style="width: 100%; border: 0.5px solid #333; margin: 15px 0;">
                <div class="setup-row"><label>FFA Gladiators:</label><input type="number" id="ffa-count" value="12" min="2" max="15"></div>
                <button class="mode-btn" id="btn-ffa" style="background: #f1c40f; color: #000;">STAGED FFA</button>
            </div>
        `;

        const startGame = (config) => {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                this.overlay.style.display = 'none';
                if (this.ui) this.ui.style.display = 'block';
            }, 500);
            onStart(config);
        };

        const btnVs = document.getElementById('btn-vs');
        const btnFfa = document.getElementById('btn-ffa');

        if (btnVs) {
            btnVs.addEventListener('click', () => {
                const t1 = parseInt(document.getElementById('t1-count').value) || 1;
                const t2 = parseInt(document.getElementById('t2-count').value) || 1;
                startGame({ t1, t2, ffa: false });
            });
        }

        if (btnFfa) {
            btnFfa.addEventListener('click', () => {
                const count = parseInt(document.getElementById('ffa-count').value) || 12;
                startGame({ t1: 0, t2: 0, ffa: true, ffaCount: count });
            });
        }
    }

    clearHealthBars() {
        if (this.hbContainer) this.hbContainer.innerHTML = '';
    }

    createHealthBar(entity, combatMode) {
        if (!this.hbContainer) return;

        const barWrap = document.createElement('div');
        barWrap.className = 'hp-bar-container';
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'gladiator-name';
        
        const teamDot = document.createElement('div');
        let teamClass = 'team-ffa';
        if (combatMode === 'VS') {
            teamClass = entity.teamId === 1 ? 'team-1' : 'team-2';
        }
        teamDot.className = `team-dot ${teamClass}`;
        
        nameLabel.appendChild(teamDot);
        nameLabel.appendChild(document.createTextNode(entity.name));
        
        const barFill = document.createElement('div');
        barFill.className = 'hp-bar-fill';
        
        barWrap.appendChild(nameLabel);
        barWrap.appendChild(barFill);
        this.hbContainer.appendChild(barWrap);
        
        entity.hpBar = barFill;
        entity.hpContainer = barWrap;
    }

    updateHealthBars(entities, camera) {
        if (!this.hbContainer || entities.length === 0) return;

        entities.forEach(entity => {
            if (!entity.hpContainer) return;

            if (entity.isDying && entity.health <= 0 && entity.frameIndex > 4) {
                entity.hpContainer.style.display = 'none';
                return;
            }

            const vector = entity.position.clone();
            vector.y += 5.5; 
            vector.project(camera);

            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

            entity.hpContainer.style.left = `${x}px`;
            entity.hpContainer.style.top = `${y}px`;
            
            if (entity.hpBar) {
                const healthPct = (entity.health / entity.maxHealth) * 100;
                entity.hpBar.style.width = `${healthPct}%`;
            }
        });
    }
}
