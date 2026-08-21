import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import {Check, Flame, Plus, Settings, BookOpen, BriefcaseBusiness, ShoppingCart, LogIn, LogOut, WifiOff, Cloud, Pencil, Trash2} from "lucide-react";
import {ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid} from "recharts";
import "./styles.css";

const SUPABASE_URL=import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=(SUPABASE_URL&&SUPABASE_KEY)?createClient(SUPABASE_URL,SUPABASE_KEY):null;

const STARTER=[
["LeetCode + GeeksforGeeks","Coding","1 problem",10,true],
["Check Mail","Career/Admin","1 check",5,true],
["IT Learning","Learning","1 lesson",10,false],
["Apply for Jobs — Naukri + Indeed","Career","1+ application",15,true],
["Read 10 Pages","Reading","10 pages",10,true],
["Post on LinkedIn","Career/Brand","1 post",8,false],
["Create + Post Brainrot Videos","Content","1 video",10,false],
["Core Concept Learning","Learning","1 concept",10,true],
["Python Brush-Up","Coding","30 min",10,true],
["Drink 5L Water","Health","5 L",5,true],
["Record Yourself Explaining a Topic","Communication","1 video",10,false],
["Run 5 KM","Fitness","5 KM",7,false]
];

const CONCEPTS=["Python","SQL","AI / ML / DL","Excel","Web Development"];
const today=()=>new Date().toISOString().slice(0,10);
const key=()=>`ascend:${today()}`;

function useLocalState(){
  const [state,setState]=useState(()=>JSON.parse(localStorage.getItem("ascend-local")||'{"tasks":[],"completions":{},"books":[],"wishlist":[]}'));
  useEffect(()=>localStorage.setItem("ascend-local",JSON.stringify(state)),[state]);
  return [state,setState];
}

function App(){
 const [local,setLocal]=useLocalState();
 const [user,setUser]=useState(null);
 const [online,setOnline]=useState(navigator.onLine);
 const [tab,setTab]=useState("dashboard");
 const [editing,setEditing]=useState(null);

 useEffect(()=>{
   const on=()=>setOnline(true), off=()=>setOnline(false);
   addEventListener("online",on); addEventListener("offline",off);
   if(supabase) supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null));
   if(supabase){
    const {data}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));
    return()=>{removeEventListener("online",on);removeEventListener("offline",off);data.subscription.unsubscribe();}
   }
   return()=>{removeEventListener("online",on);removeEventListener("offline",off);}
 },[]);

 useEffect(()=>{
   if(!local.tasks.length){
    const tasks=STARTER.map((x,i)=>({id:`starter-${i}`,title:x[0],category:x[1],target:x[2],xp:x[3],locked:!!x[4],active:true,sort_order:i}));
    setLocal(s=>({...s,tasks}));
   }
 },[]);

 const tasks=local.tasks.filter(t=>t.active);
 const doneCount=tasks.filter(t=>local.completions[`${t.id}:${today()}`]).length;
 const pct=tasks.length?Math.round(doneCount/tasks.length*100):0;
 const xp=tasks.filter(t=>local.completions[`${t.id}:${today()}`]).reduce((a,t)=>a+t.xp,0);
 const level=Math.floor((xp+1)/100)+1;

 const toggle=t=>{
   setLocal(s=>{const completions={...s.completions};const k=`${t.id}:${today()}`;completions[k]=!completions[k];return {...s,completions}});
 };

 async function login(){
   if(!supabase){alert("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google login.");return}
   await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin}});
 }
 async function logout(){if(supabase) await supabase.auth.signOut();setUser(null)}

 function addTask(){
   const title=prompt("Task name"); if(!title) return;
   const target=prompt("Daily target (optional)")||"";
   setLocal(s=>({...s,tasks:[...s.tasks,{id:crypto.randomUUID(),title,category:"Main Quest",target,xp:10,active:true,sort_order:s.tasks.length}]}));
 }
 function deleteTask(id){const t=local.tasks.find(x=>x.id===id);if(t?.locked){alert("This task is locked. Unlock it before deleting.");return}if(confirm("Remove this task?"))setLocal(s=>({...s,tasks:s.tasks.map(t=>t.id===id?{...t,active:false}:t)}))}
 function toggleLock(t){setLocal(s=>({...s,tasks:s.tasks.map(x=>x.id===t.id?{...x,locked:!x.locked}:x)}))}
 function editTask(t){
   if(t.locked){alert("This task is locked. Unlock it first.");return}
   const title=prompt("Edit task name",t.title); if(title===null)return;
   const target=prompt("Edit target",t.target||"")??t.target;
   setLocal(s=>({...s,tasks:s.tasks.map(x=>x.id===t.id?{...x,title,target}:x)}));
 }

 return <div className="shell">
   <header><div className="brand">PROJECT <b>ASCEND</b></div><div className="headerRight">
     {!online&&<span className="status"><WifiOff size={14}/> Offline mode</span>}
     {online&&<span className="status"><Cloud size={14}/> Local + cloud ready</span>}
     {user?<button className="ghost" onClick={logout}><LogOut size={15}/> {user.email}</button>:<button className="login" onClick={login}><LogIn size={15}/> Continue with Google</button>}
   </div></header>
   <nav>{["dashboard","quests","reading","wishlist","analytics","settings"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x[0].toUpperCase()+x.slice(1)}</button>)}</nav>

   {tab==="dashboard"&&<main>
     <section className="hero"><div><div className="eyebrow">TODAY • {new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}</div><h1>Build the version of you<br/><span>you actually want.</span></h1><p>Your personal operating system for coding, career, learning, health and content.</p></div>
       <div className="ring"><div><strong>{pct}%</strong><small>complete</small></div></div>
     </section>
     <section className="metrics">
       <Metric icon={<Check/>} value={`${doneCount}/${tasks.length}`} label="quests today"/>
       <Metric icon={<Flame/>} value={level} label="current level"/>
       <Metric icon={<span>XP</span>} value={xp} label="earned today"/>
       <Metric icon={<BookOpen/>} value={local.books.length} label="books tracked"/>
     </section>
     <section className="grid2"><QuestPanel tasks={tasks} local={local} toggle={toggle} edit={editTask} del={deleteTask} lock={toggleLock}/>
       <div className="panel"><div className="panelTitle"><span>WEEKLY PULSE</span></div><WeeklyChart local={local} tasks={tasks}/></div>
     </section>
   </main>}

   {tab==="quests"&&<main><div className="pageHead"><div><div className="eyebrow">TASK MANAGEMENT</div><h2>EDIT QUESTS</h2><p>Manage your quest names, targets, XP and lock status. Daily completion stays on the Dashboard.</p></div><button className="primary" onClick={addTask}><Plus size={17}/> Add quest</button></div><EditQuestPanel tasks={tasks} edit={editTask} del={deleteTask} lock={toggleLock}/><div className="panel concepts"><div className="panelTitle">CORE CONCEPT ROTATION</div>{CONCEPTS.map(c=><div className="concept" key={c}><span>{c}</span><span>Daily learning target</span></div>)}</div></main>}

   {tab==="reading"&&<Reading local={local} setLocal={setLocal}/>}
   {tab==="wishlist"&&<Wishlist local={local} setLocal={setLocal}/>}
   {tab==="analytics"&&<Analytics local={local} tasks={tasks}/>}
   {tab==="settings"&&<SettingsPage user={user}/>}
   <footer>PROJECT ASCEND • Offline-first • Built to grow into a mobile app</footer>
 </div>
}

