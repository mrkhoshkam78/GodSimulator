// Projectile Entity
class Projectile {
    constructor(opts) {
        this.x = opts.x;
        this.y = opts.y;
        this.target = opts.target;
        this.damage = opts.damage;
        this.speed = opts.speed || 400;
        this.type = opts.type || 'cannonball';
        this.color = opts.color || '#fff';
        this.special = opts.special;
        this.isCrit = opts.isCrit || false;
        this.source = opts.source;
        this.alive = true;
        this.trail = [];
        // Homing or direction
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = this.speed;
            this.vy = 0;
        }
    }

    update(dt, enemies, particles, combat) {
        if (!this.alive) return;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Check collision with enemies
        for (const e of enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < e.data.size * 0.7 + 8) {
                combat.dealDamage(e, this.damage, this.source, this.isCrit, particles);
                if (this.special === 'splash' || this.special === 'aoe') {
                    for (const e2 of enemies) {
                        if (e2 !== e && !e2.dead && Math.hypot(e2.x - e.x, e2.y - e.y) < 70) {
                            combat.dealDamage(e2, this.damage * 0.5, this.source, false, particles);
                        }
                    }
                    particles.emitExplosion(this.x, this.y, this.color);
                } else if (this.special === 'chain') {
                    // simple chain to nearest
                    let next = null, nd = 120;
                    for (const e2 of enemies) {
                        if (e2 !== e && !e2.dead) {
                            const dd = Math.hypot(e2.x - e.x, e2.y - e.y);
                            if (dd < nd) { nd = dd; next = e2; }
                        }
                    }
                    if (next) combat.dealDamage(next, this.damage * 0.6, this.source, false, particles);
                }
                particles.emitHit(this.x, this.y, this.color);
                this.alive = false;
                return;
            }
        }

        // Off screen
        if (this.x < -50 || this.x > 2000 || this.y < -50 || this.y > 1200) this.alive = false;
    }

    draw(ctx) {
        if (!this.alive) return;
        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            ctx.globalAlpha = i / this.trail.length * 0.5;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        if (this.type === 'lightning') {
            ctx.moveTo(this.x - 4, this.y);
            ctx.lineTo(this.x + 4, this.y - 8);
            ctx.lineTo(this.x + 2, this.y);
            ctx.lineTo(this.x + 6, this.y + 8);
            ctx.fill();
        } else if (this.type === 'bolt') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.fillRect(-10, -2, 20, 4);
            ctx.restore();
        } else {
            ctx.arc(this.x, this.y, this.isCrit ? 7 : 5, 0, Math.PI * 2);
            ctx.fill();
            if (this.isCrit) {
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
}
