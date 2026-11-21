const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const rub=n=>n.toLocaleString('ru-RU').replace(/ /g,' ')+' ₽';
const fmtMin=m=>{if(!m)return'';const h=Math.floor(m/60),mm=m%60;return(h?h+' ч ':'')+(mm?mm+' мин':'').trim()};
const WA='79141944424';
const BASE=document.body.dataset.base||'';
const SPH=window.SPH||{cats:[],items:[],cons:{},tattoo:[],results:[]};
const CATN=Object.fromEntries(SPH.cats);
let lenis;
const safe=(name,fn)=>{try{fn()}catch(e){console.warn('['+name+']',e)}};

/* ---------- SEGMENTED ---------- */
function segInit(el,cb){
  if(!el)return;const th=$('.thumb',el),bs=$$('button',el);
  const place=b=>{if(!b)return;th.style.left=b.offsetLeft+'px';th.style.width=b.offsetWidth+'px'};
  bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>x.classList.toggle('on',x===b));place(b);cb&&cb(b.dataset.v)}));
  const init=()=>place($('button.on',el));init();addEventListener('resize',init);document.fonts&&document.fonts.ready.then(init);setTimeout(init,600);
  el._set=v=>{const b=bs.find(x=>x.dataset.v===v);if(b){bs.forEach(x=>x.classList.toggle('on',x===b));place(b)}};
}
/* ---------- CUSTOM SELECT ---------- */
function selInit(el,cb){
  if(!el)return;const btn=$('.sel-btn',el),lab=$('span',btn);
  btn.addEventListener('click',e=>{e.stopPropagation();$$('.sel.open').forEach(s=>s!==el&&s.classList.remove('open'));const l=$('.sel-list',el),r=btn.getBoundingClientRect();el.classList.toggle('up',innerHeight-r.bottom<l.scrollHeight+16&&r.top>l.scrollHeight+16);el.classList.toggle('open')});
  $$('li',el).forEach(li=>li.addEventListener('click',()=>{el.dataset.value=li.dataset.v;lab.textContent=li.textContent;$$('li',el).forEach(x=>x.classList.toggle('on',x===li));el.classList.remove('open');cb&&cb(li.dataset.v)}));
  el._set=v=>{const li=$$('li',el).find(x=>x.dataset.v===v);if(li){el.dataset.value=v;lab.textContent=li.textContent;$$('li',el).forEach(x=>x.classList.toggle('on',x===li))}};
}
document.addEventListener('click',()=>$$('.sel.open').forEach(s=>s.classList.remove('open')));

