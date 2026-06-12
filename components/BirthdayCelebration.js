// components/BirthdayCelebration.js
import React, { useEffect, useRef, useState } from "react";

const CC = [
  "#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6BFF","#FF9F43",
  "#A29BFE","#FD79A8","#FDCB6E","#00CEC9","#FFD700","#FF4500",
  "#7FFFD4","#FF69B4","#FFFFFF","#FF3E96","#00FFFF","#ADFF2F",
];

/* ══════════════════════════════════════════════════════════════════════
   CANVAS — confetti + fireworks + stars (transparent bg)
══════════════════════════════════════════════════════════════════════ */
function ConfettiCanvas({ show }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!show || typeof window === "undefined") return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let W, H, pieces, stars, sparks = [];

    const init = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      pieces = Array.from({ length: 280 }, () => ({
        x: Math.random() * W, y: -Math.random() * H * 2,
        w: 7 + Math.random() * 13, h: 4 + Math.random() * 8,
        color: CC[Math.floor(Math.random() * CC.length)],
        vx: (Math.random()-0.5)*3, vy: 2+Math.random()*5,
        rot: Math.random()*Math.PI*2, rSpd: (Math.random()-0.5)*0.18,
        swing: Math.random()*Math.PI*2, swSpd: 0.02+Math.random()*0.04,
        shape: ["rect","rect","circle","ribbon"][Math.floor(Math.random()*4)],
        alpha: 0.7+Math.random()*0.3,
      }));
      stars = Array.from({ length: 45 }, () => ({
        x: Math.random()*W, y: Math.random()*H,
        sz: 1.5+Math.random()*4, phase: Math.random()*Math.PI*2, spd: 0.03+Math.random()*0.06,
      }));
    };
    init();
    window.addEventListener("resize", init);

    const HUES = [45,52,195,270,320,12,160,30,280,0];
    const launch = () => {
      const x=40+Math.random()*(W-80), y=20+Math.random()*(H*.5);
      const hue=HUES[Math.floor(Math.random()*HUES.length)];
      const n=100+Math.floor(Math.random()*80);
      for(let i=0;i<n;i++){
        const a=(i/n)*Math.PI*2+(Math.random()-.5)*.3, s=2+Math.random()*8;
        sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:0.007+Math.random()*.013,size:2+Math.random()*4.5,color:`hsl(${hue+(Math.random()-.5)*30},100%,${55+Math.random()*35}%)`,glow:Math.random()>.3});
      }
    };
    launch();
    const fw=setInterval(launch,900);

    let raf;
    const tick=()=>{
      ctx.clearRect(0,0,W,H);
      pieces.forEach(c=>{
        c.swing+=c.swSpd;c.x+=c.vx+Math.sin(c.swing)*1.2;c.y+=c.vy;c.rot+=c.rSpd;
        if(c.y>H+30){c.y=-20-Math.random()*100;c.x=Math.random()*W;}
        if(c.x<-30)c.x=W+10;if(c.x>W+30)c.x=-10;
        ctx.save();ctx.globalAlpha=c.alpha;ctx.translate(c.x,c.y);ctx.rotate(c.rot);ctx.fillStyle=c.color;
        if(c.shape==="circle"){ctx.beginPath();ctx.ellipse(0,0,c.w/2,c.h*.5,0,0,Math.PI*2);ctx.fill();}
        else if(c.shape==="ribbon"){ctx.fillRect(-c.w*.15,-c.h*.7,c.w*.3,c.h*1.4);}
        else{ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);}
        ctx.restore();
      });
      for(let i=sparks.length-1;i>=0;i--){
        const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vy+=0.06;s.vx*=0.98;s.vy*=0.98;s.life-=s.decay;
        if(s.life<=0){sparks.splice(i,1);continue;}
        ctx.save();ctx.globalAlpha=Math.max(0,s.life);
        if(s.glow){ctx.shadowColor=s.color;ctx.shadowBlur=14;}
        ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.life,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      stars.forEach(t=>{
        t.phase+=t.spd;const a=(Math.sin(t.phase)+1)/2;const s=t.sz*(0.4+a*0.6);
        ctx.save();ctx.globalAlpha=a*.9;ctx.fillStyle="#FFD700";ctx.shadowColor="#FFD700";ctx.shadowBlur=10;
        ctx.beginPath();ctx.moveTo(t.x,t.y-s*2.2);ctx.lineTo(t.x+s*.45,t.y-s*.45);ctx.lineTo(t.x+s*2.2,t.y);ctx.lineTo(t.x+s*.45,t.y+s*.45);ctx.lineTo(t.x,t.y+s*2.2);ctx.lineTo(t.x-s*.45,t.y+s*.45);ctx.lineTo(t.x-s*2.2,t.y);ctx.lineTo(t.x-s*.45,t.y-s*.45);ctx.closePath();ctx.fill();ctx.restore();
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    return()=>{cancelAnimationFrame(raf);clearInterval(fw);window.removeEventListener("resize",init);};
  },[show]);
  if(!show) return null;
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:9996,pointerEvents:"none"}}/>;
}

