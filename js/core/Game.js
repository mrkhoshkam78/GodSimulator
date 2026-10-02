// Main Game Engine
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 1280;
        this.height = 720;
        // Higher internal resolution for sharper details (v1.4)
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.state = 'mainmenu'; // mainmenu, playing, paused, victory, defeat, upgrades, levels, settings
        this.save = SaveSystem.load();
        this.input = new InputManager(canvas, this.width, this.height);
        this.particles = new ParticleSystem();
        this.combat = new CombatSystem();
        this.waves = new WaveSystem();

        this.castle = null;
        this.troops = [];
        this.enemies = [];
        this.weapons = [];
        this.projectiles = [];
        this.deployedTroopIds = [];
        this.selectedTroop = 'swordsman';
        this.gameSpeed = 1;
        this.levelData = null;
        this.tokensEarned = 0;
        this.coinsEarned = 0;
        this.kills = 0;

        this.menuAnim = 0;
        this.uiHover = null;
        this.lorePopup = null;
        this.troopScroll = 0; // scroll offset for left panel
        this.troopScrollMax = 0;

        // 12 Deployment slots (v1.7) - 3 columns in front of castle
        this.deploySlots = [
            { x: 260, y: 240 }, { x: 260, y: 320 }, { x: 260, y: 400 }, { x: 260, y: 480 },
            { x: 340, y: 220 }, { x: 340, y: 300 }, { x: 340, y: 380 }, { x: 340, y: 460 },
            { x: 420, y: 260 }, { x: 420, y: 340 }, { x: 420, y: 420 }, { x: 420, y: 500 }
        ];
        this.occupiedSlots = new Set();

        this.lastTime = performance.now();
        this.boundLoop = this.loop.bind(this);
        this.troopAssets = {}; // id -> loaded troop asset pack

        // Preload gold-standard swordsman assets
        if (typeof AssetManager !== 'undefined') {
            AssetManager.preloadBattle(['swordsman']).then(res => {
                this.troopAssets = res || {};
                console.log('[Game] Troop assets loaded:', Object.keys(this.troopAssets));
            });
        }

        requestAnimationFrame(this.boundLoop);

        // Expose for healer etc
        window.game = this;
    }

    startLevel(levelNum) {
        this.levelData = LEVELS[levelNum] || generateLevel(levelNum);
        this.save.currentLevel = levelNum;
        this.state = 'playing';
        this.tokensEarned = 0;
        this.coinsEarned = 0;
        this.kills = 0;
        this.enemies = [];
        this.projectiles = [];
        this.troops = [];
        this.occupiedSlots.clear();
        this.particles.clear();
        this.gameSpeed = 1;

        // Setup castle
        this.castle = new Castle(160, this.height / 2);
        this.castle.applyUpgrades(this.save);

        // Setup weapons
        this.weapons = [];
        const weaponPositions = [
            { x: 100, y: 200 }, { x: 100, y: 520 },
            { x: 180, y: 150 }, { x: 180, y: 570 }
        ];
        let wi = 0;
        for (const [id, w] of Object.entries(this.save.weapons)) {
            if (w.unlocked && wi < weaponPositions.length) {
                this.weapons.push(new Weapon(id, weaponPositions[wi].x, weaponPositions[wi].y, w.level));
                wi++;
            }
        }
        // Always have at least basic cannon
        if (this.weapons.length === 0) {
            this.weapons.push(new Weapon('basic_cannon', 100, 200, 1));
        }

        this.waves.startLevel(this.levelData);
        this.selectedTroop = Object.keys(this.save.troops).find(id => this.save.troops[id].unlocked) || 'swordsman';
    }

    spawnEnemy(id) {
        const spawnX = this.width + 40 + Math.random() * 60;
        const spawnY = 180 + Math.random() * (this.height - 320);
        const mult = this.levelData.multiplier * this.getDifficultyMult();
        this.enemies.push(new Enemy(id, spawnX, spawnY, mult));
    }

    getDifficultyMult() {
        const d = this.save.settings.difficulty;
        if (d === 'hard') return 1.35;
        if (d === 'nightmare') return 1.8;
        return 1.0;
    }

    deployTroop(slotIndex) {
        if (this.occupiedSlots.has(slotIndex)) return;
        const troopSave = this.save.troops[this.selectedTroop];
        if (!troopSave || !troopSave.unlocked) return;
        const slot = this.deploySlots[slotIndex];
        if (!slot) return;
        const troop = new Troop(this.selectedTroop, slot.x, slot.y, troopSave.level, slotIndex);
        this.troops.push(troop);
        this.occupiedSlots.add(slotIndex);
    }

    update(dt) {
        dt *= this.gameSpeed;
        this.menuAnim += dt;
        if (this.lorePopup) {
            this.lorePopup.timer -= dt;
            if (this.lorePopup.timer <= 0) this.lorePopup = null;
            // Click outside book closes lore (except the book click itself is same frame)
            if (this.input.mouse.clicked && this.state === 'upgrades') {
                // allow re-open from book; close only if click not on a book handled this frame
                // simple: any second click after open reduces timer fast if already open > 0.3s
                if (this.lorePopup.timer < 11.5) this.lorePopup = null;
            }
        }

        // Troop panel scroll
        if (this.state === 'playing' && this.input.mouse.wheel) {
            if (this.input.mouse.x < 110) {
                this.troopScroll += this.input.mouse.wheel > 0 ? 40 : -40;
                this.troopScroll = Math.max(0, Math.min(this.troopScroll, this.troopScrollMax || 0));
            }
        }

        if (this.state === 'playing') {
            this.castle.update(dt);
            this.particles.update(dt);
            this.combat.update(dt);

            // Waves
            this.waves.update(dt, this.enemies, (id) => this.spawnEnemy(id));

            // Troops
            for (const t of this.troops) t.update(dt, this.enemies, this.particles, this.combat);

            // Enemies
            for (const e of this.enemies) e.update(dt, this.troops, this.castle, this.particles, this.combat);

            // Weapons & Projectiles
            for (const w of this.weapons) w.update(dt, this.enemies, this.projectiles, this.particles);
            for (const p of this.projectiles) p.update(dt, this.enemies, this.particles, this.combat);
            this.projectiles = this.projectiles.filter(p => p.alive);

            // Cleanup dead
            for (const e of this.enemies) {
                if (e.dead && !e.tokenGiven && e.deathTimer > 0.3) {
                    e.tokenGiven = true;
                    const tokens = e.data.tokenReward || 1;
                    this.save.tokens += tokens;
                    this.tokensEarned += tokens;
                    this.kills++;
                    this.save.stats.totalKills++;
                    this.save.stats.totalTokens += tokens;
                    // Floating token feedback
                    this.combat.spawnDamageNumber(e.x, e.y - 40, `+${tokens}🔷`, false);
                }
            }
            this.enemies = this.enemies.filter(e => !e.dead || e.deathTimer < 1.6);
            this.troops = this.troops.filter(t => !t.dead || t.deathTimer < 1.3);

            // Victory / Defeat
            if (this.castle.isDestroyed()) {
                this.state = 'defeat';
                SaveSystem.save(this.save);
            } else if (this.waves.isComplete() && this.enemies.filter(e => !e.dead).length === 0) {
                this.state = 'victory';
                const coins = this.levelData.coinReward || 30;
                this.save.coins += coins;
                this.coinsEarned = coins;
                this.save.stats.totalCoins += coins;
                if (!this.save.completedLevels.includes(this.levelData.level)) {
                    this.save.completedLevels.push(this.levelData.level);
                }
                if (this.levelData.level >= this.save.highestLevel) {
                    this.save.highestLevel = this.levelData.level + 1;
                }
                SaveSystem.save(this.save);
            }

            // Input
            if (this.input.isBinding('pause') || this.input.isKey('Escape')) {
                this.state = 'paused';
            }
            if (this.input.isKey('1')) this.gameSpeed = 1;
            if (this.input.isKey('2')) this.gameSpeed = 1.75;
            if (this.input.isKey('3')) this.gameSpeed = 2.5;

            // Troop selection from left panel (scroll-aware)
            if (this.input.mouse.clicked) {
                const panelW = 100;
                const panelTop = 58;
                const cardH = 54;
                let selectedFromPanel = false;
                if (this.input.mouse.x <= panelW && this.input.mouse.y >= panelTop + 24) {
                    let ty = panelTop + 28 - this.troopScroll;
                    for (const [id, t] of Object.entries(this.save.troops)) {
                        if (!t.unlocked) continue;
                        if (this.input.mouse.y >= ty && this.input.mouse.y <= ty + cardH - 6) {
                            this.selectedTroop = id;
                            selectedFromPanel = true;
                            break;
                        }
                        ty += cardH;
                    }
                }
                if (!selectedFromPanel) {
                    for (let i = 0; i < this.deploySlots.length; i++) {
                        const s = this.deploySlots[i];
                        if (Math.hypot(this.input.mouse.x - s.x, this.input.mouse.y - s.y) < 36 && !this.occupiedSlots.has(i)) {
                            this.deployTroop(i);
                            break;
                        }
                    }
                }
            }
        }
    }

    handleClick(x, y) {
        if (this.state === 'mainmenu') {
            // Buttons handled in UI
            return;
        }
        if (this.state === 'playing') {
            // Deploy on slots
            for (let i = 0; i < this.deploySlots.length; i++) {
                const s = this.deploySlots[i];
                if (Math.hypot(x - s.x, y - s.y) < 35 && !this.occupiedSlots.has(i)) {
                    this.deployTroop(i);
                    return;
                }
            }
        }
    }

    loop(now) {
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;

        this.update(dt);
        this.draw();
        this.input.endFrame();

        requestAnimationFrame(this.boundLoop);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        if (this.state === 'mainmenu') {
            this.drawMainMenu(ctx);
            return;
        }
        if (this.state === 'levels') {
            this.drawLevelSelect(ctx);
            return;
        }
        if (this.state === 'upgrades') {
            this.drawUpgrades(ctx);
            this.drawLorePopup(ctx);
            return;
        }
        if (this.state === 'settings') {
            this.drawSettings(ctx);
            return;
        }

        // Playing / Paused / Victory / Defeat
        const shake = this.combat.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y);

        this.drawBackground(ctx);
        this.drawBattlefield(ctx);

        // Entities
        this.castle.draw(ctx, this.particles);
        for (const w of this.weapons) w.draw(ctx);
        for (const t of this.troops) t.draw(ctx);
        for (const e of this.enemies) e.draw(ctx);
        for (const p of this.projectiles) p.draw(ctx);
        this.particles.draw(ctx);
        this.combat.draw(ctx);

        // Deploy slots hint
        if (this.state === 'playing') {
            for (let i = 0; i < this.deploySlots.length; i++) {
                if (!this.occupiedSlots.has(i)) {
                    const s = this.deploySlots[i];
                    // Very visible deploy zone
                    ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 30, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(46, 204, 113, 0.85)';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 28, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(46, 204, 113, 0.9)';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('+', s.x, s.y + 5);
                }
            }
        }

        ctx.restore();

        // UI Overlay
        this.drawBattleUI(ctx);
        this.drawLorePopup(ctx);

        if (this.state === 'paused') this.drawPauseMenu(ctx);
        if (this.state === 'victory') this.drawVictory(ctx);
        if (this.state === 'defeat') this.drawDefeat(ctx);
    }

    drawLorePopup(ctx) {
        if (!this.lorePopup || !TROOP_LORE) return;
        const lore = TROOP_LORE[this.lorePopup.id];
        if (!lore) return;
        const alpha = Math.min(1, this.lorePopup.timer / 0.4);
        ctx.save();
        ctx.globalAlpha = alpha;
        const w = 420, h = 210;
        const x = this.width / 2 - w / 2;
        const y = 140;
        // Modern card
        ctx.fillStyle = 'rgba(15, 12, 41, 0.94)';
        this.roundRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, w, h, 14);
        ctx.stroke();
        // Title
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 20px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(lore.name + ' — ' + lore.title, this.width / 2, y + 32);
        // Story lines
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '14px Tahoma, Arial';
        ctx.textAlign = 'right';
        lore.story.forEach((line, i) => {
            ctx.fillText(line, x + w - 24, y + 70 + i * 28);
        });
        // Hint
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '11px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('کلیک مجدد روی نیرو برای بستن', this.width / 2, y + h - 16);
        ctx.restore();
    }

    drawBackground(ctx) {
        const theme = this.levelData?.themeData || LEVEL_THEMES.grassland;
        // Richer sky gradient with higher contrast
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, theme.bg[0]);
        grad.addColorStop(0.4, theme.bg[1]);
        grad.addColorStop(0.75, theme.bg[2]);
        grad.addColorStop(1, this._darkenColor(theme.bg[2], 0.6));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Stars / atmosphere particles for depth
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 18; i++) {
            const sx = (i * 137 + this.menuAnim * 8) % this.width;
            const sy = 40 + (i * 53) % 180;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Far mountains - higher contrast silhouette
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.moveTo(0, 320);
        ctx.lineTo(180, 160);
        ctx.lineTo(320, 240);
        ctx.lineTo(480, 130);
        ctx.lineTo(650, 220);
        ctx.lineTo(820, 140);
        ctx.lineTo(1000, 200);
        ctx.lineTo(1150, 155);
        ctx.lineTo(1280, 210);
        ctx.lineTo(1280, 420);
        ctx.lineTo(0, 420);
        ctx.fill();

        // Mid hills
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.moveTo(0, 380);
        for (let x = 0; x <= this.width; x += 50) {
            ctx.lineTo(x, 360 - Math.sin(x * 0.008 + this.menuAnim * 0.2) * 25);
        }
        ctx.lineTo(this.width, 500);
        ctx.lineTo(0, 500);
        ctx.fill();

        // Ground with more detail
        ctx.fillStyle = theme.ground;
        ctx.beginPath();
        ctx.moveTo(0, this.height - 70);
        for (let x = 0; x <= this.width; x += 30) {
            ctx.lineTo(x, this.height - 70 - Math.sin(x * 0.012 + this.menuAnim * 0.35) * 12);
        }
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.fill();

        // Ground texture lines for detail
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (let y = this.height - 60; y < this.height; y += 12) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y + Math.sin(y) * 3);
            ctx.stroke();
        }
    }

    _darkenColor(hex, amount) {
        if (!hex || hex[0] !== '#') return hex;
        const r = Math.floor(parseInt(hex.slice(1,3),16) * amount);
        const g = Math.floor(parseInt(hex.slice(3,5),16) * amount);
        const b = Math.floor(parseInt(hex.slice(5,7),16) * amount);
        return `rgb(${r},${g},${b})`;
    }

    drawBattlefield(ctx) {
        // Path
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(200, 150, this.width - 200, this.height - 280);
    }

    drawBattleUI(ctx) {
        // Top bar - higher contrast v1.2
        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, this.width, 52);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, 50, this.width, 2);

        // Castle HP
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 17px Tahoma, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`❤️ ${Math.ceil(this.castle.hp)}/${this.castle.maxHp}`, 18, 33);

        // Coins & Tokens - brighter
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`🪙 ${this.save.coins}`, 210, 33);
        ctx.fillStyle = '#5dade2';
        ctx.fillText(`🔷 ${this.save.tokens}`, 330, 33);

        // Wave
        const prog = this.waves.getProgress();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`🌊 موج ${prog.current}/${prog.total}`, 470, 33);
        if (prog.state === 'prep') {
            ctx.fillStyle = '#2ecc71';
            ctx.fillText(`آماده‌سازی: ${prog.prepTimer}s`, 640, 33);
        }

        // Speed
        ctx.fillStyle = '#aab7b8';
        ctx.fillText(`سرعت: ${this.gameSpeed}x  [1/2/3]`, 890, 33);

        // Level name
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f8f9f9';
        ctx.fillText(this.levelData?.name || '', this.width - 18, 33);

        // Left troop panel - compact + scrollable (v1.5)
        const panelW = 100;
        const panelTop = 58;
        const panelH = this.height - 110;
        const cardH = 54;
        const unlocked = Object.entries(this.save.troops).filter(([, t]) => t.unlocked);
        const contentH = unlocked.length * cardH + 10;
        this.troopScrollMax = Math.max(0, contentH - (panelH - 30));
        this.troopScroll = Math.max(0, Math.min(this.troopScroll, this.troopScrollMax));

        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, panelTop, panelW, panelH);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, panelTop, panelW, panelH);

        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 11px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('نیروها', panelW / 2, panelTop + 16);

        // Clip cards area
        ctx.save();
        ctx.beginPath();
        ctx.rect(2, panelTop + 24, panelW - 4, panelH - 28);
        ctx.clip();

        let ty = panelTop + 28 - this.troopScroll;
        for (const [id, t] of unlocked) {
            const data = TROOPS_DATA[id];
            const selected = this.selectedTroop === id;
            if (ty + cardH > panelTop + 20 && ty < panelTop + panelH) {
                ctx.fillStyle = selected ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255,255,255,0.06)';
                this.roundRect(ctx, 6, ty, panelW - 12, cardH - 6, 6);
                ctx.fill();
                if (selected) {
                    ctx.strokeStyle = '#2ecc71';
                    ctx.lineWidth = 2;
                    this.roundRect(ctx, 6, ty, panelW - 12, cardH - 6, 6);
                    ctx.stroke();
                }
                if (typeof Troop !== 'undefined' && Troop.drawFace) {
                    Troop.drawFace(ctx, id, 28, ty + 22, 16, data.color);
                } else {
                    ctx.fillStyle = data.color;
                    ctx.beginPath();
                    ctx.arc(28, ty + 22, 14, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Tahoma, Arial';
                ctx.textAlign = 'left';
                ctx.fillText(data.name, 48, ty + 18);
                ctx.fillStyle = '#f1c40f';
                ctx.font = 'bold 11px Tahoma, Arial';
                ctx.fillText('L' + t.level, 48, ty + 34);
            }
            ty += cardH;
        }
        ctx.restore();

        // Scroll indicators
        if (this.troopScrollMax > 0) {
            if (this.troopScroll > 0) {
                ctx.fillStyle = '#f1c40f';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('▲', panelW / 2, panelTop + 28);
            }
            if (this.troopScroll < this.troopScrollMax) {
                ctx.fillStyle = '#f1c40f';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('▼', panelW / 2, panelTop + panelH - 6);
            }
        }

        // Bottom bar
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, this.height - 48, this.width, 48);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, this.height - 48, this.width, 2);
        ctx.fillStyle = '#d5d8dc';
        ctx.font = '12px Tahoma, Arial';
        ctx.textAlign = 'left';
        ctx.fillText('دایره سبز = استقرار  |  اسکرول پنل نیرو  |  ESC توقف  |  F تمام‌صفحه', 18, this.height - 18);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`کشتار: ${this.kills}  |  Token: ${this.tokensEarned}`, this.width - 18, this.height - 18);
    }

    drawMainMenu(ctx) {
        // Animated background
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#24243e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Decorative castles silhouette
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(50, 400, 120, 200);
        ctx.fillRect(1000, 380, 150, 220);

        // Title
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 64px Georgia';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 20;
        ctx.fillText('CASTLE DEFENSE', this.width / 2, 160);
        ctx.shadowBlur = 0;
        ctx.font = '24px Arial';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText('تاکتیکی دفاع از قلعه', this.width / 2, 210);

        // Buttons
        const buttons = [
            { text: 'بازی جدید', action: 'newgame', y: 300 },
            { text: 'ادامه بازی', action: 'continue', y: 370 },
            { text: 'انتخاب مرحله', action: 'levels', y: 440 },
            { text: 'ارتقاء نیروها و سلاح‌ها', action: 'upgrades', y: 510 },
            { text: 'تنظیمات', action: 'settings', y: 580 }
        ];

        for (const btn of buttons) {
            const hovered = this.isHover(this.width / 2 - 160, btn.y - 25, 320, 50);
            ctx.fillStyle = hovered ? '#e74c3c' : '#2c3e50';
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            this.roundRect(ctx, this.width / 2 - 160, btn.y - 25, 320, 50, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(btn.text, this.width / 2, btn.y + 7);

            if (hovered && this.input.mouse.clicked) {
                this.handleMenuAction(btn.action);
            }
        }

        // Stats
        ctx.font = '14px Arial';
        ctx.fillStyle = '#95a5a6';
        ctx.fillText(`بالاترین مرحله: ${this.save.highestLevel} | Token: ${this.save.tokens} | Coin: ${this.save.coins}`, this.width / 2, this.height - 30);
    }

    handleMenuAction(action) {
        if (action === 'newgame') {
            this.save = SaveSystem.defaultData();
            SaveSystem.save(this.save);
            this.startLevel(1);
        } else if (action === 'continue') {
            this.startLevel(Math.min(this.save.highestLevel, 50));
        } else if (action === 'levels') {
            this.state = 'levels';
        } else if (action === 'upgrades') {
            this.state = 'upgrades';
        } else if (action === 'settings') {
            this.state = 'settings';
        }
    }

    drawLevelSelect(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('انتخاب مرحله', this.width / 2, 50);

        // Back button
        this.drawButton(ctx, 40, 20, 100, 40, 'بازگشت', () => { this.state = 'mainmenu'; });

        for (let i = 1; i <= 50; i++) {
            const col = (i - 1) % 10;
            const row = Math.floor((i - 1) / 10);
            const x = 80 + col * 115;
            const y = 100 + row * 100;
            const unlocked = i <= this.save.highestLevel;
            const completed = this.save.completedLevels.includes(i);

            ctx.fillStyle = completed ? '#27ae60' : unlocked ? '#2c3e50' : '#1a1a1a';
            ctx.strokeStyle = unlocked ? '#f1c40f' : '#555';
            ctx.lineWidth = 2;
            this.roundRect(ctx, x, y, 100, 70, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = unlocked ? '#fff' : '#666';
            ctx.font = 'bold 22px Arial';
            ctx.fillText(i, x + 50, y + 35);
            if (completed) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#2ecc71';
                ctx.fillText('✓', x + 50, y + 55);
            }

            if (unlocked && this.isHover(x, y, 100, 70) && this.input.mouse.clicked) {
                this.startLevel(i);
            }
        }
    }

    drawUpgrades(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ارتقاء نیروها و سلاح‌ها', this.width / 2, 40);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#3498db';
        ctx.fillText(`🔷 Token: ${this.save.tokens}`, this.width / 2 - 100, 70);
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`🪙 Coin: ${this.save.coins}`, this.width / 2 + 100, 70);

        this.drawButton(ctx, 40, 20, 100, 40, 'بازگشت', () => { this.state = 'mainmenu'; });

        // Troops section
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('نیروها (Token)', 40, 110);

        let tx = 40, ty = 130;
        for (const [id, t] of Object.entries(this.save.troops)) {
            const data = TROOPS_DATA[id];
            const cost = t.unlocked ? Math.floor(8 + t.level * 4) : data.unlockCost;
            ctx.fillStyle = t.unlocked ? '#2c3e50' : '#1a1a1a';
            this.roundRect(ctx, tx, ty, 240, 70, 6);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.stroke();

            // Dedicated face avatar
            if (typeof Troop !== 'undefined' && Troop.drawFace) {
                Troop.drawFace(ctx, id, tx + 28, ty + 35, 18, data.color);
            } else {
                ctx.fillStyle = data.color;
                ctx.beginPath();
                ctx.arc(tx + 25, ty + 35, 16, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Tahoma, Arial';
            ctx.fillText(data.name, tx + 52, ty + 22);
            ctx.fillStyle = '#f1c40f';
            ctx.fillText(t.unlocked ? `Level ${t.level}/50` : 'قفل', tx + 52, ty + 40);

            // Lore book button (only in upgrades)
            ctx.font = '16px Arial';
            ctx.fillText('📖', tx + 52, ty + 58);
            if (this.isHover(tx + 48, ty + 44, 22, 20) && this.input.mouse.clicked) {
                if (typeof TROOP_LORE !== 'undefined' && TROOP_LORE[id]) {
                    this.lorePopup = { id, timer: 12 };
                }
            }

            const canAfford = this.save.tokens >= cost;
            ctx.fillStyle = canAfford ? '#27ae60' : '#7f8c8d';
            this.roundRect(ctx, tx + 150, ty + 20, 80, 30, 4);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(t.unlocked ? `ارتقا ${cost}` : `باز ${cost}`, tx + 190, ty + 40);
            ctx.textAlign = 'left';

            if (canAfford && this.isHover(tx + 150, ty + 20, 80, 30) && this.input.mouse.clicked) {
                this.save.tokens -= cost;
                if (!t.unlocked) t.unlocked = true;
                else if (t.level < 50) t.level++;
                SaveSystem.save(this.save);
                this.particles.emitLevelUp(tx + 100, ty + 35);
            }

            tx += 250;
            if (tx > 1000) { tx = 40; ty += 85; }
        }

        // Weapons section
        ty += 100;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('سلاح‌های قلعه (Coin)', 40, ty);
        ty += 20;
        tx = 40;
        for (const [id, w] of Object.entries(this.save.weapons)) {
            const data = WEAPONS_DATA[id];
            const cost = w.unlocked ? Math.floor(15 + w.level * 8) : data.unlockCost;
            ctx.fillStyle = w.unlocked ? '#2c3e50' : '#1a1a1a';
            this.roundRect(ctx, tx, ty, 240, 70, 6);
            ctx.fill();

            // Weapon icon
            ctx.fillStyle = data.color;
            ctx.beginPath();
            ctx.arc(tx + 28, ty + 35, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0a0a0a';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Barrel hint
            ctx.fillStyle = '#1a252f';
            ctx.fillRect(tx + 28, ty + 28, 18, 6);
            ctx.fillStyle = data.color;
            ctx.fillRect(tx + 40, ty + 29, 8, 4);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Tahoma, Arial';
            ctx.fillText(data.name, tx + 55, ty + 25);
            ctx.fillStyle = '#f1c40f';
            ctx.fillText(w.unlocked ? `Level ${w.level}/50` : 'قفل', tx + 50, ty + 45);

            const canAfford = this.save.coins >= cost;
            ctx.fillStyle = canAfford ? '#e67e22' : '#7f8c8d';
            this.roundRect(ctx, tx + 150, ty + 20, 80, 30, 4);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(w.unlocked ? `ارتقا ${cost}` : `باز ${cost}`, tx + 190, ty + 40);
            ctx.textAlign = 'left';

            if (canAfford && this.isHover(tx + 150, ty + 20, 80, 30) && this.input.mouse.clicked) {
                this.save.coins -= cost;
                if (!w.unlocked) w.unlocked = true;
                else if (w.level < 50) w.level++;
                SaveSystem.save(this.save);
            }

            tx += 250;
            if (tx > 1000) { tx = 40; ty += 85; }
        }
    }

    drawSettings(ctx) {
        // Modern dark glass background
        const bg = ctx.createLinearGradient(0, 0, 0, this.height);
        bg.addColorStop(0, '#0f0c29');
        bg.addColorStop(0.5, '#1a1a2e');
        bg.addColorStop(1, '#16213e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Title
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 40px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('تنظیمات', this.width / 2, 55);
        this.drawButton(ctx, 30, 18, 110, 42, 'بازگشت', () => { this.state = 'mainmenu'; SaveSystem.save(this.save); });

        // === Difficulty ===
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        this.roundRect(ctx, this.width/2 - 320, 100, 640, 90, 12);
        ctx.fill();
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 18px Tahoma, Arial';
        ctx.fillText('سطح دشواری', this.width / 2, 125);
        const diffs = [
            { id: 'normal', name: 'عادی', col: '#2ecc71' },
            { id: 'hard', name: 'سخت', col: '#f39c12' },
            { id: 'nightmare', name: 'کابوس', col: '#e74c3c' }
        ];
        diffs.forEach((d, i) => {
            const x = this.width / 2 - 240 + i * 160;
            const selected = this.save.settings.difficulty === d.id;
            ctx.fillStyle = selected ? d.col : 'rgba(255,255,255,0.1)';
            this.roundRect(ctx, x, 145, 140, 36, 8);
            ctx.fill();
            if (selected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                this.roundRect(ctx, x, 145, 140, 36, 8);
                ctx.stroke();
            }
            ctx.fillStyle = selected ? '#fff' : '#bbb';
            ctx.font = 'bold 15px Tahoma, Arial';
            ctx.fillText(d.name, x + 70, 168);
            if (this.isHover(x, 145, 140, 36) && this.input.mouse.clicked) {
                this.save.settings.difficulty = d.id;
                SaveSystem.save(this.save);
            }
        });

        // === Graphics Quality ===
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        this.roundRect(ctx, this.width/2 - 320, 220, 640, 160, 12);
        ctx.fill();
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 18px Tahoma, Arial';
        ctx.fillText('کیفیت گرافیک', this.width / 2, 245);

        const quals = [
            { id: 'veryLow', name: 'Very Low' },
            { id: 'low', name: 'Low' },
            { id: 'medium', name: 'Medium' },
            { id: 'high', name: 'High' },
            { id: 'veryHigh', name: 'Very High' },
            { id: 'ultra', name: '4K' }
        ];
        quals.forEach((q, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = this.width / 2 - 280 + col * 190;
            const y = 270 + row * 48;
            const selected = this.save.settings.graphicsQuality === q.id;
            ctx.fillStyle = selected ? '#3498db' : 'rgba(255,255,255,0.08)';
            this.roundRect(ctx, x, y, 170, 38, 8);
            ctx.fill();
            if (selected) {
                ctx.strokeStyle = '#5dade2';
                ctx.lineWidth = 2;
                this.roundRect(ctx, x, y, 170, 38, 8);
                ctx.stroke();
            }
            ctx.fillStyle = selected ? '#fff' : '#ccc';
            ctx.font = 'bold 14px Tahoma, Arial';
            ctx.fillText(q.name, x + 85, y + 25);
            if (this.isHover(x, y, 170, 38) && this.input.mouse.clicked) {
                this.save.settings.graphicsQuality = q.id;
                SaveSystem.save(this.save);
            }
        });

        // Current quality info
        const curQ = GRAPHICS_QUALITY[this.save.settings.graphicsQuality] || GRAPHICS_QUALITY.high;
        ctx.fillStyle = '#95a5a6';
        ctx.font = '13px Tahoma, Arial';
        ctx.fillText(`ذرات: ×${curQ.particleMult}  |  جزئیات: ${curQ.detail}  |  سایه: ${curQ.shadow ? 'بله' : 'خیر'}  |  درخشش: ${curQ.glow ? 'بله' : 'خیر'}`, this.width / 2, 400);

        // Reset button
        this.drawButton(ctx, this.width / 2 - 120, 440, 240, 48, 'ریست کامل پیشرفت', () => {
            this.save = SaveSystem.reset();
            SaveSystem.save(this.save);
        });

        // Hint
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px Tahoma, Arial';
        ctx.fillText('تنظیمات به صورت خودکار ذخیره می‌شوند', this.width / 2, this.height - 25);
    }

    drawPauseMenu(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('توقف', this.width / 2, 250);
        this.drawButton(ctx, this.width / 2 - 120, 320, 240, 50, 'ادامه', () => { this.state = 'playing'; });
        this.drawButton(ctx, this.width / 2 - 120, 390, 240, 50, 'منوی اصلی', () => { this.state = 'mainmenu'; SaveSystem.save(this.save); });
    }

    drawVictory(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('پیروزی!', this.width / 2, 220);
        ctx.font = '22px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`🪙 +${this.coinsEarned} سکه | 🔷 +${this.tokensEarned} توکن | کشتار: ${this.kills}`, this.width / 2, 290);
        this.drawButton(ctx, this.width / 2 - 120, 360, 240, 50, 'مرحله بعد', () => {
            const next = Math.min(50, this.levelData.level + 1);
            this.startLevel(next);
        });
        this.drawButton(ctx, this.width / 2 - 120, 430, 240, 50, 'منوی اصلی', () => { this.state = 'mainmenu'; });
    }

    drawDefeat(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('شکست...', this.width / 2, 250);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('قلعه نابود شد. دوباره تلاش کنید!', this.width / 2, 320);
        this.drawButton(ctx, this.width / 2 - 120, 380, 240, 50, 'تلاش مجدد', () => { this.startLevel(this.levelData.level); });
        this.drawButton(ctx, this.width / 2 - 120, 450, 240, 50, 'منوی اصلی', () => { this.state = 'mainmenu'; });
    }

    drawButton(ctx, x, y, w, h, text, onClick) {
        const hovered = this.isHover(x, y, w, h);
        // Modern gradient-like button
        ctx.fillStyle = hovered ? '#e74c3c' : 'rgba(44, 62, 80, 0.9)';
        this.roundRect(ctx, x, y, w, h, 10);
        ctx.fill();
        ctx.strokeStyle = hovered ? '#ff6b6b' : 'rgba(241, 196, 15, 0.7)';
        ctx.lineWidth = hovered ? 2.5 : 1.5;
        this.roundRect(ctx, x, y, w, h, 10);
        ctx.stroke();
        // Subtle inner highlight
        if (hovered) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            this.roundRect(ctx, x + 2, y + 2, w - 4, h * 0.4, 8);
            ctx.fill();
        }
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
        if (hovered && this.input.mouse.clicked && onClick) onClick();
    }

    isHover(x, y, w, h) {
        return this.input.mouse.x >= x && this.input.mouse.x <= x + w &&
               this.input.mouse.y >= y && this.input.mouse.y <= y + h;
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