/* ---------- PRICE LIST (any [data-prices] block) ---------- */
function initPrices(root){
  const fixed=root.dataset.cat||'';const STEP=+(root.dataset.step||12);const allow=(root.dataset.cats||'').split(',').filter(Boolean);
  const list=$('.pr-list',root),cats=$('.cats',root),q=$('.pr-search',root),more=$('.pr-more-btn',root),less=$('.pr-less-btn',root),btns=$('.pr-more',root);
  const order=SPH.cats.map(c=>c[0]);
  let cat=fixed||root.dataset.start||'all',gen='all',sort='def',shown=STEP,prevShown=0;
  const inAllow=c=>!allow.length||allow.includes(c);
  if(cats&&!fixed){cats.innerHTML='<button class="cat'+(cat==='all'?' on':'')+'" data-c="all">Все</button>'+SPH.cats.filter(c=>inAllow(c[0])).map(c=>`<button class="cat${cat===c[0]?' on':''}" data-c="${c[0]}">${c[1]}</button>`).join('')}
  const hasG=()=>SPH.items.some(x=>(!allow.length||allow.includes(x.c))&&(cat==='all'||x.c===cat)&&x.g!=='all');
  function rows(){
    const s=(q?q.value:'').trim().toLowerCase().replace(/ё/g,'е');
    let r=SPH.items.filter(x=>inAllow(x.c)&&(cat==='all'||x.c===cat)&&(gen==='all'||x.g===gen||x.g==='all')&&(!s||(x.n+' '+x.d+' '+CATN[x.c]+' '+x.grp).toLowerCase().replace(/ё/g,'е').includes(s)));
    if(sort==='asc')r.sort((a,b)=>a.p-b.p);else if(sort==='desc')r.sort((a,b)=>b.p-a.p);else if(sort==='time')r.sort((a,b)=>(a.t||999)-(b.t||999));
    else{const GO={w:0,all:1,m:2};r.sort((a,b)=>order.indexOf(a.c)-order.indexOf(b.c)||(a.grp>b.grp?1:a.grp<b.grp?-1:0)||GO[a.g]-GO[b.g]||a.id-b.id)}
    return r;
  }
  const gl=x=>x.g==='m'?'для него':x.g==='w'&&['laser','depil','lpg'].includes(x.c)?'для неё':'';
  const item=(x,i,old)=>`<div class="pr-item${i>=old?' new':''}" style="--d:${Math.max(0,i-old)*35}ms" data-add="${x.id}" role="button" tabindex="0" aria-label="Записаться: ${x.n}"><div class="nm">${x.n}${x.d?`<small>${x.d}</small>`:''}</div><span class="du">${[gl(x),fmtMin(x.t)].filter(Boolean).join(' · ')}</span><span class="pc">${rub(x.p)}${x.p3?`<small>${x.c==='lpg'?'':'3 сеанса: '}${rub(x.p3)}</small>`:''}</span><span class="add" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span></div>`;
  function render(anim){
    const r=rows();const all=!!(q&&q.value.trim());const lim=all?r.length:Math.min(shown,r.length);
    const h0=list.offsetHeight;let html='',last=null;
    if(!r.length)html='<div class="pr-empty">Ничего не нашлось. Попробуйте другое слово или напишите мастеру.</div>';
    r.slice(0,lim).forEach((x,i)=>{const key=sort==='def'?(x.c+'|'+x.grp):null;if(key&&key!==last){last=key;html+=`<div class="pr-group${i>=prevShown&&anim==='more'?' new':''}"><small>${x.grp?'':String(order.indexOf(x.c)+1).padStart(2,'0')}</small>${x.grp?CATN[x.c]+': '+x.grp.toLowerCase():CATN[x.c]}</div>`}html+=item(x,i,anim==='more'?prevShown:9999)});
    list.innerHTML=html;prevShown=lim;
    if(more){more.style.display=(!all&&r.length>lim)?'':'none';less.style.display=(!all&&lim>=r.length&&r.length>STEP&&shown>STEP)?'':'none';btns.style.display=(more.style.display==='none'&&less.style.display==='none')?'none':'flex'}
    const gs=$('.pr-gender',root);if(gs)gs.style.visibility=hasG()?'':'hidden';
    if(anim){const h1=list.offsetHeight;if(h0!==h1)list.animate([{height:h0+'px'},{height:h1+'px'}],{duration:anim==='less'?650:700,easing:'cubic-bezier(.22,.8,.2,1)'})}
  }
  const reset=()=>{shown=STEP;prevShown=0;render('filter')};
  cats&&cats.addEventListener('click',e=>{const b=e.target.closest('.cat');if(!b)return;cat=b.dataset.c;$$('.cat',cats).forEach(x=>x.classList.toggle('on',x===b));reset()});
  q&&q.addEventListener('input',()=>{shown=STEP;render()});
  segInit($('.pr-gender',root),v=>{gen=v;reset()});
  selInit($('.pr-sort',root),v=>{sort=v;reset()});
  more&&more.addEventListener('click',()=>{shown+=STEP;render('more')});
  less&&less.addEventListener('click',()=>{shown=STEP;render('less');scrollToEl(root)});
  const pick=el=>{const x=SPH.items[+el.dataset.add];openBook(`${CATN[x.c]}: ${x.n}${x.g==='m'?' (для него)':''}`,x.c)};
  list.addEventListener('click',e=>{const b=e.target.closest('[data-add]');b&&pick(b)});
  list.addEventListener('keydown',e=>{if(e.key==='Enter'){const b=e.target.closest('[data-add]');b&&pick(b)}});
  root._goto=c=>{if(fixed)return;cat=c;cats&&$$('.cat',cats).forEach(x=>x.classList.toggle('on',x.dataset.c===c));shown=STEP;render()};
  render();
}
safe('prices',()=>$$('[data-prices]').forEach(initPrices));
window.prGoto=c=>{const r=$('[data-prices]');r&&r._goto&&r._goto(c)};

