'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════
// SLP ALASKA — WEATHER & PHASE CONDITIONS v7
// ─ Clickable dark map (click anywhere → instant weather report)
// ─ Toggle to Windy.com animated overlay for wind visualization
// ─ NOAA station data for Alaska accuracy
// ─ Open-Meteo global weather + 7-day forecast
// ─ ASH Book 2026 phase conditions
// ═══════════════════════════════════════════════════════════════════════

const WMO={0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Depositing rime fog",51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",56:"Light freezing drizzle",57:"Dense freezing drizzle",61:"Slight rain",63:"Moderate rain",65:"Heavy rain",66:"Light freezing rain",67:"Heavy freezing rain",71:"Slight snow",73:"Moderate snow",75:"Heavy snow",77:"Snow grains",80:"Slight rain showers",81:"Moderate rain showers",82:"Violent rain showers",85:"Slight snow showers",86:"Heavy snow showers",95:"Thunderstorm",96:"Thunderstorm w/ slight hail",99:"Thunderstorm w/ heavy hail"};
const WMO_ICON={0:"\u2600\uFE0F",1:"\uD83C\uDF24",2:"\u26C5",3:"\u2601\uFE0F",45:"\uD83C\uDF2B\uFE0F",48:"\uD83C\uDF2B\uFE0F",51:"\uD83C\uDF26",53:"\uD83C\uDF27",55:"\uD83C\uDF27",56:"\uD83E\uDDCA",57:"\uD83E\uDDCA",61:"\uD83C\uDF27",63:"\uD83C\uDF27",65:"\uD83C\uDF27",66:"\uD83E\uDDCA",67:"\uD83E\uDDCA",71:"\uD83C\uDF28",73:"\uD83C\uDF28",75:"\uD83C\uDF28",77:"\uD83C\uDF28",80:"\uD83C\uDF26",81:"\uD83C\uDF27",82:"\u26C8\uFE0F",85:"\uD83C\uDF28",86:"\uD83C\uDF28",95:"\u26A1",96:"\u26A1",99:"\u26A1"};

const ASH_BOOK_PHASES={
  NORMAL:{label:"Normal Operations",color:"#22c55e",bg:"rgba(34,197,94,0.12)",border:"#22c55e",icon:"\u2705",travel:"Unrestricted travel. Standard operations.",outdoor:"Normal outdoor work permitted. Standard PPE required.",equipment:"Standard equipment operation per manufacturer specs."},
  PHASE_I:{label:"Phase I \u2014 Caution",color:"#eab308",bg:"rgba(234,179,8,0.12)",border:"#eab308",icon:"\u26A0\uFE0F",travel:"Reduced Visibility. Travel with EXTREME CAUTION. Reduce speed. Radios & lights must be operating. Arctic gear REQUIRED.",outdoor:"Outdoor work with caution. Safety time out/THA if wind chill in 5-min frostbite zone. Arctic gear required Oct 1\u2013May 1.",equipment:"Temp < -35\u00B0F (-20\u00B0F manlifts/scissor lifts): Evaluate need, exposure, failure potential before crane/equipment ops."},
  PHASE_II:{label:"Phase II \u2014 Restricted",color:"#f97316",bg:"rgba(249,115,22,0.12)",border:"#f97316",icon:"\uD83D\uDFE0",travel:"CONVOY ONLY. Two+ vehicles required. Radio comm between vehicles REQUIRED.",outdoor:"Limit outdoor work. THA REQUIRED for all outside tasks. Suspend all regulated confined space work.",equipment:"Wind > 40 mph: Safety time out/THA to determine priority. Systematic equipment review required."},
  PHASE_III:{label:"Phase III \u2014 CLOSED",color:"#ef4444",bg:"rgba(239,68,68,0.12)",border:"#ef4444",icon:"\uD83D\uDD34",travel:"CRITICAL/EMERGENCY TRAVEL ONLY. Heavy equipment convoy ONLY. Do NOT leave vehicle.",outdoor:"CEASE all non-emergency outdoor work. Personnel to designated shelter. Emergency teams only.",equipment:"SUSPEND all non-essential equipment ops. Emergency only with supervisor auth."},
};

function getASHPhase(t,w,wc,v){if((v!==null&&v<0.125)||(wc!==null&&wc<-75)||(w!==null&&w>55))return"PHASE_III";if((v!==null&&v<0.25)||(wc!==null&&wc<-60)||(w!==null&&w>45))return"PHASE_II";if((v!==null&&v<0.5)||(wc!==null&&wc<-40)||(w!==null&&w>35)||(t!==null&&t<-35))return"PHASE_I";return"NORMAL";}
function calcWindChill(t,w){if(t===null||w===null||t>50||w<3)return t;return Math.round((35.74+0.6215*t-35.75*Math.pow(w,0.16)+0.4275*t*Math.pow(w,0.16))*10)/10;}
function frostbiteTime(wc){if(wc===null||wc>-10)return null;if(wc>=-28)return"~30 min";if(wc>=-40)return"~15 min";if(wc>=-55)return"~10 min";if(wc>=-65)return"~5 min";return"< 5 min";}

