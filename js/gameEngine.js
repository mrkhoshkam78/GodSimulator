/**
 * Core match / leg / turn state machine
 */

import { detectHit, isValidCheckout, isDouble } from './hitDetection.js';
import { getCheckoutSuggestion, formatSuggestion } from './checkout.js';
import { updateStatsFromTurn, addXP, recordMatchResult, saveProfile } from './player.js';

export class GameEngine {
  constructor(opts) {
    this.mode = opts.mode || '501';
    this.startScore = { '501': 501, '301': 301, '701': 701, practice: 0, around: 0, cricket: 0 }[this.mode] || 501;
    this.rules = {
      bestOf: opts.bestOf || 3,
      inRule: opts.inRule || 'open',
      outRule: opts.outRule || 'double'
    };
    this.aiDiff = opts.aiDiff || 'amateur';
    this.boardCal = opts.boardCal;
    this.profile = opts.profile;
    this.onUpdate = opts.onUpdate || (() => {});
    this.onEvent = opts.onEvent || (() => {});

    this.resetMatch();
  }

  resetMatch() {
    this.legsNeeded = Math.ceil(this.rules.bestOf / 2);
    this.p1 = { name: this.profile.nickname || 'You', score: this.startScore, legs: 0, dartsThrown: 0, totalScore: 0 };
    this.p2 = { name: 'AI', score: this.startScore, legs: 0, dartsThrown: 0, totalScore: 0 };
    this.current = 0; // 0 = player, 1 = AI
    this.leg = 1;
    this.dartInTurn = 0;
    this.turnStartScore = this.startScore;
    this.turnHits = [];
    this.turnScore = 0;
    this.finished = false;
    this.winner = null;
    this.opened = { 0: this.rules.inRule === 'open', 1: this.rules.inRule === 'open' };
    this.aroundTarget = 1; // for around the clock
    this.practiceLog = [];
  }

  currentPlayer() {
    return this.current === 0 ? this.p1 : this.p2;
  }

  otherPlayer() {
    return this.current === 0 ? this.p2 : this.p1;
  }

  getCheckoutHint() {
    if (this.mode === 'practice' || this.mode === 'around' || this.mode === 'cricket') return '';
    const rem = this.currentPlayer().score - this.turnScore;
    const sug = getCheckoutSuggestion(rem, this.rules.outRule);
    return formatSuggestion(sug);
  }

  applyDart(nx, ny, hit, isAI = false) {
    const player = this.currentPlayer();
    const events = [];

    // Around the clock
    if (this.mode === 'around') {
      return this._applyAround(hit, isAI);
    }
    if (this.mode === 'practice') {
      this.practiceLog.push(hit);
      this.dartInTurn++;
      this.turnHits.push(hit);
      this.turnScore += hit.score;
      this.onEvent({ type: 'hit', hit, isAI });
      if (this.dartInTurn >= 3) {
        this._endTurnPractice();
      }
      this.onUpdate();
      return { hit, endTurn: this.dartInTurn >= 3 };
    }

    // Standard x01
    let scoreToApply = hit.score;
    let bust = false;
    let checkout = false;

    // Double-in
    if (!this.opened[this.current]) {
      if (isDouble(hit)) {
        this.opened[this.current] = true;
        events.push('opened');
      } else {
        scoreToApply = 0;
        events.push('needDoubleIn');
      }
    }

    const remainingAfter = player.score - this.turnScore - scoreToApply;

    if (this.opened[this.current] && scoreToApply > 0) {
      if (remainingAfter < 0) {
        bust = true;
      } else if (remainingAfter === 0) {
        if (isValidCheckout(player.score - this.turnScore, hit, this.rules.outRule)) {
          checkout = true;
        } else {
          bust = true; // invalid checkout
        }
      } else if (remainingAfter === 1 && this.rules.outRule === 'double') {
        bust = true; // leave 1 is bust on double-out
      }
    }

    if (bust) {
      // Revert entire turn
      this.turnHits = [];
      this.turnScore = 0;
      this.dartInTurn = 3; // force end
      this.onEvent({ type: 'bust', isAI });
      this._endTurn(true);
      this.onUpdate();
      return { hit, bust: true, endTurn: true };
    }

    this.turnHits.push(hit);
    this.turnScore += scoreToApply;
    this.dartInTurn++;
    player.dartsThrown++;

    this.onEvent({ type: 'hit', hit, isAI, score: scoreToApply });

    if (checkout) {
      player.score = 0;
      this.onEvent({ type: 'checkout', score: this.turnScore, isAI });
      if (!isAI) {
        updateStatsFromTurn(this.profile, this.turnScore, this.turnHits, false, true);
        addXP(this.profile, 50 + this.turnScore);
      }
      this._winLeg(isAI);
      this.onUpdate();
      return { hit, checkout: true, endTurn: true };
    }

    if (this.dartInTurn >= 3) {
      player.score -= this.turnScore;
      if (!isAI) {
        updateStatsFromTurn(this.profile, this.turnScore, this.turnHits, false, false);
        addXP(this.profile, Math.floor(this.turnScore / 10) + 2);
      }
      player.totalScore += this.turnScore;
      this._endTurn(false);
    }

    this.onUpdate();
    return { hit, endTurn: this.dartInTurn >= 3 };
  }

