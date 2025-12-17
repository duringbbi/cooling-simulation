(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  // 유로 기준(특허 설명): 30→120→111/115→110a→112→130→21→20→22→140→114→110b→113/116→150→41/42
  const steps = [
    { title:"STEP 1. 전체 개요 (도 1을 한 번 훑기)",
      one:"비상 상황에서, 냉각탑 대신 상수도 냉수를 써서 열교환기 순환을 유지합니다.",
      now:"<b>지금은:</b> 왼쪽은 ‘공급/헤더/배수’, 오른쪽은 ‘변압기 3대(예시)’입니다.",
      flow:{on:false,cold:false,hot:false,drain:false,gateOpen:false}
    },
    { title:"STEP 2. 유입: 상수도(30) → 120 → 입수구(111)",
      one:"냉수는 120을 타고 헤더(110)로 들어옵니다.",
      now:"<b>지금은:</b> 파란 라인 <b>120</b>만 따라가 보세요. (유입 조절은 115)",
      flow:{on:true,cold:["p120"],hot:false,drain:false,gateOpen:false}
    },
    { title:"STEP 3. 저장: 냉수 저장부(110a)에 먼저 모입니다",
      one:"들어온 냉수는 110a에 모였다가, 공급 포트(112)로 나갈 준비를 합니다.",
      now:"<b>지금은:</b> 110a(모이는 칸)만 기억하면 됩니다.",
      flow:{on:true,cold:["p120"],hot:false,drain:false,gateOpen:false}
    },
    { title:"STEP 4. 공급: 112 → 130 → 21 → 20",
      one:"110a의 냉수가 (예시) 3개 라인으로 열교환기(20)로 들어갑니다.",
      now:"<b>지금은:</b> 파란 라인 <b>130</b> = 헤더에서 열교환기로 가는 길입니다.",
      flow:{on:true,cold:["p130a","p130b","p130c"],hot:false,drain:false,gateOpen:false}
    },
    { title:"STEP 5. 열교환: 내부 코일(유로)에서 열을 주고받습니다",
      one:"냉수(21)가 열을 받고, 온수(22)로 나옵니다.",
      now:"<b>지금은:</b> 열교환기 안쪽(코일)만 노란색으로 ‘흐르게’ 보입니다.",
      flow:{on:true,cold:["p130a","p130b","p130c"],hot:["p140a","p140b","p140c"],drain:false,gateOpen:false}
    },
    { title:"STEP 6. 환수/저장: 140 → 114 → 온수 저장부(110b)",
      one:"따뜻해진 물은 140을 통해 헤더로 돌아와 110b에 모입니다.",
      now:"<b>지금은:</b> 노란 라인 <b>140</b>만 따라가고 110b(모이는 칸)를 확인하세요.",
      flow:{on:true,cold:false,hot:["p140a","p140b","p140c"],drain:false,gateOpen:false}
    },
    { title:"STEP 7. 배수/정리: 110b → 113/116 → 150 → 집수정(41)",
      one:"운전이 끝나면 물을 150으로 빼서 집수정으로 보낼 수 있습니다.",
      now:"<b>지금은:</b> 집수정(41) 수위가 ‘차오르는’ 것으로 배수를 직관적으로 보여줍니다.",
      flow:{on:true,cold:false,hot:false,drain:["p150"],gateOpen:true}
    }
  ];

  const stepPill = $("#stepPill");
  const modePill = $("#modePill");
  const bar = $("#bar");
  const prevBtn = $("#prevBtn");
  const nextBtn = $("#nextBtn");
  const playBtn = $("#playBtn");
  const resetBtn = $("#resetBtn");

  const stTitle = $("#stTitle");
  const stOne = $("#stOne");
  const stNow = $("#stNow");
  const miniList = $("#miniList");

  const svg = document.querySelector("svg");

  const p120 = $("#p120");
  const p130a = $("#p130a"), p130b = $("#p130b"), p130c = $("#p130c");
  const p140a = $("#p140a"), p140b = $("#p140b"), p140c = $("#p140c");
  const p150 = $("#p150");

  const gateState = $("#gateState");
  const v115 = $("#v115");
  const v116 = $("#v116");

  const tankCold = $("#tankCold");
  const tankHot = $("#tankHot");
  const pump42 = $("#pump42");

  const hxBoxes = Array.from(document.querySelectorAll("#bank rect.box")).slice(0,3);
  const coils = [$("#coil1"), $("#coil2"), $("#coil3")];

  const sumpWater = $("#sumpWater");
  const sumpSurface = $("#sumpSurface");

  const dots = {
    d120: $("#d120"),
    d130a: $("#d130a"), d130b: $("#d130b"), d130c: $("#d130c"),
    d140a: $("#d140a"), d140b: $("#d140b"), d140c: $("#d140c"),
    d150: $("#d150")
  };

  const tip = $("#tip");
  const tipTitle = $("#tipTitle");
  const tipDesc = $("#tipDesc");
  const tipMeta = $("#tipMeta");

  let step = 0;
  let playing = false;
  let timer = null;
  let raf = null;
  let t0 = 0;

  // STEP 7: “차오름” 타이밍 기준
  let stepChangedAtSec = 0;

  const allPipes = [p120,p130a,p130b,p130c,p140a,p140b,p140c,p150];

  const SUMP = { x:86, y:454, w:68, h:40, pad:3 };

  function initDimTargets(){
    const targets = $$("svg .box, svg .box2, svg .pipe, svg .node, svg .valve, svg .coil, svg text.label, svg text.sublabel");
    targets.forEach(el => el.classList.add("dimTarget"));
    $$(".frame").forEach(el => el.classList.remove("dimTarget"));
  }
  function clearFocus(){ $$(".dimTarget.focus", svg).forEach(el => el.classList.remove("focus")); }
  function focusByIds(ids){
    ids.forEach(id=>{
      const el = $("#"+id);
      if(el) el.classList.add("focus");
    });
  }
  function focusBySelectors(selectors){
    selectors.forEach(sel=>{
      $$(sel, svg).forEach(el => el.classList.add("focus"));
    });
  }

  function applyDimmingForStep(){
    clearFocus();
    if(step === 0){
      document.body.classList.remove("dimOn");
      return;
    }
    document.body.classList.add("dimOn");

    if(step === 1){
      focusByIds(["n31","n111","v115","p120","d120"]);
      focusBySelectors(["#tap *", "#header *"]);
    } else if(step === 2){
      focusByIds(["n111","v115","tankCold","p120","d120"]);
      focusBySelectors(["#header *", "#tap *"]);
    } else if(step === 3){
      focusByIds(["tankCold","n112a","n112b","n112c","p130a","p130b","p130c","d130a","d130b","d130c","hx1in"]);
      focusBySelectors(["#header *", "#ports112 *", "#bank *"]);
    } else if(step === 4){
      focusByIds(["p130a","p130b","p130c","p140a","p140b","p140c","d130a","d130b","d130c","d140a","d140b","d140c","coil1","coil2","coil3","hx1in","hx1out"]);
      focusBySelectors(["#bank *", "#ports112 *", "#ports114 *", "#header *"]);
    } else if(step === 5){
      focusByIds(["p140a","p140b","p140c","d140a","d140b","d140c","tankHot","n114a","n114b","n114c","hx1out"]);
      focusBySelectors(["#header *", "#ports114 *", "#bank *"]);
    } else if(step === 6){
      focusByIds(["p150","d150","n113","v116","n41in","sump41Body","sumpWater","sumpSurface","pump42"]);
      focusBySelectors(["#header *", "#pumpRoom *"]);
    }
  }

  function resetPipes(){
    allPipes.forEach(p=>{
      p.classList.remove("cold","hot","drain","dash");
      p.classList.add("pipe");
    });
    v115.style.stroke = "rgba(255,255,255,.18)";
    v116.style.stroke = "rgba(255,255,255,.18)";
  }

  function resetSumpWater(){
    if(!sumpWater || !sumpSurface) return;
    sumpWater.classList.remove("waterOn");
    sumpSurface.classList.remove("waterSurfaceOn");
    sumpWater.setAttribute("y", String(SUMP.y + SUMP.h));
    sumpWater.setAttribute("height", "0");
    sumpSurface.setAttribute("y1", String(SUMP.y + SUMP.h));
    sumpSurface.setAttribute("y2", String(SUMP.y + SUMP.h));
    sumpSurface.style.opacity = "";
  }

  function resetCoils(){ coils.forEach(c=>{ if(c) c.classList.remove("coilFlow"); }); }

  function resetEmphasis(){
    document.body.classList.remove("overview-lite");

    if(tankCold) tankCold.classList.remove("tank-cold-active","glow-cold","glow-hot","glow-drain");
    if(tankHot)  tankHot.classList.remove("tank-hot-active","glow-cold","glow-hot","glow-drain");

    ["n111","v115","n113","v116","n41in"].forEach(id=>{
      const el = $("#"+id);
      if(el) el.classList.remove("glow-cold","glow-hot","glow-drain");
    });
    ["n112a","n112b","n112c","n114a","n114b","n114c"].forEach(id=>{
      const el = $("#"+id);
      if(el) el.classList.remove("glow-cold","glow-hot","glow-drain");
    });

    hxBoxes.forEach(b=>b.classList.remove("hx-heat"));
    if(pump42) pump42.classList.remove("pump-run");

    resetCoils();
    resetSumpWater();
  }

  function setGate(open){
    gateState.classList.toggle("gateOn", open);
    if(open){
      gateState.setAttribute("x1","330"); gateState.setAttribute("y1","294");
      gateState.setAttribute("x2","330"); gateState.setAttribute("y2","314");
    }else{
      gateState.setAttribute("x1","316"); gateState.setAttribute("y1","296");
      gateState.setAttribute("x2","344"); gateState.setAttribute("y2","312");
    }
  }

  function applyFlow(f){
    resetPipes();
    resetEmphasis();

    svg.classList.remove("flowing");
    if(!f.on){
      stopAnim();
      setGate(false);
      if(step === 0) document.body.classList.add("overview-lite");
      return;
    }

    svg.classList.add("flowing");
    startAnim();

    if(f.cold){
      f.cold.forEach(id=>{ const p=$("#"+id); if(p) p.classList.add("cold","dash"); });
      v115.style.stroke = "rgba(99,179,255,.65)";
    }
    if(f.hot){
      f.hot.forEach(id=>{ const p=$("#"+id); if(p) p.classList.add("hot","dash"); });
    }
    if(f.drain){
      f.drain.forEach(id=>{ const p=$("#"+id); if(p) p.classList.add("drain","dash"); });
      v116.style.stroke = "rgba(110,231,183,.65)";
    }

    setGate(!!f.gateOpen);

    if(step === 1 || step === 2){
      const n111 = $("#n111");
      if(n111) n111.classList.add("glow-cold");
      if(v115) v115.classList.add("glow-cold");
    }
    if(step === 2 && tankCold){
      tankCold.classList.add("tank-cold-active","glow-cold");
    }
    if(step === 3){
      ["n112a","n112b","n112c"].forEach(id=>{ const el=$("#"+id); if(el) el.classList.add("glow-cold"); });
    }

    if(step === 4){
      hxBoxes.forEach(b=>b.classList.add("hx-heat"));
      coils.forEach(c=>{ if(c) c.classList.add("coilFlow"); });
    }

    if(step === 5){
      if(tankHot) tankHot.classList.add("tank-hot-active","glow-hot");
      ["n114a","n114b","n114c"].forEach(id=>{ const el=$("#"+id); if(el) el.classList.add("glow-hot"); });
    }

    if(step === 6){
      const n113 = $("#n113");
      const n41in = $("#n41in");
      if(n113) n113.classList.add("glow-drain");
      if(v116) v116.classList.add("glow-drain");
      if(n41in) n41in.classList.add("glow-drain");
      if(pump42) pump42.classList.add("pump-run");
      if(sumpWater && sumpSurface){
        sumpWater.classList.add("waterOn");
        sumpSurface.classList.add("waterSurfaceOn");
      }
    }
  }

  function startAnim(){ if(raf) return; t0=0; raf=requestAnimationFrame(animate); }
  function stopAnim(){ if(!raf) return; cancelAnimationFrame(raf); raf=null; }

  function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }

  function animate(ts){
    if(!t0) t0 = ts;
    const t = (ts - t0)/1000;
    const sp = 1.1;

    dots.d120.setAttribute("cy", 150 + ((t*80*sp)%60));
    dots.d130a.setAttribute("cx", 450 + ((t*120*sp)%80));
    dots.d130b.setAttribute("cx", 460 + ((t*120*sp+20)%80));
    dots.d130c.setAttribute("cx", 470 + ((t*120*sp+40)%80));
    dots.d140a.setAttribute("cx", 860 - ((t*120*sp)%120));
    dots.d140b.setAttribute("cx", 860 - ((t*120*sp+25)%120));
    dots.d140c.setAttribute("cx", 860 - ((t*120*sp+50)%120));
    dots.d150.setAttribute("cx", 210 - ((t*70*sp)%50));

    // STEP 7: “차오르는 효과만” (가득 차면 유지)
    if(step === 6 && sumpWater && sumpSurface){
      const maxH = SUMP.h - SUMP.pad*2;
      const minH = 2;

      const elapsed = Math.max(0, t - stepChangedAtSec);
      const fillSeconds = 3.0;
      const k = Math.min(1, elapsed / fillSeconds);
      const level01 = 0.15 + 0.85 * easeOutCubic(k);

      const h = Math.max(minH, Math.min(maxH, level01 * maxH));
      const y = SUMP.y + SUMP.h - SUMP.pad - h;

      sumpWater.setAttribute("x", String(SUMP.x + SUMP.pad));
      sumpWater.setAttribute("width", String(SUMP.w - SUMP.pad*2));
      sumpWater.setAttribute("y", String(y));
      sumpWater.setAttribute("height", String(h));

      const surfY = y;
      sumpSurface.setAttribute("x1", String(SUMP.x + SUMP.pad + 2));
      sumpSurface.setAttribute("x2", String(SUMP.x + SUMP.w - SUMP.pad - 2));
      sumpSurface.setAttribute("y1", String(surfY));
      sumpSurface.setAttribute("y2", String(surfY));

      const shimmer = 0.78 + 0.22 * Math.abs(Math.sin(t*2.2));
      sumpSurface.style.opacity = String(shimmer);
    }

    raf = requestAnimationFrame(animate);
  }

  function renderMiniList(){
    miniList.innerHTML = "";
    steps.forEach((s, i)=>{
      const li = document.createElement("li");
      li.className = "miniItem" + (i===step ? " active" : "");
      li.setAttribute("role","button");
      li.setAttribute("tabindex","0");
      li.innerHTML = `
        <div class="miniNum">${i+1}</div>
        <div class="miniTxt">
          <strong>${s.title.replace(/^STEP \\d+\\.\\s?/,'')}</strong>
          <span>${s.one}</span>
        </div>
      `;
      li.addEventListener("click", ()=>{ step=i; setPlaying(false); markStepChange(); render(); });
      li.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); li.click(); } });
      miniList.appendChild(li);
    });
  }

  function markStepChange(){
    if(!t0){ stepChangedAtSec = 0; return; }
    const now = performance.now();
    stepChangedAtSec = (now - t0)/1000;
  }

  function render(){
    const s = steps[step];
    stepPill.textContent = `STEP ${step+1} / ${steps.length}`;
    modePill.textContent = playing ? "재생 중" : "정지";
    bar.style.width = `${Math.round(((step+1)/steps.length)*100)}%`;

    stTitle.textContent = s.title;
    stOne.textContent = s.one;
    stNow.innerHTML = s.now;

    prevBtn.disabled = (step===0);
    nextBtn.disabled = (step===steps.length-1);

    applyFlow(s.flow);
    applyDimmingForStep();
    renderMiniList();
  }

  function setPlaying(on){
    playing = on;
    modePill.textContent = playing ? "재생 중" : "정지";
    playBtn.textContent = playing ? "일시정지" : "자동재생";
    if(playing){
      timer = setInterval(()=>{
        if(step < steps.length-1){
          step++;
          markStepChange();
          render();
        } else {
          setPlaying(false);
        }
      }, 2600);
    } else {
      clearInterval(timer); timer=null;
    }
  }

  prevBtn.addEventListener("click", ()=>{ if(step>0){ step--; setPlaying(false); markStepChange(); render(); } });
  nextBtn.addEventListener("click", ()=>{ if(step<steps.length-1){ step++; setPlaying(false); markStepChange(); render(); } });
  playBtn.addEventListener("click", ()=> setPlaying(!playing));
  resetBtn.addEventListener("click", ()=>{ setPlaying(false); step=0; markStepChange(); render(); });

  function showTip(x,y,title,desc,metaCsv){
    tipTitle.textContent = title || "구성요소";
    tipDesc.textContent = desc || "";
    tipMeta.innerHTML = "";
    (metaCsv||"").split(",").map(s=>s.trim()).filter(Boolean).forEach(m=>{
      const span = document.createElement("span");
      span.className="chip";
      span.textContent=m;
      tipMeta.appendChild(span);
    });

    tip.style.display="block";

    // v6.2: 모바일에서는 bottom-sheet 고정(좌표 계산 생략)
    const isMobile = window.matchMedia("(max-width: 820px)").matches;
    if(isMobile) return;

    const pad=14;
    const rect=tip.getBoundingClientRect();
    let left=x+12, top=y+12;
    if(left+rect.width+pad>window.innerWidth) left=x-rect.width-12;
    if(top+rect.height+pad>window.innerHeight) top=y-rect.height-12;
    tip.style.left=`${Math.max(pad,left)}px`;
    tip.style.top =`${Math.max(pad,top)}px`;
  }
  function hideTip(){ tip.style.display="none"; }

  svg.addEventListener("click",(e)=>{
    const t = e.target.closest(".hotspot");
    if(!t){ hideTip(); return; }
    showTip(e.clientX,e.clientY, t.getAttribute("data-tip"), t.getAttribute("data-desc"), t.getAttribute("data-meta"));
  });

  window.addEventListener("click",(e)=>{
    if(e.target.closest("#tip")) return;
    if(e.target.closest("svg .hotspot")) return;
    hideTip();
  });

  window.addEventListener("keydown",(e)=>{
    if(e.key==="Escape") hideTip();
    if(e.key==="ArrowLeft"){ e.preventDefault(); prevBtn.click(); }
    if(e.key==="ArrowRight"){ e.preventDefault(); nextBtn.click(); }
    if(e.key===" "){ e.preventDefault(); playBtn.click(); }
// ===== v6.2.1: 모바일 스와이프(좌/우)로 STEP 이동 =====
  // - 좌 스와이프: 다음 STEP
  // - 우 스와이프: 이전 STEP
  // - 스크롤(세로) 의도는 방해하지 않음
  (() => {
    const isMobile = () => window.matchMedia("(max-width: 820px)").matches;

    let sx = 0, sy = 0, st = 0;
    let tracking = false;

    // 민감도(필요시 조절)
    const MIN_X = 45;     // 좌우 이동 최소 픽셀
    const MAX_Y = 60;     // 세로 움직임이 이보다 크면 스와이프 취소(스크롤 우선)
    const MAX_MS = 700;   // 너무 느린 제스처는 무시(스크롤/드래그 오인 방지)

    // 스와이프 대상 영역: SVG + 좌측 카드 본문
    // (우측 리스트에서 스크롤/탭을 방해하지 않도록 제한)
    const swipeZone = document.querySelector("section.card .bd");

    if(!swipeZone) return;

    swipeZone.addEventListener("touchstart", (e) => {
      if(!isMobile()) return;
      if(!e.touches || e.touches.length !== 1) return;

      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      st = performance.now();
      tracking = true;
    }, {passive:true});

    swipeZone.addEventListener("touchmove", (e) => {
      if(!tracking) return;
      if(!e.touches || e.touches.length !== 1) return;

      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      // 세로 스크롤 의도가 강하면 스와이프 추적 종료
      if(Math.abs(dy) > MAX_Y && Math.abs(dy) > Math.abs(dx)){
        tracking = false;
      }
    }, {passive:true});

    swipeZone.addEventListener("touchend", (e) => {
      if(!tracking) return;
      tracking = false;

      const dt = performance.now() - st;
      if(dt > MAX_MS) return;

      const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      if(!t) return;

      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      // 세로 이동이 크면 무시(스크롤 우선)
      if(Math.abs(dy) > MAX_Y) return;

      // 좌우 이동이 충분할 때만 인정
      if(Math.abs(dx) < MIN_X) return;

      // 툴팁(하단 시트)이 열려 있으면 스와이프로 단계가 바뀌지 않게(혼선 방지)
      if(tip && tip.style.display === "block") return;

      // 좌 스와이프 = 다음, 우 스와이프 = 이전
      if(dx < 0){
        if(step < steps.length - 1){
          step++;
          setPlaying(false);
          markStepChange();
          render();
        }
      } else {
        if(step > 0){
          step--;
          setPlaying(false);
          markStepChange();
          render();
        }
      }
    }, {passive:true});
  })();
  });

  initDimTargets();
  markStepChange();
  render();
})();