function Metric({icon,value,label}){return <div className="metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>}

function EditQuestPanel({tasks,edit,del,lock}){
 return <div className="panel">
   <div className="panelTitle"><span>EDITABLE QUEST LIST</span><span>{tasks.length} ACTIVE</span></div>
   <div className="questList">
   {tasks.map(t=><div className="quest editQuest" key={t.id}>
      <div className="qbody"><strong>{t.title}</strong><small>{t.category} • Target: {t.target} • {t.xp} XP • {t.locked?"🔒 Locked":"🔓 Unlocked"}</small></div>
      <button className="icon" title={t.locked?"Unlock task":"Lock task"} onClick={()=>lock(t)}>{t.locked?"🔒":"🔓"}</button>
      <button className="icon" disabled={t.locked} title={t.locked?"Unlock first":"Edit quest"} onClick={()=>edit(t)}><Pencil size={15}/></button>
      <button className="icon danger" disabled={t.locked} title={t.locked?"Unlock first":"Delete quest"} onClick={()=>del(t.id)}><Trash2 size={15}/></button>
   </div>)}
   </div>
 </div>
}

function QuestPanel({tasks,local,toggle,edit,del,lock}){
 return <div className="panel"><div className="panelTitle"><span>MAIN QUESTS</span><span>{tasks.filter(t=>local.completions[`${t.id}:${today()}`]).length} DONE</span></div><div className="questList">
 {tasks.map(t=>{const done=!!local.completions[`${t.id}:${today()}`];return <div className={`quest ${done?"done":""}`} key={t.id}>
   <button className={`check ${done?"checked":""}`} onClick={()=>toggle(t)}>{done?<Check size={16}/>:null}</button>
   <div className="qbody"><strong>{t.title}</strong><small>{t.category} • {t.target} {t.locked?"• 🔒 Protected":"• Editable"}</small></div><b className="xp">+{t.xp} XP</b>
   <button className={`icon ${t.locked?"locked":""}`} title={t.locked?"Unlock task":"Lock task"} onClick={()=>lock(t)}>{t.locked?"🔒":"🔓"}</button><button className="icon" disabled={t.locked} title={t.locked?"Unlock first":"Edit task"} onClick={()=>edit(t)}><Pencil size={14}/></button><button className="icon danger" disabled={t.locked} title={t.locked?"Unlock first":"Delete task"} onClick={()=>del(t.id)}><Trash2 size={14}/></button>
 </div>})}</div></div>
}

function WeeklyChart({local,tasks}){
 const data=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const day=d.toISOString().slice(0,10);return {day:d.toLocaleDateString(undefined,{weekday:"short"}),done:tasks.filter(t=>local.completions[`${t.id}:${day}`]).length}});
 return <ResponsiveContainer width="100%" height={230}><BarChart data={data}><CartesianGrid stroke="#252b36" vertical={false}/><XAxis dataKey="day" stroke="#8d96a8"/><YAxis allowDecimals={false} stroke="#8d96a8"/><Tooltip contentStyle={{background:"#11151d",border:"1px solid #252c39"}}/><Bar dataKey="done" fill="#f5b942" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
}