  _endTurn(busted) {
    this.dartInTurn = 0;
    this.turnHits = [];
    this.turnScore = 0;
    this.current = 1 - this.current;
    this.turnStartScore = this.currentPlayer().score;
    this.onEvent({ type: 'turnEnd', next: this.current });
  }

  _endTurnPractice() {
    this.dartInTurn = 0;
    this.turnHits = [];
    this.turnScore = 0;
  }

  _winLeg(isAI) {
    const winner = isAI ? this.p2 : this.p1;
    winner.legs++;
    this.onEvent({ type: 'legWin', winner: isAI ? 1 : 0 });

    if (winner.legs >= this.legsNeeded) {
      this.finished = true;
      this.winner = isAI ? 1 : 0;
      if (!isAI) {
        recordMatchResult(this.profile, true);
        addXP(this.profile, 100);
      } else {
        recordMatchResult(this.profile, false);
        addXP(this.profile, 20);
      }
      saveProfile(this.profile);
      this.onEvent({ type: 'matchWin', winner: this.winner });
    } else {
      // Next leg
      this.p1.score = this.startScore;
      this.p2.score = this.startScore;
      this.opened = { 0: this.rules.inRule === 'open', 1: this.rules.inRule === 'open' };
      this.leg++;
      this.current = (this.leg - 1) % 2; // alternate start
      this.dartInTurn = 0;
      this.turnHits = [];
      this.turnScore = 0;
      this.turnStartScore = this.startScore;
    }
  }

  _applyAround(hit, isAI) {
    const target = this.aroundTarget;
    let success = false;
    if (target <= 20) {
      success = hit.number === target && hit.multiplier >= 1;
    } else {
      success = hit.type === 'bull' || hit.type === 'outerBull';
    }
    this.dartInTurn++;
    this.turnHits.push(hit);
    this.onEvent({ type: 'hit', hit, isAI, aroundSuccess: success });
    if (success) {
      this.aroundTarget++;
      if (this.aroundTarget > 21) {
        this.finished = true;
        this.winner = 0;
        this.onEvent({ type: 'matchWin', winner: 0 });
      }
    }
    if (this.dartInTurn >= 3) {
      this.dartInTurn = 0;
      this.turnHits = [];
    }
    this.onUpdate();
    return { hit, endTurn: this.dartInTurn === 0 };
  }

  avg(player) {
    if (player.dartsThrown === 0) return 0;
    return (player.totalScore / player.dartsThrown * 3).toFixed(1);
  }
}
