// Enemy Entity with high-quality unique avatars & rich animations (v1.2)
class Enemy {
    constructor(id, x, y, multiplier = 1) {
        this.id = id;
        this.data = getEnemyStats(id, multiplier);
        this.x = x;
        this.y = y;
        this.hp = this.data.hp;
        this.maxHp = this.data.hp;
        this.state = 'walk';
        this.animTimer = 0;
        this.attackCooldown = 0;
        this.target = null;
        this.facing = -1;
        this.hitFlash = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.offsetY = (Math.random() - 0.5) * 20;
        this.tokenGiven = false;
        this.burnTimer = 0;
        this.burnDps = 0;
        this.slowTimer = 0;
        this.phase = 1;
        this.spawnTimer = 0.35;
        this.attackPhase = 0;
        this.glowPulse = Math.random() * Math.PI * 2;
    }

    update(dt, troops, castle, particles, combat) {
        if (this.dead) {
            this.deathTimer += dt;
            return;
        }
        if (this.spawnTimer > 0) {
            this.spawnTimer -= dt;
            this.state = 'spawn';
            return;
        }

        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.animTimer += dt;
        this.glowPulse += dt * 2.5;
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);

        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= this.burnDps * dt;
            if (Math.random() < 0.3) particles.emit(this.x, this.y - 10, { count: 1, color: '#e74c3c', size: 3, speed: 20, life: 0.3 });
            if (this.hp <= 0) this.die(particles);
        }
        if (this.slowTimer > 0) this.slowTimer -= dt;

        const speedMul = this.slowTimer > 0 ? 0.45 : 1;
        const behavior = this.data.behavior || 'direct';
        const distToCastle = Math.hypot(this.x - castle.x, this.y - castle.y);

        let nearestTroop = null;
        let nearestDist = Infinity;
        for (const t of troops) {
            if (t.dead) continue;
            const d = Math.hypot(t.x - this.x, t.y - this.y);
            if (d < nearestDist) {
                nearestDist = d;
                nearestTroop = t;
            }
        }

        if (nearestTroop && nearestDist < this.data.range + 20) {
            this.target = nearestTroop;
            this.state = 'attack';
            this.facing = nearestTroop.x > this.x ? 1 : -1;
            if (this.attackCooldown <= 0) {
                const dmg = this.data.damage;
                nearestTroop.takeDamage(dmg, particles);
                combat.spawnDamageNumber(nearestTroop.x, nearestTroop.y - 30, Math.round(dmg), false);
                this.attackCooldown = 1 / this.data.attackSpeed;
                this.attackPhase = 0;
                particles.emitHit(nearestTroop.x, nearestTroop.y - 10, this.data.color);
            } else {
                this.attackPhase += dt * 7;
            }
        } else if (distToCastle < this.data.range + 30) {
            this.target = castle;
            this.state = 'attack';
            this.facing = -1;
            if (this.attackCooldown <= 0) {
                castle.takeDamage(this.data.damage);
                particles.emitHit(castle.x - 40, castle.y, '#e74c3c');
                this.attackCooldown = 1 / this.data.attackSpeed;
                this.attackPhase = 0;
            } else {
                this.attackPhase += dt * 7;
            }
        } else {
            this.state = 'walk';
            this.facing = -1;
            this.x -= this.data.speed * speedMul * dt;
            this.y += Math.sin(this.animTimer * 2 + this.offsetY) * 8 * dt;
        }

        if (behavior === 'heal' && this.attackCooldown <= 0) {
            for (const e of window.game?.enemies || []) {
                if (e !== this && !e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 150) {
                    e.hp = Math.min(e.maxHp, e.hp + (this.data.healAmount || 20));
                    particles.emit(e.x, e.y - 20, { count: 5, color: '#1abc9c', size: 3, speed: 30, life: 0.5, gravity: -40 });
                    this.attackCooldown = 2;
                    break;
                }
            }
        }

        if (this.data.type === 'boss') {
            const ratio = this.hp / this.maxHp;
            if (ratio < 0.3) this.phase = 3;
            else if (ratio < 0.6) this.phase = 2;
        }
    }

    takeDamage(amount, source, isCrit, particles) {
        if (this.dead) return 0;
        let dmg = amount;
        dmg = Math.max(1, dmg - this.data.armor * 0.35);
        this.hp -= dmg;
        this.hitFlash = 0.14;
        particles.emitHit(this.x, this.y - 15, isCrit ? '#f1c40f' : '#fff');
        if (isCrit) particles.emit(this.x, this.y - 20, { count: 4, color: '#f1c40f', size: 4, speed: 60, life: 0.3 });

        if (source && source.stats) {
            if (source.stats.special === 'burn' || source.stats.attackType === 'fire') {
                this.burnTimer = 2.5;
                this.burnDps = dmg * 0.25;
            }
            if (source.stats.special === 'slow' || source.stats.attackType === 'ice') {
                this.slowTimer = 2.0;
            }
        }

        if (this.hp <= 0) this.die(particles);
        return dmg;
    }

    die(particles) {
        this.dead = true;
        this.state = 'death';
        this.deathTimer = 0;
        particles.emitDeath(this.x, this.y, this.data.color);
        if (this.data.type === 'boss') {
            particles.emitExplosion(this.x, this.y, this.data.color);
        }
    }

    draw(ctx) {
        if (this.dead && this.deathTimer > 1.55) return;
        const alpha = this.dead ? Math.max(0, 1 - this.deathTimer / 1.5) : 1;
        ctx.globalAlpha = alpha;

        const s = this.data.size * 1.22;
        let bob = 0;
        let scaleY = 1;
        let rot = 0;

        if (this.state === 'spawn') {
            const t = 1 - this.spawnTimer / 0.35;
            scaleY = 0.2 + t * 0.8;
            bob = -25 * (1 - t);
            ctx.globalAlpha = alpha * Math.min(1, t * 1.5);
        } else if (this.state === 'walk') {
            bob = Math.sin(this.animTimer * 7) * 3.5;
        } else if (this.state === 'attack') {
            const swing = Math.sin(Math.min(this.attackPhase, 1) * Math.PI) * 0.4;
            rot = this.facing * swing;
            bob = -Math.sin(Math.min(this.attackPhase, 1) * Math.PI) * 5;
        } else if (this.state === 'hit') {
            bob = Math.sin(this.hitFlash * 50) * 4;
        } else if (this.state === 'death') {
            bob = this.deathTimer * 30;
            scaleY = Math.max(0.15, 1 - this.deathTimer * 0.65);
            rot = this.facing * this.deathTimer * 1.1;
        }

        const y = this.y + this.offsetY + bob;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + s * 0.6, s * 0.9, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(this.x, y);
        ctx.scale(this.facing, scaleY);
        ctx.rotate(rot);

        const flash = this.hitFlash > 0;
        const baseCol = flash ? '#ffffff' : this.data.color;
        this._drawAvatar(ctx, s, baseCol, flash);

        if (this.data.type === 'boss' && !flash) {
            const glow = 0.3 + Math.sin(this.glowPulse) * 0.2;
            ctx.globalAlpha = alpha * glow;
            ctx.strokeStyle = this.data.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, -s * 0.3, s * 1.1, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, -s * 1.5);
            ctx.lineTo(-s * 0.15, -s * 1.75);
            ctx.lineTo(0, -s * 1.5);
            ctx.lineTo(s * 0.15, -s * 1.75);
            ctx.lineTo(s * 0.3, -s * 1.5);
            ctx.lineTo(s * 0.25, -s * 1.35);
            ctx.lineTo(-s * 0.25, -s * 1.35);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#0a0a0a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();

        if (!this.dead) {
            const barW = this.data.type === 'boss' ? 55 : 34;
            const ratio = Math.max(0, this.hp / this.maxHp);
            const barY = y - s * (this.data.type === 'boss' ? 2.1 : 1.85);
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(this.x - barW / 2 - 1, barY - 1, barW + 2, 7);
            ctx.fillStyle = '#111';
            ctx.fillRect(this.x - barW / 2, barY, barW, 5);
            const hpCol = ratio > 0.5 ? '#e74c3c' : ratio > 0.25 ? '#c0392b' : '#922b21';
            ctx.fillStyle = hpCol;
            ctx.fillRect(this.x - barW / 2, barY, barW * ratio, 5);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(this.x - barW / 2, barY, barW * ratio, 2);
        }

        if (this.burnTimer > 0) {
            ctx.fillStyle = `rgba(231,76,60,${0.4 + Math.sin(this.animTimer * 10) * 0.2})`;
            ctx.beginPath();
            ctx.arc(this.x, y - s * 0.5, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    _drawAvatar(ctx, s, col, flash) {
        const darker = flash ? '#ccc' : this._darken(col, 0.5);
        const lighter = flash ? '#fff' : this._lighten(col, 0.3);
        const outline = flash ? '#fff' : '#0a0a0a';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        switch (this.id) {
            case 'basic_soldier':
                this._body(ctx, s, col, darker, outline);
                this._head(ctx, s, lighter, outline);
                this._helmetSimple(ctx, s, '#7f8c8d', outline);
                this._sword(ctx, s, '#bdc3c7', this.state === 'attack');
                break;
            case 'fast_runner':
                this._body(ctx, s * 0.9, col, darker, outline);
                this._head(ctx, s * 0.95, lighter, outline);
                this._hood(ctx, s, '#d35400', outline);
                this._dagger(ctx, s, this.state === 'attack');
                break;
            case 'shield_soldier':
                this._body(ctx, s * 1.05, col, darker, outline);
                this._head(ctx, s, lighter, outline);
                this._helmetSimple(ctx, s, '#5d6d7e', outline);
                this._shield(ctx, s, '#95a5a6', '#7f8c8d');
                this._sword(ctx, s * 0.85, '#bdc3c7', this.state === 'attack');
                break;
            case 'archer':
                this._body(ctx, s * 0.9, col, darker, outline);
                this._head(ctx, s, lighter, outline);
                this._hood(ctx, s, '#1e8449', outline);
                this._bow(ctx, s, this.state === 'attack');
                break;
            case 'heavy_warrior':
                this._body(ctx, s * 1.15, col, darker, outline);
                this._armor(ctx, s, lighter, darker);
                this._head(ctx, s, '#e8c39e', outline);
                this._helmetHeavy(ctx, s, '#4a235a', outline);
                this._axe(ctx, s, this.state === 'attack');
                break;
            case 'assassin':
                this._body(ctx, s * 0.85, col, darker, outline);
                this._head(ctx, s, '#2c3e50', outline);
                this._hood(ctx, s, '#1a252f', outline);
                this._dagger(ctx, s, this.state === 'attack');
                break;
            case 'mage':
                this._robe(ctx, s, col, darker, outline);
                this._head(ctx, s, '#f5cba7', outline);
                this._hatWizard(ctx, s, '#6c3483', outline);
                this._staff(ctx, s, '#9b59b6', this.state === 'attack');
                break;
            case 'healer':
                this._robe(ctx, s, col, darker, outline);
                this._head(ctx, s, '#f5cba7', outline);
                this._hatWizard(ctx, s, '#16a085', outline);
                this._staff(ctx, s, '#1abc9c', this.state === 'attack');
                break;
            case 'tank':
                this._body(ctx, s * 1.25, col, darker, outline);
                this._armor(ctx, s * 1.1, lighter, darker);
                this._head(ctx, s, '#d5d8dc', outline);
                this._helmetHeavy(ctx, s, '#2c3e50', outline);
                this._shield(ctx, s * 1.1, '#5d6d7e', '#34495e');
                break;
            case 'berserker':
                this._body(ctx, s * 1.1, col, darker, outline);
                this._head(ctx, s, '#e59866', outline);
                this._helmetSimple(ctx, s, '#922b21', outline);
                this._axe(ctx, s, this.state === 'attack');
                if (!flash) {
                    ctx.fillStyle = 'rgba(192,57,43,0.25)';
                    ctx.beginPath();
                    ctx.arc(0, -s * 0.2, s * 0.8 + Math.sin(this.animTimer * 8) * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'elite_knight':
                this._body(ctx, s * 1.15, col, darker, outline);
                this._armor(ctx, s, lighter, darker);
                this._head(ctx, s, '#f5d0a9', outline);
                this._helmetKnight(ctx, s, '#1a5276', outline);
                this._sword(ctx, s, '#ecf0f1', this.state === 'attack');
                this._shield(ctx, s, '#2980b9', '#1a5276');
                break;
            case 'boss_warlord':
                this._body(ctx, s * 1.3, col, darker, outline);
                this._armor(ctx, s * 1.2, lighter, darker);
                this._head(ctx, s * 1.1, '#e8c39e', outline);
                this._helmetHeavy(ctx, s * 1.1, '#7b241c', outline);
                this._axe(ctx, s * 1.15, this.state === 'attack');
                this._shield(ctx, s * 1.1, '#c0392b', '#922b21');
                break;
            case 'boss_dragon':
                this._dragon(ctx, s, col, darker, outline, flash);
                break;
            case 'boss_final':
                this._body(ctx, s * 1.4, col, darker, outline);
                this._armor(ctx, s * 1.3, lighter, darker);
                this._head(ctx, s * 1.15, '#f5cba7', outline);
                this._helmetHeavy(ctx, s * 1.15, '#1a1a2e', outline);
                this._sword(ctx, s * 1.2, '#f1c40f', this.state === 'attack');
                this._staff(ctx, s * 1.1, '#e74c3c', this.state === 'attack');
                break;
            default:
                this._body(ctx, s, col, darker, outline);
                this._head(ctx, s, lighter, outline);
        }
    }

    _body(ctx, s, col, darker, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.2, s * 0.5, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.fillStyle = darker;
        ctx.beginPath();
        ctx.ellipse(-s * 0.1, -s * 0.3, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = darker;
        ctx.fillRect(-s * 0.3, s * 0.2, s * 0.24, s * 0.45);
        ctx.fillRect(s * 0.06, s * 0.2, s * 0.24, s * 0.45);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(-s * 0.3, s * 0.2, s * 0.24, s * 0.45);
        ctx.strokeRect(s * 0.06, s * 0.2, s * 0.24, s * 0.45);
    }

    _head(ctx, s, skin, outline) {
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, -s * 1.0, s * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(-s * 0.11, -s * 1.03, s * 0.07, 0, Math.PI * 2);
        ctx.arc(s * 0.13, -s * 1.03, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 1.12);
        ctx.lineTo(-s * 0.05, -s * 1.08);
        ctx.moveTo(s * 0.22, -s * 1.12);
        ctx.lineTo(s * 0.07, -s * 1.08);
        ctx.stroke();
    }

    _helmetSimple(ctx, s, col, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, -s * 1.1, s * 0.38, Math.PI, 0);
        ctx.lineTo(s * 0.38, -s * 0.9);
        ctx.lineTo(-s * 0.38, -s * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _helmetHeavy(ctx, s, col, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, -s * 1.05, s * 0.42, Math.PI, 0);
        ctx.lineTo(s * 0.44, -s * 0.8);
        ctx.lineTo(-s * 0.44, -s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.55);
        ctx.lineTo(s * 0.14, -s * 1.2);
        ctx.lineTo(-s * 0.14, -s * 1.2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.stroke();
    }

    _helmetKnight(ctx, s, col, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, -s * 1.08, s * 0.4, Math.PI * 0.85, Math.PI * 0.15);
        ctx.lineTo(s * 0.42, -s * 0.85);
        ctx.lineTo(-s * 0.42, -s * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-s * 0.24, -s * 1.12, s * 0.48, s * 0.14);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _hood(ctx, s, col, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, -s * 1.05, s * 0.42, Math.PI * 1.15, -0.15);
        ctx.lineTo(s * 0.48, -s * 0.65);
        ctx.lineTo(-s * 0.48, -s * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    _hatWizard(ctx, s, col, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(-s * 0.48, -s * 0.9);
        ctx.lineTo(0, -s * 1.9);
        ctx.lineTo(s * 0.48, -s * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.9, s * 0.52, s * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    _armor(ctx, s, light, dark) {
        ctx.fillStyle = light;
        ctx.fillRect(-s * 0.38, -s * 0.5, s * 0.76, s * 0.22);
        ctx.fillStyle = dark;
        ctx.fillRect(-s * 0.32, -s * 0.25, s * 0.64, s * 0.16);
    }

    _robe(ctx, s, col, darker, outline) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(-s * 0.58, s * 0.6);
        ctx.lineTo(-s * 0.42, -s * 0.45);
        ctx.lineTo(s * 0.42, -s * 0.45);
        ctx.lineTo(s * 0.58, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.fillStyle = darker;
        ctx.beginPath();
        ctx.arc(0, -s * 0.4, s * 0.38, 0, Math.PI);
        ctx.fill();
    }

    _sword(ctx, s, blade, attacking) {
        const ang = attacking ? -0.7 : -0.3;
        ctx.save();
        ctx.translate(s * 0.4, -s * 0.25);
        ctx.rotate(ang);
        ctx.fillStyle = blade;
        ctx.fillRect(0, -s * 0.09, s * 1.0, s * 0.18);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(0, -s * 0.09, s * 1.0, s * 0.18);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 0.4);
        ctx.restore();
    }

    _axe(ctx, s, attacking) {
        const ang = attacking ? -0.85 : -0.35;
        ctx.save();
        ctx.translate(s * 0.35, -s * 0.2);
        ctx.rotate(ang);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.9, 0);
        ctx.stroke();
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath();
        ctx.moveTo(s * 0.7, -s * 0.35);
        ctx.lineTo(s * 1.15, 0);
        ctx.lineTo(s * 0.7, s * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    _dagger(ctx, s, attacking) {
        const ang = attacking ? -0.9 : -0.4;
        ctx.save();
        ctx.translate(s * 0.3, -s * 0.2);
        ctx.rotate(ang);
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.7, -s * 0.08);
        ctx.lineTo(s * 0.75, 0);
        ctx.lineTo(s * 0.7, s * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-s * 0.15, -s * 0.06, s * 0.2, s * 0.12);
        ctx.restore();
    }

    _bow(ctx, s, attacking) {
        ctx.save();
        ctx.translate(s * 0.4, -s * 0.25);
        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.55, -1.15, 1.15);
        ctx.stroke();
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.52);
        ctx.lineTo(attacking ? s * 0.3 : 0, 0);
        ctx.lineTo(0, s * 0.52);
        ctx.stroke();
        ctx.restore();
    }

    _staff(ctx, s, gem, attacking) {
        ctx.save();
        ctx.translate(s * 0.35, -s * 0.05);
        ctx.rotate(attacking ? -0.55 : -0.2);
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.45);
        ctx.lineTo(0, -s * 1.15);
        ctx.stroke();
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.arc(0, -s * 1.2, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = gem + '55';
        ctx.beginPath();
        ctx.arc(0, -s * 1.2, s * 0.32 + Math.sin(this.animTimer * 6) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _shield(ctx, s, col, dark) {
        ctx.save();
        ctx.translate(-s * 0.5, -s * 0.1);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.42);
        ctx.lineTo(s * 0.38, -s * 0.28);
        ctx.lineTo(s * 0.38, s * 0.28);
        ctx.lineTo(0, s * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(s * 0.16, 0, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
    }

    _dragon(ctx, s, col, darker, outline, flash) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.1, s * 0.7, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(s * 0.55, -s * 0.35, s * 0.35, s * 0.28, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = flash ? '#fff' : '#f1c40f';
        ctx.beginPath();
        ctx.arc(s * 0.7, -s * 0.4, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(s * 0.72, -s * 0.4, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = darker;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.3);
        ctx.quadraticCurveTo(-s * 0.9, -s * 1.1, -s * 0.5, -s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.1, -s * 0.25);
        ctx.quadraticCurveTo(s * 0.8, -s * 1.0, s * 0.4, -s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-s * 0.6, 0);
        ctx.quadraticCurveTo(-s * 1.1, s * 0.3, -s * 0.9, s * 0.6);
        ctx.stroke();
        if (this.state === 'attack' && !flash) {
            ctx.fillStyle = 'rgba(231,76,60,0.7)';
            ctx.beginPath();
            ctx.moveTo(s * 0.85, -s * 0.3);
            ctx.lineTo(s * 1.5, -s * 0.5);
            ctx.lineTo(s * 1.4, -s * 0.1);
            ctx.closePath();
            ctx.fill();
        }
    }

    _darken(hex, amount) {
        const c = this._hexToRgb(hex);
        return `rgb(${Math.floor(c.r * amount)},${Math.floor(c.g * amount)},${Math.floor(c.b * amount)})`;
    }
    _lighten(hex, amount) {
        const c = this._hexToRgb(hex);
        return `rgb(${Math.min(255, Math.floor(c.r + (255 - c.r) * amount))},${Math.min(255, Math.floor(c.g + (255 - c.g) * amount))},${Math.min(255, Math.floor(c.b + (255 - c.b) * amount))})`;
    }
    _hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16) || 120;
        const g = parseInt(hex.slice(3, 5), 16) || 80;
        const b = parseInt(hex.slice(5, 7), 16) || 80;
        return { r, g, b };
    }
}