/* ---------- CONSTRUCTOR ---------- */
safe('constructor',()=>{
  const root=$('#cons');if(!root)return;
  const Z=SPH.cons;let method=root.dataset.method||'laser',gender='w',sel=new Set();
  const box=$('#zones',root);const key=()=>method+'-'+gender;
  const CK='<span class="ck"><svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span>';
  function draw(){const d=Z[key()];box.innerHTML=d.zones.map(z=>`<button class="zone${sel.has(z[0])?' on':''}" data-z="${z[0]}">${CK}<span class="zt">${z[1]} <small>${rub(z[2])}</small></span></button>`).join('');calc()}
  function best(d){const zp=Object.fromEntries(d.zones.map(z=>[z[0],z]));let R={save:0,use:[]};const n=d.cx.length;
    for(let m=1;m<(1<<n);m++){const used=new Set();let ok=true,save=0,use=[];
      for(let i=0;i<n;i++)if(m&(1<<i)){const c=d.cx[i];if(!c[1].every(z=>sel.has(z)&&!used.has(z)&&zp[z])){ok=false;break}c[1].forEach(z=>used.add(z));save+=c[1].reduce((s,z)=>s+zp[z][2],0)-c[2];use.push(c)}
      if(ok&&save>R.save)R={save,use}}return R}
  function calc(){
    const d=Z[key()],zp=Object.fromEntries(d.zones.map(z=>[z[0],z]));const ul=$('#sumList',root);
    if(!sel.size){ul.innerHTML='<li class="sum-empty">Выберите хотя бы одну зону</li>';$('#sumTotal',root).textContent='0 ₽';$('#sumSave',root).textContent='';$('#sumTime',root).textContent='';return}
    const b=best(d);const inCx=new Set(b.use.flatMap(c=>c[1]));let total=0,time=0,lines=[];
    b.use.forEach(c=>{total+=c[2];time+=c[3]||0;lines.push(`<li class="cx"><span>${c[0]}</span><span>${rub(c[2])}</span></li>`)});
    let mzSave=0;
    [...sel].filter(z=>!inCx.has(z)).forEach(z=>{let pr=zp[z][2];if(z==='mz'&&d.mzInCx&&b.use.length){mzSave=pr-d.mzInCx;pr=d.mzInCx}total+=pr;time+=zp[z][3]||0;lines.push(`<li><span>${zp[z][1]}${z==='mz'&&mzSave?' (в комплексе)':''}</span><span>${rub(pr)}</span></li>`)});
    ul.innerHTML=lines.join('');$('#sumTotal',root).textContent=rub(total);
    const sv=b.save+mzSave;$('#sumSave',root).textContent=sv?`Комплекс выгоднее на ${rub(sv)}`:'';
    const unknown=[...sel].some(z=>!inCx.has(z)&&!zp[z][3])||b.use.some(c=>!c[3]);
    $('#sumTime',root).textContent=time&&!unknown?`Примерно ${fmtMin(time)} у мастера`:'';
    root._msg=`Здравствуйте! Хочу записаться: ${method==='laser'?'лазерная эпиляция':'депиляция (воск/шугаринг)'}, ${gender==='w'?'для неё':'для него'}.\n`+b.use.map(c=>'• '+c[0]).concat([...sel].filter(z=>!inCx.has(z)).map(z=>'• '+zp[z][1])).join('\n')+`\nПо прайсу: ${rub(total)}`;
  }
  box.addEventListener('click',e=>{const b=e.target.closest('.zone');if(!b)return;const z=b.dataset.z,d=Z[key()];
    if(sel.has(z))sel.delete(z);else{sel.add(z);(d.excl||[]).forEach(p=>{if(p.includes(z))p.forEach(o=>o!==z&&sel.delete(o))})}
    $$('.zone',box).forEach(x=>x.classList.toggle('on',sel.has(x.dataset.z)));calc()});
  segInit($('#cMethod',root),v=>{method=v;sel.clear();draw()});
  segInit($('#cGender',root),v=>{gender=v;sel.clear();draw()});
  $('#sumSend',root).addEventListener('click',()=>{if(!sel.size){box.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:350});return}window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(root._msg),'_blank')});
  sel.add('gb');sel.add('pv');draw();
});

