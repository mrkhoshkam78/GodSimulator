// Castle Entity with visual damage states
class Castle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseMaxHp = 1000;
        this.maxHp = 1000;
        this.hp = 1000;
        this.armor = 10;
        this.level = 1;
        this.width = 140;
        this.height = 180;
        this.damageState = 'normal'; // normal, damaged, heavily, critical
        this.hitFlash = 0;
        this.weapons = []; // active weapon instances
    }

    applyUpgrades(saveData) {
        this.level = saveData.castle.level || 1;
        this.maxHp = this.baseMaxHp + (this.level - 1) * 150 + (saveData.castle.hpBonus || 0);
        this.armor = 10 + (this.level - 1) * 3 + (saveData.castle.armorBonus || 0);
        this.hp = this.maxHp;
        this.updateDamageState();
    }

    takeDamage(amount) {
        const reduced = Math.max(1, amount - this.armor * 0.5);
        this.hp -= reduced;
        this.hitFlash = 0.15;
        this.updateDamageState();
        return reduced;
    }

    updateDamageState() {
        const ratio = this.hp / this.maxHp;
        if (ratio > 0.7) this.damageState = 'normal';
        else if (ratio > 0.4) this.damageState = 'damaged';
        else if (ratio > 0.15) this.damageState = 'heavily';
        else this.damageState = 'critical';
    }

    isDestroyed() {
        return this.hp <= 0;
    }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    draw(ctx, particles) {
        const cx = this.x;
        const cy = this.y;

        // Base shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + this.height * 0.45, this.width * 0.55, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main body color based on damage
        let bodyColor = '#5d6d7e';
        let wallColor = '#85929e';
        if (this.damageState === 'damaged') { bodyColor = '#6c5b4a'; wallColor = '#8b7355'; }
        if (this.damageState === 'heavily') { bodyColor = '#5a4030'; wallColor = '#7a5a40'; }
        if (this.damageState === 'critical') { bodyColor = '#3d2a1a'; wallColor = '#5a3a20'; }

        if (this.hitFlash > 0) {
            bodyColor = '#fff';
            wallColor = '#eee';
        }

        // Walls
        ctx.fillStyle = bodyColor;
        ctx.fillRect(cx - this.width / 2, cy - this.height / 2, this.width, this.height * 0.7);

        // Battlements
        ctx.fillStyle = wallColor;
        const battlementW = 18;
        for (let i = -3; i <= 3; i++) {
            if (i % 2 === 0) {
                ctx.fillRect(cx + i * 20 - battlementW / 2, cy - this.height / 2 - 18, battlementW, 22);
            }
        }

        // Gate
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(cx - 22, cy + 20, 44, 55);
        ctx.fillStyle = '#1a252f';
        ctx.beginPath();
        ctx.arc(cx, cy + 20, 22, Math.PI, 0);
        ctx.fill();

        // Damage cracks
        if (this.damageState !== 'normal') {
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 40, cy - 30);
            ctx.lineTo(cx - 20, cy + 10);
            ctx.lineTo(cx - 50, cy + 40);
            ctx.stroke();
            if (this.damageState === 'heavily' || this.damageState === 'critical') {
                ctx.beginPath();
                ctx.moveTo(cx + 30, cy - 50);
                ctx.lineTo(cx + 10, cy);
                ctx.lineTo(cx + 45, cy + 30);
                ctx.stroke();
            }
            if (this.damageState === 'critical') {
                // Fire effect
                ctx.fillStyle = `rgba(231, 76, 60, ${0.4 + Math.sin(Date.now() / 100) * 0.2})`;
                ctx.beginPath();
                ctx.arc(cx - 30, cy - 20, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + 25, cy + 10, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Flag
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(cx + this.width / 2 - 8, cy - this.height / 2 - 50, 4, 50);
        ctx.beginPath();
        ctx.moveTo(cx + this.width / 2 - 4, cy - this.height / 2 - 50);
        ctx.lineTo(cx + this.width / 2 + 30, cy - this.height / 2 - 35);
        ctx.lineTo(cx + this.width / 2 - 4, cy - this.height / 2 - 20);
        ctx.fill();

        // HP Bar above castle
        const barW = 120;
        const barH = 12;
        const barX = cx - barW / 2;
        const barY = cy - this.height / 2 - 70;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(barX, barY, barW, barH);
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        const hpColor = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, cx, barY + 10);
    }
}
