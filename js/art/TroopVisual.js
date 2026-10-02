// TroopVisual — presentation layer separated from gameplay entity (v1.9)
class TroopVisual {
    constructor(troopAsset) {
        this.asset = troopAsset; // from AssetManager.loadTroop
        this.state = 'idle';
        this.frameIndex = 0;
        this.accum = 0;
        this.facing = 1; // 1 right, -1 left
        this.alpha = 1;
        this.scale = (troopAsset?.renderScale || 1) * 1.05;
        this.hitFlash = 0;
        this.onAnimComplete = null;
        this._locked = false; // non-looping anim playing
    }

    setState(state, opts = {}) {
        if (!this.asset?.animations?.[state]) {
            // fallback
            if (state !== 'idle' && this.asset?.animations?.idle) state = 'idle';
            else return;
        }
        if (this.state === state && !opts.force && this._locked) return;
        this.state = state;
        this.frameIndex = 0;
        this.accum = 0;
        this.onAnimComplete = opts.onComplete || null;
        const def = this.asset.animations[state];
        this._locked = def && def.loop === false;
    }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt;
        const def = this.asset?.animations?.[this.state];
        if (!def || !def.frames.length) return;

        this.accum += dt;
        const dur = def.frameDuration || 0.1;
        while (this.accum >= dur) {
            this.accum -= dur;
            this.frameIndex++;
            if (this.frameIndex >= def.frames.length) {
                if (def.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = def.frames.length - 1;
                    this._locked = false;
                    if (this.onAnimComplete) {
                        const cb = this.onAnimComplete;
                        this.onAnimComplete = null;
                        cb();
                    }
                }
            }
        }
    }

    // Returns true on the attack hit frame (for combat sync)
    isHitFrame() {
        const def = this.asset?.animations?.[this.state];
        if (!def || def.hitFrame == null) return false;
        return this.state === 'attack' && this.frameIndex === def.hitFrame;
    }

    draw(ctx, x, y) {
        const def = this.asset?.animations?.[this.state];
        if (!def || !def.frames.length) return false;

        const frame = def.frames[Math.min(this.frameIndex, def.frames.length - 1)];
        if (!frame) return false;

        const origin = this.asset.origin || [frame.width / 2, frame.height - 12];
        const sc = this.scale;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(x, y);
        ctx.scale(this.facing * sc, sc);

        // Soft ground shadow (visual depth)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hit flash tint
        if (this.hitFlash > 0) {
            ctx.filter = `brightness(${1.5 + this.hitFlash * 2})`;
        }

        ctx.drawImage(frame, -origin[0], -origin[1]);

        ctx.filter = 'none';
        ctx.restore();
        return true;
    }

    flash() {
        this.hitFlash = 0.15;
    }
}