/* ---------- TATTOO CALCULATOR ---------- */
safe('tattoo',()=>{
  const root=$('#tatCalc');if(!root)return;const T=SPH.tattoo;let i=2,pig='d',ses='1';
  const sizes=$('.tc-sizes',root),fig=$('.tc-fig',root),rect=$('.tc-rect',root);
  sizes.innerHTML=T.map((t,k)=>`<button class="tc-size${k===i?' on':''}" data-i="${k}"><b>${t.code}</b><span>${t.area}</span></button>`).join('');
  const bars=$('.tc-bars',root);const MX=Math.max(...T.map(t=>t.c3));
  if(bars)bars.innerHTML=T.map((t,k)=>`<button class="tc-bar" data-i="${k}" aria-label="${t.code}"><i></i><span>${t.code}</span></button>`).join('');
  function draw(){
    const t=T[i];$$('.tc-size',sizes).forEach((b,k)=>b.classList.toggle('on',k===i));
    // scale: figure is a forearm-like area 20x34 cm
    const W=24,H=32;rect.style.width=Math.min(100,t.w/W*100)+'%';rect.style.height=Math.min(100,t.h/H*100)+'%';
    rect.dataset.label=t.code==='XXL'?'от 20×30 см':(t.w+'×'+t.h+' см');
    const one=pig==='d'?t.d1:t.c1,three=pig==='d'?t.d3:t.c3;const per=Math.round(three/3);
    $('.tc-name',root).textContent=t.n+' · '+t.area;$('.tc-ex',root).textContent=t.ex[0].toUpperCase()+t.ex.slice(1);
    $('.tc-price',root).textContent=rub(ses==='1'?one:three);
    $('.tc-note',root).textContent=ses==='1'?`Курс из 3 сеансов: ${rub(three)}, это ${rub(per)} за сеанс`:`Экономия ${rub(one*3-three)} по сравнению с оплатой по одному сеансу`;
    if(bars)$$('.tc-bar',bars).forEach((b,k)=>{const tt=T[k],v=ses==='1'?(pig==='d'?tt.d1:tt.c1):(pig==='d'?tt.d3:tt.c3);const mx=ses==='1'?Math.max(...T.map(z=>z.c1)):MX;$('i',b).style.height=(8+v/mx*92)+'%';$('i',b).dataset.v=rub(v).replace(' ₽','');b.classList.toggle('on',k===i)});
    root._msg=`Здравствуйте! Хочу записаться на удаление тату: ${t.n.toLowerCase()} (${t.area}), ${pig==='d'?'тёмный':'цветной'} пигмент, ${ses==='1'?'1 сеанс':'курс 3 сеанса'}. По прайсу: ${rub(ses==='1'?one:three)}`;
  }
  root.addEventListener('click',e=>{const b=e.target.closest('.tc-size,.tc-bar');if(!b)return;i=+b.dataset.i;draw()});
  segInit($('.tc-pig',root),v=>{pig=v;rect.classList.toggle('color',v==='c');draw()});
  segInit($('.tc-ses',root),v=>{ses=v;draw()});
  $('.tc-send',root).addEventListener('click',()=>openBook(root._msg.replace('Здравствуйте! Хочу записаться на ','').replace(/^./,c=>c.toUpperCase()),'tattoo'));
  draw();
});

/* ---------- RESULTS GALLERY ---------- */
safe('results',()=>{
  $$('[data-results]').forEach(root=>{
    const grid=$('.rs-grid',root),filt=$('.rs-filter',root);const limit=+(root.dataset.limit||0);let limitAll=false;const fixed=root.dataset.results;
    const RN={epil:'Эпиляция',tattoo:'Тату',pmu:'Татуаж',carbon:'Карбон',photo:'Пигмент и омоложение',vessels:'Сосуды'};
    let cur=fixed&&fixed!=='all'?fixed:'all';
    const pool=()=>SPH.results.filter(r=>cur==='all'||cur.split(',').includes(r.cat));
    if(filt){const present=[...new Set(SPH.results.map(r=>r.cat))];filt.innerHTML='<button class="cat on" data-c="all">Все</button>'+Object.keys(RN).filter(k=>present.includes(k)).map(k=>`<button class="cat" data-c="${k}">${RN[k]}</button>`).join('');
      filt.addEventListener('click',e=>{const b=e.target.closest('.cat');if(!b)return;cur=b.dataset.c;$$('.cat',filt).forEach(x=>x.classList.toggle('on',x===b));draw()})}
    function draw(){
      let r=pool();if(cur==='all')r=[...r.filter(x=>x.own),...r.filter(x=>!x.own)];if(limit&&!limitAll)r=r.slice(0,limit);
      grid.innerHTML=r.map((x,k)=>`<figure class="rs-card" style="--d:${k*40}ms" data-cur="photo" data-label="Смотреть" data-lb="${BASE}img/${x.src}"><img src="${BASE}img/${x.src}" alt="${x.t}: до и после" loading="lazy" width="${x.w}" height="${x.h}"><figcaption><b>${x.t}</b><span>${x.n?(x.n+' '+(x.n===1?'процедура':x.n<5?'процедуры':'процедур')+(x.iv?' · интервал '+x.iv:'')):RN[x.cat]}</span>${x.own?'<i class="own">Работа студии</i>':''}</figcaption></figure>`).join('');
    }
    draw();
    const mb=$('.rs-more button',root);
    if(mb){const upd=()=>{mb.parentElement.style.display=(limit&&pool().length>limit)?'':'none'};upd();
      mb.addEventListener('click',()=>{limitAll=true;draw();mb.parentElement.style.display='none'});
      filt&&filt.addEventListener('click',()=>{if(!limitAll)upd()})}
  });
});