const NOAA_STATIONS={"Deadhorse / Prudhoe Bay":"PASC","Kuparuk":"PASC","Alpine (CD-1)":"PAQT","Nuiqsut":"PAQT","West Harrison Bay":"PASC","Oliktok Point":"PASC","Utqia\u0121vik (Barrow)":"PABR","Umiat":"PAUM","Pt. Thompson":"PASC","Badami":"PASC","Kenai":"PAEN","Soldotna":"PAEN","Nikiski":"PAEN","Anchorage":"PANC","Fairbanks":"PAFA","Valdez":"PAVD","Homer":"PAHO","Kodiak":"PADQ","Bethel":"PABE","Nome":"PAOM","Dillingham":"PADL"};

const AK_LOCS=[
  {name:"Deadhorse / Prudhoe Bay",lat:70.2002,lon:-148.4597,ns:true},{name:"Kuparuk",lat:70.3319,lon:-149.5894,ns:true},{name:"Alpine (CD-1)",lat:70.3764,lon:-150.9453,ns:true},{name:"Nuiqsut",lat:70.2107,lon:-150.9989,ns:true},{name:"West Harrison Bay",lat:70.47,lon:-152.05,ns:true},{name:"Oliktok Point",lat:70.4991,lon:-149.8794,ns:true},{name:"Utqia\u0121vik (Barrow)",lat:71.2906,lon:-156.7886,ns:true},{name:"Umiat",lat:69.3711,lon:-152.1384,ns:true},{name:"Pt. Thompson",lat:70.0911,lon:-146.0147,ns:true},{name:"Badami",lat:70.1392,lon:-147.0017,ns:true},
  {name:"Kenai",lat:60.5544,lon:-151.2583,ns:false},{name:"Soldotna",lat:60.4878,lon:-151.0583,ns:false},{name:"Nikiski",lat:60.6903,lon:-151.2886,ns:false},{name:"Anchorage",lat:61.2181,lon:-149.9003,ns:false},{name:"Fairbanks",lat:64.8378,lon:-147.7164,ns:false},{name:"Valdez",lat:61.1309,lon:-146.3483,ns:false},{name:"Homer",lat:59.6425,lon:-151.5483,ns:false},{name:"Kodiak",lat:57.79,lon:-152.4072,ns:false},{name:"Bethel",lat:60.7922,lon:-161.7558,ns:false},{name:"Nome",lat:64.5011,lon:-165.4064,ns:false},{name:"Dillingham",lat:59.0397,lon:-158.4575,ns:false},
];

