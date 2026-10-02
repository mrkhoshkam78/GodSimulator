// Levels Data - 50 Levels with progressive difficulty & environments
const LEVEL_THEMES = {
    grassland: { name: 'دشت سبز', bg: ['#2d5a27', '#3d7a37', '#4a9a47'], ground: '#1a3a1a' },
    forest: { name: 'جنگل', bg: ['#1a3a1a', '#0d2a0d', '#1e4a1e'], ground: '#0a1f0a' },
    desert: { name: 'بیابان', bg: ['#c9a66b', '#a67c52', '#8b6914'], ground: '#6b4423' },
    frozen: { name: 'سرزمین یخ', bg: ['#a8d5e5', '#7eb8da', '#5b9bd5'], ground: '#4a7c9b' },
    volcano: { name: 'آتشفشان', bg: ['#4a1c1c', '#2d0f0f', '#1a0808'], ground: '#1a0a0a' },
    dark: { name: 'پادشاهی تاریک', bg: ['#1a1a2e', '#16213e', '#0f0f1a'], ground: '#0a0a12' },
    ruined: { name: 'شهر ویران', bg: ['#3d3d3d', '#2a2a2a', '#1f1f1f'], ground: '#151515' },
    battlefield: { name: 'میدان نبرد باستانی', bg: ['#4a3728', '#3a2a1a', '#2a1a0a'], ground: '#1a1005' },
    demon: { name: 'سرزمین شیاطین', bg: ['#2d0a0a', '#1a0505', '#0d0202'], ground: '#0a0101' },
    final: { name: 'قلمرو نهایی', bg: ['#0a0a1a', '#050510', '#000005'], ground: '#020208' }
};

function generateLevel(levelNum) {
    const themes = [
        { range: [1,5], theme: 'grassland' },
        { range: [6,10], theme: 'forest' },
        { range: [11,15], theme: 'desert' },
        { range: [16,20], theme: 'frozen' },
        { range: [21,25], theme: 'volcano' },
        { range: [26,30], theme: 'dark' },
        { range: [31,35], theme: 'ruined' },
        { range: [36,40], theme: 'battlefield' },
        { range: [41,45], theme: 'demon' },
        { range: [46,50], theme: 'final' }
    ];
    const themeInfo = themes.find(t => levelNum >= t.range[0] && levelNum <= t.range[1]);
    const theme = LEVEL_THEMES[themeInfo.theme];
    const multiplier = 1 + (levelNum - 1) * 0.12;

    // Wave composition based on level
    const waves = [];
    const waveCount = Math.min(6 + Math.floor(levelNum / 10), 10);

    for (let w = 1; w <= waveCount; w++) {
        const enemies = [];
        const isBossWave = (w === waveCount && (levelNum % 5 === 0 || levelNum >= 45));
        const isEliteWave = (w === waveCount - 1 && levelNum > 5);

        if (isBossWave) {
            if (levelNum === 50) enemies.push({ id: 'boss_final', count: 1 });
            else if (levelNum >= 40) enemies.push({ id: 'boss_dragon', count: 1 });
            else if (levelNum >= 20) enemies.push({ id: 'boss_warlord', count: 1 });
            else enemies.push({ id: 'boss_warlord', count: 1 });
        } else {
            // Progressive enemy pool
            const pool = ['basic_soldier'];
            if (levelNum >= 2) pool.push('fast_runner');
            if (levelNum >= 4) pool.push('shield_soldier');
            if (levelNum >= 6) pool.push('archer');
            if (levelNum >= 8) pool.push('heavy_warrior');
            if (levelNum >= 10) pool.push('assassin');
            if (levelNum >= 12) pool.push('mage');
            if (levelNum >= 15) pool.push('healer');
            if (levelNum >= 18) pool.push('tank');
            if (levelNum >= 22) pool.push('berserker');
            if (levelNum >= 25) pool.push('elite_knight');

            const baseCount = 4 + Math.floor(levelNum * 0.8) + w * 2;
            const count = isEliteWave ? Math.floor(baseCount * 0.6) : baseCount;

            for (let i = 0; i < count; i++) {
                let id = pool[Math.floor(Math.random() * pool.length)];
                if (isEliteWave && Math.random() > 0.4) {
                    const elites = pool.filter(p => ['heavy_warrior','assassin','mage','tank','berserker','elite_knight'].includes(p));
                    if (elites.length) id = elites[Math.floor(Math.random() * elites.length)];
                }
                enemies.push({ id, count: 1 });
            }
        }

        waves.push({
            waveNumber: w,
            enemies,
            spawnDelay: Math.max(0.3, 1.2 - levelNum * 0.015),
            prepTime: w === 1 ? 5 : 3
        });
    }

    return {
        level: levelNum,
        name: `مرحله ${levelNum} - ${theme.name}`,
        theme: themeInfo.theme,
        themeData: theme,
        multiplier,
        waves,
        coinReward: 20 + levelNum * 8,
        bonusObjectives: [
            { id: 'no_damage', desc: 'بدون آسیب به قلعه', reward: 15 },
            { id: 'speed_clear', desc: 'پاکسازی سریع', reward: 10 }
        ]
    };
}

const LEVELS = {};
for (let i = 1; i <= 50; i++) {
    LEVELS[i] = generateLevel(i);
}
