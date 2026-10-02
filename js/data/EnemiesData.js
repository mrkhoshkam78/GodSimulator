// Enemies Data - 12+ types, modular
const ENEMIES_DATA = {
    basic_soldier: {
        id: 'basic_soldier', name: 'سرباز ساده', nameEn: 'Basic Soldier',
        baseHp: 80, damage: 12, speed: 55, armor: 3, size: 40,
        attackSpeed: 1.0, tokenReward: 1, color: '#c0392b', size: 18,
        type: 'normal', behavior: 'direct'
    },
    fast_runner: {
        id: 'fast_runner', name: 'دونده سریع', nameEn: 'Fast Runner',
        baseHp: 45, damage: 8, speed: 110, armor: 1, range: 35,
        attackSpeed: 1.4, tokenReward: 1, color: '#e67e22', size: 16,
        type: 'normal', behavior: 'rush'
    },
    shield_soldier: {
        id: 'shield_soldier', name: 'سرباز سپردار', nameEn: 'Shield Soldier',
        baseHp: 140, damage: 10, speed: 40, armor: 25, range: 45,
        attackSpeed: 0.8, tokenReward: 2, color: '#7f8c8d', size: 22,
        type: 'normal', behavior: 'tank'
    },
    archer: {
        id: 'archer', name: 'کماندار دشمن', nameEn: 'Enemy Archer',
        baseHp: 50, damage: 15, speed: 60, armor: 2, range: 180,
        attackSpeed: 0.9, tokenReward: 2, color: '#27ae60', size: 17,
        type: 'ranged', behavior: 'kiting'
    },
    heavy_warrior: {
        id: 'heavy_warrior', name: 'جنگجوی سنگین', nameEn: 'Heavy Warrior',
        baseHp: 250, damage: 28, speed: 35, armor: 15, range: 55,
        attackSpeed: 0.7, tokenReward: 3, color: '#8e44ad', size: 26,
        type: 'elite', behavior: 'direct'
    },
    assassin: {
        id: 'assassin', name: 'قاتل', nameEn: 'Assassin',
        baseHp: 60, damage: 40, speed: 95, armor: 2, range: 40,
        attackSpeed: 1.6, tokenReward: 3, color: '#2c3e50', size: 16,
        type: 'elite', behavior: 'flank'
    },
    mage: {
        id: 'mage', name: 'جادوگر دشمن', nameEn: 'Enemy Mage',
        baseHp: 70, damage: 35, speed: 45, armor: 1, range: 160,
        attackSpeed: 0.7, tokenReward: 3, color: '#9b59b6', size: 18,
        type: 'elite', behavior: 'support'
    },
    healer: {
        id: 'healer', name: 'شفا‌دهنده', nameEn: 'Healer',
        baseHp: 80, damage: 5, speed: 50, armor: 3, range: 120,
        attackSpeed: 0.5, tokenReward: 4, color: '#1abc9c', size: 18,
        type: 'elite', behavior: 'heal', healAmount: 25
    },
    tank: {
        id: 'tank', name: 'تانک', nameEn: 'Tank',
        baseHp: 500, damage: 20, speed: 25, armor: 40, range: 50,
        attackSpeed: 0.6, tokenReward: 5, color: '#34495e', size: 32,
        type: 'heavy', behavior: 'tank'
    },
    berserker: {
        id: 'berserker', name: 'بربر', nameEn: 'Berserker',
        baseHp: 180, damage: 35, speed: 75, armor: 5, range: 50,
        attackSpeed: 1.3, tokenReward: 4, color: '#c0392b', size: 24,
        type: 'elite', behavior: 'berserk'
    },
    elite_knight: {
        id: 'elite_knight', name: 'شوالیه نخبه', nameEn: 'Elite Knight',
        baseHp: 320, damage: 40, speed: 50, armor: 22, range: 60,
        attackSpeed: 0.95, tokenReward: 5, color: '#f1c40f', size: 28,
        type: 'elite', behavior: 'direct'
    },
    boss_warlord: {
        id: 'boss_warlord', name: 'سالار جنگ', nameEn: 'Warlord Boss',
        baseHp: 2500, damage: 55, speed: 40, armor: 30, range: 70,
        attackSpeed: 0.8, tokenReward: 25, color: '#e74c3c', size: 48,
        type: 'boss', behavior: 'boss', phases: 3
    },
    boss_dragon: {
        id: 'boss_dragon', name: 'اژدها', nameEn: 'Dragon Boss',
        baseHp: 4000, damage: 70, speed: 55, armor: 20, range: 200,
        attackSpeed: 0.6, tokenReward: 40, color: '#8e44ad', size: 60,
        type: 'boss', behavior: 'dragon', phases: 4
    },
    boss_final: {
        id: 'boss_final', name: 'پادشاه تاریکی', nameEn: 'Final Dark King',
        baseHp: 8000, damage: 90, speed: 45, armor: 40, range: 100,
        attackSpeed: 0.9, tokenReward: 80, color: '#1a1a2e', size: 70,
        type: 'boss', behavior: 'final', phases: 5
    }
};

function getEnemyStats(enemyId, levelMultiplier = 1) {
    const data = ENEMIES_DATA[enemyId];
    if (!data) return null;
    return {
        ...data,
        hp: Math.floor(data.baseHp * levelMultiplier),
        maxHp: Math.floor(data.baseHp * levelMultiplier),
        damage: Math.floor(data.damage * levelMultiplier),
        speed: data.speed * (0.9 + levelMultiplier * 0.1)
    };
}
