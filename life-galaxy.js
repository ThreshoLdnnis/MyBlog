/* Feathered pigment galaxy: viewport canvas, cached local tiles, no visible path stroke. */
const NS = 'http://www.w3.org/2000/svg';
const clamp = value => Math.max(0, Math.min(1, value));
const noise = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export function galaxyAxis(index, count, compact = false) {
  const phase = index / Math.max(1, count - 1) * Math.PI * 5.8 - .35;
  return (compact ? 29 : 50) + Math.sin(phase) * (compact ? 10 : 24);
}

/** Smooth x(y) interpolation keeps every year on the path and y monotonic. */
export function galaxyPath(points) {
  if (!points.length) return '';
  const slope = index => {
    if (!index) return (points[1]?.x - points[0].x) / Math.max(1, points[1]?.y - points[0].y) || 0;
    if (index === points.length - 1) return (points[index].x - points[index - 1].x) / Math.max(1, points[index].y - points[index - 1].y);
    const left = (points[index].x - points[index - 1].x) / Math.max(1, points[index].y - points[index - 1].y);
    const right = (points[index + 1].x - points[index].x) / Math.max(1, points[index + 1].y - points[index].y);
    return left * right > 0 ? 2 * left * right / (left + right) : 0;
  };
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index], dy = (b.y - a.y) / 3;
    path += ` C ${a.x + slope(index - 1) * dy} ${a.y + dy}, ${b.x - slope(index) * dy} ${b.y - dy}, ${b.x} ${b.y}`;
  }
  return path;
}

function node(tag, className, attributes = {}) {
  const el = document.createElementNS(NS, tag);
  if (className) el.setAttribute('class', className);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  return el;
}

