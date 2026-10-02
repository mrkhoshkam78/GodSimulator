// Sprite / Frame Animation System (v1.8)
// Supports both pre-rendered canvas frames and future PNG sprite sheets.
class SpriteAnimator {
    constructor(framesByState, fps = 10) {
        // framesByState: { idle: [canvas|Image|ImageBitmap], walk: [...], ... }
        this.framesByState = framesByState || {};
        this.fps = fps;
        this.state = 'idle';
        this.frameIndex = 0;
        this.accum = 0;
        this.loop = true;
        this.onComplete = null;
        this.flipX = false;
        this.scale = 1;
        this.alpha = 1;
    }

    setState(state, opts = {}) {
        if (this.state === state && !opts.force) return;
        this.state = state;
        this.frameIndex = 0;
        this.accum = 0;
        this.loop = opts.loop !== undefined ? opts.loop : (state !== 'death' && state !== 'attack');
        this.onComplete = opts.onComplete || null;
    }

    update(dt) {
        const frames = this.framesByState[this.state];
        if (!frames || frames.length === 0) return;
        this.accum += dt;
        const frameDur = 1 / this.fps;
        while (this.accum >= frameDur) {
            this.accum -= frameDur;
            this.frameIndex++;
            if (this.frameIndex >= frames.length) {
                if (this.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = frames.length - 1;
                    if (this.onComplete) {
                        const cb = this.onComplete;
                        this.onComplete = null;
                        cb();
                    }
                }
            }
        }
    }

    draw(ctx, x, y) {
        const frames = this.framesByState[this.state];
        if (!frames || frames.length === 0) return;
        const frame = frames[Math.min(this.frameIndex, frames.length - 1)];
        if (!frame) return;
        const w = frame.width || frame.naturalWidth || 64;
        const h = frame.height || frame.naturalHeight || 64;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(x, y);
        if (this.flipX) ctx.scale(-1, 1);
        ctx.scale(this.scale, this.scale);
        ctx.drawImage(frame, -w / 2, -h + 8, w, h); // pivot near feet
        ctx.restore();
    }

    // Load a horizontal sprite sheet into states
    static async fromSpriteSheet(url, frameW, frameH, stateMap, fps = 10) {
        const img = await SpriteAnimator.loadImage(url);
        const framesByState = {};
        for (const [state, indices] of Object.entries(stateMap)) {
            framesByState[state] = indices.map(i => {
                const c = document.createElement('canvas');
                c.width = frameW;
                c.height = frameH;
                const cx = c.getContext('2d');
                cx.drawImage(img, i * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
                return c;
            });
        }
        return new SpriteAnimator(framesByState, fps);
    }

    static loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }
}