/* ---------- TABS & ACCORDIONS ---------- */
$$('.tabs').forEach(tb=>{const panes=tb.nextElementSibling;if(!panes||!panes.classList.contains('tpanes'))return;
  $$('.tab',tb).forEach((b,i)=>b.addEventListener('click',()=>{$$('.tab',tb).forEach(x=>x.classList.toggle('on',x===b));[...panes.children].forEach((p,k)=>p.classList.toggle('on',k===i))}))});
$$('.acc').forEach(acc=>acc.addEventListener('click',e=>{const q=e.target.closest('.acc-q');if(!q)return;const it=q.parentElement;const was=it.classList.contains('open');$$('.acc-i',acc).forEach(x=>x.classList.remove('open'));if(!was)it.classList.add('open')}));

/* ---------- MODAL ---------- */
const modal=$('#modal');
selInit($('#fSvc'));
function openBook(note,cat){
  const map={laser:'Лазерная эпиляция',tattoo:'Удаление тату',pmu:'Удаление татуажа',carbon:'Карбоновый пилинг',photo:'Фотоомоложение',vessels:'Удаление сосудов',depil:'Воск или шугаринг',lpg:'LPG-массаж'};
  if(cat&&map[cat])$('#fSvc')._set(map[cat]);
  if(note){$('#fNote').value=note}
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');lenis&&lenis.stop();
}
function closeBook(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');lenis&&lenis.start()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-book]');if(b){e.preventDefault();closeMenu();openBook(b.dataset.note||'',b.dataset.book||'')}if(e.target.closest('[data-close]'))closeBook()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeBook();closeLb();closeMenu()}});
safe('form',()=>{const ph=$('#fPhone');
ph.addEventListener('input',()=>{let d=ph.value.replace(/\D/g,'');if(d.startsWith('8'))d='7'+d.slice(1);if(!d.startsWith('7'))d='7'+d;d=d.slice(0,11);let s='+7';if(d.length>1)s+=' '+d.slice(1,4);if(d.length>4)s+=' '+d.slice(4,7);if(d.length>7)s+='-'+d.slice(7,9);if(d.length>9)s+='-'+d.slice(9,11);ph.value=s});
$('#bookForm').addEventListener('submit',e=>{e.preventDefault();const n=$('#fName'),p=$('#fPhone');let ok=true;
  [[n,n.value.trim().length>1],[p,p.value.replace(/\D/g,'').length===11]].forEach(([el,v])=>{el.parentElement.classList.toggle('err',!v);if(!v)ok=false});if(!ok)return;
  const t=`Здравствуйте! Хочу записаться в «Сфинкс».\nИмя: ${n.value.trim()}\nТелефон: ${p.value}\nУслуга: ${$('#fSvc').dataset.value}`+($('#fNote').value.trim()?`\nКомментарий: ${$('#fNote').value.trim()}`:'');
  window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(t),'_blank');});
});

/* ---------- LIGHTBOX ---------- */
const lb=$('#lb');
document.addEventListener('click',e=>{const t=e.target.closest('[data-lb]');if(t){$('img',lb).src=t.dataset.lb;lb.classList.add('open');lenis&&lenis.stop()}});
function closeLb(){if(lb.classList.contains('open')){lb.classList.remove('open');lenis&&lenis.start()}}
lb.addEventListener('click',closeLb);

