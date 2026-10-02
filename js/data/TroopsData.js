// Troops Data - Modular & Expandable
const TROOPS_DATA = {
    swordsman: {
        id: 'swordsman',
        name: 'شمشیرزن',
        nameEn: 'Swordsman',
        class: 'melee',
        unlockCost: 0,
        baseStats: {
            hp: 120, damage: 18, attackSpeed: 1.1, range: 55,
            armor: 8, critChance: 0.08, moveSpeed: 65,
            attackType: 'melee'
        },
        growth: {
            hp: 12, damage: 2.2, attackSpeed: 0.02, range: 0.5,
            armor: 0.8, critChance: 0.004, moveSpeed: 0.8
        },
        color: '#4a90d9',
        size: 22,
        special: null
    },
    spearman: {
        id: 'spearman',
        name: 'نیزه‌دار',
        nameEn: 'Spearman',
        class: 'melee',
        unlockCost: 15,
        baseStats: {
            hp: 100, damage: 22, attackSpeed: 0.95, range: 75,
            armor: 5, critChance: 0.1, moveSpeed: 70,
            attackType: 'melee'
        },
        growth: {
            hp: 10, damage: 2.5, attackSpeed: 0.025, range: 0.8,
            armor: 0.6, critChance: 0.005, moveSpeed: 1
        },
        color: '#2ecc71',
        size: 20,
        special: 'pierce'
    },
    archer: {
        id: 'archer',
        name: 'کماندار',
        nameEn: 'Archer',
        class: 'ranged',
        unlockCost: 25,
        baseStats: {
            hp: 70, damage: 14, attackSpeed: 1.3, range: 220,
            armor: 2, critChance: 0.15, moveSpeed: 80,
            attackType: 'ranged'
        },
        growth: {
            hp: 7, damage: 1.8, attackSpeed: 0.03, range: 3,
            armor: 0.3, critChance: 0.006, moveSpeed: 1.2
        },
        color: '#27ae60',
        size: 18,
        special: null
    },
    crossbowman: {
        id: 'crossbowman',
        name: 'کمان‌صلیبی',
        nameEn: 'Crossbowman',
        class: 'ranged',
        unlockCost: 40,
        baseStats: {
            hp: 85, damage: 28, attackSpeed: 0.7, range: 200,
            armor: 4, critChance: 0.2, moveSpeed: 60,
            attackType: 'ranged'
        },
        growth: {
            hp: 8, damage: 3.2, attackSpeed: 0.02, range: 2.5,
            armor: 0.5, critChance: 0.007, moveSpeed: 0.8
        },
        color: '#16a085',
        size: 19,
        special: 'armor_pierce'
    },
    knight: {
        id: 'knight',
        name: 'شوالیه',
        nameEn: 'Knight',
        class: 'melee',
        unlockCost: 60,
        baseStats: {
            hp: 200, damage: 30, attackSpeed: 0.9, range: 60,
            armor: 18, critChance: 0.12, moveSpeed: 55,
            attackType: 'melee'
        },
        growth: {
            hp: 18, damage: 3.5, attackSpeed: 0.015, range: 0.4,
            armor: 1.5, critChance: 0.005, moveSpeed: 0.6
        },
        color: '#8e44ad',
        size: 26,
        special: 'charge'
    },
    heavy_guard: {
        id: 'heavy_guard',
        name: 'نگهبان سنگین',
        nameEn: 'Heavy Guard',
        class: 'tank',
        unlockCost: 80,
        baseStats: {
            hp: 350, damage: 15, attackSpeed: 0.7, range: 50,
            armor: 30, critChance: 0.05, moveSpeed: 40,
            attackType: 'melee'
        },
        growth: {
            hp: 30, damage: 1.8, attackSpeed: 0.01, range: 0.3,
            armor: 2.5, critChance: 0.003, moveSpeed: 0.4
        },
        color: '#7f8c8d',
        size: 28,
        special: 'taunt'
    },
    mage: {
        id: 'mage',
        name: 'جادوگر',
        nameEn: 'Mage',
        class: 'magic',
        unlockCost: 100,
        baseStats: {
            hp: 60, damage: 35, attackSpeed: 0.85, range: 180,
            armor: 1, critChance: 0.18, moveSpeed: 55,
            attackType: 'magic'
        },
        growth: {
            hp: 5, damage: 4, attackSpeed: 0.02, range: 2.5,
            armor: 0.2, critChance: 0.006, moveSpeed: 0.7
        },
        color: '#9b59b6',
        size: 20,
        special: 'aoe'
    },
    fire_mage: {
        id: 'fire_mage',
        name: 'جادوگر آتش',
        nameEn: 'Fire Mage',
        class: 'magic',
        unlockCost: 150,
        baseStats: {
            hp: 55, damage: 40, attackSpeed: 0.8, range: 170,
            armor: 1, critChance: 0.15, moveSpeed: 50,
            attackType: 'fire'
        },
        growth: {
            hp: 5, damage: 4.5, attackSpeed: 0.02, range: 2,
            armor: 0.2, critChance: 0.005, moveSpeed: 0.6
        },
        color: '#e74c3c',
        size: 20,
        special: 'burn'
    },
    ice_mage: {
        id: 'ice_mage',
        name: 'جادوگر یخ',
        nameEn: 'Ice Mage',
        class: 'magic',
        unlockCost: 150,
        baseStats: {
            hp: 55, damage: 32, attackSpeed: 0.75, range: 175,
            armor: 1, critChance: 0.12, moveSpeed: 50,
            attackType: 'ice'
        },
        growth: {
            hp: 5, damage: 3.8, attackSpeed: 0.018, range: 2.2,
            armor: 0.2, critChance: 0.004, moveSpeed: 0.6
        },
        color: '#3498db',
        size: 20,
        special: 'slow'
    },
    cannon_soldier: {
        id: 'cannon_soldier',
        name: 'سرباز توپ',
        nameEn: 'Cannon Soldier',
        class: 'artillery',
        unlockCost: 200,
        baseStats: {
            hp: 90, damage: 55, attackSpeed: 0.45, range: 250,
            armor: 6, critChance: 0.1, moveSpeed: 35,
            attackType: 'explosive'
        },
        growth: {
            hp: 8, damage: 5.5, attackSpeed: 0.01, range: 3,
            armor: 0.6, critChance: 0.004, moveSpeed: 0.3
        },
        color: '#d35400',
        size: 24,
        special: 'splash'
    }
};

function getTroopStats(troopId, level) {
    const data = TROOPS_DATA[troopId];
    if (!data) return null;
    const lvl = Math.max(1, Math.min(50, level));
    const s = data.baseStats;
    const g = data.growth;
    return {
        hp: Math.floor(s.hp + g.hp * (lvl - 1)),
        maxHp: Math.floor(s.hp + g.hp * (lvl - 1)),
        damage: Math.floor(s.damage + g.damage * (lvl - 1)),
        attackSpeed: +(s.attackSpeed + g.attackSpeed * (lvl - 1)).toFixed(2),
        range: Math.floor(s.range + g.range * (lvl - 1)),
        armor: Math.floor(s.armor + g.armor * (lvl - 1)),
        critChance: Math.min(0.6, +(s.critChance + g.critChance * (lvl - 1)).toFixed(3)),
        moveSpeed: Math.floor(s.moveSpeed + g.moveSpeed * (lvl - 1)),
        attackType: s.attackType,
        special: data.special,
        color: data.color,
        size: data.size,
        level: lvl
    };
}
