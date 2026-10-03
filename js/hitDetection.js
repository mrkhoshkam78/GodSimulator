/**
 * Precise polar hit detection for standard dartboard layout.
 * Numbers clockwise from top (20): 20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5
 */

const SECTOR_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export function detectHit(nx, ny, calibration = null) {
  // nx, ny in normalized board space: center=0,0, outer radius ≈ 1
  const cal = calibration || {
    outer: 0.95, doubleOuter: 0.95, doubleInner: 0.90,
    tripleOuter: 0.62, tripleInner: 0.57, outerBull: 0.12, bull: 0.05
  };

  const r = Math.sqrt(nx * nx + ny * ny);
  let angle = Math.atan2(nx, -ny); // 0 at top, clockwise positive after adjustment
  if (angle < 0) angle += Math.PI * 2;

  // Each sector is 18° = π/10. Offset by half sector so 20 is centered at top.
  const sectorAngle = Math.PI / 10;
  let sectorIdx = Math.floor((angle + sectorAngle / 2) / sectorAngle) % 20;
  const number = SECTOR_NUMBERS[sectorIdx];

  if (r > cal.outer) {
    return { type: 'miss', number: 0, multiplier: 0, score: 0, label: 'MISS' };
  }
  if (r <= cal.bull) {
    return { type: 'bull', number: 25, multiplier: 2, score: 50, label: 'BULL' };
  }
  if (r <= cal.outerBull) {
    return { type: 'outerBull', number: 25, multiplier: 1, score: 25, label: '25' };
  }
  if (r >= cal.tripleInner && r <= cal.tripleOuter) {
    return { type: 'triple', number, multiplier: 3, score: number * 3, label: `T${number}` };
  }
  if (r >= cal.doubleInner && r <= cal.doubleOuter) {
    return { type: 'double', number, multiplier: 2, score: number * 2, label: `D${number}` };
  }
  // Single
  const isInnerSingle = r < cal.tripleInner;
  return {
    type: isInnerSingle ? 'singleInner' : 'singleOuter',
    number,
    multiplier: 1,
    score: number,
    label: `S${number}`
  };
}

export function isDouble(hit) {
  return hit.type === 'double' || hit.type === 'bull';
}

export function isValidCheckout(remaining, hit, outRule) {
  if (outRule === 'open') return hit.score === remaining && remaining > 0;
  // Double out
  if (hit.score !== remaining) return false;
  return isDouble(hit);
}

export function canCheckout(remaining, outRule) {
  if (remaining <= 0) return false;
  if (outRule === 'open') return remaining <= 60;
  // Double out: even numbers up to 40, or 50 (bull)
  if (remaining === 50) return true;
  if (remaining > 40 || remaining % 2 !== 0) return false;
  return true;
}
