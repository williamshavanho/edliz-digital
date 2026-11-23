'use client';
import {useState,useEffect} from 'react';
import SourcePreview, {type Draft} from './source-preview';
import DraftSearch from './draft-search';
import SourceIndex from './source-index';
import SourceReader from './source-reader';
import ReferenceAssistant from './reference-assistant';
import { cacheAppShell, offlineDraft, activeDraft, type SavedPage } from './device-library';
import { Bookmarks, OfflineLibrary } from './saved-library';
import { useSharedSource } from './use-shared-source';
import {Activity,BookOpen,Pill,Search,LayoutDashboard,Bookmark,Download,Settings,ArrowUpRight,ArrowRight,ShieldCheck,Sparkles,ChevronRight,Globe,Menu,X,Check,Sun,Moon,Plus,MessageSquare,Wifi,Stethoscope} from 'lucide-react';
const links=[['Overview',LayoutDashboard],['Conditions',BookOpen],['Medicines',Pill],['Ask EDLIZ AI',Sparkles],['Bookmarks',Bookmark],['Offline library',Download]] as const;
export default function Home(){const[page,setPage]=useState('Overview'),[query,setQuery]=useState(''),[mobile,setMobile]=useState(false),[note,setNote]=useState(''),[dark,setDark]=useState(false),[toast,setToast]=useState(''),[online,setOnline]=useState(true),[font,setFont]=useState(16);
const [draft,setDraft]=useState<Draft|null>(null);
const [pdfPage,setPdfPage]=useState(0);
const sync=useSharedSource(draft,source=>{setDraft(current=>current?.hash===source.hash?current:source);setPdfPage(0);},
  !draft || (page!=='Reader' && page!=='Administration' && page!=='Search'));

const [bookmarks,setBookmarks]=useState<SavedPage[]>([]);
const [saved,setSaved]=useState<Draft|null>(null);
const [saving,setSaving]=useState(false);
useEffect(()=>{
  if(!draft) return;
  let current=true;
  activeDraft(draft).then(()=>{
    if(navigator.storage?.persist) void navigator.storage.persist().catch(()=>{});
    return cacheAppShell();
  }).catch(()=>{ if(current && !online) notify('This browser could not save the PDF for later. Reconnect to restore the published copy.'); });
  return ()=>{current=false};
},[draft]);
useEffect(()=>{
  let active=true;
  try {
    const stored: unknown=JSON.parse(localStorage.getItem('edliz-bookmarks') || '[]');
    if(Array.isArray(stored)) setBookmarks(stored);
  } catch {}
  offlineDraft().then(document=>{
    if(active && document){setSaved(document);setDraft(current=>current || document);}
  }).catch(()=>{});
  return ()=>{active=false};
},[]);

function replaceBookmarks(next:SavedPage[]){
  try {
    localStorage.setItem('edliz-bookmarks',JSON.stringify(next));
    setBookmarks(next);
  } catch { notify('This browser could not save the bookmark.'); }
}
function removeBookmark(item:SavedPage){
  replaceBookmarks(bookmarks.filter(bookmark=>bookmark.hash!==item.hash || bookmark.index!==item.index));
}
async function saveOffline(){
  if(!draft || saving) return;
  setSaving(true);
  try {
    await cacheAppShell();
    await offlineDraft(draft);
    setSaved(draft);
    notify('PDF and search index are available offline.');
  } catch { notify('Could not download for offline use. Check your connection and available storage, then try again.'); }
  finally { setSaving(false); }
}
async function removeOffline(){
  if(saving) return;
  setSaving(true);
  try { await offlineDraft(null);setSaved(null);notify('Offline copy removed from this device.'); }
  catch { notify('The offline copy could not be removed.'); }
  finally { setSaving(false); }
}
const [reader,setReader]=useState<{ index:number; title:string; from:string; query:string }|null>(null);
useEffect(()=>{setNote(localStorage.getItem('edliz-note')||'');setDark(localStorage.getItem('edliz-dark')==='true');setOnline(navigator.onLine);const on=()=>setOnline(navigator.onLine);window.addEventListener('online',on);window.addEventListener('offline',on);if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js');return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',on)}},[]);
const indexEntries=draft?.index && (page==='Conditions'?draft.index.conditions:page==='Medicines'?draft.index.medicines:null);
function openSourcePage(index:number,title=''){
  setReader({index,title,from:page,query:query || title});
  setPage('Reader');
  window.scrollTo(0,0);
}
const activeBookmark=reader&&draft?bookmarks.find(item=>item.hash===draft.hash&&item.index===reader.index):undefined;
function toggleBookmark(){
  if(!reader || !draft) return;
  if(activeBookmark) removeBookmark(activeBookmark);
  else replaceBookmarks([...bookmarks,{hash:draft.hash,index:reader.index,title:reader.title || 'PDF page '+(reader.index+1),filename:draft.name}]);
}
const showPublicLoad = !draft && (!!sync.cloudHash || sync.status==='checking' || sync.status==='error');
const publicLoading = sync.status==='checking' || sync.status==='downloading';
const publicNotice = <div className="notice"><div>
  <b>{publicLoading?'Loading the published PDF':sync.status==='error'?'The published PDF could not load':'The published PDF is ready to load'}</b>
  <p role="status">{sync.progress || (publicLoading?'Search becomes available once indexing finishes.':'Retry to restore searchable content or open the original PDF.')}</p>
  <div className="pdf-pagination">
    {!publicLoading && <button className="outline" disabled={!online} onClick={()=>void sync.pull(true)}>Retry loading</button>}
    {sync.cloudHash && <a className="outline" href="/api/shared-source" target="_blank" rel="noreferrer">Open original PDF</a>}
  </div>
