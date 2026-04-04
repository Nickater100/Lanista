export const UnitDatabase = {
    'pelado': {
        class: 'pelado',
        maxHealth: 100,
        speed: 5.0,
        damage: 15,
        attackRange: 4.0,
        attackCooldown: 1.0,
        agility: 10,
        type: 'melee',
        skills: {
            // Placeholder para futuras habilidades del pelado
            // lv4: { ... },
            // lv8: { ... },
            // lv12: { ... }
        }
    },
    'goblin': {
        class: 'goblin',
        maxHealth: 60,
        speed: 7.0,
        damage: 8,
        attackRange: 3.5,
        attackCooldown: 0.4,
        agility: 30,
        type: 'melee',
        skills: {
            // Placeholder para futuras habilidades del goblin
        }
    },
    'succubus': {
        class: 'succubus',
        maxHealth: 80,
        speed: 4.5,
        damage: 20,
        attackRange: 20.0,
        attackCooldown: 2.0,
        agility: 15,
        type: 'ranged',
        projectileTexture: 'dark_orb',
        skills: {
            lv4: {
                name: 'Besos del Abismo',
                animKey: 'lv4',
                cooldown: 8,
                range: 22,
                type: 'projectile',
                unlockLevel: 4,
                triggerFrame: 6,       // Frame donde se ejecuta el efecto (de 13)
                effect: {
                    type: 'CHARM',
                    duration: 4,
                    attackSpeedReduction: 0.5,
                    damageReduction: 0.3
                }
            },
            lv8: {
                name: 'Sombra Seductora',
                animKey: 'lv8',
                cooldown: 12,
                type: 'self',
                unlockLevel: 8,
                triggerFrame: 4,
                dashDistance: 15,
                effect: {
                    type: 'EVASION_BOOST',
                    duration: 3,
                    evasionBonus: 50
                },
                decoy: {
                    duration: 3,
                    attractsAttacks: true
                }
            },
            lv12: {
                name: 'Dominio del Deseo',
                animKey: 'lv12',
                cooldown: 30,
                range: 12,
                type: 'aoe',
                unlockLevel: 12,
                triggerFrame: 7,
                effect: {
                    type: 'CHARMED_ULTIMATE',
                    duration: 5,
                    drainPerSecond: 5,
                    immobilize: true
                }
            }
        }
    }
};
