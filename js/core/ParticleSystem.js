// High quality Particle System
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, options = {}) {
        const q = (typeof getQuality === 'function') ? getQuality() : { particleMult: 1 };
        const {
            count = 8,
            color = '#fff',
            size = 4,
            speed = 80,
            life = 0.6,
            gravity = 200,
            spread = Math.PI * 2,
            angle = 0,
            type = 'circle' // circle, square, spark, blood
        } = options;

        const finalCount = Math.max(1, Math.round(count * (q.particleMult || 1)));
        for (let i = 0; i < finalCount; i++) {
            const a = angle + (Math.random() - 0.5) * spread;
            const s = speed * (0.5 + Math.random() * 0.8);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: life * (0.7 + Math.random() * 0.5),
                maxLife: life,
                size: size * (0.6 + Math.random() * 0.8),
                color,
                gravity,
                type,
                alpha: 1
            });
        }
    }

    emitBlood(x, y) {
        this.emit(x, y, { count: 12, color: '#8b0000', size: 5, speed: 60, life: 0.7, gravity: 300, type: 'blood' });
        this.emit(x, y, { count: 6, color: '#c0392b', size: 3, speed: 40, life: 0.5, gravity: 250 });
    }

    emitHit(x, y, color = '#fff') {
        this.emit(x, y, { count: 6, color, size: 3, speed: 100, life: 0.3, gravity: 50, spread: Math.PI });
    }

    emitExplosion(x, y, color = '#e74c3c') {
        this.emit(x, y, { count: 20, color, size: 6, speed: 150, life: 0.8, gravity: 80, type: 'spark' });
        this.emit(x, y, { count: 10, color: '#f39c12', size: 4, speed: 100, life: 0.6 });
        this.emit(x, y, { count: 8, color: '#fff', size: 3, speed: 80, life: 0.4 });
    }

    emitLevelUp(x, y) {
        this.emit(x, y, { count: 25, color: '#f1c40f', size: 5, speed: 120, life: 1.0, gravity: -50, type: 'spark' });
        this.emit(x, y, { count: 15, color: '#fff', size: 3, speed: 80, life: 0.8, gravity: -30 });
    }

    emitDeath(x, y, color) {
        this.emit(x, y, { count: 15, color, size: 5, speed: 90, life: 0.9, gravity: 150 });
        this.emitBlood(x, y);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            if (p.type === 'spark') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.atan2(p.vy, p.vx));
                ctx.fillRect(-p.size, -p.size * 0.3, p.size * 2, p.size * 0.6);
                ctx.restore();
            } else if (p.type === 'blood') {
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 0.7, p.size, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    clear() {
        this.particles = [];
    }
}
