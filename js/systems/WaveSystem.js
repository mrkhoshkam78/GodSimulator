// Wave System
class WaveSystem {
    constructor() {
        this.currentWave = 0;
        this.totalWaves = 0;
        this.waveData = null;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.prepTimer = 0;
        this.state = 'idle'; // idle, prep, spawning, combat, complete
        this.enemiesRemaining = 0;
        this.levelData = null;
    }

    startLevel(levelData) {
        this.levelData = levelData;
        this.totalWaves = levelData.waves.length;
        this.currentWave = 0;
        this.state = 'prep';
        this.prepTimer = levelData.waves[0].prepTime || 5;
        this.spawnQueue = [];
        this.enemiesRemaining = 0;
    }

    update(dt, enemies, spawnEnemyFn) {
        if (this.state === 'complete' || this.state === 'idle') return;

        if (this.state === 'prep') {
            this.prepTimer -= dt;
            if (this.prepTimer <= 0) {
                this.startWave();
            }
            return;
        }

        if (this.state === 'spawning') {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
                const item = this.spawnQueue.shift();
                spawnEnemyFn(item.id);
                this.enemiesRemaining++;
                this.spawnTimer = this.waveData.spawnDelay || 0.8;
            }
            if (this.spawnQueue.length === 0) {
                this.state = 'combat';
            }
        }

        if (this.state === 'combat' || this.state === 'spawning') {
            // Count living enemies
            const alive = enemies.filter(e => !e.dead).length;
            if (alive === 0 && this.spawnQueue.length === 0 && this.state === 'combat') {
                // Wave cleared
                if (this.currentWave >= this.totalWaves) {
                    this.state = 'complete';
                } else {
                    this.state = 'prep';
                    this.prepTimer = this.levelData.waves[this.currentWave]?.prepTime || 3;
                }
            }
        }
    }

    startWave() {
        this.currentWave++;
        this.waveData = this.levelData.waves[this.currentWave - 1];
        this.spawnQueue = [];
        for (const group of this.waveData.enemies) {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({ id: group.id });
            }
        }
        // Shuffle a bit
        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }
        this.state = 'spawning';
        this.spawnTimer = 0.2;
        this.enemiesRemaining = this.spawnQueue.length;
    }

    isComplete() {
        return this.state === 'complete';
    }

    getProgress() {
        return {
            current: this.currentWave,
            total: this.totalWaves,
            state: this.state,
            prepTimer: Math.ceil(this.prepTimer),
            remaining: this.spawnQueue.length + (window.game?.enemies?.filter(e => !e.dead).length || 0)
        };
    }
}
