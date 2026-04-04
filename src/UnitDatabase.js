export const UnitDatabase = {
    'pelado': {
        class: 'pelado',
        maxHealth: 100,
        speed: 5.0,
        damage: 15,
        attackRange: 4.0,       // Rango de contacto melee
        attackCooldown: 1.0,    // Se demora un poco entre espadazos
        agility: 10,            // % de esquivar lento
        type: 'melee'
    },
    'goblin': {
        class: 'goblin',
        maxHealth: 60,          // Fragil
        speed: 7.0,             // Muy veloz (pursuit/escape)
        damage: 8,              // Daño bajo
        attackRange: 3.5,       // Rango melee más corto
        attackCooldown: 0.4,    // Ataques muy rápidos (ataque de dagas)
        agility: 30,            // Alta probabilidad de esquivar
        type: 'melee'
    },
    'succubus': {
        class: 'succubus',
        maxHealth: 80,
        speed: 4.5,             // Más lenta persiguiendo
        damage: 20,             // Daño alto (hechizo especial o proyectil)
        attackRange: 20.0,      // Ataca desde lejos
        attackCooldown: 2.0,    // Se demora mucho en "castear" (cooldown de proyectil)
        agility: 15,
        type: 'ranged',
        projectileTexture: 'dark_orb' // No lo usamos aun pero será clave
    }
};
