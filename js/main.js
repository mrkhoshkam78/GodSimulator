// Entry Point
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }

    // Handle resize for different monitors
    function resize() {
        const container = document.getElementById('gameContainer');
        const maxW = window.innerWidth;
        const maxH = window.innerHeight;
        const aspect = 1280 / 720;
        let w = maxW;
        let h = maxW / aspect;
        if (h > maxH) {
            h = maxH;
            w = maxH * aspect;
        }
        container.style.width = w + 'px';
        container.style.height = h + 'px';
    }
    window.addEventListener('resize', resize);
    resize();

    // Fullscreen toggle
    document.addEventListener('keydown', e => {
        if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen();
            }
        }
    });

    // Start game
    const game = new Game(canvas);

    // Click handling for menus (delegated)
    canvas.addEventListener('click', () => {
        // handled inside game via input.mouse.clicked
    });
});
