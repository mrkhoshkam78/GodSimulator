// Input Manager - Mouse + Keyboard (fixed for HiDPI / logical coords)
class InputManager {
    constructor(canvas, logicalWidth = 1280, logicalHeight = 720) {
        this.canvas = canvas;
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, clicked: false, rightDown: false, wheel: 0 };
        this.bindings = {
            pause: ['Escape', 'p', 'P'],
            speed1: ['1'],
            speed2: ['2'],
            speed3: ['3'],
            deploy1: ['q', 'Q'],
            deploy2: ['w', 'W'],
            deploy3: ['e', 'E'],
            deploy4: ['r', 'R']
        };

        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.key] = false; });

        const updateMousePos = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Always map to logical game coordinates (1280x720), independent of devicePixelRatio
            const scaleX = this.logicalWidth / rect.width;
            const scaleY = this.logicalHeight / rect.height;
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
        };

        canvas.addEventListener('mousemove', updateMousePos);
        canvas.addEventListener('mousedown', e => {
            updateMousePos(e);
            if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
            if (e.button === 2) this.mouse.rightDown = true;
        });
        canvas.addEventListener('mouseup', e => {
            updateMousePos(e);
            if (e.button === 0) this.mouse.down = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });
        // Also support touch for better compatibility
        canvas.addEventListener('touchstart', e => {
            if (e.touches.length > 0) {
                const t = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                this.mouse.x = (t.clientX - rect.left) * (this.logicalWidth / rect.width);
                this.mouse.y = (t.clientY - rect.top) * (this.logicalHeight / rect.height);
                this.mouse.down = true;
                this.mouse.clicked = true;
            }
            e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('touchend', e => {
            this.mouse.down = false;
            e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('wheel', e => {
            this.mouse.wheel = e.deltaY;
            e.preventDefault();
        }, { passive: false });
    }

    isKey(key) { return !!this.keys[key]; }
    isBinding(name) {
        const keys = this.bindings[name] || [];
        return keys.some(k => this.keys[k]);
    }

    endFrame() {
        this.mouse.clicked = false;
        this.mouse.wheel = 0;
    }
}
