(() => {
  "use strict";

  const $ = (s,p=document) => p.querySelector(s);
  const $$ = (s,p=document) => [...p.querySelectorAll(s)];
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const E = encodeURIComponent;

  // ESPHome 2026.8 REST API: the URL uses the ENTITY NAME exactly as in YAML,
  // not the old slug/object_id. Keeping all names here avoids desynchronisation.
  const N = {
    litres:"Eau restante",
    niveau:"Niveau cuve",
    today:"Consommation aujourd'hui",
    since:"Consommation depuis le plein",
    avg7:"Moyenne 7 jours",
    avg30:"Moyenne 30 jours",
    reserve:"Reserve eau",
    capacity:"Capacite cuve",
    threshold:"Seuil reserve",
    add:"Ajouter de l'eau",
    hist:"Historique 30 jours JSON",
    full:"Cuve pleine",
    calStart:"Calibration 1L - Demarrer",
    calStop:"Calibration 1L - Terminer",
    calibration:"Calibration debitmetre",
    resetHist:"Reset historique",
    wifiSsidInput:"WiFi Home Assistant",
    wifiPassInput:"Mot de passe WiFi",
    wifiConnect:"Connecter Home Assistant",
    wifiDirect:"Revenir au WiFi direct",
    wifiCurrent:"WiFi connecte",
    wifiIp:"Adresse IP"
  };

  const URL = {
    get:(domain,name)=>`/${domain}/${E(name)}`,
    button:name=>`/button/${E(name)}/press`,
    number:(name,v)=>`/number/${E(name)}/set?value=${E(v)}`,
    text:(name,v)=>`/text/${E(name)}/set?value=${E(v)}`
  };

  const S = {
    litres:0,pct:0,today:0,since:0,avg7:0,avg30:0,reserve:false,
    cap:100,threshold:15,calibration:0,hist:Array(30).fill(0),wifi:"",ip:""
  };
  let tab="tank", busy=false;

  const style=document.createElement("style");
  style.textContent=`
    :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#18333b;background:#f2f5f6}
    *{box-sizing:border-box} html,body{margin:0;min-height:100%;background:#f2f5f6;color:#18333b}
    body.modal-open{overflow:hidden}.app{width:min(100%,560px);margin:auto;padding:10px 12px 30px}
    .brand{text-align:center;padding:3px 0 8px}.brandline{display:flex;align-items:center;justify-content:center;gap:8px;font-size:23px;font-weight:650}
    .drop{width:20px;height:28px;background:#008d98;clip-path:polygon(50% 0,100% 62%,92% 84%,72% 100%,28% 100%,8% 84%,0 62%)}
    .tag{font-size:10px;color:#7a8b91;margin-top:2px}
    .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;position:sticky;top:0;z-index:20;background:#f2f5f6;padding:4px 0 8px}
    .tabs button{height:34px;border:1px solid #d8e1e3;border-radius:8px;background:#fff;color:#63777d;font-size:12px}
    .tabs button.on{background:#008d98;color:#fff;border-color:#008d98}
    .card{background:#fff;border:1px solid #dce4e6;border-radius:14px;padding:14px;margin:8px 0;box-shadow:0 1px 2px #00000009}
    .gaugewrap{display:grid;place-items:center}.gauge{width:120px;height:120px;border-radius:50%;display:grid;place-items:center;position:relative;background:conic-gradient(#008d98 0deg,#e0e7e9 0)}
    .gauge:after{content:"";position:absolute;inset:8px;border-radius:50%;background:#fff}.gaugein{position:relative;z-index:1;text-align:center}.lit{font-size:28px;font-weight:750}.pct{font-size:13px;color:#788b91}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .stat{background:#fff;border:1px solid #e0e7e9;border-radius:12px;padding:11px}.lab{font-size:10px;color:#74888e}.val{font-size:18px;font-weight:650}
    .status{border-radius:9px;padding:9px;text-align:center;margin:8px 0;font-size:12px;background:#e4f5f2;color:#0a756e}.status.reserve{background:#ffe6e7;color:#ae3039;font-weight:700}
    .action{width:100%;height:40px;border:0;border-radius:8px;margin:4px 0;background:#008d98;color:#fff;font-size:13px;font-weight:650}.action.secondary{background:#057580}.action.ghost{background:#eef4f5;color:#31535c}.action.danger{background:#b4474e}
    h3{font-size:15px;margin:3px 0 11px}.note{font-size:11px;line-height:1.45;color:#75888e}
    label{display:block;font-size:12px;color:#657a80;margin:9px 0 4px} input{width:100%;height:40px;border:1px solid #d5dfe1;border-radius:8px;padding:0 10px;background:#fff;color:#18333b;font:inherit}
    .rowsetting{display:grid;grid-template-columns:1fr 110px;gap:8px;align-items:end}
    canvas{width:100%;height:210px;display:block}.day{display:flex;justify-content:space-between;padding:9px 2px;border-bottom:1px solid #edf1f2;font-size:13px}
    .modalback{position:fixed;inset:0;background:#0007;display:none;align-items:center;justify-content:center;padding:18px;z-index:1000}.modalback.show{display:flex}
    .modal{width:min(100%,480px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 18px 60px #0005}
    .modalhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.close{width:32px;height:32px;border:0;border-radius:50%;background:#eef3f4;font-size:19px}
    .quick{display:grid;grid-template-columns:1fr 1fr;gap:7px}.quick button{height:42px;border:1px solid #d8e2e4;border-radius:9px;background:#f7fafb;color:#29474f}
    .custom{display:grid;grid-template-columns:1fr 90px;gap:7px;margin-top:7px}.custom button{border:0;border-radius:8px;background:#008d98;color:#fff}
    .wifiStatus{border-radius:10px;background:#f5f8f9;padding:10px;font-size:12px;line-height:1.55}.ok{color:#08766f;font-weight:700}
    .toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(28px);opacity:0;transition:.2s;background:#17343d;color:#fff;padding:9px 14px;border-radius:20px;font-size:12px;z-index:2000;pointer-events:none}.toast.show{opacity:1;transform:translateX(-50%)}
  `;
  document.head.appendChild(style);

  document.body.innerHTML=`
    <div class="app">
      <header class="brand"><div class="brandline"><span class="drop"></span>WaterVan</div><div class="tag">Gestion de l'eau du fourgon</div></header>
      <nav class="tabs"><button data-tab="tank">💧 Cuve</button><button data-tab="history">▥ Historique</button><button data-tab="settings">⚙ Paramètres</button></nav>
      <main id="main"></main>
    </div>
    <div id="waterModal" class="modalback"><div class="modal">
      <div class="modalhead"><b>Ajouter de l'eau</b><button id="closeModal" class="close">×</button></div>
      <div class="quick"><button data-add="5">+ 5 L</button><button data-add="10">+ 10 L</button><button data-add="20">+ 20 L</button><button data-add="30">+ 30 L</button></div>
      <div class="custom"><input id="customLitres" type="number" inputmode="decimal" min="1" max="100" step="1" placeholder="Autre quantité"><button id="customAdd">Ajouter</button></div>
    </div></div>
    <div id="toast" class="toast"></div>`;

  async function request(path,method="GET"){
    try{
      const r=await fetch(path,{method,cache:"no-store"});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      if(method==="GET") return await r.json();
      return true;
    }catch(e){
      console.log(path,e);
      return null;
    }
  }
  const get=(d,n)=>request(URL.get(d,n));
  const post=p=>request(p,"POST");

  function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1600)}
  function modal(open){$("#waterModal").classList.toggle("show",open);document.body.classList.toggle("modal-open",open)}

  async function press(name,msg,expectDisconnect=false){
    if(busy)return false;busy=true;
    const ok=await post(URL.button(name));
    if(ok){
      toast(msg);
      if(!expectDisconnect){await sleep(250);await refresh();}
    }else toast("Commande non envoyée");
    busy=false;return !!ok;
  }
  async function setNumber(name,v,msg){
    if(busy)return false;busy=true;
    const ok=await post(URL.number(name,v));
    if(ok){toast(msg);await sleep(250);await refresh()} else toast("Commande non envoyée");
    busy=false;return !!ok;
  }
  async function setText(name,v){
    return !!(await post(URL.text(name,v)));
  }

  $$(".tabs button").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
  $("#closeModal").onclick=()=>modal(false);
  $("#waterModal").onclick=e=>{if(e.target===$("#waterModal"))modal(false)};
  $$("[data-add]").forEach(b=>b.onclick=async()=>{
    if(await setNumber(N.add,Number(b.dataset.add),`+${b.dataset.add} L ajoutés`)) modal(false);
  });
  $("#customAdd").onclick=async()=>{
    const v=parseFloat($("#customLitres").value);
    if(!(v>=1))return toast("Quantité incorrecte");
    if(await setNumber(N.add,v,`${v.toFixed(0)} L ajoutés`)) modal(false);
  };

  function render(){
    $$(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
    const m=$("#main");
    if(tab==="tank"){
      m.innerHTML=`
        <section class="card gaugewrap"><div id="gauge" class="gauge"><div class="gaugein"><div class="lit"><span id="lit">--</span> L</div><div class="pct"><span id="pct">--</span> %</div></div></div></section>
        <div class="grid2"><div class="stat"><div class="lab">Aujourd'hui</div><div class="val"><span id="today">--</span> L</div></div><div class="stat"><div class="lab">Depuis le plein</div><div class="val"><span id="since">--</span> L</div></div></div>
        <div id="status" class="status">Niveau d'eau normal</div>
        <button id="fullBtn" class="action">💧 CUVE PLEINE</button>
        <button id="addBtn" class="action secondary">＋ AJOUTER DE L'EAU</button>`;
      $("#fullBtn").onclick=()=>press(N.full,"Cuve remise à pleine");
      $("#addBtn").onclick=()=>modal(true);
    } else if(tab==="history"){
      m.innerHTML=`
        <div class="grid3"><div class="stat"><div class="lab">Aujourd'hui</div><div class="val"><span id="today">0.0</span>L</div></div><div class="stat"><div class="lab">Moy. 7 j</div><div class="val"><span id="a7">0.0</span>L</div></div><div class="stat"><div class="lab">Moy. 30 j</div><div class="val"><span id="a30">0.0</span>L</div></div></div>
        <section class="card"><h3>Consommation sur 30 jours</h3><canvas id="chart" width="520" height="220"></canvas></section>
        <section class="card"><h3>Détail</h3><div id="days"></div></section>`;
    } else {
      m.innerHTML=`
        <section class="card"><h3>Cuve</h3>
          <div class="rowsetting"><label>Capacité de la cuve</label><div style="position:relative"><input id="cap" type="number" min="10" max="500" step="1" style="padding-right:34px"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6d8086;font-size:13px">L</span></div></div>
          <div class="rowsetting"><label>Seuil de réserve</label><div style="position:relative"><input id="thr" type="number" min="1" max="100" step="1" style="padding-right:34px"><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6d8086;font-size:13px">L</span></div></div>
          <button id="saveTank" class="action">ENREGISTRER</button>
        </section>
        <section class="card"><h3>Calibration 1 litre</h3><p class="note">Démarre la calibration, fais couler exactement 1 litre, puis termine.</p>
          <div class="wifiStatus"><b>Calibration actuelle :</b> <span id="calibrationValue">--</span> imp/L</div>
          <div class="grid2"><button id="calStart" class="action">DÉMARRER</button><button id="calStop" class="action secondary">TERMINER</button></div>
        </section>
        <section class="card"><h3>Home Assistant</h3>
          <div class="wifiStatus"><b>État :</b> <span id="wifiState">Mode Wi-Fi direct</span><br><b>Adresse :</b> <span id="wifiIp">192.168.4.1</span></div>
          <label>Nom du Wi-Fi de la box / routeur</label><input id="ssid" type="text" autocomplete="off" placeholder="Ex. Livebox-1234">
          <label>Mot de passe Wi-Fi</label><input id="pass" type="password" autocomplete="new-password" placeholder="Mot de passe">
          <button id="connectHA" class="action">CONNECTER HOME ASSISTANT</button>
          <p class="note">Après connexion au routeur, le réseau WaterVan peut disparaître. WaterVan devient alors accessible depuis Home Assistant et depuis son adresse IP sur ce réseau.</p>
          <button id="directWifi" class="action ghost">REVENIR AU WI-FI DIRECT</button>
          <p class="note">Cette commande efface uniquement le Wi-Fi du routeur. Les litres, la calibration et l'historique sont conservés. WaterVan redémarre ensuite sur WaterVan / 192.168.4.1.</p>
        </section>
        <section class="card"><button id="resetHist" class="action danger">EFFACER L'HISTORIQUE</button></section>`;
      $("#saveTank").onclick=async()=>{
        const c=parseFloat($("#cap").value),t=parseFloat($("#thr").value);
        if(c>=10) await setNumber(N.capacity,c,"Capacité enregistrée");
        if(t>=1) await setNumber(N.threshold,t,"Seuil enregistré");
      };
      $("#calStart").onclick=()=>press(N.calStart,"Calibration démarrée");
      $("#calStop").onclick=()=>press(N.calStop,"Calibration terminée");
      $("#resetHist").onclick=()=>{if(confirm("Effacer les 30 jours d'historique ?"))press(N.resetHist,"Historique effacé")};
      $("#connectHA").onclick=async()=>{
        const ssid=$("#ssid").value.trim(),pass=$("#pass").value;
        if(!ssid)return toast("Entre le nom du Wi-Fi");
        busy=true;
        const a=await setText(N.wifiSsidInput,ssid);
        const b=await setText(N.wifiPassInput,pass);
        busy=false;
        if(!a||!b)return toast("Impossible d'enregistrer le Wi-Fi");
        toast("Connexion au Wi-Fi…");
        await sleep(150);
        await press(N.wifiConnect,"Connexion en cours…",true);
      };
      $("#directWifi").onclick=()=>{
        if(confirm("Revenir au Wi-Fi direct WaterVan ?")) press(N.wifiDirect,"Redémarrage en Wi-Fi direct…",true);
      };
    }
    paint();
  }

  const num=(o,d)=>o && Number.isFinite(Number(o.value)) ? Number(o.value) : d;
  async function refresh(){
    const r=await Promise.all([
      get("sensor",N.litres), get("sensor",N.niveau), get("sensor",N.today), get("sensor",N.since),
      get("sensor",N.avg7), get("sensor",N.avg30), get("binary_sensor",N.reserve),
      get("number",N.capacity), get("number",N.threshold), get("text_sensor",N.hist),
      get("text_sensor",N.wifiCurrent), get("text_sensor",N.wifiIp), get("sensor",N.calibration)
    ]);
    S.litres=num(r[0],S.litres);S.pct=num(r[1],S.pct);S.today=num(r[2],S.today);S.since=num(r[3],S.since);
    S.avg7=num(r[4],S.avg7);S.avg30=num(r[5],S.avg30);
    if(r[6]&&typeof r[6].value==="boolean")S.reserve=r[6].value;
    S.cap=num(r[7],S.cap);S.threshold=num(r[8],S.threshold);
    if(r[9]?.value){try{const h=JSON.parse(r[9].value);if(Array.isArray(h)&&h.length===30)S.hist=h.map(Number)}catch(e){}}
    S.wifi=(r[10]?.value||r[10]?.state||"").trim();
    S.ip=(r[11]?.value||r[11]?.state||"").trim();
    S.calibration=num(r[12],S.calibration);
    paint();
  }

  function paint(){
    if(tab==="tank"){
      if($("#lit"))$("#lit").textContent=S.litres.toFixed(1);
      if($("#pct"))$("#pct").textContent=Math.round(S.pct);
      if($("#today"))$("#today").textContent=S.today.toFixed(1);
      if($("#since"))$("#since").textContent=S.since.toFixed(1);
      if($("#gauge")){
        const deg=Math.max(0,Math.min(100,S.pct))*3.6;
        $("#gauge").style.background=`conic-gradient(${S.reserve?"#d84d58":"#008d98"} ${deg}deg,#e0e7e9 ${deg}deg)`;
      }
      if($("#status")){
        $("#status").classList.toggle("reserve",S.reserve);
        $("#status").textContent=S.reserve?"⚠ RÉSERVE D'EAU":"✓ Niveau d'eau normal";
      }
    } else if(tab==="history"){
      if($("#today"))$("#today").textContent=S.today.toFixed(1);
      if($("#a7"))$("#a7").textContent=S.avg7.toFixed(1);
      if($("#a30"))$("#a30").textContent=S.avg30.toFixed(1);
      drawChart();drawDays();
    } else {
      if($("#cap")&&document.activeElement!==$("#cap"))$("#cap").value=Math.round(S.cap);
      if($("#thr")&&document.activeElement!==$("#thr"))$("#thr").value=Math.round(S.threshold);
      if($("#calibrationValue"))$("#calibrationValue").textContent=S.calibration>0?S.calibration.toFixed(1):"--";
      if($("#wifiState")){
        const connected=S.wifi && S.wifi!=="WaterVan";
        $("#wifiState").innerHTML=connected?`<span class="ok">Connecté à ${escapeHtml(S.wifi)}</span>`:"Mode Wi-Fi direct";
        $("#wifiIp").textContent=connected&&S.ip?S.ip:"192.168.4.1";
      }
    }
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function drawDays(){
    const e=$("#days");if(!e)return;
    let h="";
    for(let i=0;i<30;i++){
      const d=new Date();d.setDate(d.getDate()-i);
      const idx=29-i;
      const label=i===0?"Aujourd'hui":i===1?"Hier":d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
      h+=`<div class="day"><span>${label}</span><b>${Number(S.hist[idx]||0).toFixed(1)} L</b></div>`;
    }
    e.innerHTML=h;
  }
  function drawChart(){
    const c=$("#chart");if(!c)return;
    const x=c.getContext("2d"),w=c.width,h=c.height,p=32,v=S.hist,max=Math.max(1,...v)*1.15;
    x.clearRect(0,0,w,h);x.font="11px system-ui";x.strokeStyle="#dfe6e8";x.fillStyle="#75888d";
    for(let k=0;k<=4;k++){const y=p+(h-p*2)*k/4;x.beginPath();x.moveTo(p,y);x.lineTo(w-p,y);x.stroke();x.fillText((max*(1-k/4)).toFixed(1),2,y+4)}
    const slot=(w-p*2)/30,bw=Math.max(2,slot*.68);
    v.forEach((n,i)=>{const bh=(h-p*2)*(n/max);x.fillStyle="#008d98";x.fillRect(p+i*slot+slot*.16,h-p-bh,bw,bh)});
    x.fillStyle="#75888d";x.fillText("−29 j",p,h-7);x.fillText("Aujourd'hui",w-p-62,h-7);
  }

  render();
  refresh();
  setInterval(()=>{if(!document.hidden&&!busy)refresh()},800);
})();