// ─── DATA FETCHING ───
async function fetchOpenMeteo(lat,lon){
  try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7`;
    const res=await fetch(url);if(!res.ok)throw new Error("Open-Meteo error");const data=await res.json();const c=data.current;
    const current={temp_f:c.temperature_2m,apparent_f:c.apparent_temperature,wind_mph:c.wind_speed_10m,wind_dir:c.wind_direction_10m,wind_gust:c.wind_gusts_10m,humidity:c.relative_humidity_2m,visibility_miles:null,weather_code:c.weather_code,description:WMO[c.weather_code]||"Unknown",icon:WMO_ICON[c.weather_code]||"\uD83C\uDF24",cloud_cover:c.cloud_cover,precipitation:c.precipitation,timestamp:c.time,source:"Open-Meteo"};
    current.wind_chill=calcWindChill(current.temp_f,current.wind_mph);current.frostbite_time=frostbiteTime(current.wind_chill);
    const d=data.daily;const forecast=d.time.map((t,i)=>({date:t,weather_code:d.weather_code[i],description:WMO[d.weather_code[i]]||"",icon:WMO_ICON[d.weather_code[i]]||"",temp_max:d.temperature_2m_max[i],temp_min:d.temperature_2m_min[i],precip:d.precipitation_sum[i],wind_max:d.wind_speed_10m_max[i],wind_dir:d.wind_direction_10m_dominant[i]}));
    return{current,forecast,error:null};}catch(e){return{current:null,forecast:[],error:e.message};}
}
async function fetchNOAAStation(stationId){
  try{const res=await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`,{headers:{"User-Agent":"SLPAlaskaSafetyPortal/7.0"}});if(!res.ok)return null;const data=await res.json();const p=data.properties;
    const tc=p.temperature?.value;const ws=p.windSpeed?.value;const vm=p.visibility?.value;const obsTime=p.timestamp?new Date(p.timestamp):null;const ageHrs=obsTime?(new Date()-obsTime)/3600000:999;
    if(ageHrs>4||tc===null)return null;
    return{temp_f:Math.round((tc*9/5+32)*10)/10,wind_mph:ws!==null?Math.round(ws*0.621371*10)/10:null,wind_dir:p.windDirection?.value,humidity:p.relativeHumidity?.value!=null?Math.round(p.relativeHumidity.value):null,visibility_miles:vm!==null?Math.round((vm/1609.34)*10)/10:null,description:p.textDescription||"N/A",station:stationId,timestamp:p.timestamp,dataAge:Math.round(ageHrs*60)};
  }catch(e){console.warn("NOAA err:",stationId,e);return null;}
}
async function fetchWeather(lat,lon,locationName){
  const stId=NOAA_STATIONS[locationName];const[openMeteo,noaa]=await Promise.all([fetchOpenMeteo(lat,lon),stId?fetchNOAAStation(stId):Promise.resolve(null)]);
  if(noaa&&openMeteo.current){const merged={...openMeteo.current,temp_f:noaa.temp_f,wind_mph:noaa.wind_mph??openMeteo.current.wind_mph,wind_dir:noaa.wind_dir??openMeteo.current.wind_dir,humidity:noaa.humidity??openMeteo.current.humidity,visibility_miles:noaa.visibility_miles??openMeteo.current.visibility_miles,description:noaa.description!=="N/A"?noaa.description:openMeteo.current.description,station:noaa.station,dataAge:noaa.dataAge,source:`NOAA ${stId}`,timestamp:noaa.timestamp};merged.wind_chill=calcWindChill(merged.temp_f,merged.wind_mph);merged.frostbite_time=frostbiteTime(merged.wind_chill);return{current:merged,forecast:openMeteo.forecast,error:null};}
  return openMeteo;
}
async function searchLocations(query){try{const res=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`);if(!res.ok)return[];const data=await res.json();return(data.results||[]).map(r=>({name:[r.name,r.admin1,r.country].filter(Boolean).join(", "),lat:r.latitude,lon:r.longitude,country:r.country_code}));}catch{return[];}}
async function reverseGeocode(lat,lon){try{const res=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`,{headers:{"User-Agent":"SLPAlaskaSafetyPortal/7.0"}});if(!res.ok)return null;const data=await res.json();const a=data.address;const city=a?.city||a?.town||a?.village||a?.municipality||a?.county||"";const state=a?.state||"";const country=a?.country||"";if(city)return state?`${city}, ${state}`:`${city}, ${country}`;if(state)return`${state}, ${country}`;return country||null;}catch{return null;}}

