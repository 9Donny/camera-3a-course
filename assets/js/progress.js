export class Progress {
  constructor(initial = null) {
    const defaults = {
      currentDay: 1,
      completedDays: [],
      streak: 0,
      lastCompletedAt: null,
    };
    if (initial && Array.isArray(initial.completedDays)) {
      this.state = initial;
    } else {
      this.state = defaults;
    }
  }

  getState() {
    return { ...this.state, completedDays: [...this.state.completedDays] };
  }

  isUnlocked(day) {
    if (day === 1) return true;
    return this.state.completedDays.includes(day - 1);
  }

  isCompleted(day) {
    return this.state.completedDays.includes(day);
  }

  completeDay(day, isoDate) {
    if (!this.isUnlocked(day)) {
      throw new Error(`Day ${day} is locked`);
    }
    if (this.state.completedDays.includes(day)) {
      return; // idempotent
    }

    this.state.completedDays.push(day);
    this.state.completedDays.sort((a, b) => a - b);
    this.state.currentDay = Math.max(this.state.currentDay, day + 1);

    this._updateStreak(isoDate);
    this.state.lastCompletedAt = isoDate;
  }

  _updateStreak(isoDate) {
    const last = this.state.lastCompletedAt;
    if (last === null) {
      this.state.streak = 1;
      return;
    }
    if (last === isoDate) {
      return; // same calendar day, no change
    }
    const diff = daysBetween(last, isoDate);
    if (diff === 1) {
      this.state.streak += 1;
    } else {
      this.state.streak = 1;
    }
  }
}

function daysBetween(a, b) {
  const ms = (new Date(b)) - (new Date(a));
  return Math.round(ms / 86400000);
}
