'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════
// SLP ALASKA — WEATHER & PHASE CONDITIONS GLOBE v3
// ─ Real earth texture (NASA Blue Marble via Three.js examples)
// ─ Open-Meteo for GLOBAL weather (no API key, free)
// ─ NOAA hardcoded stations for North Slope accuracy
// ─ Open-Meteo Geocoding API for city/zip search
// ─ Nominatim reverse geocoding for globe click → place name
// ─ ASH Book 2026 phase conditions for Alaska locations
// ═══════════════════════════════════════════════════════════════════════

// ─── WMO WEATHER CODES ───
const WMO = {
  0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
  45:"Foggy",48:"Depositing rime fog",51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",
  56:"Light freezing drizzle",57:"Dense freezing drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
  66:"Light freezing rain",67:"Heavy freezing rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",
  77:"Snow grains",80:"Slight rain showers",81:"Moderate rain showers",82:"Violent rain showers",
  85:"Slight snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm w/ slight hail",99:"Thunderstorm w/ heavy hail"
};
const WMO_ICON = {
  0:"\u2600\uFE0F",1:"\uD83C\uDF24",2:"\u26C5",3:"\u2601\uFE0F",
  45:"\uD83C\uDF2B\uFE0F",48:"\uD83C\uDF2B\uFE0F",51:"\uD83C\uDF26",53:"\uD83C\uDF27",55:"\uD83C\uDF27",
  56:"\uD83E\uDDCA",57:"\uD83E\uDDCA",61:"\uD83C\uDF27",63:"\uD83C\uDF27",65:"\uD83C\uDF27",
  66:"\uD83E\uDDCA",67:"\uD83E\uDDCA",71:"\uD83C\uDF28",73:"\uD83C\uDF28",75:"\uD83C\uDF28",
  77:"\uD83C\uDF28",80:"\uD83C\uDF26",81:"\uD83C\uDF27",82:"\u26C8\uFE0F",
  85:"\uD83C\uDF28",86:"\uD83C\uDF28",95:"\u26A1",96:"\u26A1",99:"\u26A1"
};

// ─── ASH BOOK PHASE CONDITIONS ───
const ASH_BOOK_PHASES = {
  NORMAL: { label: "Normal Operations", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "#22c55e", icon: "\u2705",
    travel: "Unrestricted travel. Standard operations.", outdoor: "Normal outdoor work permitted. Standard PPE required.", equipment: "Standard equipment operation per manufacturer specs." },
  PHASE_I: { label: "Phase I — Caution", color: "#eab308", bg: "rgba(234,179,8,0.12)", border: "#eab308", icon: "\u26A0\uFE0F",
    travel: "Reduced Visibility. Travel with EXTREME CAUTION. Reduce speed. Radios & lights must be operating. Arctic gear REQUIRED.",
    outdoor: "Outdoor work with caution. Safety time out/THA if wind chill in 5-min frostbite zone. Arctic gear required Oct 1\u2013May 1.",
    equipment: "Temp < -35\u00B0F (-20\u00B0F manlifts/scissor lifts): Evaluate need, exposure, failure potential before crane/equipment ops." },
  PHASE_II: { label: "Phase II — Restricted", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "#f97316", icon: "\uD83D\uDFE0",
    travel: "CONVOY ONLY. Two+ vehicles required. Radio comm between vehicles REQUIRED.",
    outdoor: "Limit outdoor work. THA REQUIRED for all outside tasks. Suspend all regulated confined space work.",
    equipment: "Wind > 40 mph: Safety time out/THA to determine priority. Systematic equipment review required." },
  PHASE_III: { label: "Phase III — CLOSED", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "#ef4444", icon: "\uD83D\uDD34",
    travel: "CRITICAL/EMERGENCY TRAVEL ONLY. Heavy equipment convoy ONLY. Do NOT leave vehicle.",
    outdoor: "CEASE all non-emergency outdoor work. Personnel to designated shelter. Emergency teams only.",
    equipment: "SUSPEND all non-essential equipment ops. Emergency only with supervisor auth." },
};

function getASHPhase(t, w, wc, v) {
  if ((v !== null && v < 0.125) || (wc !== null && wc < -75) || (w !== null && w > 55)) return "PHASE_III";
  if ((v !== null && v < 0.25) || (wc !== null && wc < -60) || (w !== null && w > 45)) return "PHASE_II";
  if ((v !== null && v < 0.5) || (wc !== null && wc < -40) || (w !== null && w > 35) || (t !== null && t < -35)) return "PHASE_I";
  return "NORMAL";
}
function calcWindChill(t, w) {
  if (t === null || w === null || t > 50 || w < 3) return t;
  return Math.round((35.74 + 0.6215*t - 35.75*Math.pow(w,0.16) + 0.4275*t*Math.pow(w,0.16))*10)/10;
}
function frostbiteTime(wc) {
  if (wc === null || wc > -10) return null;
  if (wc >= -28) return "~30 min"; if (wc >= -40) return "~15 min";
  if (wc >= -55) return "~10 min"; if (wc >= -65) return "~5 min"; return "< 5 min";
}