/* ---------- MENU ---------- */
function closeMenu(){if(document.body.classList.contains('menu-open')){document.body.classList.remove('menu-open');lenis&&lenis.start()}}
$('#burger').addEventListener('click',()=>{const o=document.body.classList.toggle('menu-open');o?lenis&&lenis.stop():lenis&&lenis.start()});
$$('.mm-nav a').forEach(a=>a.addEventListener('click',closeMenu));
$$('.nav-dd').forEach(d=>{const b=$('.nav-dd-btn',d);b&&b.addEventListener('click',e=>{e.stopPropagation();d.classList.toggle('open')})});
document.addEventListener('click',e=>{if(!e.target.closest('.nav-dd'))$$('.nav-dd.open').forEach(d=>d.classList.remove('open'))});

/* ---------- SCROLL ---------- */
function scrollToEl(sel){const el=typeof sel==='string'?$(sel):sel;if(!el)return;const off=-70;if(lenis)lenis.scrollTo(el,{offset:off,duration:1.4});else scrollTo({top:el.getBoundingClientRect().top+scrollY+off,behavior:'smooth'})}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const h=a.getAttribute('href');if(h.length<2)return;e.preventDefault();closeMenu();setTimeout(()=>scrollToEl(h),10)});
try{lenis=new Lenis({duration:1.15,smoothWheel:true,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t))});function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf)}catch(e){}
if(location.hash.length>1)setTimeout(()=>scrollToEl(location.hash),400);
const hdr=$('#hdr'),fab=$('#fab');let lastY=0;
function onScroll(){const y=scrollY;hdr.classList.toggle('scrolled',y>30);hdr.classList.toggle('hide',y>lastY&&y>500&&!document.body.classList.contains('menu-open'));lastY=y;fab&&fab.classList.toggle('hidden',y<innerHeight*.6)}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* ---------- REVEAL ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
const observeReveal=()=>$$('.rv-up:not(.in)').forEach(el=>io.observe(el));observeReveal();
safe('pulse',()=>{const pv=$('#pulseViz');if(pv)new IntersectionObserver(es=>es.forEach(e=>pv.classList.toggle('run',e.isIntersecting))).observe(pv)});

/* ---------- MAP ---------- */
safe('map',()=>{
  if(!window.L||!$('#map'))return;const ll=[48.539067,135.091006];
  const m=L.map('map',{scrollWheelZoom:false,zoomControl:true,attributionControl:true}).setView([ll[0]+.0012,ll[1]],16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);
  L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="pin">'+($('#pinMark')?$('#pinMark').innerHTML:'')+'</div>',iconSize:[54,54],iconAnchor:[27,27]})}).addTo(m);
  m.attributionControl.setPrefix('');
});

/* ---------- MYTHS ---------- */
safe('myths',()=>{
  const g=$('#mythGrid');if(!g)return;
  const M={
    rak:['Лазер может вызвать рак кожи','Эпиляционный лазер работает в неионизирующем спектре: его энергии не хватает, чтобы повредить ДНК. Он нагревает пигмент волоса, а не клетки. Родинки мастер закрывает или обходит.'],
    gorm:['Влияет на гормоны, яичники и лимфоузлы','Лазер проникает в кожу всего на несколько миллиметров и действует только на пигмент. До внутренних органов он просто не достаёт.'],
    zud:['Зуд после процедуры значит аллергия','Чаще всего это нормальная реакция кожи на нагрев. Проходит за 1–3 дня. Помогают холод, увлажнение и правило «не трогать».'],
    vosk:['Воск и шугаринг тоже эпиляция','Это долгая депиляция: волос вырывается с луковицей, но фолликул остаётся живым. Через 3–4 недели волос вернётся.'],
    home:['Домашний фотоэпилятор не хуже салона','Он замедляет рост, но не удаляет волос полностью. А истончённые им волосы потом хуже поддаются лазеру, так что скажите об этом мастеру.'],
    light:['Светлые волосы лазер не берёт','Насадка IPLASER 755 работает, если волос хоть немного темнее кожи. Просто на светлые волосы уйдёт больше сеансов.'],
    one:['Тату удаляется за один сеанс','Лазер дробит пигмент, а выводит его сам организм. Поэтому нужен курс с паузой 8–12 недель. Небольшой тёмной работе иногда хватает пары сеансов, крупной цветной нужно больше.'],
    scar:['После удаления тату останется шрам','Nd:YAG бьёт по пигменту и почти не задевает кожу вокруг. Рубцы появляются, когда сдирают корочки или сокращают интервалы, поэтому памятку по уходу Виктория даёт каждому.'],
    color:['Цветные тату лазер не выводит','У аппарата две длины волны: 1064 нм для тёмных пигментов и 532 нм для тёплых оттенков. Некоторые цвета уходят дольше, это мастер честно скажет на консультации.'],
    cover:['Старый татуаж можно только перекрыть','Перекрытие часто даёт тяжёлый и неровный цвет. Лазер осветляет старую работу, и новый мастер начинает почти с чистого листа.']
  };
  const keys=(g.dataset.myths||'rak,gorm,light,one,scar,color').split(',');
  const TURN='<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"/></svg>';
  g.innerHTML=keys.map((k,i)=>{const m=M[k];return `<div class="myth rv-up d${i%3}" tabindex="0" role="button" aria-label="Миф: ${m[0]}"><div class="myth-in"><div class="mf"><span class="tg">Миф ${String(i+1).padStart(2,'0')}</span><h3>${m[0]}</h3><span class="turn">${TURN}Узнать правду</span></div><div class="mb"><span class="tg">Факт</span><p>${m[1]}</p></div></div></div>`}).join('');
  g.addEventListener('click',e=>{const c=e.target.closest('.myth');c&&c.classList.toggle('flip')});
  g.addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest('.myth');c&&c.classList.toggle('flip')}});
  observeReveal();
});

