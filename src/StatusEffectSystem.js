/**
 * StatusEffectSystem.js
 * Sistema genérico de buffs/debuffs para cualquier entidad de combate.
 * Cada efecto tiene: tipo, duración, callbacks de aplicación/tick/expiración.
 */

export class StatusEffect {
    /**
     * @param {Object} config
     * @param {string} config.type - Tipo único del efecto (CHARM, EVASION_BOOST, CHARMED_ULTIMATE, etc.)
     * @param {number} config.duration - Duración en segundos
     * @param {SpriteEntity} config.source - Quién aplicó el efecto
     * @param {Object} config.params - Parámetros específicos del efecto
     * @param {Function} [config.onApply] - Callback al aplicarse (target)
     * @param {Function} [config.onTick] - Callback cada frame (target, dt)
     * @param {Function} [config.onExpire] - Callback al expirar (target)
     */
    constructor(config) {
        this.type = config.type;
        this.duration = config.duration;
        this.maxDuration = config.duration;
        this.source = config.source || null;
        this.params = config.params || {};
        this.onApply = config.onApply || null;
        this.onTick = config.onTick || null;
        this.onExpire = config.onExpire || null;
        this.isExpired = false;
    }

    tick(dt) {
        this.duration -= dt;
        if (this.duration <= 0) {
            this.isExpired = true;
        }
    }
}

export class StatusEffectSystem {
    /**
     * Aplica un efecto a una entidad.
     * Si ya tiene un efecto del mismo tipo, lo refresca (reemplaza).
     */
    static apply(target, effect) {
        if (!target.activeEffects) {
            target.activeEffects = [];
        }

        // Remover efecto existente del mismo tipo (refresh)
        const existing = target.activeEffects.find(e => e.type === effect.type);
        if (existing) {
            if (existing.onExpire) existing.onExpire(target);
            target.activeEffects = target.activeEffects.filter(e => e.type !== effect.type);
        }

        target.activeEffects.push(effect);

        if (effect.onApply) {
            effect.onApply(target);
        }
    }

    /**
     * Tick de todos los efectos activos en una entidad.
     * Llama onTick por frame, y onExpire cuando expiran.
     */
    static update(target, dt) {
        if (!target.activeEffects || target.activeEffects.length === 0) return;

        for (let i = target.activeEffects.length - 1; i >= 0; i--) {
            const effect = target.activeEffects[i];
            
            // Tick del efecto
            if (effect.onTick) {
                effect.onTick(target, dt);
            }
            
            effect.tick(dt);

            // Expirado
            if (effect.isExpired) {
                if (effect.onExpire) {
                    effect.onExpire(target);
                }
                target.activeEffects.splice(i, 1);
            }
        }
    }

    /**
     * Verifica si una entidad tiene un efecto activo de cierto tipo.
     */
    static has(target, effectType) {
        if (!target.activeEffects) return false;
        return target.activeEffects.some(e => e.type === effectType && !e.isExpired);
    }

    /**
     * Remueve un efecto específico de una entidad.
     */
    static remove(target, effectType) {
        if (!target.activeEffects) return;
        const effect = target.activeEffects.find(e => e.type === effectType);
        if (effect) {
            if (effect.onExpire) effect.onExpire(target);
            target.activeEffects = target.activeEffects.filter(e => e.type !== effectType);
        }
    }

    /**
     * Limpia todos los efectos de una entidad.
     */
    static clearAll(target) {
        if (!target.activeEffects) return;
        target.activeEffects.forEach(e => {
            if (e.onExpire) e.onExpire(target);
        });
        target.activeEffects = [];
    }
}
