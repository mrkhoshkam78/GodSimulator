/**
 * Canvas rendering: board, darts, aim, flight animation
 */

import { loadImage, getBoard, getDart } from './assets.js';

export class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.boardImg = null;
    this.dartImgs = {};
    this.boardId = 'classic';
    this.dartId = 'beginner_red';
    this.placedDarts = []; // {nx, ny, angle, dartId}
    this.flying = null;
    this.aim = { x: 0, y: 0, active: false };
    this.shake = 0;
    this.size = 600;
    this.dpr = window.devicePixelRatio || 1;
  }

  async setBoard(id) {
    this.boardId = id;
    const b = getBoard(id);
    this.boardImg = await loadImage(b.image);
    this.cal = b.calibration;
  }

  async setDart(id) {
    this.dartId = id;
    if (!this.dartImgs[id]) {
      this.dartImgs[id] = await loadImage(getDart(id).image);
    }
  }

  resize() {
    const container = this.canvas.parentElement;
    const max = Math.min(container.clientWidth, container.clientHeight) * 0.95;
    this.size = Math.max(280, Math.floor(max));
    this.canvas.width = this.size * this.dpr;
    this.canvas.height = this.size * this.dpr;
    this.canvas.style.width = this.size + 'px';
    this.canvas.style.height = this.size + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clearDarts() {
    this.placedDarts = [];
  }

  addDart(nx, ny, angle = 0) {
    this.placedDarts.push({ nx, ny, angle, dartId: this.dartId });
  }

  // Convert normalized board coords (-1..1) to canvas pixels
  toScreen(nx, ny) {
    const cx = this.size / 2;
    const cy = this.size / 2;
    const r = this.size * 0.48;
    return { x: cx + nx * r, y: cy + ny * r };
  }

  // Screen to normalized
  toNorm(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (sx - rect.left) * (this.size / rect.width);
    const y = (sy - rect.top) * (this.size / rect.height);
    const cx = this.size / 2;
    const cy = this.size / 2;
    const r = this.size * 0.48;
    return { nx: (x - cx) / r, ny: (y - cy) / r };
  }

  draw() {
    const ctx = this.ctx;
    const s = this.size;
    ctx.clearRect(0, 0, s, s);

    // Shake
    if (this.shake > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= 0.85;
      if (this.shake < 0.5) this.shake = 0;
    }

    // Board image
    if (this.boardImg) {
      const pad = s * 0.02;
      ctx.drawImage(this.boardImg, pad, pad, s - pad * 2, s - pad * 2);
    } else {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }

    // Placed darts
    for (const d of this.placedDarts) {
      this._drawDart(d.nx, d.ny, d.angle, d.dartId, 1);
    }

    // Flying dart
    if (this.flying) {
      const f = this.flying;
      this._drawDart(f.nx, f.ny, f.angle, f.dartId, f.scale || 1);
    }

    // Aim crosshair
    if (this.aim.active) {
      const p = this.toScreen(this.aim.nx, this.aim.ny);
      ctx.strokeStyle = 'rgba(0,229,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y);
      ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.shake > 0) ctx.restore();
  }

  _drawDart(nx, ny, angle, dartId, scale) {
    const img = this.dartImgs[dartId] || this.dartImgs[this.dartId];
    if (!img) return;
    const p = this.toScreen(nx, ny);
    const ctx = this.ctx;
    const h = this.size * 0.11 * scale;
    const w = h * (img.width / img.height);

    ctx.save();
    ctx.translate(p.x, p.y);
    // Point tip toward center-ish / impact
    ctx.rotate(angle || Math.atan2(ny, nx) + Math.PI / 2);
    // Tip is usually at one end; draw so tip is near impact point
    ctx.drawImage(img, -w * 0.15, -h / 2, w, h);
    ctx.restore();
  }

  async animateFlight(fromNx, fromNy, toNx, toNy, duration = 380) {
    return new Promise(resolve => {
      const start = performance.now();
      const dartId = this.dartId;
      const self = this;
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - t, 2);
        // Arc
        const arc = Math.sin(t * Math.PI) * 0.12;
        const nx = fromNx + (toNx - fromNx) * ease;
        const ny = fromNy + (toNy - fromNy) * ease - arc;
        const scale = 1.3 - 0.3 * ease;
        const angle = Math.atan2(toNy - fromNy, toNx - fromNx) + Math.PI / 2 + (1 - ease) * 0.4;
        self.flying = { nx, ny, angle, dartId, scale };
        self.draw();
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          self.flying = null;
          self.addDart(toNx, toNy, angle);
          self.shake = 6;
          self.draw();
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }
}
