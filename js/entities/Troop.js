// Premium Troop Entity - Clash-inspired stylized 2.5D characters (v1.7)
// Unique silhouettes, multi-layer equipment, visual evolution by level tier
class Troop {
    constructor(id, x, y, level, lane = 0) {
        this.id = id;
        this.data = TROOPS_DATA[id];
        this.stats = getTroopStats(id, level);
        this.x = x;
        this.y = y;
        this.level = level;
        this.lane = lane;
        this.hp = this.stats.hp;
        this.maxHp = this.stats.maxHp;
        this.state = 'idle';
        this.animTimer = 0;
        this.attackCooldown = 0;
        this.target = null;
        this.facing = 1;
        this.hitFlash = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.offsetY = (Math.random() - 0.5) * 12;
        this.spawnTimer = 0.5;
        this.attackPhase = 0;
        this.walkPhase = 0;
        this.glowPulse = Math.random() * Math.PI * 2;
        this.legPhase = 0;
        this.armPhase = 0;
        this.breathPhase = Math.random() * Math.PI * 2;
        this.specialTimer = 0;
        this.tier = this._calcTier(level);
        this._legSwing = 0;
        this._armSwing = 0;
        // Asset-based visual (v1.9) — separated from gameplay
        this.visual = null;
        this._pendingAttackDamage = null;
        this._tryAttachVisual();
    }

    _tryAttachVisual() {
        const pack = window.game?.troopAssets?.[this.id];
        if (pack && typeof TroopVisual !== 'undefined') {
            this.visual = new TroopVisual(pack);
            this.visual.scale = 1.0 + this.tier * 0.03;
            this.visual.setState('idle');
            return true;
        }
        // Retry shortly if assets still loading
        if (this.id === 'swordsman' && !this._visualRetry) {
            this._visualRetry = true;
            setTimeout(() => { this._visualRetry = false; this._tryAttachVisual(); }, 200);
        }
        return false;
    }

    _calcTier(level) {
        if (level >= 50) return 5; // Legendary
        if (level >= 40) return 4; // High-tier
        if (level >= 30) return 3; // Elite
        if (level >= 20) return 2; // Advanced
        if (level >= 10) return 1; // Improved
        return 0; // Basic
    }

    update(dt, enemies, particles, combat) {
        if (this.dead) { this.deathTimer += dt; return; }
        if (this.spawnTimer > 0) {
            this.spawnTimer -= dt;
            this.state = 'spawn';
            return;
        }
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.animTimer += dt;
        this.glowPulse += dt * 2.5;
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        this.breathPhase += dt * 2.4;
        this.legPhase += dt * (this.state === 'attack' ? 5 : 5.5);
        this.armPhase += dt * (this.state === 'attack' ? 12 : 4);

        this.target = null;
        let closestDist = Infinity;
        for (const e of enemies) {
            if (e.dead) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist < this.stats.range && dist < closestDist) {
                closestDist = dist;
                this.target = e;
            }
        }

