const ICONS = {
  menu: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  close: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  world: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></svg>`,
  prayer: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v6M9 6h6"/><path d="M7 14c0-2.8 2.2-5 5-5s5 2.2 5 5v6H7v-6z"/></svg>`,
  power: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 10-13h-7l0-7z"/></svg>`,
  events: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
  stats: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9M12 19V5M19 19v-7"/></svg>`,
  settings: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 6.5l1.5 1.5M17.6 16l1.5 1.5M3 12h2M19 12h2M4.9 17.5l1.5-1.5M17.6 8l1.5-1.5"/></svg>`,
  pause: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8zM13 6h3v12h-3z"/></svg>`,
  play: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l12 6-12 6V6z"/></svg>`,
  fast: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6l8 6-8 6V6zM13 6l8 6-8 6V6z"/></svg>`,
  fastest: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l7 6-7 6V6zM10 6l7 6-7 6V6zM17 7v10"/></svg>`,
  save: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h11l3 3v11H5V5z"/><path d="M8 5v5h8V5M8 19v-6h8v6"/></svg>`,
  load: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M8 10l4 4 4-4"/><path d="M5 18h14"/></svg>`,
  spark: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.2 6.2L19 9l-5 3.5L15.5 21 12 16.8 8.5 21 10 12.5 5 9l5.8.2z"/></svg>`,
  alive: `<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/></svg>`,
  dead: `<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8l8 8M16 8l-8 8"/></svg>`,
  group: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c.5-3 2.5-5 5-5s4.5 2 5 5M11 19c.5-3 2.5-5 5-5s4.5 2 5 5"/></svg>`,
  brand: `<svg class="ico ico-brand" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.2H22l-6.2 4.4 2.4 7.4L12 16.8 5.8 21l2.4-7.4L2 9.2h7.6z"/></svg>`
};
function icon(name){ return ICONS[name] || ""; }
