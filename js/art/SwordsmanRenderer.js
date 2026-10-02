// Gold-Standard Swordsman - Pre-rendered frame pipeline (v1.8)
// Each animation frame is a unique pose (not just rotated primitives).
// Designed so PNG sprite sheets can replace these canvases later without code changes.
const SwordsmanArt = {
    FRAME_W: 96,
    FRAME_H: 112,
    _cache: null,

    // Build all animation frames once
    buildFrames() {
        if (this._cache) return this._cache;
        const poses = {
            idle: [
                { legL: 0.05, legR: -0.05, armL: 0.1, armR: -0.15, body: 0, head: 0, sword: -0.2, bob: 0 },
                { legL: 0.05, legR: -0.05, armL: 0.12, armR: -0.12, body: 0.02, head: 0.02, sword: -0.18, bob: 1.5 },
                { legL: 0.05, legR: -0.05, armL: 0.1, armR: -0.15, body: 0, head: 0, sword: -0.2, bob: 2.5 },
                { legL: 0.05, legR: -0.05, armL: 0.08, armR: -0.18, body: -0.02, head: -0.02, sword: -0.22, bob: 1.0 }
            ],
            walk: [
                { legL: 0.35, legR: -0.35, armL: -0.3, armR: 0.3, body: 0.04, head: 0, sword: -0.15, bob: 0 },
                { legL: 0.1, legR: -0.1, armL: -0.1, armR: 0.1, body: 0, head: 0, sword: -0.2, bob: 3 },
                { legL: -0.35, legR: 0.35, armL: 0.3, armR: -0.3, body: -0.04, head: 0, sword: -0.25, bob: 0 },
                { legL: -0.1, legR: 0.1, armL: 0.1, armR: -0.1, body: 0, head: 0, sword: -0.2, bob: 3 }
            ],
            attack: [
                // Anticipation
                { legL: 0.15, legR: -0.1, armL: 0.2, armR: -1.1, body: -0.12, head: -0.08, sword: -1.3, bob: 0 },
                { legL: 0.2, legR: -0.15, armL: 0.25, armR: -1.3, body: -0.18, head: -0.1, sword: -1.5, bob: -2 },
                // Strike
                { legL: 0.25, legR: -0.2, armL: -0.2, armR: 0.6, body: 0.15, head: 0.05, sword: 0.5, bob: -4 },
                { legL: 0.2, legR: -0.15, armL: -0.15, armR: 0.9, body: 0.2, head: 0.08, sword: 0.9, bob: -2 },
                // Recovery
                { legL: 0.1, legR: -0.08, armL: 0, armR: 0.3, body: 0.08, head: 0.02, sword: 0.2, bob: 0 },
                { legL: 0.05, legR: -0.05, armL: 0.08, armR: -0.1, body: 0, head: 0, sword: -0.15, bob: 1 }
            ],
            hit: [
                { legL: 0.1, legR: -0.05, armL: 0.3, armR: -0.4, body: -0.15, head: -0.1, sword: -0.5, bob: -3 },
                { legL: 0.08, legR: -0.04, armL: 0.2, armR: -0.3, body: -0.08, head: -0.05, sword: -0.35, bob: 0 }
            ],
            death: [
                { legL: 0.2, legR: -0.1, armL: 0.4, armR: -0.5, body: 0.2, head: 0.15, sword: 0.3, bob: 0 },
                { legL: 0.4, legR: 0.1, armL: 0.6, armR: -0.3, body: 0.5, head: 0.4, sword: 0.6, bob: 8 },
                { legL: 0.5, legR: 0.3, armL: 0.8, armR: 0.2, body: 0.9, head: 0.7, sword: 1.0, bob: 18 },
                { legL: 0.55, legR: 0.4, armL: 0.9, armR: 0.4, body: 1.2, head: 1.0, sword: 1.2, bob: 28 }
            ],
            spawn: [
                { legL: 0, legR: 0, armL: 0, armR: 0, body: 0, head: 0, sword: -0.2, bob: -20, scale: 0.3 },
                { legL: 0.05, legR: -0.05, armL: 0.1, armR: -0.1, body: 0, head: 0, sword: -0.2, bob: -8, scale: 0.7 },
                { legL: 0.05, legR: -0.05, armL: 0.1, armR: -0.15, body: 0, head: 0, sword: -0.2, bob: 2, scale: 1.05 },
                { legL: 0.05, legR: -0.05, armL: 0.1, armR: -0.15, body: 0, head: 0, sword: -0.2, bob: 0, scale: 1 }
            ]
        };

        const framesByState = {};
        for (const [state, poseList] of Object.entries(poses)) {
            framesByState[state] = poseList.map(pose => this._renderPose(pose));
        }
        this._cache = framesByState;
        return framesByState;
    },

    _renderPose(pose) {
        const w = this.FRAME_W;
        const h = this.FRAME_H;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h - 18 + (pose.bob || 0);
        const sc = pose.scale !== undefined ? pose.scale : 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- LEGS ---
        this._drawLeg(ctx, -8, 0, pose.legL, true);
        this._drawLeg(ctx, 8, 0, pose.legR, false);

        // --- TORSO (armored) ---
        ctx.save();
        ctx.rotate(pose.body || 0);
        // Hip armor
        ctx.fillStyle = '#3d5a80';
        ctx.beginPath();
        ctx.ellipse(0, -12, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Main chest plate
        const chestGrad = ctx.createLinearGradient(-14, -40, 14, -10);
        chestGrad.addColorStop(0, '#5b8def');
        chestGrad.addColorStop(0.4, '#4a7ad9');
        chestGrad.addColorStop(1, '#2c5aa0');
        ctx.fillStyle = chestGrad;
        ctx.beginPath();
        ctx.moveTo(-15, -14);
        ctx.quadraticCurveTo(-18, -30, -12, -42);
        ctx.lineTo(12, -42);
        ctx.quadraticCurveTo(18, -30, 15, -14);
        ctx.closePath();
        ctx.fill();
        // AO under chest
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, -16, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Chest highlight (metallic)
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.ellipse(-5, -32, 6, 10, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Center ridge
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(0, -16);
        ctx.stroke();
        // Belt
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(-15, -16, 30, 7);
        ctx.fillStyle = '#c9a227';
        ctx.beginPath();
        ctx.arc(0, -12.5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(-3, -15, 6, 5);
        // Shoulder pads
        this._drawShoulder(ctx, -16, -38, -0.4);
        this._drawShoulder(ctx, 16, -38, 0.4);
        ctx.restore();

        // --- HEAD ---
        ctx.save();
        ctx.rotate((pose.body || 0) * 0.5 + (pose.head || 0));
        // Neck
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(-4, -48, 8, 8);
        // Head
        const skinGrad = ctx.createRadialGradient(-3, -56, 2, 0, -54, 14);
        skinGrad.addColorStop(0, '#f0d0a8');
        skinGrad.addColorStop(1, '#d4a574');
        ctx.fillStyle = skinGrad;
        ctx.beginPath();
        ctx.arc(0, -56, 12, 0, Math.PI * 2);
        ctx.fill();
        // Ear
        ctx.beginPath();
        ctx.arc(-11, -55, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-4.5, -57, 3.2, 2.8, 0, 0, Math.PI * 2);
        ctx.ellipse(4.5, -57, 3.2, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(-4, -57, 1.8, 0, Math.PI * 2);
        ctx.arc(5, -57, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-4.5, -57.5, 0.7, 0, Math.PI * 2);
        ctx.arc(4.5, -57.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
        // Brows
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-7, -61);
        ctx.lineTo(-2, -60);
        ctx.moveTo(7, -61);
        ctx.lineTo(2, -60);
        ctx.stroke();
        // Nose
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -55);
        ctx.lineTo(1, -51);
        ctx.stroke();
        // Mouth
        ctx.strokeStyle = '#a0684a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, -49, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();
        // Hair / fringe under helmet
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.ellipse(0, -64, 10, 4, 0, Math.PI, 0);
        ctx.fill();
        // Helmet
        const helmGrad = ctx.createLinearGradient(0, -72, 0, -50);
        helmGrad.addColorStop(0, '#7f8c9b');
        helmGrad.addColorStop(0.5, '#5d6d7e');
        helmGrad.addColorStop(1, '#3d4a56');
        ctx.fillStyle = helmGrad;
        ctx.beginPath();
        ctx.arc(0, -60, 13, Math.PI * 1.05, -0.05);
        ctx.lineTo(12, -52);
        ctx.quadraticCurveTo(0, -48, -12, -52);
        ctx.closePath();
        ctx.fill();
        // Helmet rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -60, 12, Math.PI * 1.15, -0.2);
        ctx.stroke();
        // Nose guard
        ctx.fillStyle = '#4a5560';
        ctx.fillRect(-2, -58, 4, 8);
        // Plume
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(-2, -72);
        ctx.quadraticCurveTo(-6, -82, 0, -88);
        ctx.quadraticCurveTo(6, -82, 2, -72);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // --- ARMS + SWORD ---
        // Back arm (left)
        ctx.save();
        ctx.translate(-12, -36);
        ctx.rotate(pose.armL || 0);
        ctx.fillStyle = '#4a7ad9';
        ctx.fillRect(-4, 0, 8, 16);
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(0, 18, 4, 0, Math.PI * 2);
        ctx.fill();
        // Glove
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(0, 20, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Sword arm (right)
        ctx.save();
        ctx.translate(12, -36);
        ctx.rotate(pose.armR || 0);
        // Upper arm
        ctx.fillStyle = '#4a7ad9';
        ctx.fillRect(-4, 0, 8, 14);
        // Forearm
        ctx.save();
        ctx.translate(0, 14);
        ctx.rotate((pose.sword || 0) * 0.3);
        ctx.fillStyle = '#3d6bc4';
        ctx.fillRect(-3.5, 0, 7, 12);
        // Hand + glove
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(0, 14, 5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sword
        ctx.rotate(pose.sword || -0.2);
        // Blade
        const bladeGrad = ctx.createLinearGradient(0, 14, 0, 55);
        bladeGrad.addColorStop(0, '#f5f6fa');
        bladeGrad.addColorStop(0.5, '#dcdde1');
        bladeGrad.addColorStop(1, '#a4b0be');
        ctx.fillStyle = bladeGrad;
        ctx.beginPath();
        ctx.moveTo(-2.5, 16);
        ctx.lineTo(-1.5, 52);
        ctx.lineTo(0, 58);
        ctx.lineTo(1.5, 52);
        ctx.lineTo(2.5, 16);
        ctx.closePath();
        ctx.fill();
        // Blade edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-1, 18);
        ctx.lineTo(0, 54);
        ctx.stroke();
        // Guard
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(-8, 14, 16, 4);
        // Grip
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(-2.5, 8, 5, 8);
        // Pommel
        ctx.fillStyle = '#c9a227';
        ctx.beginPath();
        ctx.arc(0, 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.restore();

        ctx.restore();
        return c;
    },

    _drawLeg(ctx, x, y, angle, isLeft) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        // Thigh
        ctx.fillStyle = '#2c5aa0';
        ctx.beginPath();
        ctx.rect(-5, 0, 10, 18);
        ctx.fill();
        // Shin armor
        ctx.fillStyle = '#3d6bc4';
        ctx.fillRect(-4.5, 16, 9, 14);
        // Knee
        ctx.fillStyle = '#5b8def';
        ctx.beginPath();
        ctx.arc(0, 17, 4, 0, Math.PI * 2);
        ctx.fill();
        // Boot
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.moveTo(-6, 28);
        ctx.lineTo(7, 28);
        ctx.lineTo(9, 34);
        ctx.lineTo(-5, 34);
        ctx.closePath();
        ctx.fill();
        // Boot highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(-4, 29, 8, 2);
        ctx.restore();
    },

    _drawShoulder(ctx, x, y, ang) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
        g.addColorStop(0, '#7ba3f0');
        g.addColorStop(1, '#2c5aa0');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Rivet
        ctx.fillStyle = '#c9a227';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    createAnimator() {
        const frames = this.buildFrames();
        return new SpriteAnimator(frames, 9);
    }
};
