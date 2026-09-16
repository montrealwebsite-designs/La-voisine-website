const video=document.querySelector('#hero');
const journey=document.querySelector('.journey');
const film=document.querySelector('.film');
const callouts=document.querySelector('.callouts');
const nav=document.querySelector('.navigation');
const cue=document.querySelector('.scroll-cue');
const progressBar=document.querySelector('.progress span');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const mobileView=matchMedia('(max-width:700px), (max-aspect-ratio:4/3)');
const touchDevice=matchMedia('(pointer:coarse) and (max-width:1400px)');
const frameImage=document.querySelector('#hero-frame');
const frames=new Map();
const queuedFrames=new Set();
const loadingFrames=new Set();
const anchorFrames=new Set();
const frameQueue=[];
let drawnFrame=0,framesStarted=false,frameTick=false,activeLoads=0,anchorsRemaining=0;
const lastFrame=72;
const frameURL=index=>`frames/${String(index).padStart(3,'0')}.webp`;
function scheduleFrame(){if(!frameTick){frameTick=true;requestAnimationFrame(()=>{frameTick=false;renderFrame()})}}
function renderFrame(){
  const wanted=Math.round(progress*lastFrame);
  if(touchDevice.matches){
    const direction=wanted>=drawnFrame?1:-1;
    [wanted,wanted+direction,wanted-direction,wanted+direction*2,wanted-direction*2].forEach(requestFrame);
  }
  const next=frames.has(wanted)?wanted:frames.size?[...frames.keys()].reduce((a,b)=>Math.abs(b-wanted)<Math.abs(a-wanted)?b:a):drawnFrame;
  if(next!==drawnFrame&&frames.has(next)){frameImage.src=frames.get(next).src;drawnFrame=next;}
  reveal();
}
function requestFrame(index){
  if(index<0||index>lastFrame||frames.has(index)||queuedFrames.has(index)||loadingFrames.has(index))return;
  queuedFrames.add(index);frameQueue.push(index);pumpFrames();
}
function pumpFrames(){
  const limit=touchDevice.matches?3:4;
  while(activeLoads<limit&&frameQueue.length){
    const target=Math.round(progress*lastFrame);
    frameQueue.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));
    const index=frameQueue.shift();queuedFrames.delete(index);loadingFrames.add(index);activeLoads++;
    const image=new Image();image.decoding='async';image.src=frameURL(index);
    image.decode().then(()=>{frames.set(index,image);scheduleFrame()}).catch(()=>{}).finally(()=>{
      loadingFrames.delete(index);activeLoads--;
      if(anchorFrames.has(index)){anchorsRemaining--;if(anchorsRemaining<=0)document.body.classList.remove('is-frame-loading')}
      trimFrames();pumpFrames();
    });
  }
}
function trimFrames(){
  if(!touchDevice.matches||frames.size<=36)return;
  const target=Math.round(progress*lastFrame);
  [...frames.keys()].filter(index=>!anchorFrames.has(index)&&index!==drawnFrame).sort((a,b)=>Math.abs(b-target)-Math.abs(a-target)).slice(0,frames.size-36).forEach(index=>{
    const image=frames.get(index);frames.delete(index);if(image)image.src='';
  });
}
function loadFrames(){
  if(framesStarted)return;framesStarted=true;
  if(touchDevice.matches){
    const anchors=Array.from({length:19},(_,i)=>i*4);
    anchors.forEach(index=>anchorFrames.add(index));anchorsRemaining=anchors.length;
    document.body.classList.add('is-frame-loading');anchors.forEach(requestFrame);
  }else{
    [0,lastFrame,...Array.from({length:lastFrame-1},(_,i)=>i+1)].forEach(requestFrame);
  }
}
function selectRenderer(){
  video.pause();loadFrames();
  placeCallouts();update();
}
let progress=0,targetTime=0,ready=false,ticking=false;
const finalTime=()=>Math.max(0,(video.duration||6.041667)-1/24);
function placeCallouts(){
  const w=film.clientWidth,h=film.clientHeight,mobile=matchMedia('(max-width:700px), (max-aspect-ratio:4/3)').matches;
  const scale=Math.max(w/1916,h/1080);
  const offsetX=(w-1916*scale)*.5,offsetY=(h-1080*scale)/2;
  const items=[['.reservation-callout',230,792],['.menu-callout',785,665]];
  items.forEach(([selector,x,y],i)=>{
    const card=document.querySelector(selector),line=card.querySelector('.pointer');
    const anchorX=offsetX+x*scale,anchorY=offsetY+y*scale;
    const left=mobile?(w-card.offsetWidth)/2:Math.max(24,Math.min(w-card.offsetWidth-24,anchorX-card.offsetWidth/2));
    const top=mobile?h-24-(i+1)*(card.offsetHeight+12):Math.max(100,anchorY-card.offsetHeight-50);
    line.hidden=mobile;
    card.style.left=left+'px';card.style.top=top+'px';
    const startX=Math.max(12,Math.min(card.offsetWidth-12,anchorX-left));
    const startY=mobile&&i===0?0:card.offsetHeight;
    const dx=anchorX-left-startX,dy=anchorY-top-startY;
    line.style.left=startX+'px';line.style.top=startY+'px';
    line.style.height=Math.hypot(dx,dy)+'px';line.style.transformOrigin='top';line.style.transform=`rotate(${Math.atan2(-dx,dy)}rad)`;
  });
}
function reveal(){
  const displayedProgress=drawnFrame/lastFrame;
  const opacity=Math.max(0,Math.min(1,(Math.min(progress,displayedProgress)-.82)/.12));
  const complete=opacity>0;
  callouts.style.opacity=opacity;
  callouts.style.visibility=complete?'visible':'hidden';
  document.body.classList.toggle('is-complete',complete);
  callouts.inert=opacity<.5;cue.tabIndex=complete||progress>.005?-1:0;
}
function seek(){
  renderFrame();
}
function update(){
  ticking=false;
  const distance=journey.offsetHeight-document.querySelector('.stage').offsetHeight;
  progress=reduceMotion.matches?1:Math.max(0,Math.min(1,scrollY/Math.max(1,distance)));
  document.body.classList.toggle('has-scrolled',progress>.005);

  progressBar.style.width=`${progress*100}%`;
  targetTime=progress*finalTime();reveal();seek();
}
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
addEventListener('resize',()=>{placeCallouts();update()});
reduceMotion.addEventListener('change',update);
mobileView.addEventListener('change',selectRenderer);
video.addEventListener('loadedmetadata',()=>{ready=true;update()});
video.addEventListener('loadeddata',()=>{ready=true;placeCallouts();update()});
video.addEventListener('seeked',()=>{reveal();seek()});
video.addEventListener('error',()=>{document.body.classList.add('has-scrolled');nav.inert=false;cue.hidden=true});
cue.addEventListener('click',()=>scrollTo({top:journey.offsetHeight-document.querySelector('.stage').offsetHeight,behavior:reduceMotion.matches?'instant':'smooth'}));
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.open).showModal()));
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
});
if(video.readyState>=2)ready=true;
// Keep navigation discoverable on arrival and whenever the visitor interacts.
let navTimer;
function showNavigation(){
  clearTimeout(navTimer);
  nav.classList.remove('is-idle');
  navTimer=setTimeout(()=>{
    if(nav.matches(':hover')||nav.contains(document.activeElement))return;
    nav.classList.add('is-idle');
  },3500);
}
['pointermove','pointerdown','touchstart','scroll','keydown'].forEach(type=>addEventListener(type,showNavigation,{passive:true}));
nav.addEventListener('focusin',showNavigation);
nav.addEventListener('focusout',showNavigation);
nav.addEventListener('pointerleave',showNavigation);
showNavigation();
selectRenderer();