function Reading({local,setLocal}){
 const [title,setTitle]=useState(""); const [pages,setPages]=useState("");
 const add=()=>{if(!title)return;setLocal(s=>({...s,books:[...s.books,{id:crypto.randomUUID(),title,pages:+pages||0,current:0,start:today(),status:"Reading"}]}));setTitle("");setPages("")};
 return <main><div className="pageHead"><div><div className="eyebrow">READ 10 PAGES DAILY</div><h2>READING COMMAND CENTER</h2></div></div>
 <div className="formRow"><input placeholder="Book title" value={title} onChange={e=>setTitle(e.target.value)}/><input type="number" placeholder="Total pages" value={pages} onChange={e=>setPages(e.target.value)}/><button className="primary" onClick={add}><Plus size={17}/> Add book</button></div>
 <div className="cards">{local.books.map(b=><div className="panel" key={b.id}><div className="eyebrow">{b.status}</div><h3>{b.title}</h3><p>{b.current}/{b.pages||"?"} pages • started {b.start}</p><input type="number" value={b.current} onChange={e=>setLocal(s=>({...s,books:s.books.map(x=>x.id===b.id?{...x,current:+e.target.value}:x)}))}/></div>)}</div></main>
}

function Wishlist({local,setLocal}){
 const [item,setItem]=useState(""); const [cost,setCost]=useState("");
 const add=()=>{if(!item)return;setLocal(s=>({...s,wishlist:[...s.wishlist,{id:crypto.randomUUID(),item,cost:+cost||0,priority:"Medium",purchased:false}]}));setItem("");setCost("")};
 return <main><div className="pageHead"><div><div className="eyebrow">FUTURE PURCHASES</div><h2>WISHLIST</h2></div></div>
 <div className="formRow"><input placeholder="What do you want to buy?" value={item} onChange={e=>setItem(e.target.value)}/><input type="number" placeholder="Estimated ₹" value={cost} onChange={e=>setCost(e.target.value)}/><button className="primary" onClick={add}><Plus size={17}/> Add item</button></div>
 <div className="cards">{local.wishlist.map(w=><div className="panel row" key={w.id}><div><h3>{w.item}</h3><small>₹{w.cost} • {w.priority}</small></div><label><input type="checkbox" checked={w.purchased} onChange={e=>setLocal(s=>({...s,wishlist:s.wishlist.map(x=>x.id===w.id?{...x,purchased:e.target.checked}:x)}))}/> Purchased</label></div>)}</div></main>
}

function Analytics({local,tasks}){
 const data=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);const day=d.toISOString().slice(0,10);return {day:d.toLocaleDateString(undefined,{day:"2-digit",month:"short"}),completion:tasks.length?Math.round(tasks.filter(t=>local.completions[`${t.id}:${day}`]).length/tasks.length*100):0}});
 return <main><div className="pageHead"><div><div className="eyebrow">LONG-TERM VIEW</div><h2>ANALYTICS</h2><p>Your history becomes useful once the database is connected.</p></div></div><div className="panel"><div className="panelTitle">14-DAY COMPLETION TREND</div><ResponsiveContainer width="100%" height={330}><LineChart data={data}><CartesianGrid stroke="#252b36"/><XAxis dataKey="day" stroke="#8d96a8"/><YAxis unit="%" stroke="#8d96a8"/><Tooltip/><Line type="monotone" dataKey="completion" stroke="#f5b942" strokeWidth={3}/></LineChart></ResponsiveContainer></div></main>
}

function SettingsPage({user}){return <main><div className="pageHead"><div><div className="eyebrow">SYSTEM</div><h2>SETTINGS</h2><p>Google login, offline mode and cloud sync are ready for Supabase configuration.</p></div></div><div className="panel"><h3>Account</h3><p>{user?`Signed in as ${user.email}`:"Not signed in — local-only mode is available."}</p><h3>Offline-first</h3><p>Your current device stores changes locally. When the Supabase project is configured, cloud synchronization can be added without changing the interface.</p></div></main>}

createRoot(document.getElementById("root")).render(<App/>);
