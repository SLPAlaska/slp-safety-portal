'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════
// SLP ALASKA — WEATHER & PHASE CONDITION GLOBE
// ═══════════════════════════════════════════════════════

const ASH_BOOK_PHASES = {
  NORMAL: { label: "Normal Operations", color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "#22c55e", icon: "✅", travel: "Unrestricted travel. Standard operations.", outdoor: "Normal outdoor work permitted. Standard PPE required.", equipment: "Standard equipment operation per manufacturer specs." },
  PHASE_I: { label: "Phase I — Caution", color: "#eab308", bg: "rgba(234,179,8,0.15)", border: "#eab308", icon: "⚠️", travel: "Reduced Visibility. Travel with EXTREME CAUTION. Reduce speed. Radios & lights must be operating. Arctic gear REQUIRED.", outdoor: "Outdoor work with caution. Safety time out/THA if wind chill in 5-min frostbite zone. Arctic gear required Oct 1–May 1.", equipment: "Temp < -35°F (-20°F manlifts/scissor lifts): Evaluate need, exposure, failure potential before crane/equipment ops." },
  PHASE_II: { label: "Phase II — Restricted", color: "#f97316", bg: "rgba(249,115,22,0.15)", border: "#f97316", icon: "🟠", travel: "CONVOY ONLY. Two+ vehicles required. Radio comm between vehicles REQUIRED.", outdoor: "Limit outdoor work. THA REQUIRED for all outside tasks. Suspend all regulated confined space work.", equipment: "Wind > 40 mph: Safety time out/THA to determine priority. Systematic equipment review required." },
  PHASE_III: { label: "Phase III — CLOSED", color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "#ef4444", icon: "🔴", travel: "CRITICAL/EMERGENCY TRAVEL ONLY. Heavy equipment convoy ONLY. Do NOT leave vehicle.", outdoor: "CEASE all non-emergency outdoor work. Personnel to designated shelter. Emergency teams only.", equipment: "SUSPEND all non-essential equipment ops. Emergency only with supervisor auth." },
};

function getASHPhase(temp_f, wind_mph, wc, vis) {
  if ((vis !== null && vis < 0.125) || (wc !== null && wc < -75) || (wind_mph !== null && wind_mph > 55)) return "PHASE_III";
  if ((vis !== null && vis < 0.25) || (wc !== null && wc < -60) || (wind_mph !== null && wind_mph > 45)) return "PHASE_II";
  if ((vis !== null && vis < 0.5) || (wc !== null && wc < -40) || (wind_mph !== null && wind_mph > 35) || (temp_f !== null && temp_f < -35)) return "PHASE_I";
  return "NORMAL";
}

function calcWindChill(t, w) {
  if (t === null || w === null || t > 50 || w < 3) return t;
  return 35.74 + 0.6215 * t - 35.75 * Math.pow(w, 0.16) + 0.4275 * t * Math.pow(w, 0.16);
}

function frostbiteTime(wc) {
  if (wc === null || wc > -10) return null;
  if (wc >= -28) return "30 min";
  if (wc >= -40) return "15 min";
  if (wc >= -55) return "10 min";
  if (wc >= -65) return "5 min";
  return "< 5 min";
}

const AK_LOCS = [
  { name: "Deadhorse / Prudhoe Bay", lat: 70.2002, lon: -148.4597, ns: true },
  { name: "Kuparuk", lat: 70.3319, lon: -149.5894, ns: true },
  { name: "Alpine (CD-1)", lat: 70.3764, lon: -150.9453, ns: true },
  { name: "Nuiqsut", lat: 70.2107, lon: -150.9989, ns: true },
  { name: "West Harrison Bay", lat: 70.47, lon: -152.05, ns: true },
  { name: "Oliktok Point", lat: 70.4991, lon: -149.8794, ns: true },
  { name: "Utqiaġvik (Barrow)", lat: 71.2906, lon: -156.7886, ns: true },
  { name: "Umiat", lat: 69.3711, lon: -152.1384, ns: true },
  { name: "Kenai", lat: 60.5544, lon: -151.2583, ns: false },
  { name: "Soldotna", lat: 60.4878, lon: -151.0583, ns: false },
  { name: "Nikiski", lat: 60.6903, lon: -151.2886, ns: false },
  { name: "Anchorage", lat: 61.2181, lon: -149.9003, ns: false },
  { name: "Fairbanks", lat: 64.8378, lon: -147.7164, ns: false },
  { name: "Valdez", lat: 61.1309, lon: -146.3483, ns: false },
  { name: "Homer", lat: 59.6425, lon: -151.5483, ns: false },
  { name: "Kodiak", lat: 57.79, lon: -152.4072, ns: false },
  { name: "Bethel", lat: 60.7922, lon: -161.7558, ns: false },
  { name: "Nome", lat: 64.5011, lon: -165.4064, ns: false },
  { name: "Dillingham", lat: 59.0397, lon: -158.4575, ns: false },
];