// ─── NOAA STATIONS (North Slope hardcoded for accuracy) ───
const NOAA_STATIONS = {
  "Deadhorse / Prudhoe Bay":"PASC","Kuparuk":"PASC","Alpine (CD-1)":"PALU","Nuiqsut":"PAQT",
  "West Harrison Bay":"PASC","Oliktok Point":"POLI","Utqia\u0121vik (Barrow)":"PABR","Umiat":"PAUM",
  "Pt. Thompson":"PASC","Badami":"PASC","Kenai":"PAEN","Soldotna":"PAEN","Nikiski":"PAEN",
  "Anchorage":"PANC","Fairbanks":"PAFA","Valdez":"PAVD","Homer":"PAHO","Kodiak":"PADQ",
  "Bethel":"PABE","Nome":"PAOM","Dillingham":"PADL"
};

// ─── ALASKA LOCATIONS ───
const AK_LOCS = [
  { name:"Deadhorse / Prudhoe Bay", lat:70.2002, lon:-148.4597, ns:true },
  { name:"Kuparuk", lat:70.3319, lon:-149.5894, ns:true },
  { name:"Alpine (CD-1)", lat:70.3764, lon:-150.9453, ns:true },
  { name:"Nuiqsut", lat:70.2107, lon:-150.9989, ns:true },
  { name:"West Harrison Bay", lat:70.47, lon:-152.05, ns:true },
  { name:"Oliktok Point", lat:70.4991, lon:-149.8794, ns:true },
  { name:"Utqia\u0121vik (Barrow)", lat:71.2906, lon:-156.7886, ns:true },
  { name:"Umiat", lat:69.3711, lon:-152.1384, ns:true },
  { name:"Pt. Thompson", lat:70.0911, lon:-146.0147, ns:true },
  { name:"Badami", lat:70.1392, lon:-147.0017, ns:true },
  { name:"Kenai", lat:60.5544, lon:-151.2583, ns:false },
  { name:"Soldotna", lat:60.4878, lon:-151.0583, ns:false },
  { name:"Nikiski", lat:60.6903, lon:-151.2886, ns:false },
  { name:"Anchorage", lat:61.2181, lon:-149.9003, ns:false },
  { name:"Fairbanks", lat:64.8378, lon:-147.7164, ns:false },
  { name:"Valdez", lat:61.1309, lon:-146.3483, ns:false },
  { name:"Homer", lat:59.6425, lon:-151.5483, ns:false },
  { name:"Kodiak", lat:57.79, lon:-152.4072, ns:false },
  { name:"Bethel", lat:60.7922, lon:-161.7558, ns:false },
  { name:"Nome", lat:64.5011, lon:-165.4064, ns:false },
  { name:"Dillingham", lat:59.0397, lon:-158.4575, ns:false },
];

// ─── EARTH TEXTURE URL ───
// Using a well-known public NASA Blue Marble texture
const EARTH_TEXTURE = "https://unpkg.com/three-globe@2.41.12/example/img/earth-blue-marble.jpg";
const EARTH_BUMP = "https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png";
const NIGHT_TEXTURE = "https://unpkg.com/three-globe@2.41.12/example/img/earth-night.jpg";

