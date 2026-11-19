(() => {
  'use strict';
  const canvas = document.querySelector('#web-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = (n, dt) => 1 - Math.exp(-n * dt);
  const smooth = t => t * t * (3 - 2 * t);
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const makeCanvas = (w, h = w) => Object.assign(document.createElement('canvas'), {width: w, height: h});
  const loadImage = src => new Promise(resolve => {
    const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src;
  });
  const silk = new window.FoundSilk();
  let sleepInk = '#fff';
  const updatePalette = () => {
    const light = document.documentElement.dataset.theme === 'silver';
    silk.setPalette(light);sleepInk = light ? '#252a33' : '#fff';
  };
  updatePalette();document.addEventListener('found:theme',updatePalette);
  const coarse = matchMedia('(hover:none) and (pointer:coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let W = innerWidth, H = innerHeight, DPR = 1, K = .196, scale = 1, flySize = 1;
  let lastTime = 0, clock = 0, lastMoved = 0, nudgeSample = 0, suspended = false;
  const diagnostics = new URLSearchParams(location.search).has('qa');
  const pointer = {x: W * .61, y: H * .57, active: !coarse, hidden: false};
  const spider = {
    x: W / 2, y: -140, heading: PI / 2, vx: 0, vy: 0, z: 0,
    size: 1.63, speed: 0, intro: true, introDone: false, jump: null,
    height: 0, land: 0, qt: 0, sleep: 0, quiet: 0, breathe: 0,
    blinkAt: 1.5, blinkTime: -10, blinkSecond: false, frameCount: 0, jumps: 0, wakeHops: 0
  };
  const fly = {x: pointer.x, y: pointer.y, angle: 0, landed: 0, opacity: 1,
    caught: 0, caughtFor: 0, recoil: 0, cocoon: 0, releaseX: 0, releaseY: 0, captures: 0, releases: 0};
  let rig = null, flyRig = null, idle = null, idleSamples = [];
  const eyes = [[139,158,12.5],[170,158,12.5],[117.5,151.2,5.2],[190.7,151.2,5.2],[108.8,153.6,3.2],[199.8,153.6,3.2]];
  const legs = [];
  const limbPoints = [
    [[470,760],[370,830],[400,1160]],
    [[460,665],[300,690],[100,955]],
    [[480,605],[370,580],[55,475]],
    [[490,560],[360,420],[410,52]]
  ];
  // The source photographs were not included with the brief. These photo-space
  // landmarks register the replacement cut-out to the specified 1254-unit rig;
  // kinematic dimensions and world motion continue to use limbPoints above.
  const photoLimbs = [
    [[490,820],[390,900],[365,1220]],
    [[465,755],[260,750],[70,1000]],
    [[470,650],[310,600],[45,490]],
    [[475,570],[330,470],[335,50]]
  ];
  const scratch = makeCanvas(640), sctx = scratch.getContext('2d');
  const toBody = p => ({x:p[1]-600,y:-(p[0]-627)});
  const world = (p, tuck = 1) => {
    const co = Math.cos(spider.heading), si = Math.sin(spider.heading);
    return {x: spider.x + (p.x*co-p.y*si)*K*tuck, y:spider.y+(p.x*si+p.y*co)*K*tuck};
  };

  function createRig(photo) {
    const raw = makeCanvas(photo.width, photo.height), rc = raw.getContext('2d', {willReadFrequently:true});
    rc.drawImage(photo,0,0);
    const pixels = rc.getImageData(0,0,raw.width,raw.height).data, q = raw.width/1254;
    const masked = (ellipses, mapping) => {
      const out = makeCanvas(raw.width,raw.height), c = out.getContext('2d');
      c.drawImage(raw,0,0); c.globalCompositeOperation='destination-in';
      const mask=makeCanvas(raw.width,raw.height), m=mask.getContext('2d');
      m.filter=`blur(${2*q}px)`; m.fillStyle='#000';
      ellipses.forEach(([x,y,rx,ry])=>{m.beginPath();m.ellipse(x*q,y*q,rx*q,ry*q,0,0,TAU);m.fill();});
      c.drawImage(mask,0,0);
      if(!mapping)return out;
      const registered=makeCanvas(raw.width,raw.height),r=registered.getContext('2d');
      r.setTransform(mapping[0],0,0,mapping[1],mapping[2]*q,mapping[3]*q);r.drawImage(out,0,0);return registered;
    };
    const sample = (x,y,k) => {
      x=clamp(x*q,0,raw.width-1.001); y=clamp(y*q,0,raw.height-1.001);
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*raw.width+ix)*4+k;
      return mix(mix(pixels[i],pixels[i+4],fx),mix(pixels[i+raw.width*4],pixels[i+raw.width*4+4],fx),fy);
    };
    for(let side=0;side<2;side++)for(let li=0;li<4;li++){
      const p=photoLimbs[li].map(v=>[side?1254-v[0]:v[0],v[1]]);
      const canonical=limbPoints[li].map(v=>[side?1254-v[0]:v[0],v[1]]);
      const len1=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]);
      const len2=Math.hypot(p[2][0]-p[1][0],p[2][1]-p[1][1]), len=len1+len2;
      const strip=makeCanvas(92,Math.ceil(len)), c=strip.getContext('2d'), data=c.createImageData(strip.width,strip.height);
      for(let y=0;y<strip.height;y++){
        const second=y>len1, a=p[second?1:0], b=p[second?2:1], t=second?(y-len1)/len2:y/len1;
        const theta=Math.atan2(b[1]-a[1],b[0]-a[0]);
        for(let x=0;x<92;x++){
          const off=x-46,sx=mix(a[0],b[0],t)-Math.sin(theta)*off,sy=mix(a[1],b[1],t)+Math.cos(theta)*off;
          const idx=(y*92+x)*4;
          for(let k=0;k<3;k++)data.data[idx+k]=sample(sx,sy,k);
          data.data[idx+3]=sample(sx,sy,3)*clamp((1-Math.abs(off)/46)/.28,0,1);
        }
      }
      c.putImageData(data,0,0);
      const hip=toBody(canonical[0]), rest=toBody(canonical[2]);
      const a=Math.hypot(canonical[1][0]-canonical[0][0],canonical[1][1]-canonical[0][1]);
      const b=Math.hypot(canonical[2][0]-canonical[1][0],canonical[2][1]-canonical[1][1]);
      const factor=Math.max(1,1.15*Math.hypot(rest.x-hip.x,rest.y-hip.y)/(a+b));
      legs.push({side,li,hip,rest,a:a*factor,b:b*factor,split:len1,strip,
        group:(li+(side?0:1))%2,foot:world(rest),from:world(rest),to:world(rest),stepping:false,t:0,duration:.15});
    }
    return {abdomen:masked([[628,365,230,250]],[220/230,205/250,628*(1-220/230),345-365*205/250]),
      head:masked([[630,800,172,205],[535,1020,80,100],[722,1020,80,100]],[1,.8,0,40])};
  }

  function createFly(photo) {
    const w=photo.width,h=photo.height,q=w/920;
    const poly=[[380,311],[337,353],[234,488],[142,622],[54,764],[34,830],[69,853],[169,810],[253,734],[322,645],[372,515],[402,396]];
    const body=makeCanvas(w,h),bc=body.getContext('2d');bc.drawImage(photo,0,0);
    const wings=[0,1].map(side=>{
      const out=makeCanvas(w,h),c=out.getContext('2d');
      c.beginPath();poly.forEach(([x,y],i)=>c[i?'lineTo':'moveTo']((side?920-x:x)*q,y*q));c.closePath();c.clip();c.drawImage(photo,0,0);
      bc.save();bc.globalCompositeOperation='destination-out';bc.drawImage(out,0,0);bc.restore();return out;
    });
    return {body,wings};
  }

  const nudges=[];
  function collectNudges(){
    for(const el of document.querySelectorAll('img[data-web-anchor], .nav-icon[data-web-anchor], [data-web-anchor] > img[data-wobble]')){
      const bottom=el.dataset.stick==='bottom';
      if(nudges.some(n=>n.el===el))continue;
      const base=Number(el.dataset.tilt)||0;
      nudges.push({el,bottom,base,angle:0,angular:0,x:0,y:0,vx:0,vy:0,box:el.getBoundingClientRect()});
      if(base)el.style.rotate=`${base}deg`;
      if(bottom)el.style.transformOrigin='50% 100%';
    }
  }
  function measureNudgeBoxes(){
    // Read layout without our own transforms, so a resize cannot count the
    // existing translation a second time. Batch writes before all reads.
    const transforms=nudges.map(n=>({rotate:n.el.style.rotate,translate:n.el.style.translate}));
    nudges.forEach(n=>{n.el.style.rotate='none';n.el.style.translate='none';});
    nudges.forEach(n=>{n.box=n.el.getBoundingClientRect();});
    nudges.forEach((n,i)=>{n.el.style.rotate=transforms[i].rotate;n.el.style.translate=transforms[i].translate;});
  }
  function nudgeBox(n){
    const b=n.box,a=(n.base+n.angle)*PI/180,co=Math.cos(a),si=Math.sin(a);
    const width=Math.abs(b.width*co)+Math.abs(b.height*si);
    const height=Math.abs(b.width*si)+Math.abs(b.height*co);
    const cx=b.left+b.width/2+(n.bottom?si*b.height/2:n.x);
    const cy=n.bottom?b.bottom-co*b.height/2:b.top+b.height/2+n.y;
    return {left:cx-width/2,right:cx+width/2,top:cy-height/2,bottom:cy+height/2,width,height};
  }
  function updateNudges(dt){
    let moving=false;
    for(const n of nudges){
      const b=nudgeBox(n), px=clamp(spider.x,b.left,b.right),py=clamp(spider.y,b.top,b.bottom);
      if(Math.hypot(spider.x-px,spider.y-py)<260*K&&spider.speed>40&&!spider.intro){
        const ox=spider.x-(b.left+b.width/2),oy=spider.y-(b.top+b.height/2),s=Math.max(b.width,b.height,20);
        n.angular+=clamp((ox*spider.vy-oy*spider.vx)/(s*s),-2.5,2.5)*120*dt;
        if(!n.bottom){n.vx+=.85*spider.vx*dt;n.vy+=.85*spider.vy*dt;}
      }
      const angleLimit=n.bottom?8:24;
      if(Math.abs(n.angle)>angleLimit)n.angular-=(n.angle-Math.sign(n.angle)*angleLimit)*(n.bottom?20:8)*dt;
      if(Math.abs(n.x)>50)n.vx-=(n.x-Math.sign(n.x)*50)*8*dt;
      if(Math.abs(n.y)>50)n.vy-=(n.y-Math.sign(n.y)*50)*8*dt;
      const damping=Math.exp(-2.8*dt);n.angular*=damping;n.vx*=damping;n.vy*=damping;
      n.angle+=n.angular*dt;n.x+=n.vx*dt;n.y+=n.vy*dt;
      n.el.style.rotate=`${(n.base+n.angle).toFixed(3)}deg`;
      if(!n.bottom)n.el.style.translate=`${n.x.toFixed(2)}px ${n.y.toFixed(2)}px`;
      if(Math.abs(n.angular)+Math.abs(n.vx)+Math.abs(n.vy)>.25)moving=true;
    }
    if(moving)nudgeSample=clock+.3;
    else if(nudgeSample&&clock>nudgeSample){silk.sampleAnchors();nudgeSample=0;}
  }
  function nudgeLanding(){
    nudges.forEach(n=>{
      const b=nudgeBox(n);
      if(Math.hypot(spider.x-(b.left+b.width/2),spider.y-(b.top+b.height/2))<180*scale){
        n.angular+=(Math.random()<.5?-1:1)*(16+Math.random()*12)*5;
      }
    });
  }
  function resetFeet(){legs.forEach(l=>{l.foot=world(l.rest,1-.38*spider.sleep);l.stepping=false;});}
  function resize(){
    const previousW=W,previousH=H;W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);
    // A new viewport has its own composition; discard pushes from the old one.
    if(W!==previousW||H!==previousH)nudges.forEach(n=>{
      n.x=n.y=n.vx=n.vy=n.angle=n.angular=0;
      n.el.style.rotate=`${n.base}deg`;n.el.style.translate='none';
    });
    canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';
    let t=W<=H?clamp(W/480,.78,1.1):H<560?Math.max(.68,H/620):Math.min(W/1440,H/810);
    scale=clamp(t,.6,1.25);spider.size=1.63*scale;K=spider.size*.12;flySize=Math.max(.75,1.05*scale);
    if(spider.intro){spider.x=W/2;spider.y=-760*K;}else{spider.x=clamp(spider.x/previousW*W,10,W-10);spider.y=clamp(spider.y/previousH*H,10,H-10);}
    pointer.x=clamp(pointer.x,0,W);pointer.y=clamp(pointer.y,0,H);
    silk.resize(W,H,DPR);resetFeet();measureNudgeBoxes();
    if(spider.intro&&typeof silk.setLiveAnchor==='function')silk.setLiveAnchor(W/2,-2);
  }
  function mouth(){return world({x:360,y:0});}
  function startJump(startled=false){
    if(spider.jump||fly.caught&&!startled)return;
    spider.intro=false;spider.introDone=true;spider.qt=0;spider.sleep=0;spider.quiet=0;
    let tx=spider.x,ty=spider.y,heading=spider.heading;
    if(!startled){
      const target=flyRig?fly:pointer;
      heading=Math.atan2(target.y-spider.y,target.x-spider.x);
      const destination={x:target.x-Math.cos(heading)*360*K,y:target.y-Math.sin(heading)*360*K};
      const d=dist(destination,spider),r=Math.min(1,360*K/Math.max(d,.1));
      tx=clamp(mix(spider.x,destination.x,r),10,W-10);ty=clamp(mix(spider.y,destination.y,r),10,H-10);
    }
    const d=Math.hypot(tx-spider.x,ty-spider.y);
    spider.jump={x:spider.x,y:spider.y,tx,ty,t:0,duration:startled?.3:clamp(d/1100,.28,.6),height:startled?26:Math.max(22,Math.min(.3*d,130)),startled};
    if(startled)spider.wakeHops++;else spider.jumps++;
    spider.heading=heading;spider.vx=spider.vy=0;resetFeet();
  }
  function landing(jump){
    spider.height=0;spider.land=1;spider.jump=null;resetFeet();
    silk.vibrate(spider.x,spider.y,140,3);nudgeLanding();
    if(flyRig&&!jump.startled&&dist(fly,mouth())<55*flySize){fly.caughtFor=3+Math.random()*1.2;fly.caught=fly.caughtFor;fly.cocoon=0;fly.captures++;}
  }
  function updateFly(dt){
    fly.opacity=mix(fly.opacity,pointer.active&&!pointer.hidden?1:0,ease(14,dt));
    fly.recoil=Math.max(0,fly.recoil-dt*1.2);
    if(fly.caught>0){
      fly.caught-=dt;const m=mouth();fly.x=m.x+Math.sin(clock*47)*1.8;fly.y=m.y+Math.sin(clock*31)*1.5;
      fly.angle=spider.heading+PI/2;fly.cocoon=clamp((fly.caughtFor-fly.caught)/1.9,0,1);
      if(fly.caught<=0){
        fly.caught=0;fly.releases++;
        const a=spider.heading+(Math.random()-.5);fly.releaseX=clamp(fly.x+Math.cos(a)*150,12,W-12);fly.releaseY=clamp(fly.y+Math.sin(a)*150,12,H-12);fly.recoil=1;
      }
      return;
    }
    fly.cocoon=Math.max(0,fly.cocoon-dt*2);
    fly.landed=mix(fly.landed,clock-lastMoved>1.2?1:0,ease(clock-lastMoved>1.2?3:10,dt));
    const buzz=reduced?0:1-fly.landed;
    const jitterX=(Math.sin(23.1*clock)+.6*Math.sin(37.7*clock+1.3))*2.2*buzz;
    const jitterY=(Math.sin(29.3*clock+.7)+.6*Math.sin(41.9*clock))*2.2*buzz;
    const tx=mix(pointer.x+jitterX,fly.releaseX,fly.recoil),ty=mix(pointer.y+jitterY,fly.releaseY,fly.recoil);
    const ox=fly.x,oy=fly.y,f=ease(28-20*fly.recoil,dt);
    fly.x=mix(fly.x,tx,f);fly.y=mix(fly.y,ty,f);
    const vx=(fly.x-ox)/dt,vy=(fly.y-oy)/dt;
    if(Math.hypot(vx,vy)>60)fly.angle+=angleDiff(Math.atan2(vy,vx)+PI/2,fly.angle)*ease(14,dt);
  }
  function updateSpider(dt){
    spider.land=Math.max(0,spider.land-dt*4);
    spider.breathe+=(3.2-1.8*smooth(spider.sleep))*dt;
    if(spider.intro){
      const u=clock-3;
      if(u<0){spider.y=-760*K;return;}
      if(u<2.3){const v=u/2.3;spider.y=mix(-760*K,H/2,1-Math.pow(1-v,2.4));}
      else{const v=u-2.3;spider.y=H/2+14*Math.exp(-3.2*v)*Math.sin(6.5*v);}
      spider.x=W/2+Math.sin(1.8*u)*8*Math.exp(-.5*u);spider.heading=PI/2+Math.sin(u*2.2)*.035;
      resetFeet();
      if(u>3.6){spider.intro=false;spider.introDone=true;spider.land=1;silk.vibrate(spider.x,spider.y,140,2);}
      return;
    }
    if(spider.jump){
      const j=spider.jump;j.t+=dt;const t=clamp(j.t/j.duration,0,1),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      spider.x=mix(j.x,j.tx,e);spider.y=mix(j.y,j.ty,e);spider.height=Math.sin(PI*t)*j.height;
      resetFeet();if(t>=1)landing(j);return;
    }
    const target=flyRig?fly:pointer;
    const dx=target.x-spider.x,dy=target.y-spider.y,d=Math.hypot(dx,dy),gap=(flyRig?560:330)*K;
    const desired=pointer.active&&!pointer.hidden&&!fly.caught?Math.min(760,Math.max(0,d-gap)*4):0;
    const oldAngle=spider.heading;
    if(d>10&&desired>2)spider.heading+=angleDiff(Math.atan2(dy,dx),spider.heading)*ease(8,dt);
    spider.vx=mix(spider.vx,dx/Math.max(d,1)*desired,ease(10,dt));
    spider.vy=mix(spider.vy,dy/Math.max(d,1)*desired,ease(10,dt));
    spider.speed=Math.hypot(spider.vx,spider.vy);
    spider.x=clamp(spider.x+spider.vx*dt,10,W-10);spider.y=clamp(spider.y+spider.vy*dt,10,H-10);
    spider.z=mix(spider.z,clamp(-angleDiff(spider.heading,oldAngle)/dt*.08,-.35,.35),ease(6,dt));
    updateFeet(dt);
  }
  function updateFeet(dt){
    for(const l of legs){
      const hip=world(l.hip),rest=world(l.rest,1-.38*smooth(spider.sleep));
      rest.x+=spider.vx*.09;rest.y+=spider.vy*.09;
      if(l.stepping){
        l.t+=dt/l.duration;const p=clamp(l.t,0,1),e=1-Math.pow(1-p,3);
        l.foot={x:mix(l.from.x,l.to.x,e),y:mix(l.from.y,l.to.y,e)};
        if(l.t>=1){l.stepping=false;silk.vibrate(l.foot.x,l.foot.y,30,.6);}
      } else {
        const d=dist(l.foot,rest),reach=(l.a+l.b)*K,over=dist(l.foot,hip)>.98*reach;
        const trigger=130*K*(l.li===0?.7:1)*(spider.speed<12?.3:1);
        const frontBehind=l.li===0&&((l.foot.x-hip.x)*Math.cos(spider.heading)+(l.foot.y-hip.y)*Math.sin(spider.heading))<0;
        if((d>trigger||over||frontBehind)&&(!legs.some(o=>o.group!==l.group&&o.stepping)||over||d>trigger*1.6)){
          l.from={...l.foot};l.to=rest;l.t=0;l.stepping=true;l.duration=clamp(.15-spider.speed/3200,.055,.15);
        }
      }
    }
  }
  function updateRest(dt){
    const quiet=!spider.intro&&!spider.jump&&clock-lastMoved>.25&&spider.speed<25&&!fly.caught;
    const faceQuiet=quiet&&(!legs.some(l=>l.stepping)||spider.sleep>.01);
    spider.qt=clamp(spider.qt+(faceQuiet?3.2:-6)*dt,0,1);
    if(quiet)spider.quiet+=dt;else spider.quiet=0;
    spider.sleep=clamp(spider.sleep+(spider.quiet>8?dt/1.6:-dt*4),0,1);
    if(spider.qt>.8&&spider.quiet>spider.blinkAt){
      spider.blinkTime=clock;
      if(!spider.blinkSecond){spider.blinkAt=spider.quiet+.33;spider.blinkSecond=true;}
      else{spider.blinkAt=spider.quiet+3+Math.random()*2;spider.blinkSecond=false;}
    }
    if(!quiet&&spider.qt<.1){spider.blinkAt=1.5;spider.blinkSecond=false;}
  }
  function kneeFor(l,hip,foot){
    const a=l.a*K,b=l.b*K,d=clamp(dist(hip,foot),Math.abs(a-b)+.01,a+b-.01);
    const dx=(foot.x-hip.x)/Math.max(dist(hip,foot),.01),dy=(foot.y-hip.y)/Math.max(dist(hip,foot),.01);
    const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
    const k1={x:hip.x+dx*along-dy*height,y:hip.y+dy*along+dx*height};
    const k2={x:hip.x+dx*along+dy*height,y:hip.y+dy*along-dx*height};
    const out=world({x:l.hip.x,y:l.side?-650:650});
    return dist(k1,out)<dist(k2,out)?k1:k2;
  }
  function drawBone(c,l,a,b,start,length){
    const d=dist(a,b);if(d<.01)return;
    c.save();c.translate(a.x-spider.x+320,a.y-spider.y+320);c.rotate(Math.atan2(b.y-a.y,b.x-a.x)-PI/2);
    c.drawImage(l.strip,0,start,92,length,-46*K,-d*.06,92*K,d*1.12);c.restore();
  }
  function drawSpider(){
    if(!rig)return;
    sctx.setTransform(1,0,0,1,0,0);sctx.clearRect(0,0,640,640);
    const order=[3,7,2,6,1,5,0,4];
    for(const i of order){
      const l=legs[i],hip=world(l.hip),foot={...l.foot};let knee=kneeFor(l,hip,foot);
      if(l.stepping&&!spider.jump){
        const lift=Math.sin(PI*clamp(l.t,0,1));
        for(const [p,amount] of [[knee,(l.li===0?12:26)*K],[foot,20*K]]){
          const d=dist(p,spider);p.x+=(p.x-spider.x)/d*amount*lift;p.y+=(p.y-spider.y)/d*amount*lift;
        }
      }
      drawBone(sctx,l,hip,knee,0,l.split);drawBone(sctx,l,knee,foot,l.split,l.strip.height-l.split);
    }
    sctx.save();sctx.translate(320,320);sctx.rotate(spider.heading-PI/2);
    const breathe=1+Math.sin(spider.breathe)*(.025+.03*spider.sleep),squash=1-.1*spider.land;
    sctx.save();sctx.translate(0,-52*K);sctx.rotate(spider.z);sctx.scale(breathe*(2-squash),breathe*squash);
    sctx.drawImage(rig.abdomen,-627*K,-548*K,1254*K,1254*K);sctx.restore();
    const qt=smooth(spider.qt);sctx.globalAlpha=1-.85*qt;
    sctx.drawImage(rig.head,-627*K,-600*K,1254*K,1254*K);sctx.globalAlpha=1;
    if(idle&&qt>.001){
      const k=3.3*(.9+.1*qt)*K;
      sctx.save();sctx.translate(3*K,90*K);sctx.scale(k,k);sctx.globalAlpha=qt;
      sctx.drawImage(idle,-154,-150,308,308);
      const since=clock-spider.blinkTime,blink=since>=0&&since<.2?Math.sin(since/.2*PI):0,close=Math.max(blink,smooth(spider.sleep));
      if(close>.001){
        eyes.forEach(([x,y,r],i)=>{
          sctx.save();sctx.beginPath();sctx.arc(x-154,y-150,r,0,TAU);sctx.clip();
          const rgb=idleSamples[i]||[105,78,54];sctx.fillStyle=`rgb(${rgb.join(',')})`;
          const ey=y-150-r+2*r*close;
          sctx.beginPath();sctx.rect(x-154-r,y-150-r,r*2,r*2*close);sctx.fill();
          sctx.beginPath();sctx.moveTo(x-154-r,ey);sctx.quadraticCurveTo(x-154,ey+r*.3,x-154+r,ey);
          sctx.strokeStyle='rgba(40,22,12,.7)';sctx.lineWidth=.8;sctx.stroke();sctx.restore();
        });
      }
      sctx.restore();
    }
    sctx.restore();
    const h=spider.height,lift=(1+h/260)*(1-.03*spider.sleep);
    ctx.save();ctx.translate(spider.x,spider.y);ctx.scale(lift,lift);
    ctx.shadowColor=`rgba(0,0,0,${.42-Math.min(.24,h/500)})`;ctx.shadowBlur=7+.14*h;
    ctx.shadowOffsetX=5+.35*h;ctx.shadowOffsetY=9+.6*h;ctx.drawImage(scratch,-320,-320);ctx.restore();
  }
  function snore(x,y,s){
    for(let i=0;i<3;i++){
      const c=(clock*.24+i/3)%1;ctx.save();ctx.globalAlpha=Math.sin(PI*c)*spider.sleep;
      ctx.fillStyle=sleepInk;ctx.font=`700 ${(12+14*c)*s}px system-ui`;
      ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
      ctx.fillText('z',x+30*c*s,y-70*c*s);ctx.restore();
    }
  }
  function drawFly(){
    if(!flyRig||fly.opacity<.01)return;
    const width=79*flySize,k=width/920,y=1-fly.landed;
    ctx.save();ctx.globalAlpha=fly.opacity;ctx.translate(fly.x,fly.y+Math.sin(6*clock)*1.2*y);ctx.rotate(fly.angle);
    ctx.shadowColor=`rgba(0,0,0,${.2+.18*fly.landed})`;ctx.shadowBlur=3+9*y;ctx.shadowOffsetX=3+14*y;ctx.shadowOffsetY=5+26*y;
    ctx.drawImage(flyRig.body,-460*k,-472.5*k,920*k,945*k);ctx.shadowColor='transparent';
    for(let side=0;side<2;side++){
      const count=fly.landed>.97&&!fly.caught?1:4,dir=side?1:-1,hx=side?531:389;
      for(let n=0;n<count;n++){
        const q=fly.caught?Math.sin(clock*TAU*46+n*.8):Math.sin(clock*TAU*34+n*.8)*(1-fly.landed);
        ctx.save();ctx.globalAlpha=fly.opacity*(count===1?.85:.27);ctx.translate((hx-460)*k,(329-472.5)*k);
        ctx.rotate(dir*(.9*q+.18*fly.landed));ctx.scale(1,1-.25*Math.abs(q));
        ctx.drawImage(flyRig.wings[side],-hx*k,-329*k,920*k,945*k);ctx.restore();
      }
    }
    if(fly.cocoon>.01){
      ctx.shadowColor='rgba(0,0,0,.15)';ctx.shadowBlur=2;ctx.strokeStyle='rgba(255,255,247,.85)';
      for(let i=0;i<7;i++){
        const p=clamp(fly.cocoon*7-i,0,1);if(!p)continue;
        ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(0,0,30*flySize,(16+i*1.5)*flySize,i*.39,0,TAU*p);ctx.stroke();
      }
      ctx.lineWidth=.35;ctx.globalAlpha=fly.opacity*fly.cocoon*.8;
      for(let i=0;i<70;i++){
        const a=i*2.39996,r=(10+18*Math.sqrt(i/70))*flySize,x=Math.cos(a)*r,y=Math.sin(a)*r*.75;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(i*13)*8,y+Math.cos(i*7)*8);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function clearWeb(){const spin=world({x:-450,y:0});silk.clear(spin.x,spin.y);}
  function controlTarget(target){return target instanceof Element&&!!target.closest('a,button,input,textarea,select,[contenteditable="true"],[data-no-spider],dialog');}
  function editableTarget(target){return target instanceof Element&&(target.isContentEditable||!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));}
  let touchStart=null,holdTimer=0,lastTap=0,held=false;
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'&&touchStart&&Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)>12)clearTimeout(holdTimer);
    if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>1){
      if(spider.sleep>.6)startJump(true);
      lastMoved=clock;pointer.x=e.clientX;pointer.y=e.clientY;
    }
    pointer.active=true;pointer.hidden=controlTarget(e.target);
  },{passive:true});
  document.addEventListener('pointerdown',e=>{
    pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true;pointer.hidden=controlTarget(e.target);
    if(pointer.hidden)return;
    lastMoved=clock;
    if(e.pointerType==='touch'){
      touchStart={x:e.clientX,y:e.clientY};held=false;
      holdTimer=setTimeout(()=>{held=true;clearWeb();navigator.vibrate?.(30);},650);
    }
  },{passive:true});
  document.addEventListener('pointerup',e=>{
    clearTimeout(holdTimer);
    if(e.pointerType==='touch'&&!held&&!controlTarget(e.target)){
      const now=performance.now();if(now-lastTap<340){fly.x=pointer.x;fly.y=pointer.y;startJump();lastTap=0;}else lastTap=now;
    }
    touchStart=null;
  },{passive:true});
  document.addEventListener('pointercancel',()=>{clearTimeout(holdTimer);touchStart=null;});
  document.addEventListener('click',e=>{if(e.pointerType!=='touch'&&!coarse&&!controlTarget(e.target))startJump();});
  document.addEventListener('keydown',e=>{
    if((e.key==='Delete'||e.key==='Backspace')&&!editableTarget(e.target)){e.preventDefault();clearWeb();}
  });
  document.documentElement.addEventListener('pointerleave',()=>{pointer.active=false;});
  window.addEventListener('blur',()=>{pointer.active=false;});
  document.addEventListener('visibilitychange',()=>{suspended=document.hidden;lastTime=performance.now();});
  document.addEventListener('found:clear-web',clearWeb);
  document.addEventListener('found:jump',()=>startJump());
  document.addEventListener('found:layout',()=>setTimeout(()=>silk.sampleAnchors(),100));

  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min(.033,Math.max(.001,(now-lastTime)/1000));lastTime=now;
    if(suspended)return;
    clock+=dt;spider.frameCount++;
    updateFly(dt);updateNudges(dt);updateSpider(dt);updateRest(dt);
    const spin=world({x:-450,y:0});
    silk.update(dt,clock,spin,pointer,!spider.intro||clock>3);
    ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
    silk.draw(ctx,clock);drawSpider();
    if(spider.sleep>.1){const p=world({x:260,y:-170});snore(p.x,p.y,scale);if(fly.landed>.8)snore(fly.x+15,fly.y-10,scale*.5);}
    drawFly();
    if(diagnostics&&spider.frameCount%15===0)canvas.dataset.state=JSON.stringify(window.foundDebug.state);
  }
  async function init(){
    const [photo,head,flyPhoto]=await Promise.all([loadImage(FOUND_ASSETS.spider),loadImage(FOUND_ASSETS.idle),loadImage(FOUND_ASSETS.fly)]);
    if(photo)rig=createRig(photo);
    if(head){
      const c=makeCanvas(308),cctx=c.getContext('2d',{willReadFrequently:true});
      // Register the replacement face to the source brief's two central eyes.
      cctx.drawImage(head,92.9,100.37,122.41,122.41);idle=c;
      idleSamples=eyes.map(([x,y,r])=>{const p=cctx.getImageData(Math.round(x),Math.round(y-r-4),1,1).data;return [Math.round(p[0]*.82),Math.round(p[1]*.78),Math.round(p[2]*.75)];});
    }
    if(flyPhoto)flyRig=createFly(flyPhoto);
    if(!flyRig){document.documentElement.style.cursor='auto';document.body.style.cursor='auto';}
    await Promise.all([...document.querySelectorAll('.frame img.object')].map(image=>image.decode().catch(()=>{})));
    collectNudges();resize();
    new ResizeObserver(resize).observe(document.querySelector('.page')||document.body);
    document.fonts.ready.then(()=>silk.sampleAnchors());window.addEventListener('load',()=>silk.sampleAnchors());
    setTimeout(()=>silk.sampleAnchors(),600);
    if(reduced){spider.intro=false;spider.x=W/2;spider.y=H/2;resetFeet();}
    lastTime=performance.now();requestAnimationFrame(frame);
    document.documentElement.dataset.ready='true';
  }
  // Read-only diagnostics make animation and standalone-file QA reproducible.
  window.foundDebug={get state(){return {width:W,height:H,scale,K,flySize,ready:!!rig,frames:spider.frameCount,
    spider:{x:spider.x,y:spider.y,speed:spider.speed,intro:spider.intro,jumping:!!spider.jump,sleep:spider.sleep,quiet:spider.quiet,jumps:spider.jumps,wakeHops:spider.wakeHops},
    fly:{x:fly.x,y:fly.y,caught:fly.caught,landed:fly.landed,captures:fly.captures,releases:fly.releases},silk:silk.stats,legs:legs.length};}};
  init();
})();
