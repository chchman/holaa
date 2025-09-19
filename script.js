// script.js — hacker -> takeoff -> explosion -> result (языки + список слева снизу)

// ===== Настройки =====
const HACKER_LOG_ENABLED   = true;
const HACKER_TOTAL_MS      = 1400;
const HACKER_FINAL_HOLD_MS = 250;

const TAKEOFF_DURATION_MS  = 2400;
const ANGLE_RESPONSE       = 12;
const ANGLE_LIMIT_UP       = -28;
const ANGLE_LIMIT_DOWN     = 12;

const EXPLOSION_DURATION_MS = 500;
const P_CRUSH               = 0.68;
const MAX_RESULTS_STORED    = 50;

// ===== DOM =====
const phone         = document.querySelector('.phone');
const plane         = document.querySelector('.plane');
const explosion     = document.querySelector('.explosion');
const startBtn      = document.querySelector('.start-btn');
const hackerOverlay = document.querySelector('.hacker-overlay');
const hackLog       = document.getElementById('hackLog');

// результаты
const resultsBox    = document.querySelector('.results-box');
const resultsTitle  = document.querySelector('.results-title');
const resultsList   = document.querySelector('.results-list');

// кнопка/меню языков
const settingsBtn   = document.querySelector('.settings-btn'); // кнопка ⚙ или LANGUAGE
const langMenu      = document.querySelector('.lang-menu');    // выпадающий список языков

let runIndex = 0;
let resultsHistory = [];

// ===== Переводы =====
const TRANSLATIONS = {
  en: {
    getStart: "GET START",
    panelTitle: "> SIGNAL CONSOLE — ANALYTICS",
    crushLabel: "CRUSH",
    resultSuffix: "x",
    results: "Results",
    languages: "Languages"
  },
  ru: {
    getStart: "СТАРТ",
    panelTitle: "> КОНСОЛЬ СИГНАЛОВ — АНАЛИТИКА",
    crushLabel: "КРАШ",
    resultSuffix: "x",
    results: "Результаты",
    languages: "Языки"
  },
  es: {
    getStart: "INICIAR",
    panelTitle: "> CONSOLA DE SEÑAL — ANALÍTICA",
    crushLabel: "CRASH",
    resultSuffix: "x",
    results: "Resultados",
    languages: "Idiomas"
  }
};
let currentLang = 'en';

// хакерское меню всегда остаётся английским
const hackerLines = [
  "[SYS] boot sequence initiated...",
  "[NET] linking telemetry adapters...",
  "[I/O] streaming anonymized telemetry...",
  "[ANALYTICS] extracting session features...",
  "[MODEL] running quick pattern pass...",
  "> READY. EXECUTE GET SIGNAL."
];

// ===== Утилиты =====
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b - a) * t; }
function calcAngleDeg(vx, vy){ return Math.atan2(vy, vx) * 180 / Math.PI; }

function getCssPlaneStart(){
  const root = getComputedStyle(document.documentElement);
  return {
    x: parseInt(root.getPropertyValue('--plane-start-x'), 10),
    y: parseInt(root.getPropertyValue('--plane-start-y'), 10)
  };
}
function setPlaneCenterPx(x, y){
  plane.style.left = Math.round(x) + "px";
  plane.style.top  = Math.round(y) + "px";
}

// ===== Хакерская панель =====
function countChars(lines){ return lines.reduce((s, l) => s + l.length + 1, 0); }

async function runHackerConsole(){
  if (!HACKER_LOG_ENABLED) return;
  hackerOverlay.style.display = "block";
  hackLog.textContent = "";

  const totalChars = countChars(hackerLines);
  let baseDelay = Math.max(3, Math.round(HACKER_TOTAL_MS / totalChars));
  baseDelay = clamp(baseDelay, 3, 24);

  for (let i = 0; i < hackerLines.length; i++){
    const line = hackerLines[i] + (i === hackerLines.length - 1 ? "" : "\n");
    for (let c = 0; c < line.length; c++){
      hackLog.textContent += line[c];
      const jitter = baseDelay * (0.7 + Math.random() * 0.6);
      await wait(jitter);
    }
    await wait(40 + Math.random() * 80);
  }
  await wait(HACKER_FINAL_HOLD_MS);
  hackerOverlay.style.display = "none";
}

// ===== Взлёт =====
const easeInOutCubic = t => t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2;

