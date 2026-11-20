import { initialContent, journalIllustrations, projects } from './content.js';
import { mountCabinet } from './cabinet/cabinet.js';
import { mountPortraitReveal } from './portrait-reveal.js';
import { mountNameParticles } from './name-particles.js';
import { mountHeroStickers } from './hero-stickers.js';
import { mountAboutTags } from './about-tags.js';
import { mountAboutInterests } from './about-interests.js';
import { mountJournalBook } from './journal-book.js';
import { renderLifeTimeline } from './life-timeline.js';
import { pages, mountModuleFrame, mountPageNavigation } from './page-navigation.js';

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeHTML;
const STORAGE='feiyang-journal-v1';
const safeURL = url => {if(typeof url!=='string'||!url.trim())return '';try{const u=new URL(url,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const safeImage = value => typeof value==='string' && (/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)||/^assets\/[a-zA-Z0-9_./-]+$/.test(value)) ? value : '';
let content=structuredClone(initialContent), saved=new Set(), workFilter='全部', timeFilter='全部', collectFilter='全部';
let pageNavigation;
const diary = mountJournalBook($('#journal'), journalIllustrations);
const moduleInfo={map:{title:'猪的世界足迹',path:'modules/map.html'},music:{title:'Music of Love · 音乐墙',path:'modules/music.html'},books:{title:'猪的读书角',path:'modules/books.html'}};
const contentKinds=['timeline','honors','collections','posts'];
function validEntry(x){return x && typeof x==='object' && typeof x.id==='string' && typeof x.title==='string' && ['body','date','category','subtitle','excerpt','image','url','module'].every(k=>x[k]===undefined||typeof x[k]==='string');}
function validContent(c){return c && typeof c==='object' && c.profile && typeof c.profile.name==='string' && contentKinds.every(k=>Array.isArray(c[k])&&c[k].length<=500&&c[k].every(validEntry)) && (c.trash===undefined||(Array.isArray(c.trash)&&c.trash.length<=2000&&c.trash.every(x=>x&&contentKinds.includes(x.kind)&&validEntry(x.entry))));}
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE) || 'null');
  if (validContent(stored)) {
    const previousDefaults = {
      intro: [
        '在数学与感性之间，寻找自己的表达。研究量化，设计产品，也认真收藏生活里那些微小的心动。',
        '数学教我在还没有答案的时候，把问题看久一点。我做量化研究，也设计产品，喜欢把纸上那些模糊的想法带到现实里试一试。',
        '我读数学，也做量化。一条回测曲线看起来挺漂亮，把手续费填进去，可能就瘪了一半。我喜欢回去看亏得最难看的那几天。当时究竟发生了什么？我怎么就那么相信自己的判断？'
      ],
      bio: [
        '数学与应用数学本科生，关注量化金融、金融 AI、产品设计与软件工程。我喜欢从一个问题出发，和伙伴一起把想法变成可复现的研究，或可以触摸的产品。',
        '我也喜欢那些不急着求解的时刻。比如球拍落下前的一秒、山路转弯处的风，还有相机里舍不得删掉的光。长大以后，我还是想认真喜欢这些小事。',
        '以前写自我介绍，恨不得把做过的事填满一页。现在写着写着，常常会删掉一句「我一直」。二十几岁，哪来那么多一直？我还想知道，如果一个下午没人等我交东西，我会怎么过。大概还是会带上相机出门。'
      ]
    };
    for (const [key, values] of Object.entries(previousDefaults)) {
      if (values.includes(stored.profile[key])) stored.profile[key] = initialContent.profile[key];
    }
    content = stored;
  }
  const storedFavorites = JSON.parse(localStorage.getItem(STORAGE + '-saved') || '[]');
  if (Array.isArray(storedFavorites)) saved = new Set(storedFavorites);
} catch { /* retain safe defaults */ }
function persist(next){if(!validContent(next)){toast('未保存：每类最多 500 条内容，请检查备份格式或先整理现有内容。');return false;}try{localStorage.setItem(STORAGE,JSON.stringify(next));content=next;return true;}catch{toast('未能保存。浏览器空间可能不足，请先导出备份或减少图片大小。');return false;}}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function setFilter(group,value){$$('button',group).forEach(b=>{const on=b.dataset.filter===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function renderProfile() {
  $('[data-display-name]').textContent = content.profile.name.toUpperCase();
  for (const element of $$('[data-profile]')) {
    const text = String(content.profile[element.dataset.profile] || '');
    if (!element.hasAttribute('data-profile-paragraphs')) {
      element.textContent = text;
      continue;
    }
    const paragraphs = text.trim().split(/\r?\n[ \t]*\r?\n/).filter(Boolean).map(value => {
      const paragraph = document.createElement('p');
      paragraph.textContent = value;
      return paragraph;
    });
    element.replaceChildren(...paragraphs);
  }
  $('#profile-github').href = safeURL(content.profile.github) || 'https://github.com/ThreshoLdnnis';
  if (pageNavigation) pageNavigation.refreshTitle();
  else document.title = content.profile.name;
}
function renderWorks() {
  const list = projects.filter(project => workFilter === '全部' || project.type === workFilter);
  $('#works-grid').innerHTML = list.length ? list.map(project => {
    const {id, title, year, number, image, description, preview, tag} = project;
    const site = safeURL(project.site);
    const cover = image
      ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`
      : `<span class="wordmark-cover">${esc(title)}</span>`;
    const visual = `
      <span class="work-number">${esc(number)} / ${esc(year)}</span>
      ${cover}
      <span class="work-arrow" aria-hidden="true">↗</span>`;
    const action = site
      ? `<a class="work-visual" href="${esc(site)}" target="_blank" rel="noopener noreferrer" aria-label="打开官网：${esc(title)}">${visual}</a>`
      : `<button type="button" class="work-visual" data-project="${esc(id)}" aria-label="${preview ? '预览作品' : '查看作品'}：${esc(title)}" aria-haspopup="dialog">${visual}</button>`;
    return `<article class="work-card">
      ${action}
      <div class="work-info"><h3>${esc(title)}</h3><span>${esc(tag)}</span></div>
      <p>${esc(description)}</p>
    </article>`;
  }).join('') : '<p class="empty-state" role="status">暂无策略模型</p>';
}
function renderTimeline() {
  const entries = content.timeline.filter(entry => !initialContent.timeline.some(sample =>
    Object.keys(entry).length === Object.keys(sample).length &&
    Object.entries(sample).every(([key, value]) => entry[key] === value)
  ));
  $('#timeline-filters').hidden = !entries.length;
  renderLifeTimeline($('#timeline-list'), entries, timeFilter);
}
function renderCollections(){const q=$('#collection-search').value.trim().toLocaleLowerCase();const list=content.collections.filter(x=>(collectFilter==='全部'||x.category===collectFilter)&&`${x.title} ${x.subtitle} ${x.body}`.toLocaleLowerCase().includes(q));$('#collection-grid').innerHTML=list.length?list.map(x=>{const img=safeImage(x.image);return `<article class="find-card ${img?'':'textual'}">${img?`<img src="${esc(img)}" alt="${esc(x.title)}" loading="lazy">`:''}<span class="find-category">${esc(x.category)} / GOOD FIND</span><h3>${esc(x.title)}</h3><p>${esc(x.subtitle)}</p><div class="find-footer"><button data-collection="${esc(x.id)}">打开收藏 ↗</button><button data-save="${esc(x.id)}" class="${saved.has(x.id)?'saved':''}" aria-label="${saved.has(x.id)?'取消标记':'标记喜欢'}：${esc(x.title)}" aria-pressed="${saved.has(x.id)}">${saved.has(x.id)?'已喜欢':'喜欢 ＋'}</button></div></article>`;}).join(''):`<div class="empty-state"><h3>${q?'没有找到这份收藏。':'这个抽屉，等一份新的心动。'}</h3><p>${q?'试试其他关键词，或者切换分类。':'探店、地点、物品或一句话，都值得被好好留下。'}</p><button class="text-button" data-edit="collections">添加收藏 ＋</button></div>`;}
function renderHonors(){$('#honor-grid').innerHTML=content.honors.length?content.honors.map(x=>`<article class="honor-card"><span>${esc(x.date)} / ${esc(x.category||'荣誉')}</span><h3>${esc(x.title)}</h3><p>${esc(x.subtitle)}</p><p>${esc(x.body)}</p><button class="text-button" data-edit="honors" data-id="${esc(x.id)}">编辑荣誉 ↗</button></article>`).join(''):`<div class="honor-empty"><strong>01.</strong><div><h3>把努力的回响，收藏在这里。</h3><p>这里留给真实的奖项、证书与里程碑。<br>第一份荣誉，由你亲自写下。</p></div><button class="underlined-link" data-edit="honors">记录我的第一份荣誉 ↗</button></div>`;}
function renderAll(postId){renderProfile();renderWorks();renderTimeline();renderCollections();renderHonors();diary.setPosts(content.posts, postId);}

const detailDialog=$('#detail-dialog'), editorDialog=$('#editor-dialog');
const projectPreview = $('#project-preview');
const previewShell = $('.project-preview-shell', projectPreview);
let unmountProjectPreview;

function openProjectPreview(project) {
  unmountProjectPreview?.();
  $('#project-preview-title').textContent = project.title;
  projectPreview.showModal();
  unmountProjectPreview = mountModuleFrame(previewShell, {
    module: project.preview,
    title: project.title,
    loadingText: '正在加载互动预览…',
    preview: true,
  });
}

projectPreview.addEventListener('close', () => {
  if (projectPreview.open) return;
  unmountProjectPreview?.();
  unmountProjectPreview = undefined;
});
let dialogTrigger;
let editorGeneration=0;
editorDialog.addEventListener('close',()=>{editorGeneration++;});
function openDialog(dialog){dialogTrigger=document.activeElement;dialog.showModal();}
function closeDialog(dialog) {
  dialog.close();
  if (dialogTrigger?.isConnected && !dialogTrigger.closest('[hidden]')) {
    dialogTrigger.focus();
  } else {
    $('#page-content').focus({preventScroll:true});
  }
}
function openModule(key){const page=pages.find(p=>p.module===key);if(page)pageNavigation.navigate(page.id);}
$$('.dialog-close').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
[detailDialog,editorDialog].forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}}));
function showArticle(x,kind){const link=safeURL(x.url);$('#detail-content').innerHTML=`<span class="eyebrow">${esc(x.category||x.type||'SELECTED WORK')} ${x.date?' / '+esc(x.date):''}</span><h2>${esc(x.title)}</h2>${safeImage(x.image)?`<img src="${esc(x.image)}" alt="${esc(x.title)}">`:''}<p class="article-meta">${esc(x.subtitle||x.excerpt||'')}</p><div class="article-body">${esc(x.body||x.description||'')}</div>${x.module&&moduleInfo[x.module]?`<button class="primary-button" data-detail-module="${esc(x.module)}">进入完整空间 ↗</button>`:link?`<a class="primary-button" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${kind==='project'?'查看项目':'访问链接'} ↗</a>`:''}${['posts','collections'].includes(kind)?`<div class="article-actions"><button class="text-button" data-detail-edit="${kind}" data-id="${esc(x.id)}">编辑这篇${kind==='posts'?'手记':'收藏'} ↗</button></div>`:''}`;openDialog(detailDialog);}

const schemas={
  timeline:{name:'人生篇章',fields:[['date','时间','text'],['category','篇章类别',['生活','学习','工作','创业']],['title','篇章标题','text'],['subtitle','一句话说明','text'],['body','这一段的故事','textarea']]},
  honors:{name:'个人荣誉',fields:[['date','获奖时间','text'],['category','荣誉类别',['奖项','证书','里程碑']],['title','荣誉名称','text'],['subtitle','颁发机构 / 场合','text'],['body','补充说明','textarea']]},
  collections:{name:'宝藏收藏',fields:[['category','收藏类别',['探店','工具','地点','物品','语录','说说','音乐']],['title','收藏名称','text'],['subtitle','一句话推荐','text'],['url','相关网址（可选）','url'],['body','为什么喜欢 / 地址 / 使用心得','textarea'],['image','配图（可选，JPG / PNG / WebP，2 MB 以内）','file']]},
  posts:{name:'生活手记',fields:[['date','日期','text'],['category','主题','text'],['title','文章标题','text'],['excerpt','简短介绍','text'],['body','正文','textarea']]},
  profile:{name:'个人资料',fields:[['name','英文姓名','text'],['chineseName','中文姓名','text'],['alias','昵称','text'],['intro','个人介绍','textarea'],['bio','详细介绍','textarea'],['github','GitHub 链接','url']]}
};
function openEditor(kind,id){const generation=++editorGeneration;const schema=schemas[kind];if(!schema)return;const current=kind==='profile'?content.profile:content[kind].find(x=>x.id===id)||{date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()).replaceAll('-','.'),category:kind==='posts'?'生活手记':(kind==='timeline'&&timeFilter!=='全部'?timeFilter:undefined)};
$('#editor-content').innerHTML=`<span class="eyebrow">MAKE IT YOURS / 写下自己的版本</span><h2>${id?'编辑':'记录'}${schema.name}</h2><p>修改保存在当前浏览器。可在「内容管理」导出备份，或导入到其他设备。</p><form class="editor-form" id="content-form">${schema.fields.map(([key,label,type])=>`<label>${esc(label)}${Array.isArray(type)?`<select name="${key}">${type.map(v=>`<option ${current[key]===v?'selected':''}>${esc(v)}</option>`).join('')}</select>`:type==='textarea'?`<textarea name="${key}" maxlength="50000" ${key==='body'&&kind==='posts'?'required':''}>${esc(current[key]||'')}</textarea>`:type==='file'?`<input name="${key}" type="file" accept="image/jpeg,image/png,image/webp">`:`<input name="${key}" type="${type}" maxlength="${key==='url'?1500:500}" value="${esc(current[key]||'')}" ${['title','name','chineseName'].includes(key)?'required':''}>`}</label>`).join('')}<div class="form-buttons"><button class="primary-button" type="submit">保存${schema.name} ↗</button>${id?'<button class="delete-button" type="button" id="delete-entry">移到回收站</button>':''}</div></form>`;
if(editorDialog.open)editorDialog.scrollTop=0;else openDialog(editorDialog);
$('#content-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);const value={...current};for(const [key,,type] of schema.fields){if(type!=='file')value[key]=String(data.get(key)||'').trim();}if(value.title!==undefined&&!value.title){toast('请填写标题。');return;}if(value.url && !/^https?:\/\//i.test(value.url)){toast('请使用以 https:// 或 http:// 开头的网址。');return;}if(kind==='profile'&&value.github&&!/^https?:\/\//i.test(value.github)){toast('请输入完整 GitHub 网址。');return;}
const file=data.get('image');if(file instanceof File&&file.size){if(file.size>2*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('请选择 2 MB 以内的 JPG、PNG 或 WebP 图片。');return;}try{value.image=await readImage(file);}catch{toast('图片无法读取，请换一张图片。');return;}}
if(generation!==editorGeneration||!editorDialog.open)return;const next=structuredClone(content);if(kind==='profile')next.profile=value;else{value.id=id||crypto.randomUUID();const index=next[kind].findIndex(x=>x.id===id);if(index>=0)next[kind][index]=value;else next[kind].unshift(value);}if(persist(next)){renderAll(kind==='posts'?value.id:undefined);closeDialog(editorDialog);toast('已保存，新的故事已经在这里。');}});
$('#delete-entry')?.addEventListener('click',()=>{const next=structuredClone(content);const entry=next[kind].find(x=>x.id===id);next.trash=[...(next.trash||[]),{kind,entry}];next[kind]=next[kind].filter(x=>x.id!==id);if(persist(next)){renderAll();closeDialog(editorDialog);toast('已移到回收站，可在内容管理中恢复。');}});
}
function readImage(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>resolve(r.result);img.onerror=reject;img.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}
function downloadContent(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function openManager(){editorGeneration++;$('#editor-content').innerHTML=`<span class="eyebrow">YOUR JOURNAL, YOUR WAY.</span><h2>让它慢慢，变成你的样子。</h2><p>个人资料、时间轴、文章、收藏与荣誉保存在这个浏览器中。导出文件可以备份和迁移这些内容；书架和手办使用各自的备份入口；地图与音乐保留原模块的内容管理方式。导入会替换主站内容，并自动下载导入前的备份。</p><div class="manager-grid">${Object.entries(schemas).map(([k,v])=>`<button data-manager-edit="${k}">${v.name} ＋</button>`).join('')}<button id="restore-entry" ${(content.trash||[]).length?'':'disabled'}>恢复上次移除的内容</button></div><div class="manager-tools"><button class="underlined-link" id="export-data">导出内容备份 ↓</button><label class="underlined-link" style="cursor:pointer">导入内容备份 ↑<input id="import-data" type="file" accept="application/json,.json" hidden></label></div><div class="manager-list">${['posts','collections','timeline','honors'].flatMap(kind=>content[kind].map(x=>`<button data-manager-edit="${kind}" data-id="${esc(x.id)}"><span>${esc(x.title)}</span><small>${schemas[kind].name} ↗</small></button>`)).join('')}</div>`;openDialog(editorDialog);
$('#export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='feiyang-journal-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('内容备份已导出。');});
$('#import-data').addEventListener('change',async e=>{const file=e.target.files[0];const generation=editorGeneration;if(!file)return;try{if(file.size>12*1024*1024)throw Error('oversize');const incoming=JSON.parse(await file.text());if(generation!==editorGeneration||!editorDialog.open)return;if(!validContent(incoming))throw Error('invalid');downloadContent(content,'mofarigano-before-import.json');delete incoming.previousImport;if(persist(incoming)){renderAll();closeDialog(editorDialog);toast('导入成功，导入前的内容备份已下载。');}}catch{toast('无法导入，请选择本网站导出的 JSON 备份（不超过 12 MB）。');}});
$('#restore-entry').addEventListener('click',()=>{const next=structuredClone(content);const item=next.trash?.pop();if(item&&schemas[item.kind]&&Array.isArray(next[item.kind])){if(!next[item.kind].some(x=>x.id===item.entry.id))next[item.kind].unshift(item.entry);if(persist(next)){renderAll();closeDialog(editorDialog);toast('已恢复上次移除的内容。');}}});
}

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if(d.module)openModule(d.module);
if (d.project) {
  const project = projects.find(item => item.id === d.project);
  if (project?.preview) openProjectPreview(project);
  else if (project) showArticle(project, 'project');
}
if(d.collection){const c=content.collections.find(x=>x.id===d.collection);if(c)showArticle(c,'collections');}
if(d.edit)openEditor(d.edit,d.id);
if(d.managerEdit)openEditor(d.managerEdit,d.id);
if(d.detailEdit){closeDialog(detailDialog);openEditor(d.detailEdit,d.id);}
if(d.detailModule){closeDialog(detailDialog);openModule(d.detailModule);}
if(d.save){const next=new Set(saved);next.has(d.save)?next.delete(d.save):next.add(d.save);try{localStorage.setItem(STORAGE+'-saved',JSON.stringify([...next]));saved=next;renderCollections();}catch{toast('标记无法保存，请检查浏览器存储空间。');}}
});
$('#work-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){workFilter=b.dataset.filter;setFilter(e.currentTarget,workFilter);renderWorks();}});
$('#timeline-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){timeFilter=b.dataset.filter;setFilter(e.currentTarget,timeFilter);renderTimeline();}});
$('#collection-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){collectFilter=b.dataset.filter;setFilter(e.currentTarget,collectFilter);renderCollections();}});
$('#collection-search').addEventListener('input',renderCollections);
$('#manage-content').addEventListener('click',openManager);
$('#index-links').innerHTML=pages.map(({id,title})=>`<a href="#/${id}">${title}</a>`).join('');
function toggleIndex(force){const expanded=force??$('#index-panel').hidden;$('#index-panel').hidden=!expanded;$('#index-toggle').setAttribute('aria-expanded',String(expanded));$('#index-toggle').setAttribute('aria-label',expanded?'关闭全部章节':'打开全部章节');}
$('#index-toggle').addEventListener('click',()=>toggleIndex());$('#index-links').addEventListener('click',e=>{if(e.target.closest('a'))toggleIndex(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleIndex(false);});
document.addEventListener('click',e=>{if(!e.target.closest('#index-panel,#index-toggle'))toggleIndex(false);});
$('#credits-button').addEventListener('click',()=>{$('#detail-content').innerHTML=`<h2>关于本站</h2><div class="credit-text">设计融合已有 Fashion Web 系列的大字排版、本人造型切换，以及 Orbit 的空间感与纸张质感。
欢迎页复用 <a href="https://github.com/ThreshoLdnnis/MovingSpider" target="_blank" rel="noopener noreferrer">MovingSpider</a> 的跳蛛收藏场景。素材与字体声明见 <a href="welcome/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener noreferrer">欢迎页来源说明</a>。
旅行地图、音乐墙和读书角直接集成原作。音乐墙预置封面与歌词；播放需要添加你自己的音频。
个人介绍与经历依据已有个人资料整理；荣誉未虚构，手办默认展示灵感样例。两篇站点手记为本次网站制作撰写的开场内容，可自行编辑。
主站内容保存在当前浏览器，不会自动同步到其他设备。内容管理支持导出和导入。
字体：Anton、Instrument Sans、Noto Serif SC、Instrument Serif、Caveat 与小赖字体；自托管字库与许可见 <a href="assets/fonts/README.md" target="_blank" rel="noopener noreferrer">字体说明</a>。图片与素材来源保存在 <a href="assets/sources.json" target="_blank" rel="noopener noreferrer">素材来源清单</a>；手办图片为 POP MART 官方商品参考图，原作者及品牌保留权利。
Made with curiosity, for Mofarigano.</div>`;openDialog(detailDialog);});
$('#current-year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Shanghai'}).format(new Date());
renderAll();
mountAboutTags($('#about-tag-board'));
mountAboutInterests($('#about-interests'));
pageNavigation=mountPageNavigation({getName:()=>content.profile.name});

function prepareJournalMedia() {
  const stage = $('#portrait-stage');
  for (const image of $$('img[data-src]', stage)) image.src = image.dataset.src;
  mountPortraitReveal(stage, $('#intro'));
  mountNameParticles($('[data-display-name]'), $('#intro'));
  mountHeroStickers($('#hero-stickers'));
  mountCabinet($('#cabinet'));
}

// The journal's larger artwork should not compete with the welcome scene.
const gate = $('#welcome-gate');
if (gate.hidden || gate.classList.contains('is-entering')) prepareJournalMedia();
else document.addEventListener('journal:entering', prepareJournalMedia, {once:true});