function drawCoastlines(scene) {
  const lines = [];
  const mat = new THREE.LineBasicMaterial({ color: 0x5bb8ff, transparent: true, opacity: 0.45 });
  const data = [
    [[71,-156],[70,-148],[70,-141],[68,-135],[61,-140],[60,-147],[59,-152],[57,-155],[55,-160],[52,-170],[51,-178],[52,177],[56,165],[59,163],[62,167],[64,168],[66,170],[64,-168],[61,-165],[58,-157],[55,-133],[49,-128],[48,-124],[43,-124],[38,-123],[34,-120],[32,-117],[28,-112],[26,-98],[29,-95],[30,-88],[27,-82],[25,-80],[25,-78],[30,-82],[29,-85],[30,-90]],
    [[12,-72],[10,-76],[7,-77],[2,-80],[-2,-80],[-5,-81],[-6,-77],[-13,-76],[-15,-75],[-18,-70],[-23,-70],[-28,-66],[-35,-57],[-40,-62],[-43,-65],[-46,-67],[-50,-69],[-53,-71],[-55,-68],[-54,-64],[-52,-59],[-47,-56],[-42,-53],[-38,-49],[-32,-48],[-25,-47],[-23,-44],[-20,-40],[-13,-38],[-8,-35],[-3,-40],[0,-50],[5,-60],[8,-63],[10,-68],[12,-72]],
    [[36,-6],[37,-2],[39,0],[41,2],[43,3],[43,5],[44,8],[45,12],[41,14],[39,17],[37,22],[40,24],[41,29],[46,30],[55,20],[56,10],[58,5],[59,3],[62,5],[63,10],[65,12],[68,15],[70,20],[71,25],[70,30]],
    [[36,-6],[35,0],[37,10],[33,12],[31,32],[25,35],[20,37],[15,42],[12,44],[2,42],[5,40],[0,9],[-5,12],[-10,14],[-15,12],[-20,15],[-25,15],[-30,18],[-34,18],[-34,26],[-30,32],[-25,35],[-20,37],[-15,40],[-10,42],[-5,40],[0,42],[5,44],[10,45],[12,44]],
    [[70,30],[72,40],[70,55],[68,70],[65,75],[60,70],[55,70],[50,55],[45,50],[42,45],[40,50],[35,52],[33,48],[30,48],[25,55],[20,58],[15,55],[10,53],[8,50],[5,48],[0,44]],
    [[35,52],[36,60],[40,65],[45,65],[50,75],[55,80],[60,90],[55,110],[50,120],[45,130],[40,130],[35,128],[32,121],[30,120],[25,120],[22,108],[20,100],[15,100],[10,105],[5,104],[1,104]],
    [[55,80],[60,90],[65,90],[70,85],[72,90],[72,100],[72,110],[72,120],[72,130],[70,135],[68,140],[65,143],[62,150],[60,155],[62,160],[64,168],[66,170]],
    [[-12,130],[-14,136],[-12,142],[-16,145],[-20,149],[-24,152],[-28,153],[-33,152],[-37,150],[-38,145],[-35,137],[-35,135],[-32,133],[-32,128],[-28,123],[-25,114],[-22,114],[-20,119],[-15,125],[-12,130]],
    [[71,-156],[71,-153],[70,-148],[70,-144],[69,-141],[67,-140],[63,-140],[61,-146],[60,-149],[59,-152],[58,-155],[57,-157],[56,-159],[55,-161],[54,-165],[55,-168],[57,-170],[60,-172],[62,-167],[64,-165],[65,-168],[66,-170],[68,-163],[70,-160],[71,-156]],
    [[60,-43],[63,-42],[65,-40],[68,-33],[72,-25],[76,-20],[78,-18],[80,-20],[82,-25],[83,-35],[82,-50],[80,-55],[78,-60],[75,-60],[73,-56],[70,-52],[67,-50],[64,-48],[60,-43]],
    [[50,-6],[51,-3],[52,0],[53,0],[55,-2],[57,-4],[58,-3],[58,-5],[56,-6],[52,-5],[50,-6]],
    [[33,130],[35,133],[36,137],[38,140],[40,140],[42,141],[44,144],[45,143],[43,141],[40,140],[38,137],[35,135],[33,130]],
    [[30,68],[28,70],[25,68],[22,70],[20,73],[18,73],[15,74],[12,75],[10,76],[8,77],[8,79],[12,80],[15,80],[18,84],[20,87],[22,89],[23,90],[24,89],[25,88],[28,80],[30,78],[33,72],[30,68]],
  ];
  data.forEach(coords => {
    const pts = coords.map(([lat, lon]) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(-1.005 * Math.sin(phi) * Math.cos(theta), 1.005 * Math.cos(phi), 1.005 * Math.sin(phi) * Math.sin(theta));
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    lines.push(line);
  });
  return lines;
}

// Add location dots for Alaska
function addAlaskaDots(scene) {
  const dots = [];
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.6 });
  AK_LOCS.forEach(loc => {
    const phi = (90 - loc.lat) * (Math.PI / 180);
    const theta = (loc.lon + 180) * (Math.PI / 180);
    const geo = new THREE.SphereGeometry(0.008, 8, 8);
    const dot = new THREE.Mesh(geo, loc.ns ? new THREE.MeshBasicMaterial({ color: 0xff6633, transparent: true, opacity: 0.7 }) : dotMat);
    dot.position.set(
      -1.01 * Math.sin(phi) * Math.cos(theta),
      1.01 * Math.cos(phi),
      1.01 * Math.sin(phi) * Math.sin(theta)
    );
    scene.add(dot);
    dots.push(dot);
  });
  return dots;
}