</div></div>;
function returnToResults(){
  if(reader) setPage(reader.from);
  setReader(null);
}
function go(p:string){setReader(null);setPage(p);setMobile(false);setQuery('')}function notify(t:string){setToast(t);setTimeout(()=>setToast(''),4500)}
return <div className={dark?'app dark':'app'} style={{fontSize:font}}><aside className={mobile?'sidebar open':'sidebar'}><a className="brand" href="#" onClick={()=>go('Overview')}><span className="brandicon"><Activity size={25}/></span><span>EDLIZ<span className="digital">Digital</span></span></a><div className="workspace">CLINICAL WORKSPACE</div><nav>{links.map(([name,Icon])=><button key={name} className={page===name?'nav active':'nav'} onClick={()=>go(name)}><Icon size={19}/>{name}{name==='Ask EDLIZ AI'&&<small>AI</small>}</button>)}</nav><div className="nav-divider"/><button className={page==='Administration'?'nav active':'nav'} onClick={()=>go('Administration')}><ShieldCheck size={19}/>Administration</button><button className={page==='Settings'?'nav active':'nav'} onClick={()=>go('Settings')}><Settings size={19}/>Settings</button><div className="sidebar-bottom"><div className="edition"><span className="dot"/> EDLIZ 2025 <span className="tag">SETUP</span></div><p>Authorised source pending</p><div className="profile"><span className="avatar">TS</span><div><b>Tatenda Shavanho</b><span>Personal workspace</span></div></div></div></aside><div className="body"><header><button className="mobile-toggle" aria-label="Toggle navigation" onClick={()=>setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button><div className="crumb">Workspace <ChevronRight size={14}/><b>{page}</b></div><div className="header-right"><span className="connection"><span className="dot"/>{online?'Online':'Offline'}</span><button className="iconbtn" title="Toggle theme" onClick={()=>{setDark(!dark);localStorage.setItem('edliz-dark',String(!dark))}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><span className="avatar small">TS</span></div></header><main><div className="page-heading"><div><div className="eyebrow">YOUR CLINICAL REFERENCE, CONNECTED</div><h1>{page==='Overview'?'A clearer path to clinical knowledge.':page}</h1><p>{page==='Overview'?'Zimbabwe’s essential medicines and treatment guidance, in one workspace.':'EDLIZ 2025 · Personal reference workspace'}</p></div><button className="outline install" onClick={()=>go('Install app')}><Download size={16}/>Install app</button></div>
{page==='Reader'&&draft&&reader?<SourceReader draft={draft} index={reader.index} title={reader.title} query={reader.query}
  bookmarked={!!activeBookmark} onBookmark={toggleBookmark} onBack={returnToResults} onPage={index=>{setReader({...reader,index,title:''});window.scrollTo(0,0)}}/>:page==='Bookmarks'?<Bookmarks bookmarks={bookmarks} draft={draft} remove={removeBookmark} open={openSourcePage} setup={()=>go('Administration')}/>
  :page==='Offline library'?<OfflineLibrary draft={draft} saved={saved || draft} busy={saving} online={online} save={saveOffline} remove={removeOffline}
    setup={()=>go('Administration')} search={()=>{const document=saved || draft;if(document){setDraft(document);setPdfPage(0);go('Search')}}}/>
  :page==='Overview'?<><section className="hero"><div className="hero-content"><span className="hero-label"><span className="dot"/> BUILT FOR HEALTHCARE IN ZIMBABWE</span><h2>The right reference.<br/>Right when you need it.</h2><p>Find guidance, explore medicines, and connect<br className="desktop"/> with knowledge you can trace to its source.</p><form className="searchbox" onSubmit={e=>{e.preventDefault();setPage('Search')}}><Search size={21}/><input aria-label="Search clinical reference" placeholder={draft ? "Search the selected PDF…" : "Search conditions, medicines, or topics…"} value={query} onChange={e=>setQuery(e.target.value)}/><button aria-label="Submit search"><ArrowRight size={20}/></button></form><div className="hero-foot"><ShieldCheck size={15}/> Source-linked guidance <span>•</span> Designed for clinical professionals</div></div><div className="hero-art" aria-hidden="true"><div className="orbit o1"/><div className="orbit o2"/><div className="medical-cross"><Plus size={94} strokeWidth={2.5}/></div><div className="float-card fc1"><BookOpen size={22}/><div><b>Knowledge with context</b><span>Every reference, traceable.</span></div><ShieldCheck size={17}/></div><div className="float-card fc2"><span className="cyan-icon"><Activity size={20}/></span><div><b>EDLIZ</b><span>2025 EDITION</span></div></div><div className="little-cross">+</div></div></section>
<div className="notice"><span className="notice-icon"><ShieldCheck size={19}/></span><div><b>A trusted reference starts with a verified source.</b><p>{sync.status==='downloading'?(sync.progress || 'The published PDF is loading.'):draft?'Search the active PDF or browse its Conditions and Medicines index.':'The public reference will appear when the publisher makes a PDF available.'}</p></div><button onClick={()=>go(draft?'Search':'Administration')}>{draft?'Search document':'Document settings'} <ArrowRight size={16}/></button></div>{showPublicLoad&&publicNotice}<div className="section-heading"><h2>Explore your workspace</h2><span>Built around your day-to-day practice</span></div><div className="cards">{[['Conditions','Explore treatment guidance','Browse source-linked conditions, investigations, and management.',BookOpen,'blue'],['Medicines','Find medicine information','Explore formulations, prescribing guidance, and precautions.',Pill,'cyan'],['Ask EDLIZ AI','Ask. Find. Verify.','Get answers grounded in approved guidance, with source citations.',Sparkles,'purple']].map(([name,title,desc,Icon,color]:any)=><button className={'feature '+color} key={name} onClick={()=>go(name)}><span className="feature-top"><span className="feature-icon"><Icon size={25}/></span><ArrowUpRight size={19}/></span><span className="feature-label">{name}</span><h3>{title}</h3><p>{desc}</p><span className="feature-bottom">{name==='Ask EDLIZ AI'?'Open assistant':'Explore library'} <ArrowRight size={16}/></span></button>)}</div><div className="lower-grid"><section className="panel"><div className="section-heading"><h2>Your reference shelf</h2><button onClick={()=>go('Bookmarks')}>View bookmarks <ArrowRight size={14}/></button></div><div className="shelf-empty"><span className="empty-icon"><Bookmark size={24}/></span><div><h3>{bookmarks.length ? bookmarks.length + (bookmarks.length === 1 ? ' saved page' : ' saved pages') : 'A place for the guidance you return to'}</h3><p>{bookmarks.length ? 'Open Bookmarks to return to your saved pages.' : 'Your bookmarked conditions and medicines will appear here.'}</p></div></div></section><section className="offline-card"><span className="offline-icon"><Download size={23}/></span><div className="eyebrow">READY WHEN YOU ARE</div><h3>Your reference. Even offline.</h3><p>Keep approved guidance within reach when your connection isn’t.</p><button onClick={()=>go('Offline library')}>Manage offline library <ArrowRight size={16}/></button></section></div></>:page==='Administration'?<><section className="panel content-panel"><div className="section-heading"><div><h2>Content workspace</h2><p>Verify the source before clinical publication.</p></div><span className="tag">NOT CONNECTED</span></div><div className="workflow">{['Imported','Needs review','Clinically approved','Published'].map((t,i)=><span key={t}><b>{i+1}</b>{t}{i<3&&<ChevronRight size={16}/>}</span>)}</div><div className="panel sync-panel">
  <h3>Public document</h3>
  <p>Visitors can search and read the published PDF without signing in.</p>
  <p role="status">{sync.status==='uploading'?'Publishing PDF…':sync.status==='downloading'?(sync.progress || 'Loading and indexing PDF…'):sync.status==='error'?'Could not complete the request. Try again while online.':sync.cloudHash?'A PDF is available to visitors.':'No PDF has been published yet.'}</p>
  <div className="pdf-pagination">
    {!sync.canPublish && <a className="outline" href="/signin-with-chatgpt?return_to=%2F" target="_top">Publisher sign-in</a>}
    {sync.canPublish && sync.hasPrevious && <button className="outline" disabled={sync.status==='uploading'||sync.status==='downloading'||!online} onClick={()=>void sync.loadPrevious()}>Load previous upload</button>}
    {sync.canPublish && draft?.file && draft.hash!==sync.cloudHash && <button className="primary" disabled={sync.status==='uploading'||sync.status==='downloading'||!online} onClick={()=>void sync.upload(draft)}>Publish PDF publicly</button>}
    {sync.cloudHash && sync.cloudHash!==draft?.hash && <button className="outline" disabled={sync.status==='uploading'||sync.status==='downloading'||!online} onClick={()=>void sync.pull(true)}>Load published PDF</button>}
  </div>
  {sync.canPublish && <p>Only publish PDFs you have permission to share. Publishing replaces the current public PDF.</p>}
</div><SourcePreview draft={draft} setDraft={setDraft} page={pdfPage} setPage={setPdfPage} searchDraft={()=>go("Search")}/><div className="notice"><ShieldCheck/><div><b>Clinical publication is unavailable</b><p>Search results show extracted source material. Compare clinical details with the original PDF.</p></div></div></section></>:page==='Ask EDLIZ AI'?<ReferenceAssistant draft={draft} openPage={openSourcePage} browse={go}/>:page==='Settings'?<section className="panel content-panel"><h2>Reading preferences</h2><div className="setting"><div><h3>Appearance</h3><p>Choose a comfortable reading theme.</p></div><button className="outline" onClick={()=>{setDark(!dark);localStorage.setItem('edliz-dark',String(!dark))}}>{dark?'Light mode':'Dark mode'}</button></div><div className="setting"><h3>Text size</h3><select aria-label="Text size" value={font} onChange={e=>setFont(Number(e.target.value))}><option value="16">Standard</option><option value="18">Large</option><option value="20">Extra large</option></select></div><h3>Private reference note</h3><p>Stored only in this browser. Keep patient information out of notes.</p><textarea aria-label="Private reference note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Write a personal reference note…"/><button className="primary" onClick={()=>{localStorage.setItem('edliz-note',note);notify('Note saved on this device.')}}>Save note</button></section>:page==='Install app'?<section className="panel content-panel"><Download size={36}/><h2>Take your workspace with you</h2><p>In Chrome or Edge, open the browser menu and choose “Install app” or “Install this page as an app” when available. On iPhone or iPad, use Safari → Share → Add to Home Screen.</p><div className="notice"><Wifi/><div><b>App shell available offline after your first visit</b><p>Save the selected PDF in Offline library for use without internet. AI requires an internet connection. Browser storage may be cleared or evicted.</p></div></div></section>:<section className="panel content-panel"><div className="section-heading"><h2>{page==='Search'?(draft?'Search selected PDF':'Search reference'):page}</h2><span className="tag">{page==='Search'&&draft?'DRAFT PDF':indexEntries?indexEntries.length+' DRAFT ENTRIES':page==='Offline library'?'0 PACKAGES':'0 ENTRIES'}</span></div>{['Conditions','Medicines','Search'].includes(page)&&<form className="searchbox library-search" onSubmit={e=>e.preventDefault()}><Search size={20}/><input aria-label="Search library" placeholder={'Search '+(page==='Search'?(draft?'the selected PDF':'all approved content'):page.toLowerCase())+'…'} value={query} onChange={e=>setQuery(e.target.value)}/></form>}{page==='Search'&&draft?<DraftSearch draft={draft} query={query} openPage={openSourcePage}/>:indexEntries&&(page==='Conditions'||page==='Medicines')?<SourceIndex entries={indexEntries} module={page} query={query} openPage={openSourcePage}/>:showPublicLoad?publicNotice:<div className="big-empty"><span className="empty-icon">{page==='Offline library'?<Download size={32}/>:page==='Bookmarks'?<Bookmark size={32}/>:<BookOpen size={32}/>}</span><h2>{query?'No approved results found':page==='Offline library'?'Your offline library is waiting':page==='Bookmarks'?'Keep useful guidance close':'Your library starts with a verified source'}</h2><p>{page==='Bookmarks'?'Bookmarks will become available when approved clinical entries are published.':page==='Offline library'?'Save your selected PDF to read it offline.':'There is no approved EDLIZ 2025 content yet. Add the authorised source and complete clinical review to populate this library.'}</p><button className="primary" onClick={()=>go('Administration')}>Go to content setup <ArrowRight size={16}/></button></div>}</section>}
<footer><span><Activity size={15}/> EDLIZ Digital <span className="footer-divider">|</span> Independent clinical reference project</span><button onClick={()=>notify('This workspace is a technical prototype. It is not clinically validated or government-endorsed.')}>About this workspace <ArrowUpRight size={13}/></button></footer></main></div>{toast&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}<nav className="bottom-nav">{links.slice(0,4).map(([n,I])=><button className={page===n?'selected':''} key={n} onClick={()=>go(n)}><I size={20}/><span>{n==='Ask EDLIZ AI'?'AI assistant':n}</span></button>)}</nav></div>}