/* ══════════════════════════════════════════════════════════════════════
   TEXT BALLOONS — "Happy Birthday [Name]" written on balloon shapes
   that float from bottom to top across the full screen
══════════════════════════════════════════════════════════════════════ */
const BALLOON_COLORS = [
  { body:"#FF4D6D", shine:"#FF8FA3", text:"#fff" },
  { body:"#4361EE", shine:"#7289FA", text:"#fff" },
  { body:"#F72585", shine:"#FF70A6", text:"#fff" },
  { body:"#7B2D8B", shine:"#B45FCF", text:"#fff" },
  { body:"#2DC653", shine:"#5FE084", text:"#fff" },
  { body:"#FF9F1C", shine:"#FFCF77", text:"#fff" },
  { body:"#E63946", shine:"#FF7285", text:"#fff" },
  { body:"#3A86FF", shine:"#74ADFF", text:"#fff" },
];

function TextBalloonItem({ name, colorIdx, left, delay, duration, sway }) {
  const c = BALLOON_COLORS[colorIdx % BALLOON_COLORS.length];
  return (
    <div style={{
      position:"fixed", bottom:-260, left:`${left}%`,
      zIndex:9999, pointerEvents:"none", userSelect:"none",
      animation:`bdayTxtBalloon ${duration}s ${delay}s ease-in-out infinite both`,
      "--bx":`${sway}px`,
    }}>
      {/* balloon body */}
      <div style={{
        width:130, height:152,
        background:`radial-gradient(circle at 32% 30%, ${c.shine} 0%, ${c.body} 55%, color-mix(in srgb,${c.body},#000 30%) 100%)`,
        borderRadius:"50% 50% 50% 50% / 58% 58% 42% 42%",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        color:c.text, position:"relative", overflow:"hidden",
        boxShadow:`0 8px 30px rgba(0,0,0,.35), inset 0 -6px 20px rgba(0,0,0,.2)`,
        padding:"0 10px",
      }}>
        {/* shine */}
        <div style={{
          position:"absolute", top:16, left:20, width:34, height:46,
          background:"rgba(255,255,255,.28)", borderRadius:"50%",
          transform:"rotate(-25deg)", pointerEvents:"none",
        }}/>
        <div style={{fontSize:11,fontWeight:900,letterSpacing:".08em",textTransform:"uppercase",opacity:.85,marginBottom:2}}>Happy</div>
        <div style={{fontSize:13,fontWeight:900,letterSpacing:".04em",textTransform:"uppercase",marginBottom:4}}>Birthday</div>
        <div style={{
          fontSize:name.length>10?10:12, fontWeight:800, textAlign:"center",
          lineHeight:1.2, maxWidth:100,
          textShadow:"0 1px 4px rgba(0,0,0,.5)",
        }}>{name}!</div>
      </div>
      {/* knot */}
      <div style={{width:8,height:8,background:c.body,borderRadius:"50%",margin:"0 auto -1px"}}/>
      {/* string */}
      <svg width="20" height="55" viewBox="0 0 20 55" style={{display:"block",margin:"0 auto"}}>
        <path d="M10 0 Q 18 14 10 28 Q 2 42 10 55" stroke={c.body} strokeWidth="1.5" fill="none" opacity=".7"/>
      </svg>
    </div>
  );
}

