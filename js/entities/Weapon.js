// Castle Weapon Entity - Detailed unique designs + level scaling (v1.3)
class Weapon {
    constructor(id, x, y, level) {
        this.id = id;
        this.data = WEAPONS_DATA[id];
        this.stats = getWeaponStats(id, level);
        this.x = x;
        this.y = y;
        this.level = level;
        this.cooldown = 0;
        this.angle = 0;
        this.target = null;
        this.animTimer = 0;
        this.fireFlash = 0;
        this.recoil = 0;
    }

    update(dt, enemies, projectiles, particles) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.animTimer += dt;
        if (this.fireFlash > 0) this.fireFlash -= dt;
        if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);

        this.target = null;
        let closest = Infinity;
        for (const e of enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < this.stats.range && d < closest) {
                closest = d;
                this.target = e;
            }
        }
        if (this.target) {
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            if (this.cooldown <= 0) {
                this.fire(projectiles, particles);
                this.cooldown = 1 / this.stats.attackSpeed;
                this.fireFlash = 0.18;
                this.recoil = 1.0;
            }
        }
    }

    fire(projectiles, particles) {
        if (!this.target) return;
        const isCrit = Math.random() < this.stats.critChance;
        projectiles.push(new Projectile({
            x: this.x, y: this.y,
            target: this.target,
            damage: this.stats.damage * (isCrit ? 1.7 : 1),
            speed: 420,
            type: this.stats.projectileType,
            color: this.stats.color,
            special: this.stats.special,
            isCrit,
            source: this
        }));
        const q = getQuality();
        particles.emit(this.x, this.y, { count: Math.round(5 * (q.particleMult || 1)), color: this.stats.color, size: 3, speed: 50, life: 0.3 });
    }

    draw(ctx) {
        const q = getQuality();
        const s = 20 + Math.min(8, this.level * 0.14);
        const col = this.stats.color;
        const lvlTier = this.level >= 40 ? 3 : this.level >= 25 ? 2 : this.level >= 10 ? 1 : 0;

        if (q.shadow) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + 14, s * 0.9, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        const recoilOff = (this.recoil || 0) * 6;
        ctx.translate(this.x - Math.cos(this.angle) * recoilOff, this.y - Math.sin(this.angle) * recoilOff);

        ctx.fillStyle = '#1a252f';
        ctx.beginPath();
        ctx.ellipse(0, 6, s * 1.1, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.ellipse(0, 4, s * 0.95, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        this._drawWeaponBody(ctx, s, col, lvlTier, q);

        ctx.save();
        ctx.rotate(this.angle);
        this._drawBarrel(ctx, s, col, lvlTier);
        if (this.fireFlash > 0) {
            ctx.fillStyle = `rgba(255,220,100,${this.fireFlash * 4})`;
            ctx.beginPath();
            ctx.arc(s * 1.6, 0, 6 + this.fireFlash * 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (q.glow && lvlTier >= 2) {
            ctx.strokeStyle = col;
            ctx.globalAlpha = 0.3 + Math.sin(this.animTimer * 3) * 0.15;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, s * 1.3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.arc(0, s * 1.15, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 10px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('L' + this.level, 0, s * 1.15);

        ctx.restore();
    }

    _drawWeaponBody(ctx, s, col, tier, q) {
        const outline = '#0a0a0a';
        switch (this.id) {
            case 'basic_cannon':
                ctx.fillStyle = '#4a4a4a';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'heavy_cannon':
                ctx.fillStyle = '#3d3d3d';
                ctx.fillRect(-s * 0.7, -s * 0.55, s * 1.4, s * 1.1);
                ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.strokeRect(-s * 0.7, -s * 0.55, s * 1.4, s * 1.1);
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
                ctx.fill();
                if (tier >= 1) {
                    ctx.fillStyle = '#7f8c8d';
                    ctx.fillRect(-s * 0.5, -s * 0.7, s * 0.2, s * 0.25);
                    ctx.fillRect(s * 0.3, -s * 0.7, s * 0.2, s * 0.25);
                }
                break;
            case 'ballista':
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(-s * 0.6, -s * 0.3, s * 1.2, s * 0.6);
                ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.strokeRect(-s * 0.6, -s * 0.3, s * 1.2, s * 0.6);
                ctx.strokeStyle = '#8d6e63';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-s * 0.9, -s * 0.5);
                ctx.lineTo(0, 0);
                ctx.lineTo(-s * 0.9, s * 0.5);
                ctx.stroke();
                break;
            case 'fire_cannon':
                ctx.fillStyle = '#4a2020';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
                if (q.glow) {
                    ctx.fillStyle = 'rgba(231,76,60,0.35)';
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.9 + Math.sin(this.animTimer * 5) * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'ice_cannon':
                ctx.fillStyle = '#1a3a5c';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
                if (q.glow) {
                    ctx.fillStyle = 'rgba(52,152,219,0.3)';
                    ctx.beginPath();
                    ctx.arc(0, 0, s * 0.9 + Math.sin(this.animTimer * 4) * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'lightning':
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.moveTo(0, -s * 0.8);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s * 0.8);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'explosive':
                ctx.fillStyle = '#3e2723';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    ctx.fillStyle = '#5d4037';
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55);
                    ctx.lineTo(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95);
                    ctx.lineTo(Math.cos(a + 0.2) * s * 0.55, Math.sin(a + 0.2) * s * 0.55);
                    ctx.fill();
                }
                break;
            case 'magic_tower':
                ctx.fillStyle = '#4a235a';
                ctx.beginPath();
                ctx.moveTo(-s * 0.6, s * 0.5);
                ctx.lineTo(-s * 0.45, -s * 0.6);
                ctx.lineTo(s * 0.45, -s * 0.6);
                ctx.lineTo(s * 0.6, s * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, -s * 0.3, s * 0.3, 0, Math.PI * 2);
                ctx.fill();
                if (q.glow) {
                    ctx.fillStyle = col + '55';
                    ctx.beginPath();
                    ctx.arc(0, -s * 0.3, s * 0.5 + Math.sin(this.animTimer * 4) * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            default:
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
                ctx.fill();
        }
        if (tier >= 2) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (tier >= 3) {
            ctx.fillStyle = '#f1c40f';
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2 + this.animTimer;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawBarrel(ctx, s, col, tier) {
        const len = s * (1.3 + tier * 0.15);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(0, -5 - tier, len, 10 + tier * 2);
        ctx.fillStyle = col;
        ctx.fillRect(len * 0.7, -3 - tier * 0.5, len * 0.3, 6 + tier);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2 + tier; i++) {
            ctx.beginPath();
            ctx.moveTo(8 + i * 8, -6 - tier);
            ctx.lineTo(8 + i * 8, 6 + tier);
            ctx.stroke();
        }
    }
}
