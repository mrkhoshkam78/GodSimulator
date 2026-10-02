// Centralized Asset Manager (v1.9) — load, cache, preload troop graphics
const AssetManager = {
    _images: new Map(),
    _meta: new Map(),
    _loading: new Map(),
    _failed: new Set(),

    loadImage(url) {
        if (this._images.has(url)) return Promise.resolve(this._images.get(url));
        if (this._failed.has(url)) return Promise.resolve(null);
        if (this._loading.has(url)) return this._loading.get(url);

        const p = new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this._images.set(url, img);
                this._loading.delete(url);
                resolve(img);
            };
            img.onerror = () => {
                console.warn('[AssetManager] failed:', url);
                this._failed.add(url);
                this._loading.delete(url);
                resolve(null);
            };
            img.src = url;
        });
        this._loading.set(url, p);
        return p;
    },

    async loadJSON(url) {
        if (this._meta.has(url)) return this._meta.get(url);
        try {
            const res = await fetch(url);
            const data = await res.json();
            this._meta.set(url, data);
            return data;
        } catch (e) {
            console.warn('[AssetManager] JSON failed:', url, e);
            return null;
        }
    },

    async loadTroop(troopId) {
        const metaUrl = `assets/troops/${troopId}/metadata.json`;
        const meta = await this.loadJSON(metaUrl);
        if (!meta) return null;

        const anims = {};
        for (const [state, def] of Object.entries(meta.animations || {})) {
            const frames = [];
            // Prefer individual frames
            if (def.frames && def.frames.length) {
                for (const path of def.frames) {
                    const img = await this.loadImage(path);
                    if (img) frames.push(img);
                }
            }
            // Fallback: slice spritesheet
            if (frames.length === 0 && def.spritesheet) {
                const sheet = await this.loadImage(def.spritesheet);
                if (sheet) {
                    const fw = meta.frameWidth || 96;
                    const fh = meta.frameHeight || 112;
                    const count = def.frameCount || Math.floor(sheet.width / fw);
                    for (let i = 0; i < count; i++) {
                        const c = document.createElement('canvas');
                        c.width = fw;
                        c.height = fh;
                        const cx = c.getContext('2d');
                        cx.drawImage(sheet, i * fw, 0, fw, fh, 0, 0, fw, fh);
                        frames.push(c);
                    }
                }
            }
            if (frames.length) {
                anims[state] = {
                    frames,
                    frameDuration: def.frameDuration || 0.1,
                    loop: def.loop !== false,
                    hitFrame: def.hitFrame
                };
            }
        }
        return {
            id: troopId,
            meta,
            animations: anims,
            origin: meta.origin || [meta.frameWidth / 2, meta.frameHeight - 12],
            renderScale: meta.renderScale || 1
        };
    },

    async preloadBattle(troopIds = ['swordsman']) {
        const results = {};
        await Promise.all(troopIds.map(async id => {
            results[id] = await this.loadTroop(id);
        }));
        return results;
    },

    getCachedImage(url) {
        return this._images.get(url) || null;
    },

    isReady(troopId) {
        return this._meta.has(`assets/troops/${troopId}/metadata.json`);
    }
};