// ─── UI COMPONENTS ───
function MetricBox({label,value,sub,alert:isA,icon}){return(<div style={{padding:"10px 12px",borderRadius:"8px",background:isA?"rgba(239,68,68,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${isA?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.06)"}`}}><div style={{fontSize:"10px",color:"#8892a4",textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:"4px"}}>{icon&&<span style={{fontSize:"12px"}}>{icon}</span>}{label}</div><div style={{fontSize:"18px",fontWeight:800,color:isA?"#ef4444":"#fff",marginTop:"2px"}}>{value}</div>{sub&&<div style={{fontSize:"10px",color:isA?"#f97316":"#8892a4",marginTop:"2px"}}>{sub}</div>}</div>);}
function ThresholdRow({label,value,thresholds,alert:isA}){return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",borderRadius:"6px",background:isA?"rgba(249,115,22,0.08)":"rgba(255,255,255,0.03)",border:`1px solid ${isA?"rgba(249,115,22,0.2)":"rgba(255,255,255,0.04)"}`,gap:"8px"}}><div><div style={{fontSize:"11px",fontWeight:600,color:isA?"#f97316":"#e2e8f0"}}>{label}: {value}</div><div style={{fontSize:"9px",color:"#64748b"}}>{thresholds}</div></div>{isA&&<span style={{fontSize:"14px"}}>{"\u26A0\uFE0F"}</span>}</div>);}
function windDirLabel(deg){if(deg==null)return"";const d=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];return d[Math.round(deg/22.5)%16];}
function dayName(s){const d=new Date(s+"T12:00:00"),t=new Date(),tm=new Date(t);tm.setDate(t.getDate()+1);if(d.toDateString()===t.toDateString())return"Today";if(d.toDateString()===tm.toDateString())return"Tomorrow";return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});}

// ═══════════════════════════════════════════════════════════════════════
// LEAFLET MAP COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function LeafletMap({ onMapClick, selectedLat, selectedLon, mapRef }){
  const containerRef=useRef(null);
  const leafletMap=useRef(null);
  const markerRef=useRef(null);
  const initRef=useRef(false);

  useEffect(()=>{
    if(initRef.current||!containerRef.current)return;
    initRef.current=true;

    if(!document.getElementById("leaflet-css")){
      const link=document.createElement("link");link.id="leaflet-css";link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(link);
    }
    if(!document.getElementById("leaflet-cursor-css")){
      const s=document.createElement("style");s.id="leaflet-cursor-css";
      s.textContent=`.leaflet-container{cursor:crosshair!important}.leaflet-interactive{cursor:pointer!important}`;
      document.head.appendChild(s);
    }

    const loadLeaflet=()=>new Promise((resolve)=>{
      if(window.L){resolve(window.L);return;}
      const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload=()=>resolve(window.L);document.head.appendChild(s);
    });

    loadLeaflet().then((L)=>{
      const map=L.map(containerRef.current,{center:[63.0,-152.0],zoom:4,zoomControl:true,attributionControl:false});
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:18,subdomains:"abcd"}).addTo(map);
      L.control.attribution({position:"bottomleft",prefix:false}).addTo(map);
      map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>');

      map.on("click",(e)=>{
        const{lat,lng}=e.latlng;
        // Check if click is near an AK location
        const nearby=AK_LOCS.find(ak=>Math.abs(ak.lat-lat)<0.15&&Math.abs(ak.lon-lng)<0.15);
        onMapClick(nearby?nearby.lat:lat,nearby?nearby.lon:lng,nearby?nearby.name:null);
      });

      leafletMap.current=map;
      if(mapRef)mapRef.current=map;

      // AK location markers
      AK_LOCS.forEach(l=>{
        const circle=L.circleMarker([l.lat,l.lon],{radius:5,fillColor:l.ns?"#f97316":"#4a9eff",color:"rgba(255,255,255,0.4)",weight:1,fillOpacity:0.85});
        circle.bindTooltip(l.name,{direction:"top",offset:[0,-6],className:"ak-tooltip"});
        circle.on("click",(e)=>{L.DomEvent.stopPropagation(e);onMapClick(l.lat,l.lon,l.name);});
        circle.addTo(map);
      });

      // Invalidate size after a tick to handle flex layout
      setTimeout(()=>map.invalidateSize(),100);
    });

    return()=>{if(leafletMap.current){leafletMap.current.remove();leafletMap.current=null;initRef.current=false;}};
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Update selected marker
  useEffect(()=>{
    if(!leafletMap.current||!window.L||selectedLat==null)return;
    const L=window.L;
    if(markerRef.current)leafletMap.current.removeLayer(markerRef.current);
    const icon=L.divIcon({className:"",html:`<div style="width:22px;height:22px;background:#4a9eff;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(74,158,255,0.5);margin:-11px 0 0 -11px"></div>`,iconSize:[22,22],iconAnchor:[11,11]});
    markerRef.current=L.marker([selectedLat,selectedLon],{icon}).addTo(leafletMap.current);
    leafletMap.current.flyTo([selectedLat,selectedLon],leafletMap.current.getZoom()<6?7:leafletMap.current.getZoom(),{duration:0.8});
  },[selectedLat,selectedLon]);

  return(<div ref={containerRef} style={{width:"100%",height:"100%"}} />);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function WeatherPage(){
  const[loc,setLoc]=useState(null);const[weather,setWeather]=useState(null);const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);const[tab,setTab]=useState("current");const[searchText,setSearchText]=useState("");
  const[searchResults,setSearchResults]=useState([]);const[searching,setSearching]=useState(false);const[showAK,setShowAK]=useState(true);
  const[mapView,setMapView]=useState("map"); // "map" or "windy"
  const searchTimeout=useRef(null);
  const mapObjRef=useRef(null);

  const akLoc=useMemo(()=>loc?AK_LOCS.find(l=>l.name===loc.name):null,[loc]);
  const isAlaska=!!akLoc;
  const phase=useMemo(()=>{if(!weather?.current||!isAlaska)return null;return getASHPhase(weather.current.temp_f,weather.current.wind_mph,weather.current.wind_chill,weather.current.visibility_miles);},[weather,isAlaska]);
  const pd=phase?ASH_BOOK_PHASES[phase]:null;

  const windyUrl=useMemo(()=>{
    const lat=loc?.lat??62.0;const lon=loc?.lon??-152.0;
    const akM=loc?AK_LOCS.find(a=>a.name===loc.name):null;
    const zoom=akM?(akM.ns?8:7):(loc?6:4);
    return`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=%C2%B0F&metricWind=mph&zoom=${zoom}&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&marker=true&message=true`;
  },[loc]);

  const selectLocation=useCallback(async(lat,lon,name)=>{
    setLoc({lat,lon,name:name||null});setLoading(true);setError(null);setWeather(null);setSearchResults([]);setSearchText("");setShowAK(true);

    let resolvedName=name;
    if(!resolvedName){
      const nearby=AK_LOCS.find(ak=>Math.abs(ak.lat-lat)<0.15&&Math.abs(ak.lon-lon)<0.15);
      if(nearby){resolvedName=nearby.name;}
      else{const gn=await reverseGeocode(lat,lon);resolvedName=gn||`${Math.abs(lat).toFixed(2)}\u00B0${lat>=0?"N":"S"}, ${Math.abs(lon).toFixed(2)}\u00B0${lon>=0?"E":"W"}`;}
      setLoc({lat,lon,name:resolvedName});
    }
    const data=await fetchWeather(lat,lon,resolvedName);
    if(data.error)setError(data.error);else{setWeather(data);setTab(AK_LOCS.find(a=>a.name===resolvedName)?"ash":"current");}setLoading(false);
  },[]);

  const handleMapClick=useCallback((lat,lon,name)=>{selectLocation(lat,lon,name||null);},[selectLocation]);

  const handleSearch=useCallback((val)=>{
    setSearchText(val);if(searchTimeout.current)clearTimeout(searchTimeout.current);
    if(val.trim().length<2){setSearchResults([]);setShowAK(true);return;}setShowAK(false);
    searchTimeout.current=setTimeout(async()=>{const akMatch=AK_LOCS.filter(l=>l.name.toLowerCase().includes(val.toLowerCase()));
      setSearching(true);const global=await searchLocations(val);setSearching(false);
      setSearchResults([...akMatch.map(l=>({name:l.name,lat:l.lat,lon:l.lon,isAK:true,ns:l.ns})),...global.filter(g=>!akMatch.find(a=>Math.abs(a.lat-g.lat)<0.1&&Math.abs(a.lon-g.lon)<0.1)).map(g=>({...g,isAK:false}))]);},350);
  },[]);

  return(
    <div style={{background:"linear-gradient(145deg,#080f1e 0%,#0c1a2e 50%,#080f1e 100%)",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e2e8f0",width:"100%",maxWidth:"1100px",margin:"0 auto"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:800px){.wp-main{flex-direction:column!important}.wp-map{flex:none!important;height:380px!important;width:100%!important}.wp-panel{border-left:none!important;border-top:1px solid rgba(255,255,255,0.06)!important}}
        .wg-chip{padding:3px 10px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#8892a4;font-size:11px;cursor:pointer;white-space:nowrap;transition:all 0.15s}
        .wg-chip:hover{background:rgba(74,158,255,0.12);color:#4a9eff}
        .wg-chip-active{background:rgba(74,158,255,0.15)!important;color:#4a9eff!important;border-color:rgba(74,158,255,0.3)!important}
        .wg-tab{flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#64748b;font-size:12px;cursor:pointer;transition:all 0.15s}
        .wg-tab:hover{color:#94a3b8}
        .wg-tab-active{color:#4a9eff!important;border-bottom-color:#4a9eff!important;font-weight:700!important}
        .wg-sr{padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.1s;font-size:12px}
        .wg-sr:hover{background:rgba(74,158,255,0.08)}
        .ak-tooltip{background:rgba(12,26,46,0.95)!important;color:#e2e8f0!important;border:1px solid rgba(74,158,255,0.3)!important;border-radius:6px!important;font-size:11px!important;padding:3px 8px!important;box-shadow:0 2px 8px rgba(0,0,0,0.3)!important}
        .ak-tooltip::before{border-top-color:rgba(74,158,255,0.3)!important}
        .map-toggle{padding:5px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:#8892a4;font-size:11px;cursor:pointer;transition:all 0.15s;font-weight:500}
        .map-toggle:hover{background:rgba(74,158,255,0.1);color:#4a9eff}
        .map-toggle-active{background:rgba(74,158,255,0.2)!important;color:#4a9eff!important;border-color:rgba(74,158,255,0.4)!important;font-weight:700!important}
      `}</style>

      {/* Header */}
      <div style={{padding:"14px 20px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"22px"}}>{"\uD83C\uDF10"}</span>
          <div><div style={{fontSize:"15px",fontWeight:700,color:"#fff"}}>Weather & Phase Conditions</div>
          <div style={{fontSize:"10px",color:"#64748b"}}>Click Map for Instant Weather {"\u2022"} NOAA Stations {"\u2022"} ASH Book 2026</div></div>
        </div>
        {pd&&<div style={{padding:"4px 14px",borderRadius:"20px",background:pd.bg,border:`1px solid ${pd.border}`,fontSize:"12px",fontWeight:700,color:pd.color,whiteSpace:"nowrap"}}>{pd.icon} {pd.label}</div>}
      </div>

      {/* Body */}
      <div className="wp-main" style={{display:"flex",flexDirection:"row",minHeight:"540px"}}>

        {/* LEFT: Map */}
        <div className="wp-map" style={{flex:"0 0 55%",height:"540px",position:"relative",borderRight:"1px solid rgba(255,255,255,0.06)"}}>
          {/* Toggle buttons */}
          <div style={{position:"absolute",top:"10px",right:"10px",zIndex:1000,display:"flex",gap:"3px",background:"rgba(8,15,30,0.88)",borderRadius:"8px",padding:"3px",border:"1px solid rgba(255,255,255,0.12)",backdropFilter:"blur(8px)"}}>
            <button className={`map-toggle ${mapView==="map"?"map-toggle-active":""}`} onClick={()=>setMapView("map")}>{"\uD83D\uDDFA\uFE0F"} Click Map</button>
            <button className={`map-toggle ${mapView==="windy"?"map-toggle-active":""}`} onClick={()=>setMapView("windy")}>{"\uD83C\uDF2C\uFE0F"} Windy Live</button>
          </div>

          {/* Leaflet clickable map */}
          <div style={{width:"100%",height:"100%",display:mapView==="map"?"block":"none"}}>
            <LeafletMap onMapClick={handleMapClick} selectedLat={loc?.lat} selectedLon={loc?.lon} mapRef={mapObjRef} />
          </div>

          {/* Windy iframe */}
          {mapView==="windy"&&(
            <div style={{width:"100%",height:"100%",position:"relative"}}>
              <iframe key={windyUrl} src={windyUrl} style={{width:"100%",height:"100%",border:"none"}} title="Windy Weather Map" allow="fullscreen" />
              <div style={{position:"absolute",bottom:"10px",left:"50%",transform:"translateX(-50%)",background:"rgba(8,15,30,0.92)",border:"1px solid rgba(74,158,255,0.3)",borderRadius:"8px",padding:"6px 14px",fontSize:"11px",color:"#94a3b8",whiteSpace:"nowrap",backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
                {"\uD83D\uDCA1"} Switch to <strong style={{color:"#4a9eff",cursor:"pointer"}} onClick={()=>setMapView("map")}>Click Map</strong> to pick a location for full weather data
              </div>
            </div>
          )}

          {/* Coordinate bar */}
          {loc&&(
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"5px 12px",background:"rgba(8,15,30,0.92)",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:"11px",color:"#64748b",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:999,backdropFilter:"blur(4px)"}}>
              <span>{"\uD83D\uDCCD"} <span style={{color:"#e2e8f0"}}>{loc.name||"Selected"}</span></span>
              <span style={{fontFamily:"monospace",fontSize:"10px",color:"#4a9eff"}}>{loc.lat.toFixed(4)}\u00B0, {loc.lon.toFixed(4)}\u00B0</span>
            </div>
          )}
        </div>

        {/* RIGHT: Data Panel */}
        <div className="wp-panel" style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,maxHeight:"540px"}}>
          {/* Search */}
          <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{position:"relative"}}>
              <input placeholder="Search city, zip code, or place..." value={searchText} onChange={e=>handleSearch(e.target.value)}
                style={{width:"100%",padding:"8px 12px 8px 32px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#e2e8f0",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              <span style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"13px",opacity:0.4}}>{"\uD83D\uDD0D"}</span>
              {searching&&<div style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",width:"14px",height:"14px",border:"2px solid rgba(74,158,255,0.3)",borderTop:"2px solid #4a9eff",borderRadius:"50%",animation:"spin 0.6s linear infinite"}} />}
            </div>
            {searchResults.length>0&&(
              <div style={{marginTop:"4px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",background:"rgba(12,26,46,0.98)",maxHeight:"180px",overflowY:"auto",position:"relative",zIndex:10}}>
                {searchResults.map((r,i)=>(<div key={i} className="wg-sr" onClick={()=>{selectLocation(r.lat,r.lon,r.name);if(mapObjRef.current)mapObjRef.current.flyTo([r.lat,r.lon],7,{duration:0.8});}}>
                  <span style={{marginRight:"6px"}}>{r.isAK?(r.ns?"\uD83C\uDFD4\uFE0F":"\uD83D\uDCCD"):"\uD83C\uDF0D"}</span>{r.name}
                  {r.country&&!r.isAK&&<span style={{color:"#64748b",marginLeft:"4px"}}>({r.country})</span>}</div>))}
              </div>)}
            {showAK&&(<div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginTop:"6px",maxHeight:"72px",overflowY:"auto"}}>
              {AK_LOCS.map(l=>(<button key={l.name} className={`wg-chip ${loc?.name===l.name?"wg-chip-active":""}`}
                onClick={()=>{selectLocation(l.lat,l.lon,l.name);if(mapObjRef.current)mapObjRef.current.flyTo([l.lat,l.lon],l.ns?8:7,{duration:0.8});}}>{l.ns?"\uD83C\uDFD4\uFE0F":"\uD83D\uDCCD"} {l.name}</button>))}
            </div>)}
          </div>

          {/* Content */}
          <div style={{flex:1,overflow:"auto"}}>
            {!loc&&!loading&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#475569",fontSize:"13px",textAlign:"center",padding:"20px",gap:"10px"}}>
                <span style={{fontSize:"42px",opacity:0.25}}>{"\uD83D\uDCCD"}</span>
                <div style={{fontWeight:600,color:"#8892a4",fontSize:"15px"}}>Click anywhere on the map</div>
                <div style={{lineHeight:1.7,fontSize:"12px",color:"#64748b"}}>
                  Tap any spot to get instant weather data.<br/>
                  Alaska locations are marked with colored dots.<br/>
                  Use <strong style={{color:"#4a9eff"}}>Windy Live</strong> for animated wind visualization.
                </div>
              </div>)}
            {loading&&(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"160px",gap:"10px",color:"#4a9eff"}}>
              <div style={{width:"18px",height:"18px",border:"2px solid rgba(74,158,255,0.3)",borderTop:"2px solid #4a9eff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />Fetching weather...</div>)}
            {error&&!loading&&!weather&&(<div style={{padding:"16px"}}><div style={{color:"#f97316",fontSize:"13px",fontWeight:600}}>{"\u26A0\uFE0F"} {error}</div></div>)}

            {weather&&!loading&&(
              <div>
                <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  {[{id:"current",label:"Current"},{id:"forecast",label:"7-Day"},...(isAlaska?[{id:"ash",label:"\uD83C\uDFD4\uFE0F ASH Book"}]:[])].map(t=>(
                    <button key={t.id} className={`wg-tab ${tab===t.id?"wg-tab-active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>))}
                </div>

                {tab==="current"&&weather.current&&(
                  <div style={{padding:"14px"}}>
                    <div style={{fontSize:"11px",color:"#4a9eff",fontWeight:600}}>{"\uD83D\uDCCD"} {loc.name}</div>
                    <div style={{fontSize:"9px",color:"#475569",marginBottom:"12px"}}>{weather.current.source}{weather.current.dataAge!=null?` \u2022 ${weather.current.dataAge} min ago`:""}</div>
                    <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px"}}>
                      <div><div style={{fontSize:"42px",fontWeight:800,color:"#fff",lineHeight:1,letterSpacing:"-1px"}}>{weather.current.temp_f!==null?`${Math.round(weather.current.temp_f)}\u00B0`:"--"}<span style={{fontSize:"18px",fontWeight:400,color:"#8892a4"}}>F</span></div>
                      {weather.current.apparent_f!=null&&<div style={{fontSize:"11px",color:"#64748b",marginTop:"2px"}}>Feels like {Math.round(weather.current.apparent_f)}\u00B0F</div>}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:"2px"}}><span style={{fontSize:"26px"}}>{weather.current.icon}</span><span style={{fontSize:"11px",color:"#94a3b8"}}>{weather.current.description}</span></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                      <MetricBox icon={"\uD83D\uDCA8"} label="Wind" value={weather.current.wind_mph!=null?`${Math.round(weather.current.wind_mph)} mph`:"--"} sub={weather.current.wind_dir!=null?`${windDirLabel(weather.current.wind_dir)} (${Math.round(weather.current.wind_dir)}\u00B0)${weather.current.wind_gust?` \u2022 Gusts ${Math.round(weather.current.wind_gust)} mph`:""}`:""} />
                      <MetricBox icon={"\uD83C\uDF21\uFE0F"} label="Wind Chill" value={weather.current.wind_chill!=null?`${Math.round(weather.current.wind_chill)}\u00B0F`:"--"} sub={weather.current.frostbite_time?`\u26A0\uFE0F Frostbite: ${weather.current.frostbite_time}`:""} alert={weather.current.wind_chill!=null&&weather.current.wind_chill<-40} />
                      <MetricBox icon={"\uD83D\uDC41\uFE0F"} label="Visibility" value={weather.current.visibility_miles!=null?`${weather.current.visibility_miles.toFixed(1)} mi`:"--"} alert={weather.current.visibility_miles!=null&&weather.current.visibility_miles<0.5} />
                      <MetricBox icon={"\uD83D\uDCA7"} label="Humidity" value={weather.current.humidity!=null?`${Math.round(weather.current.humidity)}%`:"--"} />
                    </div>
                  </div>)}

                {tab==="forecast"&&(
                  <div style={{padding:"10px 14px"}}>
                    <div style={{fontSize:"11px",color:"#4a9eff",fontWeight:600,marginBottom:"8px"}}>{"\uD83D\uDCCD"} {loc.name} \u2014 7-Day Forecast</div>
                    {weather.forecast.map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",marginBottom:"3px",borderRadius:"8px",background:i===0?"rgba(74,158,255,0.06)":"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:"20px",width:"28px",textAlign:"center"}}>{p.icon}</span>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:"11px",fontWeight:700,color:"#e2e8f0"}}>{dayName(p.date)}</div><div style={{fontSize:"10px",color:"#8892a4"}}>{p.description}</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:"13px",fontWeight:800,color:"#fff"}}>{Math.round(p.temp_max)}\u00B0</div><div style={{fontSize:"10px",color:"#64748b"}}>{Math.round(p.temp_min)}\u00B0</div></div>
                      <div style={{textAlign:"right",minWidth:"50px"}}><div style={{fontSize:"9px",color:"#8892a4"}}>{"\uD83D\uDCA8"}{Math.round(p.wind_max)}mph</div>{p.precip>0&&<div style={{fontSize:"9px",color:"#60a5fa"}}>{"\uD83D\uDCA7"}{p.precip.toFixed(2)}"</div>}</div>
                    </div>))}
                    <div style={{fontSize:"9px",color:"#334155",marginTop:"6px",textAlign:"center"}}>Data: Open-Meteo.com {"\u2022"} CC BY 4.0</div>
                  </div>)}

                {tab==="ash"&&isAlaska&&(
                  <div style={{padding:"10px 14px"}}>
                    <div style={{fontSize:"11px",color:"#4a9eff",fontWeight:600}}>{"\uD83D\uDCCD"} {loc.name}</div>
                    <div style={{fontSize:"10px",color:"#475569",marginBottom:"10px"}}>ASH Book 2026 {"\u2022"} Foul Weather Contingency (pp. 56-57){akLoc?.ns&&<span style={{marginLeft:"6px",padding:"1px 6px",borderRadius:"8px",background:"rgba(249,115,22,0.15)",color:"#f97316",fontSize:"9px",fontWeight:600}}>NORTH SLOPE</span>}</div>
                    {pd&&(<div style={{padding:"12px",borderRadius:"10px",background:pd.bg,border:`1px solid ${pd.border}`,marginBottom:"10px"}}>
                      <div style={{fontSize:"15px",fontWeight:800,color:pd.color,marginBottom:"8px"}}>{pd.icon} {pd.label}</div>
                      {[["\uD83D\uDE97 Travel",pd.travel],["\uD83C\uDFD7\uFE0F Outdoor Work",pd.outdoor],["\u2699\uFE0F Equipment",pd.equipment]].map(([l,t])=>(<div key={l} style={{marginBottom:"6px"}}><div style={{fontSize:"10px",fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"2px"}}>{l}</div><div style={{fontSize:"11px",color:"#e2e8f0",lineHeight:1.5}}>{t}</div></div>))}
                    </div>)}
                    <div style={{fontSize:"11px",fontWeight:700,color:"#8892a4",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Current vs. Thresholds</div>
                    <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                      <ThresholdRow label="Wind Chill" value={weather.current?.wind_chill!=null?`${Math.round(weather.current.wind_chill)}\u00B0F`:"--"} thresholds="-40\u00B0F (I) \u00B7 -60\u00B0F (II) \u00B7 -75\u00B0F (III)" alert={weather.current?.wind_chill<-40} />
                      <ThresholdRow label="Wind" value={weather.current?.wind_mph!=null?`${Math.round(weather.current.wind_mph)} mph`:"--"} thresholds="35 mph (I) \u00B7 45 mph (II) \u00B7 55 mph (III)" alert={weather.current?.wind_mph>35} />
                      <ThresholdRow label="Visibility" value={weather.current?.visibility_miles!=null?`${weather.current.visibility_miles.toFixed(1)} mi`:"--"} thresholds="< \u00BD mi (I) \u00B7 < \u00BC mi (II) \u00B7 < \u215B mi (III)" alert={weather.current?.visibility_miles<0.5} />
                      <ThresholdRow label="Temp" value={weather.current?.temp_f!=null?`${Math.round(weather.current.temp_f)}\u00B0F`:"--"} thresholds="< -35\u00B0F: Equipment eval required (p.44)" alert={weather.current?.temp_f<-35} />
                      {weather.current?.frostbite_time&&<div style={{padding:"5px 10px",borderRadius:"6px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",fontSize:"11px",color:"#ef4444",fontWeight:600}}>{"\u2744\uFE0F"} FROSTBITE RISK: {weather.current.frostbite_time} (Wind Chill Chart p.188)</div>}
                    </div>
                    <div style={{marginTop:"10px",padding:"8px 10px",borderRadius:"8px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{fontSize:"10px",fontWeight:700,color:"#64748b",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Phase Reference</div>
                      {Object.entries(ASH_BOOK_PHASES).map(([k,p])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:"8px",padding:"2px 0",fontSize:"10px",color:k===phase?p.color:"#64748b",fontWeight:k===phase?700:400}}><span style={{width:"8px",height:"8px",borderRadius:"50%",background:p.color,flexShrink:0}} />{p.label}</div>))}
                    </div>
                  </div>)}
              </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
