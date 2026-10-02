// Combat System - Damage numbers, feedback
class CombatSystem {
    constructor() {
        this.damageNumbers = [];
        this.screenShake = 0;
        this.hitStop = 0;
    }

    dealDamage(target, amount, source, isCrit, particles) {
        let actual = 0;
        if (target instanceof Enemy) {
            actual = target.takeDamage(amount, source, isCrit, particles);
        } else if (target instanceof Troop) {
            actual = target.takeDamage(amount, particles);
        } else if (target instanceof Castle) {
            actual = target.takeDamage(amount);
        }

        if (actual > 0) {
            this.spawnDamageNumber(target.x, target.y - 30, Math.ceil(actual), isCrit);
            if (isCrit) this.screenShake = Math.max(this.screenShake, 0.12);
            else this.screenShake = Math.max(this.screenShake, 0.04);
        }
        return actual;
    }

    spawnDamageNumber(x, y, value, isCrit) {
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 20,
            y,
            value,
            isCrit,
            life: 0.9,
            vy: -60 - Math.random() * 30
        });
    }

    update(dt) {
        if (this.screenShake > 0) this.screenShake -= dt;
        if (this.hitStop > 0) this.hitStop -= dt;

        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y += d.vy * dt;
            d.vy += 40 * dt;
            d.life -= dt;
            if (d.life <= 0) this.damageNumbers.splice(i, 1);
        }
    }

    draw(ctx) {
        for (const d of this.damageNumbers) {
            ctx.globalAlpha = Math.min(1, d.life * 2);
            ctx.font = d.isCrit ? 'bold 20px Arial' : 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = d.isCrit ? '#f1c40f' : '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(d.value, d.x, d.y);
            ctx.fillText(d.value, d.x, d.y);
            if (d.isCrit) {
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = '#f39c12';
                ctx.fillText('CRIT!', d.x, d.y - 16);
            }
        }
        ctx.globalAlpha = 1;
    }

    getShakeOffset() {
        if (this.screenShake <= 0) return { x: 0, y: 0 };
        const intensity = this.screenShake * 18;
        return {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity
        };
    }
}