        if (this.target) {
            this.facing = this.target.x > this.x ? 1 : -1;
            if (this.attackCooldown <= 0) {
                this.state = 'attack';
                this.attackPhase = 0;
                this.attackCooldown = 1 / this.stats.attackSpeed;
                // Sync damage to attack hit frame when using assets
                if (this.visual) {
                    this._pendingAttackDamage = { particles, combat };
                    this.visual.setState('attack', { force: true, onComplete: () => {
                        if (this.visual && !this.dead) this.visual.setState('idle');
                        this.state = 'idle';
                    }});
                } else {
                    this.performAttack(particles, combat);
                }
            } else if (this.state === 'attack') {
                this.attackPhase += dt * 6.5;
                // Fire damage on hit frame
                if (this.visual && this._pendingAttackDamage && this.visual.isHitFrame()) {
                    this.performAttack(this._pendingAttackDamage.particles, this._pendingAttackDamage.combat);
                    this._pendingAttackDamage = null;
                }
                if (this.attackPhase > 1.2 && !this.visual) this.state = 'idle';
            } else {
                this.state = 'idle';
                if (this.visual && this.visual.state !== 'attack' && this.visual.state !== 'hit') {
                    this.visual.setState('idle');
                }
            }
        } else {
            this.state = 'idle';
            if (this.visual && this.visual.state !== 'attack' && this.visual.state !== 'hit' && this.visual.state !== 'death') {
                this.visual.setState('idle');
            }
        }
        if (this.visual) {
            this.visual.facing = this.facing;
            this.visual.update(dt);
            // Late damage fallback if hit frame missed
            if (this._pendingAttackDamage && this.visual.state !== 'attack') {
                this.performAttack(this._pendingAttackDamage.particles, this._pendingAttackDamage.combat);
                this._pendingAttackDamage = null;
            }
        }
    }

    performAttack(particles, combat) {
        if (!this.target || this.target.dead) return;
        const isCrit = Math.random() < this.stats.critChance;
        let dmg = this.stats.damage * (isCrit ? 1.8 : 1);
        if (this.stats.special === 'armor_pierce' || this.stats.special === 'pierce') dmg *= 1.3;
        combat.dealDamage(this.target, dmg, this, isCrit, particles);
        this.animTimer = 0;
        const col = this.stats.color;
        const q = getQuality();
        const cnt = Math.round(6 * (q.particleMult || 1));
        if (this.data.class === 'ranged' || this.id.includes('mage') || this.id === 'cannon_soldier') {
            particles.emit(this.x + this.facing * 22, this.y - 18, {
                count: cnt, color: col, size: 3.5, speed: 70, life: 0.3, gravity: -25, type: 'spark'
            });
        } else {
            // Melee impact - richer for swordsman
            const n = this.id === 'swordsman' ? Math.round(cnt * 1.8) : cnt;
            particles.emit(this.target.x, this.target.y - 12, {
                count: n, color: col, size: this.id === 'swordsman' ? 5 : 4, speed: 90, life: 0.4, gravity: 45
            });
            if (this.id === 'swordsman') {
                particles.emit(this.x + this.facing * 18, this.y - 20, {
                    count: 5, color: '#f1c40f', size: 3, speed: 50, life: 0.25, gravity: -10, type: 'spark'
                });
            }
        }
    }

    takeDamage(amount, particles) {
        if (this.dead) return;
        this.hp -= amount;
        this.hitFlash = 0.2;
        this.state = 'hit';
        if (this.visual) {
            this.visual.flash();
            this.visual.setState('hit', { force: true, onComplete: () => {
                if (this.visual && !this.dead) this.visual.setState('idle');
            }});
        }
        particles.emitHit(this.x, this.y - 12, this.stats.color);
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.deathTimer = 0;
            this.state = 'death';
            if (this.visual) this.visual.setState('death', { force: true });
            particles.emitDeath(this.x, this.y, this.stats.color);
        }
    }

    // ========== PREMIUM DRAW ==========
    draw(ctx) {
        if (this.dead && this.deathTimer > 1.4) return;
        const alpha = this.dead ? Math.max(0, 1 - this.deathTimer / 1.35) : 1;
        ctx.globalAlpha = alpha;

        // Asset-based visual rendering (PNG frames via AssetManager)
        if (!this.visual) this._tryAttachVisual();
        if (this.visual) {
            this.visual.alpha = alpha;
            this.visual.scale = 1.0 + this.tier * 0.03;
            const drawn = this.visual.draw(ctx, this.x, this.y + this.offsetY);
            if (drawn) {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.beginPath();
                ctx.arc(this.x + 18, this.y + this.offsetY - 58, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.tier >= 4 ? '#e74c3c' : '#f1c40f';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = '#f1c40f';
                ctx.font = 'bold 10px Tahoma, Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.level, this.x + 18, this.y + this.offsetY - 58);
                if (this.hp < this.maxHp && !this.dead) {
                    const barW = 34;
                    const ratio = this.hp / this.maxHp;
                    const by = this.y + this.offsetY - 68;
                    ctx.fillStyle = 'rgba(0,0,0,0.75)';
                    ctx.fillRect(this.x - barW / 2 - 1, by - 1, barW + 2, 5);
                    ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
                    ctx.fillRect(this.x - barW / 2, by, barW * ratio, 3);
                }
                ctx.globalAlpha = 1;
                return;
            }
        }

        const q = getQuality();
        const tier = this.tier;
        // Balanced readable size with slight tier growth
        const s = this.stats.size * (1.12 + tier * 0.04) * (q.detail >= 3 ? 1.06 : 1);

        let bob = 0, scaleY = 1, rot = 0;
        let legSwing = 0, armSwing = 0;

        // Animation set: spawn, idle, attack (windup+strike), hit, death
        if (this.state === 'spawn') {
            const t = 1 - this.spawnTimer / 0.5;
            scaleY = 0.2 + t * 0.8;
            bob = -35 * (1 - t) * (1 - t);
            ctx.globalAlpha = alpha * Math.min(1, t * 1.8);
        } else if (this.state === 'idle') {
            bob = Math.sin(this.breathPhase) * 3.0;
            scaleY = 1 + Math.sin(this.breathPhase) * 0.022;
            rot = Math.sin(this.breathPhase * 0.6) * 0.025;
            armSwing = Math.sin(this.breathPhase) * 0.08;
            legSwing = Math.sin(this.legPhase) * 0.1;
        } else if (this.state === 'attack') {
            const p = Math.min(1, this.attackPhase);
            if (p < 0.3) {
                // Anticipation
                rot = this.facing * (-0.5 * (p / 0.3));
                bob = -2;
                armSwing = -0.6;
            } else {
                // Impact + follow-through
                const strike = (p - 0.3) / 0.7;
                rot = this.facing * (-0.5 + Math.sin(strike * Math.PI) * 1.05);
                bob = -Math.sin(strike * Math.PI) * 7;
                armSwing = -0.6 + Math.sin(strike * Math.PI) * 1.25;
            }
        } else if (this.state === 'hit') {
            bob = Math.sin(this.hitFlash * 48) * 6;
            rot = this.facing * Math.sin(this.hitFlash * 22) * 0.2;
        } else if (this.state === 'death') {
            bob = this.deathTimer * 38;
            scaleY = Math.max(0.1, 1 - this.deathTimer * 0.78);
            rot = this.facing * this.deathTimer * 1.3;
        }
        this._legSwing = legSwing;
        this._armSwing = armSwing;

        const y = this.y + this.offsetY + bob;

        // Soft ground shadow
        if (q.shadow !== false) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + s * 0.7, s * 0.75, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(this.x, y);
        ctx.scale(this.facing, scaleY);
        ctx.rotate(rot);

        const flash = this.hitFlash > 0;
        this._drawPremiumCharacter(ctx, s, flash, tier, q);

        // Level badge
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.arc(s * 0.5, -s * 1.65, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = tier >= 4 ? '#e74c3c' : tier >= 2 ? '#f1c40f' : '#bdc3c7';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 10px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.level, s * 0.5, -s * 1.65);

        // Tier glow / legendary aura
        if (q.glow && tier >= 2 && !flash) {
            const glow = 0.15 + Math.sin(this.glowPulse) * 0.1 + tier * 0.04;
            ctx.globalAlpha = alpha * glow;
            ctx.strokeStyle = this.stats.color;
            ctx.lineWidth = 2 + tier * 0.5;
            ctx.beginPath();
            ctx.arc(0, -s * 0.35, s * (0.85 + tier * 0.06), 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = alpha;
        }
        if (tier >= 5 && !flash) {
            // Legendary particles orbit
            ctx.fillStyle = '#f1c40f';
            for (let i = 0; i < 4; i++) {
                const a = this.animTimer * 2 + i * Math.PI / 2;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * s * 0.9, -s * 0.4 + Math.sin(a) * s * 0.35, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();

        // HP bar
        if (this.hp < this.maxHp && !this.dead) {
            const barW = 34;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(this.x - barW / 2 - 1, y - s * 1.95 - 1, barW + 2, 5);
            ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(this.x - barW / 2, y - s * 1.95, barW * ratio, 3);
        }
        ctx.globalAlpha = 1;
    }

    _drawPremiumCharacter(ctx, s, flash, tier, q) {
        const col = flash ? '#ffffff' : this.stats.color;
        const dark = flash ? '#ddd' : this._shade(col, 0.55);
        const light = flash ? '#fff' : this._shade(col, 1.35);
        const outline = flash ? '#fff' : '#1a1a1a';
        const skin = flash ? '#fff' : '#e8c39e';
        const skinDark = flash ? '#eee' : '#c9a07a';

        // Class-specific full character
        switch (this.id) {
            case 'swordsman': this._drawSwordsman(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            case 'spearman': this._drawSpearman(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            case 'archer': this._drawArcher(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            case 'crossbowman': this._drawCrossbowman(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            case 'knight': this._drawKnight(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            case 'heavy_guard': this._drawHeavyGuard(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            case 'mage': this._drawMage(ctx, s, col, dark, light, outline, skin, skinDark, tier, '#8e44ad'); break;
            case 'fire_mage': this._drawMage(ctx, s, col, dark, light, outline, skin, skinDark, tier, '#c0392b'); break;
            case 'ice_mage': this._drawMage(ctx, s, col, dark, light, outline, skin, skinDark, tier, '#2980b9'); break;
            case 'cannon_soldier': this._drawCannonSoldier(ctx, s, col, dark, light, outline, skin, skinDark, tier); break;
            default: this._drawSwordsman(ctx, s, col, dark, light, outline, skin, skinDark, tier);
        }
    }

    // --- Shared body parts ---
    _legs(ctx, s, dark, outline, leg) {
        ctx.fillStyle = dark;
        ctx.save();
        ctx.translate(-s * 0.14, s * 0.22);
        ctx.rotate(leg);
        ctx.beginPath();
        ctx.roundRect(-s * 0.1, 0, s * 0.2, s * 0.48, 3);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        // Boot
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-s * 0.12, s * 0.4, s * 0.24, s * 0.12);
        ctx.restore();
        ctx.save();
        ctx.translate(s * 0.14, s * 0.22);
        ctx.rotate(-leg);
        ctx.beginPath();
        ctx.roundRect(-s * 0.1, 0, s * 0.2, s * 0.48, 3);
        ctx.fillStyle = dark;
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-s * 0.12, s * 0.4, s * 0.24, s * 0.12);
        ctx.restore();
    }

    _torso(ctx, s, col, dark, light, outline, wide = 1) {
        // Main body with gradient feel
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.28, s * 0.42 * wide, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 2.2; ctx.stroke();
        // Chest highlight
        ctx.fillStyle = light;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(-s * 0.08, -s * 0.4, s * 0.18 * wide, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Belt
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-s * 0.38 * wide, s * 0.05, s * 0.76 * wide, s * 0.1);
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, s * 0.1, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    _head(ctx, s, skin, skinDark, outline) {
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, -s * 1.0, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();
        // Cheek
        ctx.fillStyle = skinDark;
        ctx.beginPath();
        ctx.ellipse(s * 0.1, -s * 0.92, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(-s * 0.1, -s * 1.02, s * 0.055, 0, Math.PI * 2);
        ctx.arc(s * 0.12, -s * 1.02, s * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-s * 0.12, -s * 1.04, s * 0.02, 0, Math.PI * 2);
        ctx.arc(s * 0.1, -s * 1.04, s * 0.02, 0, Math.PI * 2);
        ctx.fill();
    }

    _shoulders(ctx, s, col, outline, tier) {
        const pad = 0.14 + tier * 0.02;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(-s * 0.4, -s * 0.5, s * pad, s * 0.12, -0.4, 0, Math.PI * 2);
        ctx.ellipse(s * 0.4, -s * 0.5, s * pad, s * 0.12, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        if (tier >= 2) {
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(-s * 0.4, -s * 0.5, 2, 0, Math.PI * 2);
            ctx.arc(s * 0.4, -s * 0.5, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- Class designs ---
    _drawSwordsman(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, dark, outline, this._legSwing);
        this._torso(ctx, s, col, dark, light, outline);
        this._shoulders(ctx, s, dark, outline, tier);
        this._head(ctx, s, skin, skinDark, outline);
        // Helmet by tier
        ctx.fillStyle = tier >= 3 ? '#7f8c8d' : '#5d6d7e';
        ctx.beginPath();
        ctx.arc(0, -s * 1.12, s * 0.32, Math.PI, 0);
        ctx.lineTo(s * 0.32, -s * 0.95);
        ctx.lineTo(-s * 0.32, -s * 0.95);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke();
        if (tier >= 2) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(-s * 0.06, -s * 1.35, s * 0.12, s * 0.12);
        }
        if (tier >= 4) {
            // Crest
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(0, -s * 1.5);
            ctx.lineTo(s * 0.1, -s * 1.2);
            ctx.lineTo(-s * 0.1, -s * 1.2);
            ctx.fill();
        }
        // Sword
        const arm = this._armSwing || 0;
        ctx.save();
        ctx.translate(s * 0.35, -s * 0.3);
        ctx.rotate(-0.3 + arm);
        ctx.fillStyle = tier >= 3 ? '#ecf0f1' : '#bdc3c7';
        ctx.fillRect(0, -s * 0.06, s * (0.9 + tier * 0.05), s * 0.12);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-s * 0.15, -s * 0.05, s * 0.18, s * 0.1);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-s * 0.05, -s * 0.14, s * 0.1, s * 0.28);
        ctx.restore();
    }

    _drawSpearman(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, dark, outline, this._legSwing);
        this._torso(ctx, s, col, dark, light, outline, 0.95);
        this._shoulders(ctx, s, dark, outline, tier);
        this._head(ctx, s, skin, skinDark, outline);
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(0, -s * 1.1, s * 0.3, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        // Spear
        const arm = this._armSwing || 0;
        ctx.save();
        ctx.translate(s * 0.25, -s * 0.2);
        ctx.rotate(-0.5 + arm * 0.8);
        ctx.strokeStyle = '#6d4c41';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * (1.3 + tier * 0.08), 0);
        ctx.stroke();
        ctx.fillStyle = tier >= 2 ? '#ecf0f1' : '#bdc3c7';
        ctx.beginPath();
        ctx.moveTo(s * 1.3, 0);
        ctx.lineTo(s * 1.05, -s * 0.1);
        ctx.lineTo(s * 1.05, s * 0.1);
        ctx.fill();
        ctx.restore();
    }

    _drawArcher(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, dark, outline, this._legSwing);
        this._torso(ctx, s, col, dark, light, outline, 0.9);
        this._head(ctx, s, skin, skinDark, outline);
        // Hood
        ctx.fillStyle = '#1e8449';
        ctx.beginPath();
        ctx.arc(0, -s * 1.05, s * 0.35, Math.PI * 1.1, -0.1);
        ctx.lineTo(s * 0.4, -s * 0.7);
        ctx.lineTo(-s * 0.4, -s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        // Bow
        const arm = this._armSwing || 0;
        ctx.save();
        ctx.translate(s * 0.4, -s * 0.25);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.5, -1.0, 1.0);
        ctx.stroke();
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.48);
        ctx.lineTo(arm > 0.3 ? s * 0.2 : 0, 0);
        ctx.lineTo(0, s * 0.48);
        ctx.stroke();
        ctx.restore();
        if (tier >= 2) {
            // Quiver
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(-s * 0.5, -s * 0.5, s * 0.12, s * 0.4);
        }
    }

    _drawCrossbowman(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, dark, outline, this._legSwing);
        this._torso(ctx, s, col, dark, light, outline);
        this._shoulders(ctx, s, dark, outline, tier);
        this._head(ctx, s, skin, skinDark, outline);
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(0, -s * 1.1, s * 0.3, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        // Crossbow
        ctx.save();
        ctx.translate(s * 0.3, -s * 0.25);
        ctx.rotate(this._armSwing * 0.5);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, -s * 0.08, s * 0.85, s * 0.16);
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.65, -s * 0.3);
        ctx.lineTo(s * 0.8, 0);
        ctx.lineTo(s * 0.65, s * 0.3);
        ctx.stroke();
        if (tier >= 2) {
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(s * 0.4, -s * 0.03, s * 0.4, s * 0.06);
        }
        ctx.restore();
    }

    _drawKnight(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, '#5d6d7e', outline, this._legSwing);
        this._torso(ctx, s, col, dark, light, outline, 1.08);
        // Full armor plates by tier
        if (tier >= 1) {
            ctx.fillStyle = light;
            ctx.fillRect(-s * 0.3, -s * 0.55, s * 0.6, s * 0.15);
        }
        if (tier >= 3) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(-s * 0.08, -s * 0.5, s * 0.16, s * 0.08);
        }
        this._shoulders(ctx, s, '#7f8c8d', outline, tier);
        this._head(ctx, s, skin, skinDark, outline);
        // Knight helmet with visor
        ctx.fillStyle = tier >= 3 ? '#95a5a6' : '#7f8c8d';
        ctx.beginPath();
        ctx.arc(0, -s * 1.08, s * 0.34, Math.PI * 0.9, Math.PI * 0.1);
        ctx.lineTo(s * 0.34, -s * 0.88);
        ctx.lineTo(-s * 0.34, -s * 0.88);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(-s * 0.2, -s * 1.12, s * 0.4, s * 0.1);
        ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();
        // Sword
        ctx.save();
        ctx.translate(s * 0.38, -s * 0.28);
        ctx.rotate(-0.25 + (this._armSwing || 0));
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(0, -s * 0.05, s * 1.0, s * 0.1);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-s * 0.08, -s * 0.12, s * 0.12, s * 0.24);
        ctx.restore();
    }

    _drawHeavyGuard(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, dark, outline, this._legSwing * 0.6);
        this._torso(ctx, s, col, dark, light, outline, 1.2);
        this._shoulders(ctx, s, dark, outline, tier);
        this._head(ctx, s, skin, skinDark, outline);
        // Heavy helm
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, -s * 1.05, s * 0.36, Math.PI, 0);
        ctx.lineTo(s * 0.36, -s * 0.85);
        ctx.lineTo(-s * 0.36, -s * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.45);
        ctx.lineTo(s * 0.12, -s * 1.15);
        ctx.lineTo(-s * 0.12, -s * 1.15);
        ctx.fill();
        // Shield
        ctx.fillStyle = tier >= 2 ? '#3498db' : '#5d6d7e';
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, -s * 0.5);
        ctx.lineTo(-s * 0.2, -s * 0.35);
        ctx.lineTo(-s * 0.2, s * 0.25);
        ctx.lineTo(-s * 0.55, s * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
        if (tier >= 3) {
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(-s * 0.38, -s * 0.05, s * 0.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawMage(ctx, s, col, dark, light, outline, skin, skinDark, tier, hatCol) {
        // Robe
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.55);
        ctx.lineTo(-s * 0.35, -s * 0.45);
        ctx.lineTo(s * 0.35, -s * 0.45);
        ctx.lineTo(s * 0.5, s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
        // Collar
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(0, -s * 0.4, s * 0.3, 0, Math.PI);
        ctx.fill();
        this._head(ctx, s, skin, skinDark, outline);
        // Wizard hat
        ctx.fillStyle = hatCol;
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, -s * 0.9);
        ctx.lineTo(0, -s * (1.7 + tier * 0.05));
        ctx.lineTo(s * 0.4, -s * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.9, s * 0.45, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();
        // Staff
        ctx.save();
        ctx.translate(s * 0.35, -s * 0.1);
        ctx.rotate(-0.2 + (this._armSwing || 0) * 0.5);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.35);
        ctx.lineTo(0, -s * 1.0);
        ctx.stroke();
        ctx.fillStyle = hatCol;
        ctx.beginPath();
        ctx.arc(0, -s * 1.05, s * 0.14 + tier * 0.02, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hatCol + '66';
        ctx.beginPath();
        ctx.arc(0, -s * 1.05, s * 0.22 + Math.sin(this.animTimer * 4) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawCannonSoldier(ctx, s, col, dark, light, outline, skin, skinDark, tier) {
        this._legs(ctx, s, dark, outline, this._legSwing);
        this._torso(ctx, s, col, dark, light, outline, 1.05);
        this._shoulders(ctx, s, dark, outline, tier);
        this._head(ctx, s, skin, skinDark, outline);
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(0, -s * 1.1, s * 0.3, Math.PI, 0);
        ctx.fill();
        // Small cannon on shoulder
        ctx.save();
        ctx.translate(s * 0.3, -s * 0.2);
        ctx.rotate(this._armSwing * 0.3);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, -s * 0.12, s * 0.7, s * 0.24);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(s * 0.7, 0, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
        if (tier >= 2) {
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.arc(s * 0.85, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _shade(hex, mult) {
        if (!hex || hex[0] !== '#') return hex;
        let r = parseInt(hex.slice(1, 3), 16) || 100;
        let g = parseInt(hex.slice(3, 5), 16) || 100;
        let b = parseInt(hex.slice(5, 7), 16) || 100;
        if (mult > 1) {
            r = Math.min(255, Math.floor(r + (255 - r) * (mult - 1)));
            g = Math.min(255, Math.floor(g + (255 - g) * (mult - 1)));
            b = Math.min(255, Math.floor(b + (255 - b) * (mult - 1)));
        } else {
            r = Math.floor(r * mult);
            g = Math.floor(g * mult);
            b = Math.floor(b * mult);
        }
        return `rgb(${r},${g},${b})`;
    }

    // UI face portrait
    static drawFace(ctx, id, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        const s = size;
        const grd = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s);
        grd.addColorStop(0, color || '#4a90d9');
        grd.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f5d0a9';
        ctx.beginPath();
        ctx.arc(0, s * 0.08, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(-s * 0.15, s * 0.02, s * 0.08, 0, Math.PI * 2);
        ctx.arc(s * 0.15, s * 0.02, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        // Minimal class headgear
        const gear = {
            swordsman: '#5d6d7e', spearman: '#27ae60', archer: '#1e8449',
            crossbowman: '#34495e', knight: '#7f8c8d', heavy_guard: '#2c3e50',
            mage: '#8e44ad', fire_mage: '#c0392b', ice_mage: '#2980b9',
            cannon_soldier: '#5d4037'
        };
        ctx.fillStyle = gear[id] || '#5d6d7e';
        if (id && id.includes('mage')) {
            ctx.beginPath();
            ctx.moveTo(-s * 0.45, -s * 0.05);
            ctx.lineTo(0, -s * 0.9);
            ctx.lineTo(s * 0.45, -s * 0.05);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, -s * 0.25, s * 0.45, Math.PI, 0);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Polyfill roundRect if needed
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
    };
}