function Globe3D({ onLocationSelect, selectedLocation }) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const markerRef = useRef(null);
  const rotation = useRef({ x: -0.3, y: 2.6 });
  const targetRotation = useRef({ x: -0.3, y: 2.6 });
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const coastlinesRef = useRef([]);
  const dotsRef = useRef([]);

  const latLonToVec3 = useCallback((lat, lon, r) => {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const w = el.clientWidth, h = el.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 3.2;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 3, 5);
    scene.add(dl);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x1a3a5c, shininess: 30, transparent: true, opacity: 0.92 })
    );
    scene.add(globe);
    globeRef.current = globe;

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.003, 36, 36),
      new THREE.MeshBasicMaterial({ color: 0x2a6496, wireframe: true, transparent: true, opacity: 0.12 })
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.07, side: THREE.BackSide })
    ));

    coastlinesRef.current = drawCoastlines(scene);
    dotsRef.current = addAlaskaDots(scene);

    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    markerRef.current = markerGroup;

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (autoRotate.current && !isDragging.current) targetRotation.current.y += 0.0008;
      rotation.current.x += (targetRotation.current.x - rotation.current.x) * 0.08;
      rotation.current.y += (targetRotation.current.y - rotation.current.y) * 0.08;
      const rx = rotation.current.x, ry = rotation.current.y;
      globe.rotation.set(rx, ry, 0);
      coastlinesRef.current.forEach(l => l.rotation.set(rx, ry, 0));
      dotsRef.current.forEach(d => d.rotation.set(rx, ry, 0));
      markerGroup.rotation.set(rx, ry, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onDown = e => { isDragging.current = true; autoRotate.current = false; prevMouse.current = { x: e.clientX, y: e.clientY }; };
    const onMove = e => {
      if (!isDragging.current) return;
      targetRotation.current.y += (e.clientX - prevMouse.current.x) * 0.005;
      targetRotation.current.x = Math.max(-1.2, Math.min(1.2, targetRotation.current.x + (e.clientY - prevMouse.current.y) * 0.005));
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { isDragging.current = false; };
    const onClick = e => {
      const rect = el.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObject(globe);
      if (hits.length > 0) {
        const p = hits[0].point.clone().applyEuler(new THREE.Euler(-rotation.current.x, -rotation.current.y, 0, "XYZ"));
        const lat = 90 - Math.acos(p.y) * 180 / Math.PI;
        let lon = -(Math.atan2(p.z, -p.x) * 180 / Math.PI) - 180;
        if (lon < -180) lon += 360; if (lon > 180) lon -= 360;
        onLocationSelect({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, name: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}` });
      }
    };

    const c = renderer.domElement;
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointerleave", onUp);
    c.addEventListener("click", onClick);
    c.addEventListener("touchstart", e => { if (e.touches.length === 1) onDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); }, { passive: true });
    c.addEventListener("touchmove", e => { if (e.touches.length === 1) onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); }, { passive: true });
    c.addEventListener("touchend", onUp);

    const onResize = () => { const nw = el.clientWidth, nh = el.clientHeight; camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh); };
    window.addEventListener("resize", onResize);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); if (el.contains(c)) el.removeChild(c); renderer.dispose(); };
  }, []);

  useEffect(() => {
    if (!markerRef.current || !selectedLocation) return;
    const g = markerRef.current;
    while (g.children.length) g.remove(g.children[0]);
    const pos = latLonToVec3(selectedLocation.lat, selectedLocation.lon, 1.02);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff3333 }));
    pin.position.copy(pos);
    g.add(pin);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.065, 32), new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    g.add(ring);
    const phi = (90 - selectedLocation.lat) * Math.PI / 180;
    const theta = (selectedLocation.lon + 180) * Math.PI / 180;
    targetRotation.current = { x: -(Math.PI / 2 - phi) * 0.6, y: -theta + Math.PI };
    autoRotate.current = false;
  }, [selectedLocation, latLonToVec3]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab", borderRadius: "12px", overflow: "hidden" }} />;
}

async function fetchNOAA(lat, lon) {
  try {
    const pr = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: { "User-Agent": "SLPAlaska/1.0" } });
    if (!pr.ok) throw new Error("Location not covered by NOAA");
    const pd = await pr.json();
    let current = null;
    try {
      const sr = await fetch(pd.properties.observationStations, { headers: { "User-Agent": "SLPAlaska/1.0" } });
      const sd = await sr.json();
      if (sd.features?.length) {
        const or = await fetch(`https://api.weather.gov/stations/${sd.features[0].properties.stationIdentifier}/observations/latest`, { headers: { "User-Agent": "SLPAlaska/1.0" } });
        const od = await or.json();
        const p = od.properties;
        const tc = p.temperature?.value, ws = p.windSpeed?.value, vm = p.visibility?.value;
        current = { temp_f: tc !== null ? tc * 9 / 5 + 32 : null, temp_c: tc, wind_mph: ws !== null ? ws * 2.237 : null, wind_dir: p.windDirection?.value, humidity: p.relativeHumidity?.value, visibility_miles: vm !== null ? vm / 1609.34 : null, description: p.textDescription || "N/A", station: sd.features[0].properties.name, timestamp: p.timestamp };
        current.wind_chill = calcWindChill(current.temp_f, current.wind_mph);
        current.frostbite_time = frostbiteTime(current.wind_chill);
      }
    } catch (e) { console.warn(e); }
    let forecast = [];
    try {
      const fr = await fetch(pd.properties.forecast, { headers: { "User-Agent": "SLPAlaska/1.0" } });
      const fd = await fr.json();
      forecast = (fd.properties?.periods || []).slice(0, 6).map(p => ({ name: p.name, temp_f: p.temperature, wind_speed: p.windSpeed, wind_dir: p.windDirection, short: p.shortForecast, detailed: p.detailedForecast, isDaytime: p.isDaytime }));
    } catch (e) { console.warn(e); }
    return { current, forecast, error: null };
  } catch (e) { return { current: null, forecast: [], error: e.message }; }
}

// ─── STYLES ───
const S = {
  wrap: { background: "linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a1628 100%)", borderRadius: "16px", border: "1px solid rgba(74,158,255,0.2)", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e2e8f0", width: "100%", maxWidth: "900px", margin: "0 auto" },
  header: { padding: "14px 20px 10px", borderBottom: "1px solid rgba(74,158,255,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" },
  main: { display: "flex", flexDirection: "row", minHeight: "460px" },
  globeWrap: { flex: "0 0 360px", height: "460px", position: "relative" },
  panel: { flex: 1, borderLeft: "1px solid rgba(74,158,255,0.12)", display: "flex", flexDirection: "column", minWidth: 0 },
  search: { padding: "12px 16px", borderBottom: "1px solid rgba(74,158,255,0.08)" },
  input: { width: "100%", padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid rgba(74,158,255,0.2)", background: "rgba(15,25,50,0.6)", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" },
  chips: { display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px", maxHeight: "80px", overflowY: "auto" },
  tabs: { display: "flex", borderBottom: "1px solid rgba(74,158,255,0.1)" },
};

function Chip({ loc, selected, onClick }) {
  return <button onClick={onClick} style={{ padding: "3px 10px", borderRadius: "12px", border: `1px solid ${selected ? "#4a9eff" : "rgba(74,158,255,0.15)"}`, background: selected ? "rgba(74,158,255,0.2)" : "rgba(15,25,50,0.4)", color: selected ? "#4a9eff" : "#94a3b8", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>{loc.ns ? "🏔️" : "📍"} {loc.name}</button>;
}

function MetricBox({ label, value, sub, alert }) {
  return <div style={{ padding: "10px 12px", borderRadius: "8px", background: alert ? "rgba(239,68,68,0.1)" : "rgba(15,25,50,0.5)", border: `1px solid ${alert ? "rgba(239,68,68,0.3)" : "rgba(74,158,255,0.08)"}` }}>
    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    <div style={{ fontSize: "18px", fontWeight: 800, color: alert ? "#ef4444" : "#fff", marginTop: "2px" }}>{value}</div>
    {sub && <div style={{ fontSize: "10px", color: alert ? "#f97316" : "#64748b", marginTop: "2px" }}>{sub}</div>}
  </div>;
}

function ThresholdRow({ label, value, thresholds, alert }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: "6px", background: alert ? "rgba(249,115,22,0.08)" : "rgba(15,25,50,0.3)", border: `1px solid ${alert ? "rgba(249,115,22,0.2)" : "rgba(74,158,255,0.06)"}`, gap: "8px" }}>
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: alert ? "#f97316" : "#e2e8f0" }}>{label}: {value}</div>
      <div style={{ fontSize: "9px", color: "#64748b" }}>{thresholds}</div>
    </div>
    {alert && <span style={{ fontSize: "14px" }}>⚠️</span>}
  </div>;
}

export default function WeatherGlobe() {
  const [loc, setLoc] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("current");
  const [search, setSearch] = useState("");

  const isAK = useMemo(() => loc && loc.lat >= 51 && loc.lat <= 72 && loc.lon >= -180 && loc.lon <= -129, [loc]);
  const phase = useMemo(() => { if (!weather?.current || !isAK) return null; const c = weather.current; return getASHPhase(c.temp_f, c.wind_mph, c.wind_chill, c.visibility_miles); }, [weather, isAK]);
  const pd = phase ? ASH_BOOK_PHASES[phase] : null;

  const select = useCallback(async (l) => {
    setLoc(l); setLoading(true); setError(null); setWeather(null);
    const data = await fetchNOAA(l.lat, l.lon);
    if (data.error) setError(data.error);
    else { setWeather(data); setTab(l.lat >= 51 && l.lat <= 72 && l.lon >= -180 && l.lon <= -129 ? "ash" : "current"); }
    setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return AK_LOCS;
    return AK_LOCS.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  return (
    <div style={S.wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media(max-width:740px){.wg-main{flex-direction:column!important} .wg-globe{flex:none!important;height:300px!important;width:100%!important}}`}</style>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🌐</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>Weather & Phase Conditions</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>NOAA Live Data • ASH Book 2026 Compliance</div>
          </div>
        </div>
        {pd && <div style={{ padding: "4px 14px", borderRadius: "20px", background: pd.bg, border: `1px solid ${pd.border}`, fontSize: "12px", fontWeight: 700, color: pd.color, whiteSpace: "nowrap" }}>{pd.icon} {pd.label}</div>}
      </div>

      {/* Body */}
      <div className="wg-main" style={S.main}>
        <div className="wg-globe" style={S.globeWrap}>
          <Globe3D onLocationSelect={select} selectedLocation={loc} />
          <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", fontSize: "10px", color: "#475569", pointerEvents: "none", textAlign: "center", background: "rgba(10,22,40,0.7)", padding: "3px 12px", borderRadius: "10px" }}>Drag to rotate • Click to select</div>
        </div>

        <div style={S.panel}>
          {/* Search */}
          <div style={S.search}>
            <div style={{ position: "relative" }}>
              <input placeholder="Search Alaska locations..." value={search} onChange={e => setSearch(e.target.value)} style={S.input} />
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: 0.5 }}>🔍</span>
            </div>
            <div style={S.chips}>
              {filtered.map(l => <Chip key={l.name} loc={l} selected={loc?.name === l.name} onClick={() => { select({ lat: l.lat, lon: l.lon, name: l.name }); setSearch(""); }} />)}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {!loc && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#475569", fontSize: "13px", textAlign: "center", padding: "20px", gap: "8px" }}>
                <span style={{ fontSize: "40px", opacity: 0.3 }}>🌍</span>
                <div>Select a location on the globe<br/>or choose from the list above</div>
                <div style={{ fontSize: "11px", color: "#334155" }}>Alaska locations include ASH Book phase analysis</div>
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px", color: "#4a9eff" }}>
                <div style={{ width: "20px", height: "20px", border: "2px solid rgba(74,158,255,0.3)", borderTop: "2px solid #4a9eff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Fetching NOAA data...
              </div>
            )}

            {error && !loading && (
              <div style={{ padding: "20px" }}>
                <div style={{ color: "#f97316", fontSize: "13px", fontWeight: 600 }}>⚠️ {error}</div>
                <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>📍 {loc?.lat}°, {loc?.lon}°</div>
              </div>
            )}

            {weather && !loading && (
              <div>
                <div style={S.tabs}>
                  {[{ id: "current", label: "Current" }, { id: "forecast", label: "Forecast" }, ...(isAK ? [{ id: "ash", label: "🏔️ ASH Book" }] : [])].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #4a9eff" : "2px solid transparent", color: tab === t.id ? "#4a9eff" : "#64748b", fontSize: "12px", fontWeight: tab === t.id ? 700 : 400, cursor: "pointer" }}>{t.label}</button>
                  ))}
                </div>

                {/* CURRENT */}
                {tab === "current" && weather.current && (
                  <div style={{ padding: "16px" }}>
                    <div style={{ fontSize: "11px", color: "#4a9eff", fontWeight: 600 }}>📍 {loc.name}</div>
                    <div style={{ fontSize: "10px", color: "#475569", marginBottom: "14px" }}>Station: {weather.current.station} • {weather.current.timestamp ? new Date(weather.current.timestamp).toLocaleString() : ""}</div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                      <div>
                        <div style={{ fontSize: "42px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{weather.current.temp_f !== null ? `${Math.round(weather.current.temp_f)}°F` : "--"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{weather.current.temp_c !== null ? `${Math.round(weather.current.temp_c)}°C` : ""}</div>
                      </div>
                      <div style={{ fontSize: "13px", color: "#94a3b8", paddingTop: "6px" }}>{weather.current.description}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <MetricBox label="Wind" value={weather.current.wind_mph !== null ? `${Math.round(weather.current.wind_mph)} mph` : "--"} sub={weather.current.wind_dir !== null ? `${Math.round(weather.current.wind_dir)}°` : ""} />
                      <MetricBox label="Wind Chill" value={weather.current.wind_chill !== null ? `${Math.round(weather.current.wind_chill)}°F` : "--"} sub={weather.current.frostbite_time ? `⚠️ Frostbite: ${weather.current.frostbite_time}` : ""} alert={weather.current.wind_chill !== null && weather.current.wind_chill < -40} />
                      <MetricBox label="Visibility" value={weather.current.visibility_miles !== null ? `${weather.current.visibility_miles.toFixed(1)} mi` : "--"} alert={weather.current.visibility_miles !== null && weather.current.visibility_miles < 0.5} />
                      <MetricBox label="Humidity" value={weather.current.humidity !== null ? `${Math.round(weather.current.humidity)}%` : "--"} />
                    </div>
                  </div>
                )}

                {/* FORECAST */}
                {tab === "forecast" && (
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "11px", color: "#4a9eff", fontWeight: 600, marginBottom: "10px" }}>📍 {loc.name} — Extended Forecast</div>
                    {weather.forecast.length === 0 && <div style={{ color: "#64748b", fontSize: "12px" }}>No forecast available</div>}
                    {weather.forecast.map((p, i) => (
                      <div key={i} style={{ padding: "10px 12px", marginBottom: "6px", borderRadius: "8px", background: p.isDaytime ? "rgba(74,158,255,0.06)" : "rgba(15,25,50,0.4)", border: "1px solid rgba(74,158,255,0.08)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>{p.name}</span>
                          <span style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{p.temp_f}°F</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{p.short} • Wind: {p.wind_speed} {p.wind_dir}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ASH BOOK */}
                {tab === "ash" && isAK && (
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "11px", color: "#4a9eff", fontWeight: 600 }}>📍 {loc.name}</div>
                    <div style={{ fontSize: "10px", color: "#475569", marginBottom: "12px" }}>ASH Book 2026 • Foul Weather Contingency (pp. 56-57){AK_LOCS.find(l => l.name === loc.name)?.ns ? " • NORTH SLOPE" : ""}</div>

                    {pd && (
                      <div style={{ padding: "14px", borderRadius: "10px", background: pd.bg, border: `1px solid ${pd.border}`, marginBottom: "12px" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: pd.color, marginBottom: "10px" }}>{pd.icon} {pd.label}</div>
                        {[["🚗 Travel", pd.travel], ["🏗️ Outdoor Work", pd.outdoor], ["⚙️ Equipment", pd.equipment]].map(([l, t]) => (
                          <div key={l} style={{ marginBottom: "8px" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>{l}</div>
                            <div style={{ fontSize: "11px", color: "#e2e8f0", lineHeight: 1.5 }}>{t}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current vs. Thresholds</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <ThresholdRow label="Wind Chill" value={weather.current?.wind_chill !== null ? `${Math.round(weather.current.wind_chill)}°F` : "--"} thresholds="-40°F (I) · -60°F (II) · -75°F (III)" alert={weather.current?.wind_chill < -40} />
                      <ThresholdRow label="Wind" value={weather.current?.wind_mph !== null ? `${Math.round(weather.current.wind_mph)} mph` : "--"} thresholds="35 mph (I) · 45 mph (II) · 55 mph (III)" alert={weather.current?.wind_mph > 35} />
                      <ThresholdRow label="Visibility" value={weather.current?.visibility_miles !== null ? `${weather.current.visibility_miles.toFixed(1)} mi` : "--"} thresholds="< ½ mi (I) · < ¼ mi (II) · < ⅛ mi (III)" alert={weather.current?.visibility_miles < 0.5} />
                      <ThresholdRow label="Temp" value={weather.current?.temp_f !== null ? `${Math.round(weather.current.temp_f)}°F` : "--"} thresholds="< -35°F: Equipment eval required (p.44)" alert={weather.current?.temp_f < -35} />
                      {weather.current?.frostbite_time && <div style={{ padding: "6px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>❄️ FROSTBITE RISK: ~{weather.current.frostbite_time} (Wind Chill Chart p.188)</div>}
                    </div>

                    <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "8px", background: "rgba(15,25,50,0.5)", border: "1px solid rgba(74,158,255,0.08)" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phase Reference</div>
                      {Object.entries(ASH_BOOK_PHASES).map(([k, p]) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0", fontSize: "10px", color: k === phase ? p.color : "#64748b", fontWeight: k === phase ? 700 : 400 }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                          {p.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
