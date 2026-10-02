// Save / Load System - Persistent progress (v1.3)
const SaveSystem = {
    KEY: 'castle_defense_save_v13',

    defaultData() {
        return {
            version: 13,
            tokens: 50,
            coins: 100,
            currentLevel: 1,
            highestLevel: 1,
            completedLevels: [],
            troops: {
                swordsman: { unlocked: true, level: 1 },
                spearman: { unlocked: false, level: 1 },
                archer: { unlocked: false, level: 1 },
                crossbowman: { unlocked: false, level: 1 },
                knight: { unlocked: false, level: 1 },
                heavy_guard: { unlocked: false, level: 1 },
                mage: { unlocked: false, level: 1 },
                fire_mage: { unlocked: false, level: 1 },
                ice_mage: { unlocked: false, level: 1 },
                cannon_soldier: { unlocked: false, level: 1 }
            },
            weapons: {
                basic_cannon: { unlocked: true, level: 1 },
                heavy_cannon: { unlocked: false, level: 1 },
                ballista: { unlocked: false, level: 1 },
                fire_cannon: { unlocked: false, level: 1 },
                ice_cannon: { unlocked: false, level: 1 },
                lightning: { unlocked: false, level: 1 },
                explosive: { unlocked: false, level: 1 },
                magic_tower: { unlocked: false, level: 1 }
            },
            castle: { level: 1, hpBonus: 0, armorBonus: 0 },
            settings: {
                difficulty: 'normal',
                musicVolume: 0.6,
                sfxVolume: 0.8,
                fullscreen: false,
                graphicsQuality: 'high' // veryLow, low, medium, high, veryHigh, ultra
            },
            stats: {
                totalKills: 0,
                totalTokens: 0,
                totalCoins: 0,
                playTime: 0
            },
            achievements: []
        };
    },

    load() {
        try {
            let raw = localStorage.getItem(this.KEY);
            if (!raw) raw = localStorage.getItem('castle_defense_save_v1');
            if (!raw) return this.defaultData();
            const data = JSON.parse(raw);
            const def = this.defaultData();
            const merged = {
                ...def,
                ...data,
                troops: { ...def.troops },
                weapons: { ...def.weapons },
                settings: { ...def.settings, ...(data.settings || {}) },
                stats: { ...def.stats, ...(data.stats || {}) },
                castle: { ...def.castle, ...(data.castle || {}) }
            };
            if (data.troops) {
                for (const id in def.troops) {
                    if (data.troops[id]) {
                        merged.troops[id] = {
                            unlocked: !!data.troops[id].unlocked,
                            level: Math.max(1, Math.min(50, data.troops[id].level || 1))
                        };
                    }
                }
            }
            if (data.weapons) {
                for (const id in def.weapons) {
                    if (data.weapons[id]) {
                        merged.weapons[id] = {
                            unlocked: !!data.weapons[id].unlocked,
                            level: Math.max(1, Math.min(50, data.weapons[id].level || 1))
                        };
                    }
                }
            }
            if (!merged.settings.graphicsQuality) merged.settings.graphicsQuality = 'high';
            return merged;
        } catch (e) {
            console.warn('Save load failed, using defaults', e);
            return this.defaultData();
        }
    },

    save(data) {
        try {
            const clean = {
                version: 13,
                tokens: data.tokens || 0,
                coins: data.coins || 0,
                currentLevel: data.currentLevel || 1,
                highestLevel: data.highestLevel || 1,
                completedLevels: Array.isArray(data.completedLevels) ? [...data.completedLevels] : [],
                troops: {},
                weapons: {},
                castle: { ...(data.castle || { level: 1, hpBonus: 0, armorBonus: 0 }) },
                settings: {
                    difficulty: data.settings?.difficulty || 'normal',
                    musicVolume: data.settings?.musicVolume ?? 0.6,
                    sfxVolume: data.settings?.sfxVolume ?? 0.8,
                    fullscreen: !!data.settings?.fullscreen,
                    graphicsQuality: data.settings?.graphicsQuality || 'high'
                },
                stats: { ...(data.stats || { totalKills: 0, totalTokens: 0, totalCoins: 0, playTime: 0 }) },
                achievements: data.achievements || []
            };
            for (const id of Object.keys(this.defaultData().troops)) {
                const t = data.troops?.[id];
                clean.troops[id] = {
                    unlocked: t ? !!t.unlocked : (id === 'swordsman'),
                    level: t ? Math.max(1, Math.min(50, t.level || 1)) : 1
                };
            }
            for (const id of Object.keys(this.defaultData().weapons)) {
                const w = data.weapons?.[id];
                clean.weapons[id] = {
                    unlocked: w ? !!w.unlocked : (id === 'basic_cannon'),
                    level: w ? Math.max(1, Math.min(50, w.level || 1)) : 1
                };
            }
            localStorage.setItem(this.KEY, JSON.stringify(clean));
            localStorage.setItem('castle_defense_save_v1', JSON.stringify(clean));
            return true;
        } catch (e) {
            console.error('Save failed', e);
            return false;
        }
    },

    reset() {
        localStorage.removeItem(this.KEY);
        localStorage.removeItem('castle_defense_save_v1');
        return this.defaultData();
    }
};

// Quality presets
const GRAPHICS_QUALITY = {
    veryLow:  { name: 'Very Low',   particleMult: 0.25, detail: 0, shadow: false, glow: false, effects: false, resScale: 0.6 },
    low:      { name: 'Low',        particleMult: 0.45, detail: 1, shadow: false, glow: false, effects: true,  resScale: 0.75 },
    medium:   { name: 'Medium',     particleMult: 0.7,  detail: 2, shadow: true,  glow: false, effects: true,  resScale: 0.9 },
    high:     { name: 'High',       particleMult: 1.0,  detail: 3, shadow: true,  glow: true,  effects: true,  resScale: 1.0 },
    veryHigh: { name: 'Very High',  particleMult: 1.4,  detail: 4, shadow: true,  glow: true,  effects: true,  resScale: 1.15 },
    ultra:    { name: '4K / Ultra', particleMult: 1.8,  detail: 5, shadow: true,  glow: true,  effects: true,  resScale: 1.35 }
};

function getQuality() {
    const q = (window.game && window.game.save && window.game.save.settings && window.game.save.settings.graphicsQuality) || 'high';
    return GRAPHICS_QUALITY[q] || GRAPHICS_QUALITY.high;
}