/* ---------- REVIEWS ---------- */
safe('reviews',()=>{
  const deck=$('#deck');if(!deck)return;
  const G='https://2gis.ru/khabarovsk/firm/70000001082054646/tab/reviews',D='https://dikidi.net/1466092';
  const R=[
    ['Городской житель','Буквально с 3 раза я перестала пользоваться бритвой.','Лазер',G],
    ['Nastya K','Я в восторге от этого места. До этого ходила около года на другой лазер, эффект был никакой.','Лазер',G],
    ['Кристина Щербина','Ничего не знала об этом, решила попробовать впервые, очень боялась. Процедура абсолютно комфортная, приятнее, чем шугаринг.','Лазер',G],
    ['Виктория S','Посещаю массаж LPG, результат просто вау: целлюлит разгладился, как будто новая кожа.','LPG',G],
    ['Светлана Усик','В студии «Сфинкс» соотношение качество/цена прям 10 из 10.','Лазер',G],
    ['Анна Харланова','Чистенько, уютно. Мастер приятная в общении и со знанием своего дела. Результат виден после второй процедуры.','Лазер',G],
    ['Татьяна Фартусова','Рассказала всё подробно о лазерной эпиляции и уходе, постоянно уточняла, комфортно ли мне. Почти не больно, а самое главное быстро!','Лазер',D],
    ['Юля Соло','Результат увидела сразу после первого раза. Очень приятный и компетентный мастер.','Лазер',G],
    ['Виктория Поспелова','Впервые была на данной процедуре, не знала, чего ожидать. Оказалось, всё быстро и просто.','Лазер',G],
    ['Sairi San','Это самый лучший мастер по лазерной эпиляции, однозначно плюс за понимание.','Лазер',G]
  ];
  const N=R.length;let order=R.map((_,i)=>i),busy=false;
  deck.insertAdjacentHTML('beforeend',R.map((r,i)=>`<article class="rv-card" data-i="${i}"><span class="tag">${r[2]}</span><q>${r[1]}</q><div class="who"><span class="av">${r[0][0]}</span><div><b>${r[0]}</b><a href="${r[3]}" target="_blank" rel="noopener">${r[3]===D?'DIKIDI':'2ГИС'}</a></div></div></article>`).join(''));
  const cards=$$('.rv-card',deck);
  const POS=[[0,0,0,1],[34,18,5,.96],[-30,34,-5,.92],[0,46,0,.88]];
  function lay(){order.forEach((ci,k)=>{const c=cards[ci],p=POS[Math.min(k,3)];c.style.zIndex=N-k;c.style.opacity=k>2?0:1;c.style.transform=`translate(${p[0]}px,${p[1]}px) rotate(${p[2]}deg) scale(${p[3]})`;c.classList.toggle('top',k===0);c.style.pointerEvents=k===0?'auto':'none'});
    $('#rvNum').textContent=String(order[0]+1).padStart(2,'0');$('#rvAll').textContent='/ '+N;$('#rvBar').style.width=((order[0]+1)/N*100)+'%'}
  function next(dir=-1){if(busy)return;busy=true;const c=cards[order[0]];c.style.transform=`translate(${dir*120}%,-10px) rotate(${dir*14}deg)`;c.style.opacity=0;
    setTimeout(()=>{order.push(order.shift());c.style.transition='none';lay();c.offsetHeight;c.style.transition='';busy=false},420)}
  function prev(){if(busy)return;busy=true;const ci=order.pop();order.unshift(ci);const c=cards[ci];c.style.transition='none';c.style.zIndex=N+1;c.style.opacity=0;c.style.transform='translate(-120%,-10px) rotate(-14deg)';c.offsetHeight;c.style.transition='';requestAnimationFrame(()=>{lay();setTimeout(()=>busy=false,500)})}
  $('#rvNext').onclick=()=>next(-1);$('#rvPrev').onclick=prev;
  let sx=0,sy=0,dx=0,drag=null;
  deck.addEventListener('pointerdown',e=>{const c=e.target.closest('.rv-card.top');if(!c||e.target.closest('a'))return;drag=c;sx=e.clientX;sy=e.clientY;dx=0;c.classList.add('drag');c.setPointerCapture(e.pointerId)});
  deck.addEventListener('pointermove',e=>{if(!drag)return;dx=e.clientX-sx;const dy=e.clientY-sy;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dx)<10)return;drag.style.transform=`translate(${dx}px,${dy*.15}px) rotate(${dx/18}deg)`});
  const up=()=>{if(!drag)return;const c=drag;drag=null;c.classList.remove('drag');if(Math.abs(dx)>90)next(dx<0?-1:1);else lay()};
  deck.addEventListener('pointerup',up);deck.addEventListener('pointercancel',up);
  lay();
});