// ═══════════════════════════════════════════════════════════════════════
// GLOBE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function Globe3D({ onLocationSelect, selectedLocation }) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const markerRef = useRef(null);
  const rotRef = useRef({ x: -0.3, y: 2.6 });
  const targetRot = useRef({ x: -0.3, y: 2.6 });
  const dragging = useRef(false);
  const prev = useRef({ x:0, y:0 });
  const autoRot = useRef(true);
  const clickStart = useRef({ x:0, y:0, t:0 });

  const ll2v = useCallback((lat, lon, r) => {
    const phi = (90-lat)*Math.PI/180, theta = (lon+180)*Math.PI/180;
    return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const w = el.clientWidth, h = el.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
    camera.position.z = 2.8;
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(5, 3, 5);
    scene.add(dl);

    // Earth with real texture
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 15,
    });

    // Load textures
    loader.load(EARTH_TEXTURE, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    }, undefined, () => {
      // Fallback: solid blue if texture fails
      earthMat.color = new THREE.Color(0x1a3a5c);
    });

    loader.load(EARTH_BUMP, (tex) => {
      earthMat.bumpMap = tex;
      earthMat.bumpScale = 0.04;
      earthMat.needsUpdate = true;
    });

    const globe = new THREE.Mesh(earthGeo, earthMat);
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(1.03, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x4a9eff, transparent:true, opacity:0.08, side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Alaska location dots
    const dotGeom = new THREE.SphereGeometry(0.006, 8, 8);
    const nsDotMat = new THREE.MeshBasicMaterial({ color:0xff6633, transparent:true, opacity:0.85 });
    const otherDotMat = new THREE.MeshBasicMaterial({ color:0x4a9eff, transparent:true, opacity:0.7 });
    const dotsGroup = new THREE.Group();
    AK_LOCS.forEach(loc => {
      const dot = new THREE.Mesh(dotGeom, loc.ns ? nsDotMat : otherDotMat);
      const p = ll2v(loc.lat, loc.lon, 1.005);
      dot.position.copy(p);
      dotsGroup.add(dot);
    });
    scene.add(dotsGroup);

    // Marker group
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    markerRef.current = markerGroup;

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (autoRot.current && !dragging.current) targetRot.current.y += 0.0006;
      rotRef.current.x += (targetRot.current.x - rotRef.current.x)*0.08;
      rotRef.current.y += (targetRot.current.y - rotRef.current.y)*0.08;
      const rx = rotRef.current.x, ry = rotRef.current.y;
      globe.rotation.set(rx, ry, 0);
      dotsGroup.rotation.set(rx, ry, 0);
      markerGroup.rotation.set(rx, ry, 0);
      renderer.render(scene, camera);
    };
    animate();

    // Interaction handlers
    const onDown = e => {
      dragging.current = true; autoRot.current = false;
      prev.current = { x:e.clientX, y:e.clientY };
      clickStart.current = { x:e.clientX, y:e.clientY, t:Date.now() };
    };
    const onMove = e => {
      if (!dragging.current) return;
      targetRot.current.y += (e.clientX - prev.current.x)*0.005;
      targetRot.current.x = Math.max(-1.2, Math.min(1.2, targetRot.current.x + (e.clientY - prev.current.y)*0.005));
      prev.current = { x:e.clientX, y:e.clientY };
    };
    const onUp = e => {
      dragging.current = false;
      // Only treat as click if mouse barely moved and short duration
      const dx = Math.abs(e.clientX - clickStart.current.x);
      const dy = Math.abs(e.clientY - clickStart.current.y);
      const dt = Date.now() - clickStart.current.t;
      if (dx < 5 && dy < 5 && dt < 400) {
        const rect = el.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left)/rect.width)*2 - 1,
          -((e.clientY - rect.top)/rect.height)*2 + 1
        );
        const ray = new THREE.Raycaster();
        ray.setFromCamera(mouse, camera);
        const hits = ray.intersectObject(globe);
        if (hits.length > 0) {
          const p = hits[0].point.clone().applyEuler(new THREE.Euler(-rotRef.current.x, -rotRef.current.y, 0, "XYZ"));
          const lat = 90 - Math.acos(Math.max(-1,Math.min(1,p.y)))*180/Math.PI;
          let lon = -(Math.atan2(p.z, -p.x)*180/Math.PI) - 180;
          if (lon < -180) lon += 360; if (lon > 180) lon -= 360;
          onLocationSelect({ lat:Math.round(lat*100)/100, lon:Math.round(lon*100)/100, name:null });
        }
      }
    };

    const c = renderer.domElement;
    c.style.cursor = "grab";
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointerleave", () => { dragging.current = false; });
    c.addEventListener("touchstart", e => { if (e.touches.length===1) onDown({ clientX:e.touches[0].clientX, clientY:e.touches[0].clientY }); }, { passive:true });
    c.addEventListener("touchmove", e => { if (e.touches.length===1) onMove({ clientX:e.touches[0].clientX, clientY:e.touches[0].clientY }); }, { passive:true });
    c.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      onUp({ clientX:t.clientX, clientY:t.clientY });
    });

    const onResize = () => { const nw=el.clientWidth, nh=el.clientHeight; camera.aspect=nw/nh; camera.updateProjectionMatrix(); renderer.setSize(nw,nh); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",onResize); if(el.contains(c)) el.removeChild(c); renderer.dispose(); };
  }, []);

  // Update marker when selection changes
  useEffect(() => {
    if (!markerRef.current || !selectedLocation) return;
    const g = markerRef.current;
    while (g.children.length) g.remove(g.children[0]);
    const pos = ll2v(selectedLocation.lat, selectedLocation.lon, 1.015);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.025,16,16), new THREE.MeshBasicMaterial({ color:0xff3333 }));
    pin.position.copy(pos);
    g.add(pin);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.035,0.055,32), new THREE.MeshBasicMaterial({ color:0xff3333, transparent:true, opacity:0.45, side:THREE.DoubleSide }));
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0,0,0));
    g.add(ring);
    // Rotate globe to face location
    const phi = (90-selectedLocation.lat)*Math.PI/180;
    const theta = (selectedLocation.lon+180)*Math.PI/180;
    targetRot.current = { x: -(Math.PI/2 - phi)*0.6, y: -theta + Math.PI };
    autoRot.current = false;
  }, [selectedLocation, ll2v]);

  return <div ref={mountRef} style={{ width:"100%", height:"100%", borderRadius:"12px", overflow:"hidden" }} />;
}

// ═══════════════════════════════════════════════════════════════════════
// WEATHER DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════

