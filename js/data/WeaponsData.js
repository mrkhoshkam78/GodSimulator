// Weapons Data - Castle defensive weapons
const WEAPONS_DATA = {
    basic_cannon: {
        id: 'basic_cannon', name: 'توپ پایه', nameEn: 'Basic Cannon',
        unlockCost: 0, baseDamage: 40, attackSpeed: 0.6, range: 280,
        critChance: 0.08, projectileType: 'cannonball', special: null,
        color: '#7f8c8d', growth: { damage: 5, attackSpeed: 0.02, range: 4, critChance: 0.004 }
    },
    heavy_cannon: {
        id: 'heavy_cannon', name: 'توپ سنگین', nameEn: 'Heavy Cannon',
        unlockCost: 80, baseDamage: 90, attackSpeed: 0.35, range: 320,
        critChance: 0.1, projectileType: 'heavyball', special: 'knockback',
        color: '#2c3e50', growth: { damage: 10, attackSpeed: 0.015, range: 5, critChance: 0.005 }
    },
    ballista: {
        id: 'ballista', name: 'بالیستا', nameEn: 'Ballista',
        unlockCost: 50, baseDamage: 55, attackSpeed: 0.5, range: 350,
        critChance: 0.18, projectileType: 'bolt', special: 'pierce',
        color: '#8e5a2b', growth: { damage: 7, attackSpeed: 0.02, range: 6, critChance: 0.006 }
    },
    fire_cannon: {
        id: 'fire_cannon', name: 'توپ آتشین', nameEn: 'Fire Cannon',
        unlockCost: 120, baseDamage: 50, attackSpeed: 0.55, range: 260,
        critChance: 0.1, projectileType: 'fireball', special: 'burn',
        color: '#e74c3c', growth: { damage: 6, attackSpeed: 0.02, range: 3, critChance: 0.004 }
    },
    ice_cannon: {
        id: 'ice_cannon', name: 'توپ یخی', nameEn: 'Ice Cannon',
        unlockCost: 120, baseDamage: 45, attackSpeed: 0.5, range: 270,
        critChance: 0.08, projectileType: 'iceball', special: 'slow',
        color: '#3498db', growth: { damage: 5.5, attackSpeed: 0.018, range: 3.5, critChance: 0.004 }
    },
    lightning: {
        id: 'lightning', name: 'سلاح رعد', nameEn: 'Lightning Weapon',
        unlockCost: 180, baseDamage: 70, attackSpeed: 0.7, range: 300,
        critChance: 0.15, projectileType: 'lightning', special: 'chain',
        color: '#f1c40f', growth: { damage: 8, attackSpeed: 0.025, range: 4, critChance: 0.005 }
    },
    explosive: {
        id: 'explosive', name: 'توپ انفجاری', nameEn: 'Explosive Cannon',
        unlockCost: 200, baseDamage: 80, attackSpeed: 0.3, range: 240,
        critChance: 0.12, projectileType: 'explosive', special: 'splash',
        color: '#d35400', growth: { damage: 9, attackSpeed: 0.012, range: 3, critChance: 0.005 }
    },
    magic_tower: {
        id: 'magic_tower', name: 'برج جادویی', nameEn: 'Magic Tower',
        unlockCost: 250, baseDamage: 60, attackSpeed: 0.65, range: 290,
        critChance: 0.2, projectileType: 'magic', special: 'aoe',
        color: '#9b59b6', growth: { damage: 7, attackSpeed: 0.022, range: 4, critChance: 0.006 }
    }
};

function getWeaponStats(weaponId, level) {
    const data = WEAPONS_DATA[weaponId];
    if (!data) return null;
    const lvl = Math.max(1, Math.min(50, level));
    return {
        damage: Math.floor(data.baseDamage + data.growth.damage * (lvl - 1)),
        attackSpeed: +(data.attackSpeed + data.growth.attackSpeed * (lvl - 1)).toFixed(2),
        range: Math.floor(data.range + data.growth.range * (lvl - 1)),
        critChance: Math.min(0.55, +(data.critChance + data.growth.critChance * (lvl - 1)).toFixed(3)),
        projectileType: data.projectileType,
        special: data.special,
        color: data.color,
        level: lvl,
        name: data.name
    };
}
