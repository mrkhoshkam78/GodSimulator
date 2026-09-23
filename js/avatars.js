function avatarSVG(p) {
  const female = p.gender === "زن";
  const seed = Array.from(p.id || p.name || "x").reduce((s,c)=>s+c.charCodeAt(0),0);
  const palettes = female
    ? [["#3a2438","#e8b4c8","#f3d4c0","#c97b9a"],["#2b1c32","#d4a5c8","#efd5c4","#8e5a86"],["#24182a","#f0c9a8","#ffe6d6","#b86b7a"]]
    : [["#1c2436","#c9a07a","#e8c8a8","#4a6d8c"],["#1a2220","#d0b08a","#f0d8bc","#3d6b5a"],["#22202c","#b88962","#e2c09a","#5a4e8a"]];
  const [bg, hair, skin, accent] = palettes[seed % palettes.length];
  const hairPath = female
    ? `M6 12c1-7 18-7 20 0v8c-3-6-17-6-20 0z M5 20c2 8 18 8 22 0`
    : `M8 11c1-6 15-6 16 0v3H8z`;
  const lashes = female ? `<path d="M11 15.2h2.2M18.8 15.2H21" stroke="${accent}" stroke-width=".5"/>` : "";
  return `<svg class="avatar-svg" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="15.2" fill="${bg}"/>
    <circle cx="16" cy="16" r="14" fill="none" stroke="${accent}" stroke-width=".6" opacity=".55"/>
    <path d="${hairPath}" fill="${hair}"/>
    <ellipse cx="16" cy="18" rx="7.2" ry="8" fill="${skin}"/>
    <circle cx="13.2" cy="16.6" r=".9" fill="#1a1520"/>
    <circle cx="18.8" cy="16.6" r=".9" fill="#1a1520"/>
    ${lashes}
    <path d="${female ? "M13.6 20.4c1.6 1.4 3.2 1.4 4.8 0" : "M13.8 20.2c1.4 .9 3 .9 4.4 0"}" fill="none" stroke="#6a3d3d" stroke-width=".55" stroke-linecap="round"/>
    ${female ? `<path d="M10 22c2 5 10 5 12 0" fill="${hair}"/>` : `<rect x="13.2" y="22.2" width="5.6" height="2.2" rx="1" fill="${hair}" opacity=".7"/>`}
  </svg>`;
}