/* ---------- SERVICES INDEX ---------- */
safe('services',()=>{
  const rows=$$('.svc-row'),med=$('#svcMedia');if(!rows.length||!med)return;let cur=rows[0],tm;
  const act=r=>{if(r===cur)return;cur=r;rows.forEach(x=>x.classList.toggle('on',x===r));med.classList.add('fade');clearTimeout(tm);tm=setTimeout(()=>{$('#svcNum').textContent=$('.n',r).textContent;$('#svcName').textContent=$('h3',r).textContent;$('#svcFrom').textContent=r.dataset.from;$('#svcMeta').textContent=r.dataset.meta;const g=$('#svcGo');g.dataset.goto=r.dataset.cat;g.setAttribute('href',r.dataset.href||'#prices');med.classList.remove('fade');med.classList.toggle('sw')},260)};
  rows.forEach(r=>{r.addEventListener('mouseenter',()=>act(r));r.addEventListener('click',e=>{if(e.target.closest('a'))return;if(matchMedia('(min-width:901px)').matches){act(r);const h=r.dataset.href||'#prices';if(h[0]==='#'){window.prGoto&&prGoto(r.dataset.cat);scrollToEl(h)}else location.href=h}})});
});
document.addEventListener('click',e=>{const a=e.target.closest('[data-goto]');if(a&&window.prGoto)prGoto(a.dataset.goto)},true);

/* ---------- CURSOR ---------- */
safe('cursor',()=>{
  if(!matchMedia('(hover:hover) and (pointer:fine)').matches||!$('#cur'))return;document.body.classList.add('has-cur');
  const c=$('#cur'),ring=$('.cur-ring',c),dot=$('.cur-dot',c),lab=$('span',ring);let x=-100,y=-100,rx=x,ry=y,on=false;
  addEventListener('mousemove',e=>{x=e.clientX;y=e.clientY;if(!on){on=true;rx=x;ry=y;c.classList.add('ready')}dot.style.transform=`translate(${x}px,${y}px)`},{passive:true});
  (function f(){rx+=(x-rx)*.2;ry+=(y-ry)*.2;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(f)})();
  document.addEventListener('mouseover',e=>{const t=e.target;
    const ph=t.closest('[data-cur=photo]'),lk=t.closest('a,button,.zone,.svc-row,.myth,.pr-item,.sel-btn,.sel-list li,.rv-card,.tc-size,.sv-card');
    c.classList.remove('photo','link');
    if(t.closest('input,textarea'))return;
    if(lk)c.classList.add('link');
    else if(ph){c.classList.add('photo');lab.textContent=ph.dataset.label||''}
  });
  document.documentElement.addEventListener('mouseleave',()=>c.classList.remove('ready'));document.documentElement.addEventListener('mouseenter',()=>on&&c.classList.add('ready'));
});