// Open-Meteo: Global weather — free, no key
async function fetchOpenMeteo(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&visibility_unit=miles`
      + `&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open-Meteo API error");
    const data = await res.json();
    const c = data.current;
    const current = {
      temp_f: c.temperature_2m,
      apparent_f: c.apparent_temperature,
      wind_mph: c.wind_speed_10m,
      wind_dir: c.wind_direction_10m,
      wind_gust: c.wind_gusts_10m,
      humidity: c.relative_humidity_2m,
      visibility_miles: c.visibility != null ? c.visibility : null,
      weather_code: c.weather_code,
      description: WMO[c.weather_code] || "Unknown",
      icon: WMO_ICON[c.weather_code] || "\uD83C\uDF24",
      cloud_cover: c.cloud_cover,
      precipitation: c.precipitation,
      timestamp: c.time,
      source: "Open-Meteo",
    };
    current.wind_chill = calcWindChill(current.temp_f, current.wind_mph);
    current.frostbite_time = frostbiteTime(current.wind_chill);

    const d = data.daily;
    const forecast = d.time.map((t, i) => ({
      date: t,
      weather_code: d.weather_code[i],
      description: WMO[d.weather_code[i]] || "",
      icon: WMO_ICON[d.weather_code[i]] || "",
      temp_max: d.temperature_2m_max[i],
      temp_min: d.temperature_2m_min[i],
      apparent_max: d.apparent_temperature_max?.[i],
      apparent_min: d.apparent_temperature_min?.[i],
      precip: d.precipitation_sum[i],
      wind_max: d.wind_speed_10m_max[i],
      wind_dir: d.wind_direction_10m_dominant[i],
    }));

    return { current, forecast, error:null };
  } catch (e) {
    return { current:null, forecast:[], error:e.message };
  }
}