function TextBalloons({ show, names }) {
  if (!show) return null;

  // generate slots: each name gets 3-4 balloon instances at different positions
  const slots = [];
  const positions = [5,14,23,32,41,50,59,68,77,86,94];
  const durations = [10,12,11,13,9.5,11.5,10.5,12.5,9,11];
  const delays    = [0,.8,1.6,2.4,3.2,.4,1.2,2.0,2.8,3.6,.2];

  positions.forEach((left, i) => {
    const nameIdx = i % names.length;
    slots.push({
      name:     names[nameIdx],
      colorIdx: i,
      left,
      delay:    delays[i % delays.length],
      duration: durations[i % durations.length],
      sway:     (i % 2 === 0 ? 1 : -1) * (10 + i * 3),
    });
  });

  return (
    <>
      <style>{`
        @keyframes bdayTxtBalloon{
          0%  {transform:translateY(0) rotate(-6deg);opacity:0}
          4%  {opacity:1}
          48% {transform:translateY(-120vh) rotate(6deg) translateX(var(--bx));opacity:1}
          92% {opacity:.7}
          100%{transform:translateY(-135vh) rotate(-4deg) translateX(var(--bx));opacity:0}
        }
      `}</style>
      {slots.map((s,i)=>(
        <TextBalloonItem key={i} {...s}/>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PLAIN BALLOONS — extra 🎈 rising behind the text balloons
══════════════════════════════════════════════════════════════════════ */
const PB_POS=[3,8,17,25,35,44,53,62,70,79,88,96];
const PB_DEL=[0,.6,1.2,.2,1.8,.9,1.5,.3,2.1,.7,1.3,2.5];
const PB_DUR=[8,10,7,11,9,8.5,10.5,7.5,9.5,11.5,8,10];
const PB_SIZ=[28,38,24,44,32,36,26,40,30,38,34,22];

function PlainBalloons({ show }) {
  if (!show) return null;
  return (
    <>
      <style>{`
        @keyframes bdayPB{
          0%  {transform:translateY(115vh) rotate(-8deg);opacity:0}
          4%  {opacity:.9}
          50% {transform:translateY(30vh) rotate(8deg) translateX(var(--pbx));opacity:.9}
          96% {opacity:.4}
          100%{transform:translateY(-150px) rotate(-5deg) translateX(var(--pbx));opacity:0}
        }
        .bday-pb{position:fixed;bottom:-30px;z-index:9998;animation:bdayPB ease-in-out infinite both;pointer-events:none;user-select:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.3));}
      `}</style>
      {PB_POS.map((p,i)=>(
        <div key={i} className="bday-pb"
          style={{left:`${p}%`,fontSize:PB_SIZ[i],animationDuration:`${PB_DUR[i]}s`,animationDelay:`${PB_DEL[i]}s`,"--pbx":`${(i%2===0?1:-1)*(8+i*2)}px`}}>
          🎈
        </div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STICKERS — floating birthday emoji at edges
══════════════════════════════════════════════════════════════════════ */
const STICKERS=[
  {e:"🎂",top:5, left:4, sz:60,dur:4.0,del:0  },
  {e:"🎉",top:8, left:88,sz:64,dur:3.5,del:.5 },
  {e:"🥳",top:74,left:2, sz:58,dur:4.5,del:.8 },
  {e:"🎊",top:76,left:91,sz:62,dur:3.8,del:.3 },
  {e:"✨",top:86,left:50,sz:48,dur:3.4,del:.4 },
  {e:"🎆",top:50,left:94,sz:56,dur:4.2,del:.2 },
  {e:"🌟",top:32,left:5, sz:46,dur:4.3,del:1.1},
  {e:"💫",top:60,left:77,sz:50,dur:3.6,del:.6 },
];
function FloatingStickers({ show }) {
  if (!show) return null;
  return (
    <>
      <style>{`
        @keyframes bdayStk{0%{transform:translateY(0) rotate(-12deg) scale(1)}25%{transform:translateY(-22px) rotate(10deg) scale(1.12)}50%{transform:translateY(-8px) rotate(-6deg) scale(.95)}75%{transform:translateY(-18px) rotate(9deg) scale(1.08)}100%{transform:translateY(0) rotate(-12deg) scale(1)}}
        .bday-stk{position:fixed;z-index:10000;pointer-events:none;user-select:none;animation:bdayStk ease-in-out infinite both;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4));line-height:1;}
      `}</style>
      {STICKERS.map((s,i)=>(
        <div key={i} className="bday-stk" style={{top:`${s.top}%`,left:`${s.left}%`,fontSize:s.sz,animationDuration:`${s.dur}s`,animationDelay:`${s.del}s`}}>{s.e}</div>
      ))}
    </>
  );
}

/* close button */
function CloseBtn({ onClick }) {
  const [h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{position:"fixed",top:16,right:20,zIndex:10001,background:"rgba(0,0,0,.35)",border:"1.5px solid rgba(255,255,255,.25)",backdropFilter:"blur(6px)",color:"#fff",borderRadius:"50%",width:42,height:42,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",transform:h?"scale(1.12)":"scale(1)",transition:"transform .15s"}}>
      ✕
    </button>
  );
}


const trim=(f,l)=>`${f||""} ${l||""}`.trim();

/* ══════════════════════════════════════════════════════════════════════
   SELF BIRTHDAY
══════════════════════════════════════════════════════════════════════ */
function SelfBirthday({ employee }) {
  const [out,setOut]=useState(false);
  if(out) return null;
  const name=trim(employee?.firstName,employee?.lastName);
  return(
    <>
      <ConfettiCanvas show/>
      <TextBalloons show names={[name]}/>
      <PlainBalloons show/>
      <FloatingStickers show/>
      <CloseBtn onClick={()=>setOut(true)}/>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TEAM BIRTHDAY
══════════════════════════════════════════════════════════════════════ */
function TeamBirthday({ birthdays }) {
  const [out,setOut]=useState(false);
  if(out||!birthdays.length) return null;
  const names=birthdays.map(b=>trim(b.firstName,b.lastName));
  return(
    <>
      <ConfettiCanvas show/>
      <TextBalloons show names={names}/>
      <PlainBalloons show/>
      <FloatingStickers show/>
      <CloseBtn onClick={()=>setOut(true)}/>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main export
══════════════════════════════════════════════════════════════════════ */
export default function BirthdayCelebration({ mode="team", employee, birthdays=[] }) {
  if(mode==="self"&&employee)         return <SelfBirthday employee={employee}/>;
  if(mode==="team"&&birthdays.length) return <TeamBirthday birthdays={birthdays}/>;
  return null;
}
