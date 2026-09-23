function avatarSVG(p) {
  const female = p.gender === "زن";
  const child = (p.age || 20) < 13;
  const elder = (p.age || 20) >= 60;
  const seed = Array.from(String(p.id || p.name || "x")).reduce((s,c)=>s + c.charCodeAt(0), 0);
  const fPal = [
    ["#2a1628","#2c1a20","#f0c3b0","#c98ba8","#3b2030"],
    ["#1e1830","#4a2c22","#efd0b8","#d4a0c0","#6a3d58"],
    ["#241820","#1a1214","#e8b89a","#b86b7a","#5c2e40"],
    ["#201828","#6b3a24","#f6d7c0","#e0b0c8","#7a4a62"]
  ];
  const mPal = [
    ["#151c2a","#2a1c14","#e0b894","#4a6d8c","#1c2838"],
    ["#141816","#3a2818","#d4a878","#3d6b5a","#1a2420"],
    ["#1a1824","#1c1410","#c4926a","#5a4e8a","#22202c"],
    ["#161820","#4a3420","#e8c8a0","#3a5a78","#202830"]
  ];
  const [ring, hair, skin, accent, cloth] = (female ? fPal : mPal)[seed % 4];
  const eye = elder ? "#3a3340" : "#1a1520";
  const hairCut = child
    ? (female ? "M7 13c2-6 16-6 18 0v4c-3-4-15-4-18 0z" : "M9 12c1-5 13-5 14 0v3H9z")
    : female
      ? "M5.5 13c1.2-8 19.8-8 21 1.2v9.5c-3.2-7-17.8-7-21 0z"
      : seed % 2
        ? "M7.5 12.2c1.2-6.2 16-6.2 17 0V16H7.5z"
        : "M8 11.5c.8-5.8 15.2-5.2 16.2.6V16.2H8z";
  const chin = female ? 7.2 : 7.6;
  const smile = p.alive
    ? (female ? "M13.4 20.6c1.7 1.5 3.5 1.5 5.2 0" : "M13.6 20.4c1.5 1 3.2 1 4.8 0")
    : "M13.8 21h4.4";
  return `<svg class="avatar-svg" viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <radialGradient id="ag${seed}" cx="35%" cy="30%"><stop offset="0%" stop-color="#fff" stop-opacity=".18"/><stop offset="100%" stop-color="${ring}"/></radialGradient>
    </defs>
    <circle cx="16" cy="16" r="15.4" fill="url(#ag${seed})"/>
    <circle cx="16" cy="16" r="14.2" fill="none" stroke="${accent}" stroke-width=".55" opacity=".65"/>
    <path d="${hairCut}" fill="${hair}"/>
    <ellipse cx="16" cy="${child?19:18.1}" rx="${child?6.2:7.1}" ry="${child?6.6:chin}" fill="${skin}"/>
    <circle cx="13.1" cy="${child?17.4:16.5}" r="${child?.7:.85}" fill="${eye}"/>
    <circle cx="18.9" cy="${child?17.4:16.5}" r="${child?.7:.85}" fill="${eye}"/>
    ${female && !child ? `<path d="M11 15.1h2.4M18.6 15.1H21" stroke="${accent}" stroke-width=".45"/>` : ""}
    ${elder ? `<path d="M11.2 17.8c1.2.4 2 .2 2.4-.4M18.4 17.4c.5.6 1.4.8 2.6.3" fill="none" stroke="#8a6a60" stroke-width=".35"/>` : ""}
    <path d="${smile}" fill="none" stroke="#6a3d3d" stroke-width=".55" stroke-linecap="round"/>
    <path d="M10 24.6c2.2 4.6 9.8 4.6 12 0" fill="${cloth}"/>
    ${female && !child ? `<path d="M8.2 21.5c2.4 6.2 13.2 6.2 15.6 0" fill="${hair}" opacity=".92"/>` : ""}
    ${!female && !child ? `<path d="M13.4 22.6h5.2c.4 1.2-.2 2.2-2.6 2.2s-3-1-2.6-2.2z" fill="${hair}" opacity=".55"/>` : ""}
  </svg>`;
}