// NOAA: For Alaska locations with hardcoded stations
async function fetchNOAAStation(stationId) {
  const ua = { headers:{ "User-Agent":"SLPAlaskaSafetyPortal/3.0" } };
  try {
    const res = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`, ua);
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.properties;
    const tc = p.temperature?.value;
    const ws = p.windSpeed?.value;
    const vm = p.visibility?.value;
    const obsTime = p.timestamp ? new Date(p.timestamp) : null;
    const ageHrs = obsTime ? (new Date()-obsTime)/3600000 : 999;
    if (ageHrs > 3 || tc === null) return null;
    return {
      temp_f: tc !== null ? Math.round((tc*9/5+32)*10)/10 : null,
      wind_mph: ws !== null ? Math.round(ws*2.237*10)/10 : null,
      wind_dir: p.windDirection?.value,
      humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
      visibility_miles: vm !== null ? Math.round((vm/1609.34)*10)/10 : null,
      description: p.textDescription || "N/A",
      station: stationId,
      timestamp: p.timestamp,
      dataAge: Math.round(ageHrs*60),
    };
  } catch { return null; }
}

// Composite fetcher: NOAA for known AK stations, Open-Meteo as primary/fallback
async function fetchWeather(lat, lon, locationName) {
  // Always fetch Open-Meteo for global coverage + forecast
  const openMeteo = await fetchOpenMeteo(lat, lon);

  // For known Alaska locations, try NOAA station for more accurate current obs
  const stId = NOAA_STATIONS[locationName];
  if (stId) {
    const noaa = await fetchNOAAStation(stId);
    if (noaa) {
      // Merge: use NOAA current obs (more accurate for AK), Open-Meteo forecast
      const merged = {
        ...openMeteo.current,
        temp_f: noaa.temp_f ?? openMeteo.current?.temp_f,
        wind_mph: noaa.wind_mph ?? openMeteo.current?.wind_mph,
        wind_dir: noaa.wind_dir ?? openMeteo.current?.wind_dir,
        humidity: noaa.humidity ?? openMeteo.current?.humidity,
        visibility_miles: noaa.visibility_miles ?? openMeteo.current?.visibility_miles,
        description: noaa.description !== "N/A" ? noaa.description : openMeteo.current?.description,
        station: noaa.station,
        dataAge: noaa.dataAge,
        source: `NOAA (${stId})`,
        timestamp: noaa.timestamp,
      };
      merged.wind_chill = calcWindChill(merged.temp_f, merged.wind_mph);
      merged.frostbite_time = frostbiteTime(merged.wind_chill);
      return { current: merged, forecast: openMeteo.forecast, error: null };
    }
  }
  return openMeteo;
}

// Reverse geocoding via Nominatim
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`, {
      headers: { "User-Agent": "SLPAlaskaSafetyPortal/3.0" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address;
    const city = a?.city || a?.town || a?.village || a?.municipality || a?.county || "";
    const state = a?.state || "";
    const country = a?.country || "";
    if (city) return state ? `${city}, ${state}` : `${city}, ${country}`;
    if (state) return `${state}, ${country}`;
    return country || null;
  } catch { return null; }
}

// Forward geocoding via Open-Meteo Geocoding API
async function searchLocations(query) {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(r => ({
      name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      lat: r.latitude,
      lon: r.longitude,
      country: r.country_code,
      population: r.population,
    }));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function MetricBox({ label, value, sub, alert: isAlert, icon }) {
  return (
    <div style={{ padding:"10px 12px", borderRadius:"8px",
      background: isAlert ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
      border:`1px solid ${isAlert ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}` }}>
      <div style={{ fontSize:"10px", color:"#8892a4", textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:"4px" }}>
        {icon && <span style={{ fontSize:"12px" }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize:"18px", fontWeight:800, color: isAlert ? "#ef4444" : "#fff", marginTop:"2px" }}>{value}</div>
      {sub && <div style={{ fontSize:"10px", color: isAlert ? "#f97316" : "#8892a4", marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}

function ThresholdRow({ label, value, thresholds, alert: isAlert }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", borderRadius:"6px",
      background: isAlert ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
      border:`1px solid ${isAlert ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)"}`, gap:"8px" }}>
      <div>
        <div style={{ fontSize:"11px", fontWeight:600, color: isAlert ? "#f97316" : "#e2e8f0" }}>{label}: {value}</div>
        <div style={{ fontSize:"9px", color:"#64748b" }}>{thresholds}</div>
      </div>
      {isAlert && <span style={{ fontSize:"14px" }}>{"\u26A0\uFE0F"}</span>}
    </div>
  );
}

function windDirLabel(deg) {
  if (deg == null) return "";
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg/22.5) % 16];
}

function dayName(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function WeatherGlobe() {
  const [loc, setLoc] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("current");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAK, setShowAK] = useState(true);
  const searchTimeout = useRef(null);

  // Check if this is an Alaska location
  const akLoc = useMemo(() => loc ? AK_LOCS.find(l => l.name === loc.name) : null, [loc]);
  const isAlaska = !!akLoc;

  const phase = useMemo(() => {
    if (!weather?.current || !isAlaska) return null;
    const c = weather.current;
    return getASHPhase(c.temp_f, c.wind_mph, c.wind_chill, c.visibility_miles);
  }, [weather, isAlaska]);
  const pd = phase ? ASH_BOOK_PHASES[phase] : null;

  // Handle location selection
  const selectLocation = useCallback(async (l) => {
    setLoc(l); setLoading(true); setError(null); setWeather(null);
    setSearchResults([]); setSearchText("");

    // If name not set (globe click), reverse geocode
    let name = l.name;
    if (!name) {
      // Check if close to a known AK location
      const nearby = AK_LOCS.find(ak => Math.abs(ak.lat-l.lat)<0.15 && Math.abs(ak.lon-l.lon)<0.15);
      if (nearby) {
        name = nearby.name;
        l = { ...l, name };
      } else {
        const geoName = await reverseGeocode(l.lat, l.lon);
        name = geoName || `${Math.abs(l.lat).toFixed(2)}\u00B0${l.lat>=0?"N":"S"}, ${Math.abs(l.lon).toFixed(2)}\u00B0${l.lon>=0?"E":"W"}`;
        l = { ...l, name };
      }
      setLoc(l);
    }

    const data = await fetchWeather(l.lat, l.lon, l.name);
    if (data.error) setError(data.error);
    else {
      setWeather(data);
      const ak = AK_LOCS.find(a => a.name === l.name);
      setTab(ak ? "ash" : "current");
    }
    setLoading(false);
  }, []);

  // Debounced search
  const handleSearch = useCallback((val) => {
    setSearchText(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.trim().length < 2) { setSearchResults([]); setShowAK(true); return; }
    setShowAK(false);
    searchTimeout.current = setTimeout(async () => {
      // Check Alaska locations first
      const akMatch = AK_LOCS.filter(l => l.name.toLowerCase().includes(val.toLowerCase()));
      setSearching(true);
      const global = await searchLocations(val);
      setSearching(false);
      // Combine: AK first, then global
      const combined = [
        ...akMatch.map(l => ({ name:l.name, lat:l.lat, lon:l.lon, isAK:true, ns:l.ns })),
        ...global.filter(g => !akMatch.find(a => Math.abs(a.lat-g.lat)<0.1 && Math.abs(a.lon-g.lon)<0.1))
          .map(g => ({ ...g, isAK:false }))
      ];
      setSearchResults(combined);
    }, 350);
  }, []);

  return (
    <div style={{ background:"linear-gradient(145deg, #080f1e 0%, #0c1a2e 50%, #080f1e 100%)", borderRadius:"16px",
      border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,sans-serif",
      color:"#e2e8f0", width:"100%", maxWidth:"960px", margin:"0 auto" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @media(max-width:780px){.wg-main{flex-direction:column!important}.wg-globe{flex:none!important;height:320px!important;width:100%!important}.wg-panel{border-left:none!important;border-top:1px solid rgba(255,255,255,0.06)!important}}
        .wg-chip{padding:3px 10px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#8892a4;font-size:11px;cursor:pointer;white-space:nowrap;transition:all 0.15s}
        .wg-chip:hover{background:rgba(74,158,255,0.12);color:#4a9eff;border-color:rgba(74,158,255,0.2)}
        .wg-chip-active{background:rgba(74,158,255,0.15)!important;color:#4a9eff!important;border-color:rgba(74,158,255,0.3)!important}
        .wg-tab{flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#64748b;font-size:12px;font-weight:400;cursor:pointer;transition:all 0.15s}
        .wg-tab:hover{color:#94a3b8}.wg-tab-active{color:#4a9eff!important;border-bottom-color:#4a9eff!important;font-weight:700!important}
        .wg-search-result{padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.1s;font-size:12px}
        .wg-search-result:hover{background:rgba(74,158,255,0.08)}
      `}</style>

      {/* Header */}
      <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid rgba(255,255,255,0.06)",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"22px" }}>{"\uD83C\uDF10"}</span>
          <div>
            <div style={{ fontSize:"15px", fontWeight:700, color:"#fff" }}>Weather & Phase Conditions</div>
            <div style={{ fontSize:"10px", color:"#64748b", marginTop:"1px" }}>
              NOAA + Open-Meteo Live Data {"\u2022"} ASH Book 2026 Compliance
            </div>
          </div>
        </div>
        {pd && <div style={{ padding:"4px 14px", borderRadius:"20px", background:pd.bg, border:`1px solid ${pd.border}`,
          fontSize:"12px", fontWeight:700, color:pd.color, whiteSpace:"nowrap" }}>{pd.icon} {pd.label}</div>}
      </div>

      {/* Body */}
      <div className="wg-main" style={{ display:"flex", flexDirection:"row", minHeight:"480px" }}>
        {/* Globe */}
        <div className="wg-globe" style={{ flex:"0 0 380px", height:"480px", position:"relative", background:"radial-gradient(ellipse at center, rgba(10,20,40,0.8), transparent)" }}>
          <Globe3D onLocationSelect={selectLocation} selectedLocation={loc} />
          <div style={{ position:"absolute", bottom:"10px", left:"50%", transform:"translateX(-50%)", fontSize:"9px",
            color:"rgba(255,255,255,0.3)", pointerEvents:"none", textAlign:"center",
            background:"rgba(0,0,0,0.4)", padding:"3px 14px", borderRadius:"10px", backdropFilter:"blur(4px)" }}>
            Drag to rotate {"\u2022"} Click to select
          </div>
        </div>

        {/* Right Panel */}
        <div className="wg-panel" style={{ flex:1, borderLeft:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", minWidth:0 }}>

          {/* Search Bar */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ position:"relative" }}>
              <input
                placeholder="Search city, zip code, or place..."
                value={searchText}
                onChange={e => handleSearch(e.target.value)}
                style={{ width:"100%", padding:"9px 12px 9px 34px", borderRadius:"10px",
                  border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)",
                  color:"#e2e8f0", fontSize:"13px", outline:"none", boxSizing:"border-box" }}
              />
              <span style={{ position:"absolute", left:"11px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", opacity:0.4 }}>{"\uD83D\uDD0D"}</span>
              {searching && <div style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)",
                width:"14px", height:"14px", border:"2px solid rgba(74,158,255,0.3)", borderTop:"2px solid #4a9eff",
                borderRadius:"50%", animation:"spin 0.6s linear infinite" }} />}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div style={{ marginTop:"4px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.08)",
                background:"rgba(12,26,46,0.95)", maxHeight:"200px", overflowY:"auto", backdropFilter:"blur(8px)" }}>
                {searchResults.map((r, i) => (
                  <div key={i} className="wg-search-result"
                    onClick={() => { selectLocation({ lat:r.lat, lon:r.lon, name:r.name || r.isAK ? r.name : r.name }); }}>
                    <span style={{ marginRight:"6px" }}>{r.isAK ? (r.ns ? "\uD83C\uDFD4\uFE0F" : "\uD83D\uDCCD") : "\uD83C\uDF0D"}</span>
                    {r.name}
                    {r.country && !r.isAK && <span style={{ color:"#64748b", marginLeft:"4px" }}>({r.country})</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Alaska Quick-Select Chips */}
            {showAK && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginTop:"8px", maxHeight:"82px", overflowY:"auto" }}>
                {AK_LOCS.map(l => (
                  <button key={l.name} className={`wg-chip ${loc?.name===l.name ? "wg-chip-active" : ""}`}
                    onClick={() => selectLocation({ lat:l.lat, lon:l.lon, name:l.name })}>
                    {l.ns ? "\uD83C\uDFD4\uFE0F" : "\uD83D\uDCCD"} {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div style={{ flex:1, overflow:"auto" }}>

            {/* Empty State */}
            {!loc && !loading && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                height:"100%", color:"#475569", fontSize:"13px", textAlign:"center", padding:"30px", gap:"10px" }}>
                <span style={{ fontSize:"48px", opacity:0.2 }}>{"\uD83C\uDF0D"}</span>
                <div style={{ lineHeight:1.6 }}>Select a location on the globe,<br/>search by city or zip code,<br/>or choose an Alaska location above</div>
                <div style={{ fontSize:"10px", color:"#334155", marginTop:"4px" }}>Alaska locations include ASH Book phase analysis</div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"200px", gap:"10px", color:"#4a9eff" }}>
                <div style={{ width:"20px", height:"20px", border:"2px solid rgba(74,158,255,0.3)", borderTop:"2px solid #4a9eff",
                  borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                Fetching weather data...
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ padding:"20px" }}>
                <div style={{ color:"#f97316", fontSize:"13px", fontWeight:600 }}>{"\u26A0\uFE0F"} {error}</div>
                <div style={{ color:"#64748b", fontSize:"11px", marginTop:"4px" }}>{"\uD83D\uDCCD"} {loc?.lat}\u00B0, {loc?.lon}\u00B0</div>
              </div>
            )}

            {/* Weather Data */}
            {weather && !loading && (
              <div>
                {/* Tabs */}
                <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  {[
                    { id:"current", label:"Current" },
                    { id:"forecast", label:"7-Day" },
                    ...(isAlaska ? [{ id:"ash", label:"\uD83C\uDFD4\uFE0F ASH Book" }] : [])
                  ].map(t => (
                    <button key={t.id} className={`wg-tab ${tab===t.id ? "wg-tab-active" : ""}`}
                      onClick={() => setTab(t.id)}>{t.label}</button>
                  ))}
                </div>

                {/* ─── CURRENT TAB ─── */}
                {tab === "current" && weather.current && (
                  <div style={{ padding:"16px" }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:"8px", marginBottom:"2px" }}>
                      <span style={{ fontSize:"11px", color:"#4a9eff", fontWeight:600 }}>{"\uD83D\uDCCD"} {loc.name}</span>
                    </div>
                    <div style={{ fontSize:"9px", color:"#475569", marginBottom:"14px" }}>
                      {weather.current.source}
                      {weather.current.dataAge != null ? ` \u2022 ${weather.current.dataAge} min ago` : ""}
                      {weather.current.timestamp ? ` \u2022 ${new Date(weather.current.timestamp).toLocaleString()}` : ""}
                    </div>

                    {/* Big temperature + condition */}
                    <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"16px" }}>
                      <div>
                        <div style={{ fontSize:"46px", fontWeight:800, color:"#fff", lineHeight:1, letterSpacing:"-1px" }}>
                          {weather.current.temp_f !== null ? `${Math.round(weather.current.temp_f)}\u00B0` : "--"}
                          <span style={{ fontSize:"20px", fontWeight:400, color:"#8892a4" }}>F</span>
                        </div>
                        {weather.current.apparent_f != null && (
                          <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>
                            Feels like {Math.round(weather.current.apparent_f)}\u00B0F
                          </div>
                        )}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
                        <span style={{ fontSize:"28px" }}>{weather.current.icon}</span>
                        <span style={{ fontSize:"12px", color:"#94a3b8" }}>{weather.current.description}</span>
                      </div>
                    </div>

                    {/* Metric Grid */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                      <MetricBox icon={"\uD83D\uDCA8"} label="Wind"
                        value={weather.current.wind_mph != null ? `${Math.round(weather.current.wind_mph)} mph` : "--"}
                        sub={weather.current.wind_dir != null ? `${windDirLabel(weather.current.wind_dir)} (${Math.round(weather.current.wind_dir)}\u00B0)${weather.current.wind_gust ? ` \u2022 Gusts ${Math.round(weather.current.wind_gust)} mph` : ""}` : ""} />
                      <MetricBox icon={"\uD83C\uDF21\uFE0F"} label="Wind Chill"
                        value={weather.current.wind_chill != null ? `${Math.round(weather.current.wind_chill)}\u00B0F` : "--"}
                        sub={weather.current.frostbite_time ? `\u26A0\uFE0F Frostbite: ${weather.current.frostbite_time}` : ""}
                        alert={weather.current.wind_chill != null && weather.current.wind_chill < -40} />
                      <MetricBox icon={"\uD83D\uDC41\uFE0F"} label="Visibility"
                        value={weather.current.visibility_miles != null ? `${weather.current.visibility_miles.toFixed(1)} mi` : "--"}
                        alert={weather.current.visibility_miles != null && weather.current.visibility_miles < 0.5} />
                      <MetricBox icon={"\uD83D\uDCA7"} label="Humidity"
                        value={weather.current.humidity != null ? `${Math.round(weather.current.humidity)}%` : "--"} />
                    </div>
                  </div>
                )}

                {/* ─── FORECAST TAB ─── */}
                {tab === "forecast" && (
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:"11px", color:"#4a9eff", fontWeight:600, marginBottom:"10px" }}>
                      {"\uD83D\uDCCD"} {loc.name} — 7-Day Forecast
                    </div>
                    {weather.forecast.length === 0 && <div style={{ color:"#64748b", fontSize:"12px" }}>No forecast available</div>}
                    {weather.forecast.map((p, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 12px", marginBottom:"4px",
                        borderRadius:"8px", background: i===0 ? "rgba(74,158,255,0.06)" : "rgba(255,255,255,0.02)",
                        border:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:"22px", width:"30px", textAlign:"center" }}>{p.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"12px", fontWeight:700, color:"#e2e8f0" }}>{dayName(p.date)}</div>
                          <div style={{ fontSize:"10px", color:"#8892a4", marginTop:"1px" }}>{p.description}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:"14px", fontWeight:800, color:"#fff" }}>{Math.round(p.temp_max)}\u00B0</div>
                          <div style={{ fontSize:"11px", color:"#64748b" }}>{Math.round(p.temp_min)}\u00B0</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:"55px" }}>
                          <div style={{ fontSize:"10px", color:"#8892a4" }}>{"\uD83D\uDCA8"} {Math.round(p.wind_max)} mph</div>
                          {p.precip > 0 && <div style={{ fontSize:"10px", color:"#60a5fa" }}>{"\uD83D\uDCA7"} {p.precip.toFixed(2)}"</div>}
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize:"9px", color:"#334155", marginTop:"8px", textAlign:"center" }}>
                      Data: Open-Meteo.com {"\u2022"} CC BY 4.0
                    </div>
                  </div>
                )}

                {/* ─── ASH BOOK TAB ─── */}
                {tab === "ash" && isAlaska && (
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:"11px", color:"#4a9eff", fontWeight:600 }}>{"\uD83D\uDCCD"} {loc.name}</div>
                    <div style={{ fontSize:"10px", color:"#475569", marginBottom:"12px" }}>
                      ASH Book 2026 {"\u2022"} Foul Weather Contingency (pp. 56-57)
                      {akLoc?.ns && <span style={{ marginLeft:"6px", padding:"1px 6px", borderRadius:"8px", background:"rgba(249,115,22,0.15)", color:"#f97316", fontSize:"9px", fontWeight:600 }}>NORTH SLOPE</span>}
                    </div>

                    {pd && (
                      <div style={{ padding:"14px", borderRadius:"10px", background:pd.bg, border:`1px solid ${pd.border}`, marginBottom:"12px" }}>
                        <div style={{ fontSize:"16px", fontWeight:800, color:pd.color, marginBottom:"10px" }}>{pd.icon} {pd.label}</div>
                        {[["\uD83D\uDE97 Travel", pd.travel], ["\uD83C\uDFD7\uFE0F Outdoor Work", pd.outdoor], ["\u2699\uFE0F Equipment", pd.equipment]].map(([l, t]) => (
                          <div key={l} style={{ marginBottom:"8px" }}>
                            <div style={{ fontSize:"10px", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:"2px" }}>{l}</div>
                            <div style={{ fontSize:"11px", color:"#e2e8f0", lineHeight:1.5 }}>{t}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize:"11px", fontWeight:700, color:"#8892a4", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                      Current vs. Thresholds
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                      <ThresholdRow label="Wind Chill" value={weather.current?.wind_chill != null ? `${Math.round(weather.current.wind_chill)}\u00B0F` : "--"}
                        thresholds="-40\u00B0F (I) \u00B7 -60\u00B0F (II) \u00B7 -75\u00B0F (III)" alert={weather.current?.wind_chill < -40} />
                      <ThresholdRow label="Wind" value={weather.current?.wind_mph != null ? `${Math.round(weather.current.wind_mph)} mph` : "--"}
                        thresholds="35 mph (I) \u00B7 45 mph (II) \u00B7 55 mph (III)" alert={weather.current?.wind_mph > 35} />
                      <ThresholdRow label="Visibility" value={weather.current?.visibility_miles != null ? `${weather.current.visibility_miles.toFixed(1)} mi` : "--"}
                        thresholds="< \u00BD mi (I) \u00B7 < \u00BC mi (II) \u00B7 < \u215B mi (III)" alert={weather.current?.visibility_miles < 0.5} />
                      <ThresholdRow label="Temp" value={weather.current?.temp_f != null ? `${Math.round(weather.current.temp_f)}\u00B0F` : "--"}
                        thresholds="< -35\u00B0F: Equipment eval required (p.44)" alert={weather.current?.temp_f < -35} />
                      {weather.current?.frostbite_time && (
                        <div style={{ padding:"6px 10px", borderRadius:"6px", background:"rgba(239,68,68,0.12)",
                          border:"1px solid rgba(239,68,68,0.3)", fontSize:"11px", color:"#ef4444", fontWeight:600 }}>
                          {"\u2744\uFE0F"} FROSTBITE RISK: {weather.current.frostbite_time} (Wind Chill Chart p.188)
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop:"14px", padding:"10px 12px", borderRadius:"8px", background:"rgba(255,255,255,0.02)",
                      border:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize:"10px", fontWeight:700, color:"#64748b", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                        Phase Reference
                      </div>
                      {Object.entries(ASH_BOOK_PHASES).map(([k, p]) => (
                        <div key={k} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"3px 0", fontSize:"10px",
                          color: k===phase ? p.color : "#64748b", fontWeight: k===phase ? 700 : 400 }}>
                          <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:p.color, flexShrink:0 }} />
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
