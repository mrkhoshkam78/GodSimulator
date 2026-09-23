const SAVE_KEY = "godsim_v1_world";

const SaveSystem = {
  snapshot(state) {
    return JSON.stringify(state);
  },
  persist(state) {
    try {
      localStorage.setItem(SAVE_KEY, this.snapshot(state));
    } catch (e) {
      console.warn("save failed", e);
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
};