export function createLifeGalaxy(svg) {
  // The SVG geometry remains the single source of truth for years and navigation.
  // Only this invisible path is vector; every visible mark is pigment or starlight.
  const path = node('path', 'life-galaxy-geometry');
  Object.assign(path.style, {fill:'none', stroke:'none', visibility:'hidden'});
  const viewport = node('foreignObject', 'life-galaxy-viewport', {x:0, y:0});
  viewport.style.pointerEvents = 'none';
  const canvas = document.createElement('canvas');
  canvas.className = 'life-galaxy-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {display:'block', width:'100%', height:'100%', pointerEvents:'none'});
  viewport.append(canvas);
  svg.replaceChildren(path, viewport);
  const brightCanvas = document.createElement('canvas');
  let ctx, bright;
  try { ctx = canvas.getContext('2d'); bright = brightCanvas.getContext('2d'); } catch {}
  let samples = [], length = 0, sceneWidth = 0, sceneHeight = 0;
  let pixelRatio = 1, viewHeight = 0, compact = false;
  const TILE = 384;
  const cache = new Map();
  const sprites = new Map();
  const TAU = Math.PI * 2;
  const palette = ['#f8fbff','#e6eeff','#abcaff','#91acff','#bca7ff','#dbccff','#ffdda0','#ecc071'];

  function sprite(color, kind = 'cloud') {
    const key = color + kind;
    if (sprites.has(key)) return sprites.get(key);
    const image = document.createElement('canvas');
    image.width = image.height = kind === 'cloud' ? 96 : 48;
    const c = image.getContext('2d');
    const middle = image.width / 2;
    const g = c.createRadialGradient(middle, middle, 0, middle, middle, middle);
    const rgb = color.match(/\w\w/g).map(value => parseInt(value, 16)).join(',');
    const stop = (at, alpha) => g.addColorStop(at, `rgba(${rgb},${alpha})`);
    if (kind === 'cloud') {
      stop(0,.28); stop(.16,.21); stop(.4,.105); stop(.7,.024); stop(1,0);
    } else {
      stop(0,1); stop(.07,.98); stop(.18,.42); stop(.46,.095); stop(1,0);
    }
    c.fillStyle = g; c.fillRect(0, 0, image.width, image.height);
    if (kind === 'glint') {
      c.fillStyle = '#ecf6ff';
      c.beginPath();
      c.moveTo(middle,3); c.lineTo(middle+1.2,middle-1.2);
      c.lineTo(image.width-4,middle); c.lineTo(middle+1.2,middle+1.2);
      c.lineTo(middle,image.height-3); c.lineTo(middle-1.2,middle+1.2);
      c.lineTo(4,middle); c.lineTo(middle-1.2,middle-1.2); c.closePath(); c.fill();
    }
    sprites.set(key, image);
    return image;
  }

  function pointAt(t) {
    const at = clamp(t) * (samples.length - 1);
    const index = Math.floor(at), mix = at - index;
    const a = samples[index], b = samples[Math.min(index + 1, samples.length - 1)];
    return {x:a.x + (b.x-a.x)*mix, y:a.y + (b.y-a.y)*mix,
      nx:a.nx + (b.nx-a.nx)*mix, ny:a.ny + (b.ny-a.ny)*mix};
  }

  function progressAtY(y) {
    if (!samples.length || y <= samples[0].y) return 0;
    if (y >= samples.at(-1).y) return 1;
    let low = 0, high = samples.length - 1;
    while (high-low > 1) {
      const middle = (low+high) >> 1;
      if (samples[middle].y < y) low=middle; else high=middle;
    }
    const mix = (y-samples[low].y) / Math.max(.001,samples[high].y-samples[low].y);
    return (low+mix)/(samples.length-1);
  }

  function widthAt(t) {
    // The bright cloud swells and narrows, rather than behaving like a stroked tube.
    return (compact ? 45 : 77) * (.95 + .22*Math.sin(t*TAU*3.6+.5) + .13*Math.sin(t*TAU*10.2));
  }

  function gaussian(seed) {
    return Math.sqrt(-2*Math.log(Math.max(.00001,noise(seed)))) * Math.cos(TAU*noise(seed+1337));
  }

  function resetViewport() {
    viewHeight = Math.min(sceneHeight, Math.max(200, (globalThis.innerHeight || 800) + 176));
    pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.5, Math.sqrt(2400000 / Math.max(1,sceneWidth*viewHeight)));
    viewport.setAttribute('width', String(sceneWidth));
    viewport.setAttribute('height', String(viewHeight));
    for (const surface of [canvas, brightCanvas]) {
      surface.width = Math.max(1, Math.ceil(sceneWidth * pixelRatio));
      surface.height = Math.max(1, Math.ceil(viewHeight * pixelRatio));
    }
    cache.clear();
  }

  function setGeometry(points, width, height) {
    sceneWidth = width; sceneHeight = height;
    compact = (globalThis.innerWidth || width) <= 700;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    path.setAttribute('d', galaxyPath(points));
    length = path.getTotalLength();
    const count = Math.max(80, Math.min(1600, Math.ceil(length/4)));
    samples = Array.from({length:count+1}, (_, index) => {
      const p = path.getPointAtLength(length*index/count);
      return {x:p.x, y:p.y, nx:0, ny:0};
    });
    samples.forEach((p,index) => {
      const a=samples[Math.max(0,index-1)], b=samples[Math.min(samples.length-1,index+1)];
      const dx=b.x-a.x, dy=b.y-a.y, size=Math.hypot(dx,dy)||1;
      p.nx=-dy/size; p.ny=dx/size;
    });
    resetViewport();
    return length;
  }

  function tileAt(index) {
    if (cache.has(index)) {
      const value=cache.get(index); cache.delete(index); cache.set(index,value);
      return value;
    }
    const image=document.createElement('canvas');
    image.width=Math.max(1,Math.ceil(sceneWidth*pixelRatio));
    image.height=Math.ceil(TILE*pixelRatio);
    const c=image.getContext('2d');
    const top=index*TILE;
    c.setTransform(pixelRatio,0,0,pixelRatio,0,-top*pixelRatio);
    // The same global seeds and a generous margin make adjacent tiles seamless.
    const from=progressAtY(top-220)*length, to=progressAtY(top+TILE+220)*length;
    const cloudStep=13;
    for(let i=Math.floor(from/cloudStep);i<=Math.ceil(to/cloudStep);i++) {
      const t=clamp(i*cloudStep/Math.max(1,length)), p=pointAt(t), width=widthAt(t);
      const drift=Math.sin(t*TAU*13)*width*.13;
      const x=p.x+p.nx*drift, y=p.y+p.ny*drift;
      const outer=Math.min(width*(1.88+.34*noise(i+720)), 20+y*1.9);
      c.globalAlpha=.58;
      c.drawImage(sprite(i%3===0?'#a682ed':'#688dff'),x-outer/2,y-outer/2,outer,outer);
      const core=Math.min(width*(.85+.38*noise(i+900)), 15+y*1.8);
      c.globalAlpha=.63+.27*noise(i+340);
      c.drawImage(sprite('#c2d9ff'),x-core/2,y-core/2,core,core);
      // A discontinuous mist strand gives the edge soft, uneven tendrils.
      if(noise(i+121)>.3) {
        const offset=(noise(i+320)-.5)*width*1.7, wisp=width*(.35+.45*noise(i+341));
        c.globalAlpha=.33;
        c.drawImage(sprite('#9f83ed'),p.x+p.nx*offset-wisp/2,p.y+p.ny*offset-wisp/2,wisp,wisp);
      }
    }
    c.globalAlpha=1;
    const grainGroups=Array.from({length:palette.length*3},()=>new Path2D());
    const grainStep=compact?.53:.43;
    for(let i=Math.max(0,Math.floor(from/grainStep));i<=Math.min(Math.ceil(length/grainStep),Math.ceil(to/grainStep));i++) {
      const t=clamp(i*grainStep/Math.max(1,length)), p=pointAt(t), width=widthAt(t);
      for(let k=0;k<4;k++) {
        const seed=i*11+k*117;
        const offset=gaussian(seed+53)*width*.29 + Math.sin(t*TAU*15)*width*.07;
        const along=(noise(seed+12)-.5)*2;
        const x=p.x+p.nx*offset-p.ny*along, y=p.y+p.ny*offset+p.nx*along;
        const r=.23+noise(seed+720)**2*(compact?.72:.94);
        const color = noise(seed+166) < .15 ? 6 + (k % 2) : (i+k)%6;
        const group=color + Math.floor(noise(seed+888)*3)*palette.length;
        grainGroups[group].moveTo(x+r,y); grainGroups[group].arc(x,y,r,0,TAU);
      }
    }
    for(let i=0;i<grainGroups.length;i++) {
      c.fillStyle=palette[i%palette.length]; c.globalAlpha=.37+Math.floor(i/palette.length)*.24;
      c.fill(grainGroups[i]);
    }
    // Dotted wisps and spatter have no continuous contour or stroke.
    for(let i=Math.max(0,Math.floor(from/3.7));i<=Math.ceil(to/3.7);i++) {
      const t=clamp(i*3.7/Math.max(1,length)), p=pointAt(t), width=widthAt(t);
      const side=i%2?1:-1;
      const offset=side*width*(.65+noise(i+620)*1.35);
      const x=p.x+p.nx*offset, y=p.y+p.ny*offset;
      const r=.28+noise(i+70)**3*1.25;
      c.fillStyle=palette[i%6]; c.globalAlpha=.12+noise(i+510)*.44;
      c.beginPath(); c.arc(x,y,r,0,TAU); c.fill();
      if(i%3===0) {
        const wispOffset=side*width*(.68+.16*Math.sin(t*TAU*6.5));
        c.globalAlpha=.28+noise(i+45)*.26;
        c.beginPath(); c.arc(p.x+p.nx*wispOffset,p.y+p.ny*wispOffset,.45+noise(i+92)*.45,0,TAU); c.fill();
      }
    }
    for(let i=Math.max(0,Math.floor(from/63));i<=Math.ceil(to/63);i++) {
      const t=clamp((i+.2+noise(i+421)*.6)*63/Math.max(1,length));
      const p=pointAt(t), offset=gaussian(i+830)*widthAt(t)*.64;
      const size=3+noise(i+340)**2*8;
      c.globalAlpha=.48+noise(i+901)*.4;
      const tint=i%4===1?'#ffd68b':i%3===0?'#d7d5ff':'#d7eaff';
      const image=sprite(tint,i%5===0?'glint':'star');
      c.drawImage(image,p.x+p.nx*offset-size/2,p.y+p.ny*offset-size/2,size,size);
    }
    c.globalAlpha=1;
    cache.set(index,image);
    // Keep only enough tiles for this viewport and its immediate neighbour.
    const maxTiles=Math.ceil(viewHeight/TILE)+2;
    while(cache.size>maxTiles) cache.delete(cache.keys().next().value);
    return image;
  }

  function paint(progress, time, {reduced=false, top=-Infinity, bottom=Infinity}={}) {
    if(!samples.length) return null;
    const head=pointAt(progress);
    if(!ctx||!bright||!sceneWidth||!viewHeight) return head;
    const firstVisible=Number.isFinite(top)?top:0;
    const viewTop=Math.floor(Math.max(0,Math.min(sceneHeight-viewHeight,firstVisible-88)));
    viewport.setAttribute('y',String(viewTop));
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    bright.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    ctx.clearRect(0,0,sceneWidth,viewHeight);
    bright.clearRect(0,0,sceneWidth,viewHeight);
    const first=Math.floor(viewTop/TILE), last=Math.floor((viewTop+viewHeight-1)/TILE);
    ctx.globalAlpha=.85;
    for(let i=first;i<=last;i++) {
      const tile=tileAt(i), y=i*TILE-viewTop;
      ctx.drawImage(tile,0,0,sceneWidth*pixelRatio,TILE*pixelRatio,0,y,sceneWidth,TILE);
      bright.drawImage(tile,0,0,sceneWidth*pixelRatio,TILE*pixelRatio,0,y,sceneWidth,TILE);
    }
    // A broad alpha feather lights the travelled portion without a cutoff edge.
    const feather=compact?100:155;
    const centre=head.y-viewTop;
    const mask=bright.createLinearGradient(0,centre-feather,0,centre+feather);
    mask.addColorStop(0,'rgba(255,255,255,.85)'); mask.addColorStop(1,'rgba(255,255,255,0)');
    bright.globalCompositeOperation='destination-in';
    bright.fillStyle=reduced?'rgba(255,255,255,.6)':mask;
    bright.fillRect(0,0,sceneWidth,viewHeight);
    bright.globalCompositeOperation='source-over';
    ctx.globalAlpha=.7;
    ctx.globalCompositeOperation='screen';
    ctx.drawImage(brightCanvas,0,0,sceneWidth*pixelRatio,viewHeight*pixelRatio,0,0,sceneWidth,viewHeight);
    ctx.globalCompositeOperation='source-over';
    // Only these few foreground grains move; the dense pigment is cached.
    if(!reduced) {
      const moteCount=compact?76:105;
      for(let i=0;i<moteCount;i++) {
        const isGold=i%3===1;
        const t=(i/moteCount+time*(.007+noise(i+9)*.008))%1;
        const p=pointAt(t);
        if(p.y<viewTop-20||p.y>viewTop+viewHeight+20) continue;
        const side=widthAt(t)*((noise(i+710)-.5)*1.05+(isGold?.20*Math.sin(t*TAU*4.5+1):0));
        const x=p.x+p.nx*side, y=p.y+p.ny*side-viewTop;
        const light=clamp((head.y-p.y+feather)/(2*feather));
        ctx.globalAlpha=((isGold?.74:.46)+.20*Math.sin(time*.9+i))*(.68+.32*light);
        const size=i%11===0?12:2.5+noise(i+290)*4.2;
        if(isGold) {
          // Warm motes stretch in the direction of flow like grains of illuminated sand.
          ctx.save();
          ctx.translate(x,y);
          ctx.rotate(Math.atan2(-p.nx,p.ny));
          ctx.drawImage(sprite('#ffd280','star'),-size*1.8,-size/2,size*3.3,size);
          ctx.restore();
        } else {
          ctx.drawImage(sprite(i%3===0?'#d8bfff':'#ecf7ff',i%11===0?'glint':'star'),x-size/2,y-size/2,size,size);
        }
      }
    }
    ctx.globalAlpha=1;
    return head;
  }

  return {setGeometry, progressAtY, paint};
}
