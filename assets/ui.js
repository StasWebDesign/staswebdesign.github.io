/* Stas Web Design — плавная прокрутка + фирменный курсор */
(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- плавная прокрутка (Lenis) ---------- */
  if(window.Lenis&&!reduce){
    const lenis=new Lenis({lerp:.09,wheelMultiplier:1,smoothWheel:true,syncTouch:false});
    window.lenis=lenis;
    (function raf(t){lenis.raf(t);requestAnimationFrame(raf)})(performance.now());
    document.addEventListener('click',e=>{
      const a=e.target.closest('a[href*="#"]');if(!a||e.defaultPrevented)return;
      const u=new URL(a.href,location.href);
      if(u.pathname!==location.pathname||!u.hash)return;
      const id=decodeURIComponent(u.hash.slice(1));
      const el=id==='top'?0:document.getElementById(id);
      if(el===null)return;
      e.preventDefault();
      lenis.scrollTo(el,{duration:1.4});
      history.replaceState(null,'',id==='top'?location.pathname:'#'+id);
    });
  }

  /* ---------- курсор ---------- */
  if(!fine)return;
  const root=document.documentElement;
  const ring=document.createElement('div'),dot=document.createElement('div');
  ring.className='cur-r';dot.className='cur-d';ring.innerHTML='<span></span>';
  document.body.append(ring,dot);root.classList.add('has-cur');
  const lbl=ring.firstChild;
  let mx=-100,my=-100,rx=-100,ry=-100,shown=false;
  const HOT='a,button,summary,label,select,[role=button],.ls,.fbig';
  const TEXT='input:not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]),textarea,[contenteditable]';
  addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    if(!shown){rx=mx;ry=my;shown=true;root.classList.add('cur-on')}
    dot.style.transform=`translate3d(${mx}px,${my}px,0)`;
    const t=e.target instanceof Element?e.target:null;
    const txt=t&&t.closest(TEXT), view=t&&t.closest('.cc'), hot=!txt&&!view&&t&&t.closest(HOT);
    root.classList.toggle('cur-text',!!txt);
    root.classList.toggle('cur-view',!!view);
    root.classList.toggle('cur-hot',!!hot);
    if(view)lbl.textContent='Смотреть';
  },{passive:true});
  document.addEventListener('mouseleave',()=>{root.classList.remove('cur-on');shown=false});
  addEventListener('blur',()=>{root.classList.remove('cur-on');shown=false});
  addEventListener('mousedown',()=>root.classList.add('cur-down'));
  addEventListener('mouseup',()=>root.classList.remove('cur-down'));
  (function loop(){
    rx+=(mx-rx)*.2;ry+=(my-ry)*.2;
    ring.style.transform=`translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(loop);
  })();
})();