function animateRAF(duration, onUpdate){
  return new Promise(resolve => {
    const start = performance.now();
    function frame(now){
      const t = Math.min(1, (now - start) / duration);
      onUpdate(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

async function runTakeoffToOffset(offsetXPercent=0.72, offsetYPercent=0.42){
  const start = getCssPlaneStart();
  const phoneRect = phone.getBoundingClientRect();
  const targetX = phoneRect.width * offsetXPercent;
  const targetY = phoneRect.height * offsetYPercent;

  let prevX = start.x, prevY = start.y, angle = 0;

  await animateRAF(TAKEOFF_DURATION_MS, t => {
    const p = easeInOutCubic(t);
    const curX = lerp(start.x, targetX, p);
    const curY = lerp(start.y, targetY, p);

    const vx = curX - prevX, vy = curY - prevY;
    let targetAngle = clamp(calcAngleDeg(vx, vy), ANGLE_LIMIT_UP, ANGLE_LIMIT_DOWN);
    angle = lerp(angle, targetAngle, 0.2);

    setPlaneCenterPx(curX, curY);
    plane.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    prevX = curX; prevY = curY;
  });

  const planeRect = plane.getBoundingClientRect();
  const phoneRect2 = phone.getBoundingClientRect();
  const exX = planeRect.left - phoneRect2.left + planeRect.width/2;
  const exY = planeRect.top  - phoneRect2.top  + planeRect.height/2;

  explosion.style.left = `${exX}px`;
  explosion.style.top  = `${exY}px`;
  explosion.classList.remove("active");
  void explosion.offsetWidth;
  explosion.classList.add("active");

  plane.style.opacity = "0";
  await wait(EXPLOSION_DURATION_MS);
  return {x:exX,y:exY};
}

// ===== Генерация результата =====
function sampleSkew(min, max, power=3){
  const u = Math.random();
  const v = Math.pow(u, power);
  return min + (max-min)*v;
}
function generateResult(runIdx){
  if (runIdx === 1) return { type:'CRUSH' };
  if (runIdx === 2){
    const v = sampleSkew(2,6,1.8);
    return { type:'MULT', value:Math.round(v*100)/100 };
  }
  if (Math.random() < P_CRUSH) return { type:'CRUSH' };

  const buckets = [
    {min:0.6,max:0.99,abs:8,power:3.0},
    {min:1.0,max:7.0,abs:14,power:2.2},
    {min:7.0,max:11.0,abs:4,power:1.9},
    {min:11.0,max:50.0,abs:3,power:1.6},
    {min:50.0,max:200.0,abs:3,power:1.4}
  ];
  const totalAbs = buckets.reduce((s,b)=>s+b.abs,0);
  let r = Math.random()*totalAbs, chosen=buckets[buckets.length-1];
  for (const b of buckets){
    if (r < b.abs){chosen=b;break;} r-=b.abs;
  }
  const raw = sampleSkew(chosen.min,chosen.max,chosen.power);
  return { type:'MULT', value:Math.round(raw*100)/100 };
}

// ===== Показ результата + история =====
async function showResultAt(x,y,result){
  const label = (result.type==='CRUSH')
    ? TRANSLATIONS[currentLang].crushLabel
    : `${result.value}${TRANSLATIONS[currentLang].resultSuffix}`;
  const el = document.createElement('div');
  el.textContent = label;
  Object.assign(el.style,{
    position:'absolute',left:`${x}px`,top:`${y}px`,
    transform:'translate(-50%,-50%)',
    fontFamily:'Courier New, monospace',
    fontSize:'26px',fontWeight:'700',
    color:(result.type==='CRUSH')?'#ff4444':'#07ff6a',
    zIndex:120
  });
  phone.appendChild(el);
  await wait(1200); el.remove();

  resultsHistory.unshift({runIndex,type:result.type,value:result.value??null,time:Date.now()});
  if (resultsHistory.length>MAX_RESULTS_STORED) resultsHistory.pop();
  renderResultsList();
}

function renderResultsList(){
  resultsList.innerHTML="";
  const crushText=TRANSLATIONS[currentLang].crushLabel;
  const suffix=TRANSLATIONS[currentLang].resultSuffix;
  resultsHistory.slice(0,20).forEach(r=>{
    const row=document.createElement('div');
    row.textContent = r.type==='CRUSH'?crushText:`${r.value}${suffix}`;
    row.style.color= r.type==='CRUSH'?'#ff4444':'#07ff6a';
    resultsList.appendChild(row);
  });
}

// ===== Языки =====
function applyLanguage(lang){
  if(!TRANSLATIONS[lang])return;
  currentLang=lang;
  const t=TRANSLATIONS[lang];
  if(startBtn) startBtn.textContent=t.getStart;
  const title=document.querySelector('.panel-title');
  if(title) title.textContent=t.panelTitle;
  if(resultsTitle) resultsTitle.textContent=t.results;
  renderResultsList();
}

// ===== Меню языков =====
if(settingsBtn){
  settingsBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    langMenu.hidden=!langMenu.hidden;
  });
}
if(langMenu){
  langMenu.addEventListener('click',(e)=>{
    const btn=e.target.closest('button[data-lang]');
    if(!btn)return;
    const lang=btn.getAttribute('data-lang');
    applyLanguage(lang);
    langMenu.hidden=true;
  });
}
document.addEventListener('click',(e)=>{
  if(!langMenu||langMenu.hidden)return;
  if(e.target===settingsBtn||langMenu.contains(e.target))return;
  langMenu.hidden=true;
});

// ===== Главный процесс =====
async function handleLaunch(){
  runIndex++;
  startBtn.disabled=true;
  await runHackerConsole();
  const pos=await runTakeoffToOffset();
  const result=generateResult(runIndex);
  await showResultAt(pos.x,pos.y,result);
  const s=getCssPlaneStart();
  setPlaneCenterPx(s.x,s.y);
  plane.style.opacity='1';
  plane.style.transform='translate(-50%,-50%) rotate(0deg)';
  startBtn.disabled=false;
}

startBtn.addEventListener('click',handleLaunch);

window.addEventListener('load',()=>{
  const s=getCssPlaneStart();
  setPlaneCenterPx(s.x,s.y);
  applyLanguage(currentLang);
  renderResultsList();
});
