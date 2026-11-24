const main=document.querySelector('main');
function el(tag,text,parent,cls){
  const node=document.createElement(tag);
  if(text)node.textContent=text;
  if(cls)node.className=cls;
  parent.append(node);return node;
}
function link(text,path,parent,cls){const a=el('a',text,parent,cls);a.href='#'+path;return a;}
function row(title,path,detail){
  const a=link('',path,main,'row'),label=el('span',title,a);
  el('small',detail,label);el('i','›',a).setAttribute('aria-hidden','true');
}
function albumCard(grid,path,title,subtitle){
  const a=link('',path,grid,'card'), cover=el('div','',a,'cover');
  const image=el('img','',cover);image.src='academy.jpg';image.alt='';
  el('strong',title,a);el('small',subtitle,a);
}
function render(){
  const [tab,cid,oid,lid,rid]=location.hash.slice(1).split('/');
  const s=catalog.sections.find(x=>x.id===tab)||catalog.sections[0];
  main.replaceChildren();
  const nav=document.querySelector('nav');nav.replaceChildren();
  for(const item of catalog.sections){
    const a=link(item.tab,item.id,nav);
    if(item.id===s.id)a.setAttribute('aria-current','page');
  }
  const course=catalog.courses.find(c=>c.id===cid);
  const offerings=catalog.offerings.filter(o=>o.course===cid);
  const offering=offerings.find(o=>o.id===oid)||offerings[0];
  const lesson=catalog.lessons.find(l=>l.id===lid&&l.course===cid);
  const base=course&&offering?[s.id,cid,offering.id].join('/'):'';
  const entries=catalog.placements.filter(p=>p.lesson===lid&&(!p.offering||p.offering===offering?.id));
  const ids=s.kind==='library'?catalog.hymnLibraryIDs:entries.map(p=>p.resource);
  const resource=catalog.resources.find(r=>r.id===(s.kind==='library'?cid:rid)&&ids.includes(r.id));
  const album=s.kind==='library'&&catalog.albums.find(a=>a.id===cid);
  if(album){
    const path='library/'+album.id;
    link('‹ Hymns Library',s.id,main,'back');
    el('h1',album.title,main);
    if(oid==='lectures'||oid==='sources'){
      recordings(album,{id:'album-'+album.id},oid,path);
    }else{
      row('Lectures',path+'/lectures','Instructional recordings');
      row('Source Recordings',path+'/sources','Hymn recordings for practice');
    }
  }else if(resource){
    link('‹ '+(lesson?.title||s.tab),lesson?base+'/'+lid:s.id,main,'back');
    el('h1',resource.title,main);el('small',resource.kind,main);el('p',resource.detail,main);
  }else if(lesson&&base){
    link('‹ '+course.title,base,main,'back');el('h1',lesson.title,main);
    el('p',course.title+' · '+offering.academicYear,main);el('h2','Lesson resources',main);
    for(const id of ids){const r=catalog.resources.find(x=>x.id===id);row(r.title,base+'/'+lid+'/'+id,r.kind);}
  }else if(course&&base){
    link('‹ '+s.tab,s.id,main,'back');el('h1',course.title,main);
    const label=el('label','Academic year',main,'year'),select=el('select','',label);
    for(const o of offerings)select.add(new Option(o.academicYear,o.id,false,o.id===offering.id));
    select.onchange=()=>location.hash=[s.id,cid,select.value].join('/');
    if(lid==='lectures'||lid==='sources'){recordings(course,offering,lid,base);}else{
    row('Lectures',base+'/lectures','Class lectures and instruction');
    row('Source Recordings',base+'/sources','Reference audio for practice');
    if(catalog.lessons.some(l=>l.course===cid))el('h2','Lessons',main);
    for(const l of catalog.lessons.filter(x=>x.course===cid))row(l.title,base+'/'+l.id,'View resources');
    }
  }else{
    el('h1',s.title,main);
    if(s.kind==='library'){el('p','Choose an album to listen to or upload recordings.',main);
      for(const group of new Set(catalog.albums.map(a=>a.group))){
        el('h2',group,main);const grid=el('div','',main,'grid');
        for(const album of catalog.albums.filter(a=>a.group===group))
          albumCard(grid,s.id+'/'+album.id,album.title,'');
      }
      if(ids.length)el('h2','Related resources',main);for(const id of ids){const r=catalog.resources.find(x=>x.id===id);row(r.title,s.id+'/'+id,r.kind);}}
    else{
      const years=catalog.years.filter(y=>y.section===s.id);
      el('p',years.length?'Choose a course to see its lessons.':'Courses will appear here when materials are added.',main);
      for(const y of years){
        el('h2',y.title,main);const grid=el('div','',main,'grid');
        for(const g of catalog.classes.filter(x=>x.year===y.id))for(const c of catalog.courses.filter(x=>x.group===g.id)){
          albumCard(grid,s.id+'/'+c.id,c.title,g.title);
        }
      }
    }
  }
  el('footer','SGHA Study Library',main);
  document.title=main.querySelector('h1').textContent+' · SGHA';window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);render();
function setupThemeMenu() {
  const header = document.querySelector('header');
  if (!header || header.querySelector('.sgha-theme-menu')) return;

  const storageKey = 'sgha-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const choices = {
    system: 'System',
    light: 'Light',
    dark: 'Dark'
  };

  let preference = 'system';
  try {
    const saved = localStorage.getItem(storageKey);
    if (Object.hasOwn(choices, saved)) preference = saved;
  } catch {
    // The menu still works if browser storage is unavailable.
  }

  const label = document.createElement('label');
  label.className = 'sgha-theme-menu';
  label.append('Theme');

  const select = document.createElement('select');
  for (const [value, title] of Object.entries(choices)) {
    select.add(new Option(title, value));
  }
  select.value = preference;
  label.append(select);
  header.append(label);

  function applyTheme() {
    const deviceTheme = systemTheme.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme =
      preference === 'system' ? deviceTheme : preference;
  }

  select.addEventListener('change', () => {
    preference = select.value;
    applyTheme();
    try {
      localStorage.setItem(storageKey, preference);
    } catch {
      // Keep the current choice for this visit.
    }
  });

  systemTheme.addEventListener('change', applyTheme);
  applyTheme();
}

setupThemeMenu();