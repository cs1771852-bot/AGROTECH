// ═══════════════════════════════════════════════════════════
// AGROTECH — Agente IA para Agroindustria Peruana
// Automatiza. Valida. Analiza.
// ═══════════════════════════════════════════════════════════
// 
// PARA USAR EN NETLIFY:
// 1. Reemplaza API_KEY abajo con tu clave de Anthropic
//    Obtén tu key en: https://console.anthropic.com
// 2. Sube este proyecto a Netlify
//
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API_URL = "/.netlify/functions/claude";

const G = {
  sidebar:"#0d1f0d", sidebarItem:"rgba(255,255,255,0.06)", sidebarActive:"rgba(76,175,80,0.25)",
  bg:"#f2f5f2", card:"#ffffff", verde:"#2e7d32", verdeM:"#43a047", verdeC:"#e8f5e9",
  dorado:"#b8860b", doradoC:"#fff8e1", naranja:"#e65100", naranjaC:"#fff3e0",
  rojo:"#c62828", rojoC:"#ffebee", azul:"#1565c0", azulC:"#e3f2fd",
  morado:"#6a1b9a", moradoC:"#f3e5f5", texto:"#1a2e1a", suave:"#5a6e5a", borde:"#dde8dd",
};

const CULTIVOS = ["Espárrago verde","Espárrago blanco","Palta Hass","Arándano","Uva Red Globe","Uva Thompson","Mango Kent","Mango Edward","Mandarina","Naranja","Maracuyá","Quinua","Papa","Cebolla","Tomate","Ají amarillo","Otro cultivo"];
const PROBLEMAS = ["Ninguno — todo bien","Plaga detectada","Hongos o enfermedad","Daño por granizo","Bajo rendimiento","Falla de riego","Clima adverso","Falta de personal","Otro problema"];
const hoy=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();

const makeDemo=()=>{
  const d=new Date();
  const f=(n)=>{const x=new Date(d);x.setDate(d.getDate()-n);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;};
  return [
    {cultivo:"Espárrago verde",cantidad_kg:420,campo:"La Loma",calidad:"Primera",fecha:f(0),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Excelente cosecha.",hora:"07:30"},
    {cultivo:"Espárrago verde",cantidad_kg:380,campo:"La Loma",calidad:"Primera",fecha:f(1),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Muy buena producción.",hora:"07:45"},
    {cultivo:"Espárrago verde",cantidad_kg:290,campo:"La Loma",calidad:"Segunda",fecha:f(2),problema:"Bajo rendimiento",tipo:"alerta",ia_comentario:"Rendimiento bajando.",hora:"08:00"},
    {cultivo:"Espárrago verde",cantidad_kg:260,campo:"La Loma",calidad:"Segunda",fecha:f(3),problema:"Bajo rendimiento",tipo:"alerta",ia_comentario:"Tendencia a la baja.",hora:"08:10"},
    {cultivo:"Palta Hass",cantidad_kg:650,campo:"Zona Norte",calidad:"Primera",fecha:f(0),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Excelente cosecha.",hora:"09:00"},
    {cultivo:"Palta Hass",cantidad_kg:620,campo:"Zona Norte",calidad:"Primera",fecha:f(1),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Producción estable.",hora:"09:15"},
    {cultivo:"Palta Hass",cantidad_kg:580,campo:"Zona Norte",calidad:"Primera",fecha:f(2),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Muy buena producción.",hora:"08:30"},
    {cultivo:"Arándano",cantidad_kg:45,campo:"El Bajo",calidad:"Segunda",fecha:f(0),problema:"Plaga detectada",tipo:"error",ia_comentario:"Plaga de áfidos. Urgente.",hora:"10:00"},
    {cultivo:"Arándano",cantidad_kg:110,campo:"El Bajo",calidad:"Primera",fecha:f(2),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Buena cosecha.",hora:"10:00"},
    {cultivo:"Mango Kent",cantidad_kg:320,campo:"Chacra Grande",calidad:"Primera",fecha:f(0),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Excelente mango.",hora:"11:00"},
    {cultivo:"Mango Kent",cantidad_kg:350,campo:"Chacra Grande",calidad:"Primera",fecha:f(1),problema:"Ninguno — todo bien",tipo:"ok",ia_comentario:"Buena producción.",hora:"11:10"},
  ];
};
const DEMO=makeDemo();

const PN = `Eres AGROTECH, asistente IA agrícola peruana. Extrae y valida datos de cosecha.
EXTRAE: cultivo, cantidad_kg(número), campo, calidad(Primera/Segunda/Tercera/Descarte), fecha(hoy=2026-05-18), trabajadores(array), problema.
VALIDA: espárrago max 2000kg, palta max 3000kg, arándano max 500kg. Fecha no futura. Responde amable.
SOLO JSON: {"mensaje":"texto","tipo":"ok|alerta|error","datos":{cultivo,cantidad_kg,campo,calidad,fecha,trabajadores,problema},"campos_faltantes":[],"observacion_ia":"nota","sugerencia_correccion":"ejemplo si error"}`;

const PF = `Eres AGROTECH, validador agrícola peruano. Valida formulario de cosecha. Responde amable.
SOLO JSON: {"mensaje":"respuesta","tipo":"ok|alerta|error","observacion_ia":"comentario"}`;

const PA = `Eres AGROTECH, sistema de alertas agrícolas peruano. Analiza historial de cosechas.
Detecta: caída >20%, problemas recurrentes, calidad deteriorándose.
SOLO JSON: {"alertas":[{"nivel":"critica|alta|media","campo":"c","cultivo":"c","titulo":"t","mensaje":"m","accion":"a"}],"resumen":"estado"}`;

const PP = `Eres AGROTECH, sistema predictivo agrícola. Predice próximos 7 días.
SOLO JSON: {"predicciones":[{"campo":"c","cultivo":"c","kg_estimado":0,"confianza":"alta|media|baja","tendencia":"subiendo|estable|bajando","recomendacion":"r"}],"recomendacion_general":"r","kpi_proyectado":0}`;

const PR = `Eres AGROTECH, generador de reportes agrícolas peruanos.
SOLO JSON: {"resumen_ejecutivo":"2 líneas","calificacion_semana":"Excelente|Buena|Regular|Difícil","emoji_semana":"e","kpis":[{"label":"l","valor":"v","icono":"i","color":"verde|rojo|amarillo"}],"cultivos":[{"nombre":"n","kg_total":0,"calidad_predominante":"Primera","tendencia":"subiendo|estable|bajando","observacion":"o"}],"campos":[{"nombre":"n","estado":"Optimo|Revisar|Urgente","kg_semana":0,"incidencias":0,"comentario":"c"}],"logros":["l1","l2"],"recomendaciones":[{"prioridad":"Alta|Media","accion":"a","campo":"c"}],"proyeccion":"p"}`;

const PPL = `Eres AGROTECH, experto en fitopatología peruana. Analiza síntomas de cultivos.
SOLO JSON: {"plaga_probable":"nombre","certeza":"Alta|Media|Baja","descripcion":"2 líneas","sintomas_confirmacion":["s1","s2","s3"],"dano_potencial":"d","tratamiento_organico":{"producto":"p","dosis":"d","frecuencia":"f","momento":"m"},"tratamiento_quimico":{"producto":"p","ingrediente_activo":"ia","dosis":"d","precaucion":"p"},"medidas_culturales":["m1","m2"],"urgencia":"Inmediata|Esta semana|Monitorear","alerta_vecinos":false}`;

const mkChat = (regs) => {
  const workerMap={};
  regs.forEach(r=>{
    const raw=r.trabajadores;
    const ws=Array.isArray(raw)?raw.flatMap(t=>t.split(/[,;y ]+/).map(s=>s.trim())).filter(s=>s.length>=2)
      :(typeof raw==="string"?raw.split(/[,;]+/).map(t=>t.trim()).filter(s=>s.length>=2):[]);
    ws.forEach(w=>{if(!workerMap[w])workerMap[w]={j:0,kg:0};workerMap[w].j++;workerMap[w].kg+=Number(r.cantidad_kg||0);});
  });
  const trab=Object.entries(workerMap).sort((a,b)=>b[1].kg-a[1].kg).map(([n,d])=>`${n}:${d.j}jornadas,${d.kg}kg`).join(" | ");
  const totalKg=regs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
  const campos=[...new Set(regs.map(r=>r.campo||r.lote).filter(Boolean))];
  const cultivos=[...new Set(regs.map(r=>r.cultivo).filter(Boolean))];
  const conProb=regs.filter(r=>r.problema&&!r.problema.includes("Ninguno")).length;
  const prom=regs.length>0?Math.round(totalKg/regs.length):0;
  return `Eres AGROTECH, asesor agrícola inteligente de este agricultor peruano.

DATOS COMPLETOS:
Registros: ${regs.length} | Total: ${totalKg.toLocaleString()} kg | Promedio: ${prom} kg/registro
Cultivos: ${cultivos.join(", ")} | Campos: ${campos.join(", ")}
Con problemas: ${conProb}/${regs.length} | Trabajadores: ${trab||"ninguno"}
Últimos registros: ${regs.slice(0,20).map(r=>r.cultivo+"|"+(r.campo||r.lote)+"|"+r.fecha+"|"+r.cantidad_kg+"kg|"+r.calidad+"|"+r.problema).join("\n")}

FORMATO OBLIGATORIO EN CADA RESPUESTA — SIN EXCEPCIÓN:
Línea 1: emoji + título corto
Línea 2: en blanco
Líneas siguientes: datos con • y ➤ para números
Última línea: 💡 recomendación concreta

EJEMPLO EXACTO:
"📊 Tu producción esta semana

• La Loma: 420 kg espárrago ✅
• El Bajo: ⚠️ 45 kg arándano — plaga activa

➤ Total: 1,990 kg acumulados
➤ Promedio: ${prom} kg por registro

💡 Atiende El Bajo urgente esta semana."

NUNCA respondas en párrafo seguido. SIEMPRE usa este formato.
Español peruano, directo y cálido. Máximo 10 líneas.`;
};

async function callIA(sys, content, maxTok=1500) {
  try {
    const res = await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:maxTok,system:sys,messages:[{role:"user",content}]})});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const d = await res.json();
    if(!d.content||!d.content[0]) throw new Error("empty");
    const raw=d.content[0].text;
    const cleaned=raw.replace(/```json|```/g,"").trim();
    if(cleaned.startsWith("{")||cleaned.startsWith("[")) return JSON.parse(cleaned);
    const fb=cleaned.indexOf("{"), lb=cleaned.lastIndexOf("}");
    if(fb!==-1&&lb!==-1) return JSON.parse(cleaned.substring(fb,lb+1));
    throw new Error("No JSON");
  } catch(e) {
    return {mensaje:"Error de conexión. Intenta de nuevo.",tipo:"error",datos:{},campos_faltantes:[],alertas:[],predicciones:[]};
  }
}

async function callChat(msgs, sys) {
  try {
    const res = await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,system:sys,messages:msgs})});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const d = await res.json();
    return d.content[0].text;
  } catch { return "Sin conexión. Verifica tu internet."; }
}

function calcKPIs(regs) {
  const totalHoy=regs.filter(r=>r.fecha===hoy).reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
  const total=regs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
  const conProb=regs.filter(r=>r.problema&&!r.problema.includes("Ninguno")).length;
  const campos=[...new Set(regs.map(r=>r.campo||r.lote).filter(Boolean))];
  const cultivos=[...new Set(regs.map(r=>r.cultivo).filter(Boolean))];
  const dias=[];
  for(let i=6;i>=0;i--){
    const d=new Date(2026,4,18-i);
    const f=`2026-05-${String(d.getDate()).padStart(2,"0")}`;
    dias.push({dia:d.toLocaleDateString("es-PE",{weekday:"short"}),kg:regs.filter(r=>r.fecha===f).reduce((s,r)=>s+Number(r.cantidad_kg||0),0)});
  }
  const porCultivo=cultivos.map(cv=>({name:cv.split(" ")[0],value:regs.filter(r=>r.cultivo===cv).reduce((s,r)=>s+Number(r.cantidad_kg||0),0)})).sort((a,b)=>b.value-a.value).slice(0,5);
  const porCampo=campos.map(c=>({campo:c,kg:regs.filter(r=>(r.campo||r.lote)===c).reduce((s,r)=>s+Number(r.cantidad_kg||0),0),problemas:regs.filter(r=>(r.campo||r.lote)===c&&r.problema&&!r.problema.includes("Ninguno")).length,registros:regs.filter(r=>(r.campo||r.lote)===c).length})).sort((a,b)=>b.kg-a.kg);
  return {totalHoy,total,conProb,campos:campos.length,cultivos:cultivos.length,tasaProb:regs.length?Math.round(conProb/regs.length*100):0,dias,porCultivo,porCampo,totalRegs:regs.length};
}

function sem(campo,regs){
  const rs=regs.filter(r=>(r.campo||r.lote)===campo).slice(0,5);
  if(!rs.length) return "gris";
  if(rs.some(r=>r.tipo==="error")) return "rojo";
  if(rs.filter(r=>r.tipo==="alerta").length>=2) return "amarillo";
  return "verde";
}

const PC=[G.verde,"#43a047","#66bb6a",G.dorado,"#ffa000"];
const TC={ok:G.verde,alerta:G.naranja,error:G.rojo};
const TB={ok:G.verdeC,alerta:G.naranjaC,error:G.rojoC};
const SC={verde:G.verde,amarillo:G.dorado,rojo:G.rojo,gris:"#9e9e9e"};
const SL={verde:"Óptimo",amarillo:"Revisar",rojo:"Urgente",gris:"Sin datos"};
const NC={critica:G.rojo,alta:G.naranja,media:G.dorado};

const inp={width:"100%",border:`1px solid ${G.borde}`,borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"inherit",color:G.texto,background:"white",outline:"none",boxSizing:"border-box"};
const lbl={display:"block",fontSize:10,fontWeight:700,color:G.verde,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.4px"};

function Chip({children,bg,color,style={}}){
  return <span style={{background:bg||G.verdeC,color:color||G.verde,fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20,...style}}>{children}</span>;
}
function Card({children,style={}}){
  return <div style={{background:G.card,borderRadius:12,padding:18,marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,0.07)",border:`1px solid ${G.borde}`,...style}}>{children}</div>;
}
function Titulo({icon,text,color=G.verde}){
  return <div style={{fontWeight:700,fontSize:14,color,marginBottom:12,display:"flex",alignItems:"center",gap:7}}><span>{icon}</span>{text}</div>;
}
function Btn({onClick,disabled,loading,label,lblLoad,color=G.verde}){
  return <button onClick={onClick} disabled={disabled||loading} style={{width:"100%",background:disabled||loading?"#ccc":color,color:"white",border:"none",borderRadius:9,padding:"12px",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:disabled||loading?"not-allowed":"pointer",boxShadow:disabled||loading?"none":`0 3px 10px ${color}35`,transition:"all 0.15s"}}>{loading?lblLoad||"Procesando...":label}</button>;
}
function RespIA({r}){
  if(!r) return null;
  const ico={ok:"✅",alerta:"⚠️",error:"❌"};
  const tit={ok:"Todo correcto",alerta:"Revisemos esto",error:"Necesita corrección"};
  return(
    <div style={{marginTop:10,borderRadius:9,overflow:"hidden",border:`1px solid ${TC[r.tipo]||G.verde}25`}}>
      <div style={{background:TC[r.tipo]||G.verde,padding:"7px 13px",display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>{ico[r.tipo]||"ℹ️"}</span>
        <span style={{color:"white",fontWeight:700,fontSize:12}}>AGROTECH — {tit[r.tipo]}</span>
      </div>
      <div style={{background:TB[r.tipo]||G.verdeC,padding:"11px 13px"}}>
        <div style={{fontSize:13,color:G.texto,lineHeight:1.6}}>{r.mensaje}</div>
        {r.observacion_ia&&<div style={{marginTop:6,fontSize:11,color:G.suave}}>📊 {r.observacion_ia}</div>}
        {r.sugerencia_correccion&&r.tipo==="error"&&<div style={{marginTop:7,background:"white",borderRadius:6,padding:"7px 10px",border:`1px solid ${G.dorado}40`}}><div style={{fontSize:10,fontWeight:700,color:G.dorado,marginBottom:2}}>💡 Así quedaría correcto:</div><div style={{fontSize:12,color:G.verde,fontStyle:"italic"}}>"{r.sugerencia_correccion}"</div></div>}
        {r.campos_faltantes?.length>0&&<div style={{marginTop:7,display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}><span style={{fontSize:11,color:G.suave}}>Falta:</span>{r.campos_faltantes.map((f,i)=><Chip key={i} bg={G.rojoC} color={G.rojo}>{f}</Chip>)}</div>}
      </div>
    </div>
  );
}

export default function AGROTECH(){
  const [vista,setVista]=useState("dashboard");
  const [sb,setSb]=useState(true);
  const [tab,setTab]=useState("natural");
  const [regs,setRegs]=useState(DEMO);
  const [stOk,setStOk]=useState(false);
  const [cargando,setCargando]=useState(true);
  const [txt,setTxt]=useState("");
  const [loadIA,setLoadIA]=useState(false);
  const [respIA,setRespIA]=useState(null);
  const [datos,setDatos]=useState(null);
  const [form,setForm]=useState({producto:"",cantidad:"",calidad:"",lote:"",fecha:hoy,problema:"Ninguno — todo bien",trabajadores:"",obs:""});
  const [respF,setRespF]=useState(null);
  const [loadF,setLoadF]=useState(false);
  const [alertas,setAlertas]=useState([]);
  const [resA,setResA]=useState("");
  const [loadA,setLoadA]=useState(false);
  const [preds,setPreds]=useState([]);
  const [recGen,setRecGen]=useState("");
  const [kpiP,setKpiP]=useState(null);
  const [loadP,setLoadP]=useState(false);
  const [filtroT,setFiltroT]=useState("todos");
  const [notif,setNotif]=useState(null);
  const [chatMs,setChatMs]=useState([{role:"assistant",content:"¡Hola! 👋 Soy AGROTECH, tu asesor agrícola inteligente.\n\nTengo acceso a todos tus registros. ¿En qué te ayudo hoy?"}]);
  const [chatIn,setChatIn]=useState("");
  const [loadChat,setLoadChat]=useState(false);
  const chatRef=useRef(null);
  const [rep,setRep]=useState(null);
  const [loadRep,setLoadRep]=useState(false);
  const [plSint,setPlSint]=useState("");
  const [plCult,setPlCult]=useState("");
  const [plRes,setPlRes]=useState(null);
  const [loadPl,setLoadPl]=useState(false);
  const [sConf,setSConf]=useState([]);
  const [loadRef,setLoadRef]=useState(false);
  const [plRef,setPlRef]=useState(null);
  // Edición
  const [regEditando,setRegEditando]=useState(null);
  const [formEdit,setFormEdit]=useState({});
  // Trabajadores
  const [trabajadorSel,setTrabajadorSel]=useState(null);
  // Predicción chat
  const [predChat,setPredChat]=useState([]);
  const [predInput,setPredInput]=useState("");
  const [loadPredChat,setLoadPredChat]=useState(false);
  const [climaData,setClimaData]=useState(null);
  const [loadClima,setLoadClima]=useState(false);
  const [campoUnidad,setCampoUnidad]=useState("ha");
  const predChatRef=useRef(null);
  // Reporte
  const [periodoRep,setPeriodoRep]=useState("semana");
  // Gestión de campos con hectáreas
  const [campos,setCampos]=useState({});
  const [kpiModal,setKpiModal]=useState(null);
  // Análisis de foto
  const [foto,setFoto]=useState(null);
  const [fotoPreview,setFotoPreview]=useState(null);
  const [loadFoto,setLoadFoto]=useState(false);
  const [fotoResult,setFotoResult]=useState(null);
  const fotoInputRef=useRef(null); // null | "hoy" | "total" | "campos" | "problemas"
  const [campoNombre,setCampoNombre]=useState("");
  const [campoHas,setCampoHas]=useState("");
  // Voz
  const [escuchando,setEscuchando]=useState(false);
  const [soportaVoz,setSoportaVoz]=useState(false);
  const recognRef=useRef(null);
  // Responsive
  const [isMobile,setIsMobile]=useState(false);

  const kpis=calcKPIs(regs);
  const sF=(k,v)=>setForm(f=>({...f,[k]:v}));
  function toast(msg,tipo="ok"){setNotif({msg,tipo});setTimeout(()=>setNotif(null),3000);}

  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:"smooth"});},[chatMs]);
  useEffect(()=>{predChatRef.current?.scrollIntoView({behavior:"smooth"});},[predChat]);
  useEffect(()=>{
    const ok=('SpeechRecognition' in window)||('webkitSpeechRecognition' in window);
    setSoportaVoz(ok);
    const fn=()=>{const m=window.innerWidth<768;setIsMobile(m);if(m)setSb(false);};
    window.addEventListener('resize',fn); fn();
    return()=>window.removeEventListener('resize',fn);
  },[]);
  useEffect(()=>{if(vista==="alertas"&&!alertas.length)doAlertas();},[vista]);
  useEffect(()=>{if(vista==="prediccion"&&!preds.length)doPreds();},[vista]);
  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("ag:regs");if(r?.value){const g=JSON.parse(r.value);if(Array.isArray(g)&&g.length>0)setRegs(g);}}catch{}
      try{const r=await window.storage.get("ag:campos");if(r?.value)setCampos(JSON.parse(r.value));}catch{}
      setCargando(false);setStOk(true);
    })();
  },[]);

  async function addReg(reg){
    const n=[reg,...regs];setRegs(n);
    try{await window.storage.set("ag:regs",JSON.stringify(n.slice(0,5000)));toast("✅ Registro guardado");}
    catch{toast("✅ Registro guardado");}
  }

  async function doAnalizar(){
    const t=txt.trim();
    if(!t){setRespIA({tipo:"alerta",mensaje:"📝 Escribe qué cosechaste. Ej: 'Hoy cosechamos 300 kilos de espárrago en La Loma, calidad primera.'"});return;}
    if(t.length<8){setRespIA({tipo:"alerta",mensaje:"✍️ Necesito más detalle: qué cosechaste, cuánto y en qué campo."});return;}
    setLoadIA(true);setRespIA(null);setDatos(null);
    const p=await callIA(PN,t);setRespIA(p);
    if(p.datos&&p.tipo!=="error")setDatos(p.datos);
    setLoadIA(false);
  }

  function confirmar(){
    if(!datos)return;
    addReg({...datos,tipo:respIA?.tipo||"ok",ia_comentario:respIA?.mensaje||"",hora:new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})});
    setTxt("");setRespIA(null);setDatos(null);
  }

  async function doForm(){
    if(!form.producto){setRespF({tipo:"alerta",mensaje:"🌱 Elige el cultivo primero."});return;}
    const cant=Number(form.cantidad);
    if(!form.cantidad||isNaN(cant)||cant<=0){setRespF({tipo:"error",mensaje:"⚖️ La cantidad debe ser mayor a cero. Ej: 350"});return;}
    const max={"Espárrago verde":2000,"Espárrago blanco":2000,"Palta Hass":3000,"Arándano":500,"Uva Red Globe":3000,"Mango Kent":2000};
    if(cant>(max[form.producto]||5000)*2){setRespF({tipo:"error",mensaje:`⚠️ ${cant} kg parece demasiado para ${form.producto}. Revisa el número.`});return;}
    if(!form.calidad){setRespF({tipo:"alerta",mensaje:"🏷️ Elige la calidad."});return;}
    if(!form.lote){setRespF({tipo:"alerta",mensaje:"📍 Escribe el nombre del campo."});return;}
    if(form.fecha>hoy){setRespF({tipo:"error",mensaje:`📅 La fecha ${form.fecha} es futura. ¿Quisiste poner hoy (${hoy})?`});return;}
    setLoadF(true);setRespF(null);
    const p=await callIA(PF,JSON.stringify({...form,campo:form.lote}));setRespF(p);
    if(p.tipo==="error"){setLoadF(false);return;}
    if(p.tipo==="alerta"){
      setLoadF(false);
      const confirmar=window.confirm("⚠️ AGROTECH detectó una inconsistencia:\n\n"+(p.mensaje||"Hay datos que no cuadran.")+"\n\n¿Aún así quieres guardar este registro?");
      if(!confirmar)return;
    }
    addReg({cultivo:form.producto,cantidad_kg:cant,campo:form.lote,calidad:form.calidad,fecha:form.fecha,problema:form.problema,trabajadores:form.trabajadores,tipo:p.tipo||"ok",ia_comentario:p.mensaje,hora:new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})});
    setForm({producto:"",cantidad:"",calidad:"",lote:"",fecha:hoy,problema:"Ninguno — todo bien",trabajadores:"",obs:""});
    setLoadF(false);
  }

  // ── VOZ ──
  function iniciarVoz(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return;
    const r=new SR(); r.lang='es-PE'; r.continuous=false; r.interimResults=false;
    recognRef.current=r;
    r.onstart=()=>setEscuchando(true);
    r.onend=()=>setEscuchando(false);
    r.onerror=()=>setEscuchando(false);
    r.onresult=(e)=>{const t=e.results[0][0].transcript;setTxt(prev=>prev?prev+' '+t:t);setEscuchando(false);};
    r.start();
  }
  function detenerVoz(){recognRef.current?.stop();setEscuchando(false);}

  // ── EDICIÓN ──
  function abrirEdicion(reg,idx){
    setRegEditando({...reg,_idx:idx});
    setFormEdit({cultivo:reg.cultivo||"",cantidad_kg:reg.cantidad_kg||"",campo:reg.campo||reg.lote||"",calidad:reg.calidad||"",fecha:reg.fecha||hoy,problema:reg.problema||"Ninguno — todo bien",trabajadores:Array.isArray(reg.trabajadores)?reg.trabajadores.join(", "):(reg.trabajadores||"")});
  }
  async function guardarEdicion(){
    if(!formEdit.cultivo||!formEdit.cantidad_kg||!formEdit.campo||!formEdit.calidad){alert("Completa los campos obligatorios.");return;}
    const idx=regEditando._idx;
    const probCrit=["Plaga","Hongo","granizo","enfermedad"];
    const probMed=["rendimiento","riego","Clima","personal","Otro"];
    let tipo="ok";
    if(formEdit.problema&&!formEdit.problema.includes("Ninguno")){
      if(probCrit.some(p=>formEdit.problema.includes(p))) tipo="error";
      else tipo="alerta";
    }
    const reg={...regs[idx],...formEdit,cantidad_kg:Number(formEdit.cantidad_kg),campo:formEdit.campo,lote:formEdit.campo,tipo};
    const nuevos=[...regs]; nuevos[idx]=reg; setRegs(nuevos);
    try{await window.storage.set("ag:regs",JSON.stringify(nuevos.slice(0,5000)));}catch{}
    setRegEditando(null); toast("✅ Registro actualizado");
  }
  function eliminarRegistro(idx){
    if(!window.confirm("¿Eliminar este registro?")) return;
    const nuevos=regs.filter((_,i)=>i!==idx); setRegs(nuevos);
    try{window.storage.set("ag:regs",JSON.stringify(nuevos.slice(0,5000)));}catch{}
    setRegEditando(null); toast("🗑️ Registro eliminado");
  }

  // ── TRABAJADORES ──
  async function guardarCampo(){
    if(!campoNombre.trim()||!campoHas||isNaN(Number(campoHas))||Number(campoHas)<=0){
      toast("Ingresa nombre del campo y hectáreas válidas","error"); return;
    }
    const nuevos={...campos,[campoNombre.trim()]:Number(campoHas)};
    setCampos(nuevos);
    try{await window.storage.set("ag:campos",JSON.stringify(nuevos));}catch{}
    setCampoNombre(""); setCampoHas("");
    toast("✅ Campo guardado");
  }
  async function eliminarCampo(nombre){
    const nuevos={...campos}; delete nuevos[nombre]; setCampos(nuevos);
    try{await window.storage.set("ag:campos",JSON.stringify(nuevos));}catch{}
    toast("Campo eliminado");
  }

  function calcTrabajadores(regs){
    const mapa={};
    regs.forEach(r=>{
      const raw=r.trabajadores;
      const ws=Array.isArray(raw)?raw.flatMap(t=>t.split(/[,;y ]+/).map(s=>s.trim())).filter(s=>s.length>=2):(typeof raw==="string"?raw.split(/[,;]+/).map(t=>t.trim()).filter(s=>s.length>=2):[]);
      ws.forEach(n=>{if(!mapa[n])mapa[n]={nombre:n,registros:0,totalKg:0,campos:new Set(),cultivos:new Set(),ultimaFecha:"",conProblema:0};mapa[n].registros++;mapa[n].totalKg+=Number(r.cantidad_kg||0);if(r.campo||r.lote)mapa[n].campos.add(r.campo||r.lote);if(r.cultivo)mapa[n].cultivos.add(r.cultivo);if(!mapa[n].ultimaFecha||r.fecha>mapa[n].ultimaFecha)mapa[n].ultimaFecha=r.fecha;if(r.problema&&!r.problema.includes("Ninguno"))mapa[n].conProblema++;});
    });
    return Object.values(mapa).map(t=>({...t,campos:[...t.campos],cultivos:[...t.cultivos],promedioKg:Math.round(t.totalKg/t.registros)})).sort((a,b)=>b.totalKg-a.totalKg);
  }

  // ── PREDICCIÓN CHAT ──
  async function doPredChat(msg){
    const m=msg||predInput.trim(); if(!m||loadPredChat) return;
    setPredInput(""); const ms=[...predChat,{role:"user",content:m}]; setPredChat(ms); setLoadPredChat(true);
    const totalKg=regs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
    const diasConDatos=[...new Set(regs.map(r=>r.fecha))].length;
    const promDiario=diasConDatos>0?Math.round(totalKg/diasConDatos):0;
    const porCampo=[...new Set(regs.map(r=>r.campo||r.lote).filter(Boolean))].map(campo=>({campo,kg:regs.filter(r=>(r.campo||r.lote)===campo).reduce((s,r)=>s+Number(r.cantidad_kg||0),0),registros:regs.filter(r=>(r.campo||r.lote)===campo).length}));
    const sys=`Eres AGROTECH, experto en planificación agrícola peruana. Responde preguntas de proyección con datos reales.
DATOS: ${regs.length} registros | ${totalKg.toLocaleString()} kg total | ${promDiario} kg/día promedio
Campos: ${porCampo.map(p=>p.campo+":"+p.kg+"kg").join(", ")}
Cultivos: ${[...new Set(regs.map(r=>r.cultivo))].join(", ")}
USA SIEMPRE formato con • y ➤ y 💡. Máximo 8 líneas. Da números concretos.
Rendimientos Perú: espárrago 8-12t/ha/año, palta 10-15t/ha/año, arándano 8-10t/ha/año`;
    const resp=await callChat(ms.map(x=>({role:x.role,content:x.content})),sys);
    setPredChat(v=>[...v,{role:"assistant",content:resp}]); setLoadPredChat(false);
  }

  // ── REPORTE ──
  async function doRep(periodo){
    const p=periodo||periodoRep; setLoadRep(true); setRep(null);
    const ahora=new Date();
    const filtrados=regs.filter(r=>{
      if(!r.fecha) return false;
      const diff=Math.floor((ahora-new Date(r.fecha+"T12:00:00"))/86400000);
      if(p==="hoy") return diff===0;
      if(p==="semana") return diff<=7;
      return diff<=30;
    });
    if(filtrados.length===0){setRep({error:"No hay registros para este período."});setLoadRep(false);return;}
    const totalKg=filtrados.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
    const labels={hoy:"de hoy",semana:"de los últimos 7 días",mes:"del último mes"};
    const lineas=filtrados.map(r=>r.cultivo+"|"+(r.campo||r.lote)+"|"+r.fecha+"|"+r.cantidad_kg+"kg|"+r.calidad+"|"+r.problema).join(", ");
    const msg="Período: "+labels[p]+". "+filtrados.length+" registros, "+totalKg+" kg. Datos: "+lineas;
    const res=await callIA(PR,msg,2000);
    if(res&&res.calificacion_semana) setRep(res);
    else setRep({error:res?.mensaje||"No se pudo generar. Intenta de nuevo."});
    setLoadRep(false);
  }

  async function predecirClima(){
    setLoadClima(true);setClimaData(null);
    const cultivos=[...new Set(regs.map(r=>r.cultivo).filter(Boolean))];
    const sys=`Eres AGROTECH. Genera predicción climática aproximada para los próximos 7 días en la costa norte del Perú. SOLO JSON sin texto extra: {"zona":"costa norte del Perú","epoca":"época actual","prediccion_7dias":[{"dia":"Lun","temp_max":25,"temp_min":18,"condicion":"Soleado","probabilidad_lluvia":5,"alerta":"ninguna","impacto":"sin impacto"}],"resumen_semana":"resumen 2 líneas","recomendaciones_climaticas":["rec1","rec2","rec3"],"alerta_general":"ninguna","fenomeno_especial":"ninguno"}`;
    const msg=`Fecha: ${hoy}. Cultivos: ${cultivos.join(", ")||"espárrago, palta"}. Predice clima aproximado para esta semana en la costa norte del Perú.`;
    const res=await callIA(sys,msg,1500);
    if(res&&res.prediccion_7dias)setClimaData(res);
    else setClimaData({error:"No se pudo generar. Intenta de nuevo."});
    setLoadClima(false);
  }

  async function doAlertas(){setLoadA(true);setAlertas([]);const r=await callIA(PA,regs.slice(0,30).map(r=>`Campo:${r.campo} Cultivo:${r.cultivo} Fecha:${r.fecha} Kg:${r.cantidad_kg} Calidad:${r.calidad} Problema:${r.problema}`).join("\n"));setAlertas(r.alertas||[]);setResA(r.resumen||"");setLoadA(false);}
  async function doPreds(){setLoadP(true);setPreds([]);const r=await callIA(PP,regs.slice(0,40).map(r=>`Campo:${r.campo} Cultivo:${r.cultivo} Fecha:${r.fecha} Kg:${r.cantidad_kg} Calidad:${r.calidad} Problema:${r.problema}`).join("\n"));setPreds(r.predicciones||[]);setRecGen(r.recomendacion_general||"");setKpiP(r.kpi_proyectado||null);setLoadP(false);}

  async function doChat(msg){
    const m=msg||chatIn.trim();if(!m||loadChat)return;setChatIn("");
    const ms=[...chatMs,{role:"user",content:m}];setChatMs(ms);setLoadChat(true);
    const resp=await callChat(ms.map(x=>({role:x.role,content:x.content})),mkChat(regs));
    setChatMs(v=>[...v,{role:"assistant",content:resp}]);setLoadChat(false);
  }

  async function doRep(){setLoadRep(true);setRep(null);const r=await callIA(PR,`Historial:\n${regs.slice(0,30).map(r=>`${r.cultivo}|${r.campo}|${r.fecha}|${r.cantidad_kg}kg|${r.calidad}|${r.problema}`).join("\n")}\nTotal:${regs.length},${regs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0)}kg`,2000);setRep(r);setLoadRep(false);}

  async function analizarFoto(){
    if(!foto) return;
    setLoadFoto(true); setFotoResult(null);
    try {
      // Convertir imagen a base64
      const base64 = await new Promise((res,rej)=>{
        const reader=new FileReader();
        reader.onload=()=>res(reader.result.split(",")[1]);
        reader.onerror=rej;
        reader.readAsDataURL(foto);
      });
      const mediaType = foto.type || "image/jpeg";
      const cultivoFoto = plCult || "cultivo no especificado";
      const system = `Eres AGROTECH, experto en fitopatología y agronomía peruana. Analizas fotos de cultivos.
EL AGRICULTOR TE DICE QUE ESTE ES UN CULTIVO DE: ${cultivoFoto}
Analiza la imagen buscando específicamente problemas en ${cultivoFoto}. NO intentes adivinar el cultivo — ya te lo dijo el agricultor.
Observa detalladamente y responde SOLO JSON sin texto adicional:
{"estado_general":"Saludable|Con problemas|Crítico","cultivo_detectado":"${cultivoFoto}","problemas_detectados":[{"tipo":"Plaga|Enfermedad|Deficiencia|Estrés hídrico|Daño físico|Ninguno","nombre":"nombre específico del problema","descripcion":"qué ves exactamente en 1 línea","severidad":"Leve|Moderada|Severa"}],"zona_afectada":"Hojas|Tallo|Fruto|Raíz|Planta completa|No visible","porcentaje_afectacion":"estimado %","diagnostico_principal":"diagnóstico específico para ${cultivoFoto} en 2 líneas","accion_inmediata":"qué hacer ahora mismo con dosis si aplica","urgencia":"Inmediata|Esta semana|Monitorear|Sin acción necesaria","observaciones":"cualquier otra cosa importante que ves"}`;
      const res = await fetch(API_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-5",
          max_tokens:1500,
          system,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
            {type:"text",text:"Analiza esta foto de mi cultivo y dime qué problemas tiene."}
          ]}]
        })
      });
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data=await res.json();
      const raw=data.content[0].text.replace(/```json|```/g,"").trim();
      const fb=raw.indexOf("{"),lb=raw.lastIndexOf("}");
      setFotoResult(JSON.parse(raw.substring(fb,lb+1)));
    } catch(e) {
      setFotoResult({error:"Error al analizar la foto: "+e.message});
    }
    setLoadFoto(false);
  }

  function handleFotoChange(e){
    const file=e.target.files[0];
    if(!file) return;
    setFoto(file); setFotoResult(null);
    const url=URL.createObjectURL(file);
    setFotoPreview(url);
  }

  async function doPl(){if(!plSint.trim())return;setLoadPl(true);setPlRes(null);setSConf([]);setPlRef(null);const p=await callIA(PPL,`Cultivo:${plCult||"no especificado"}\nSíntomas:${plSint}`,1800);setPlRes(p);setLoadPl(false);}

  async function doRef(conf,res){
    if(!conf.length)return;setLoadRef(true);setPlRef(null);
    const sys=`Eres AGROTECH, experto en fitopatología peruana. El agricultor confirmó síntomas adicionales. Actualiza el diagnóstico.\nSOLO JSON:{"plaga_probable":"n","certeza":"Alta|Media|Baja","confirmacion_nivel":"t","analisis_refinado":"2-3 líneas","tratamiento_urgente":"acción exacta","pronostico":"qué pasa","nivel_dano_actual":"Inicial|Moderado|Severo|Crítico"}`;
    const p=await callIA(sys,`Plaga:${res.plaga_probable}\nSíntomas:${plSint}\nCultivo:${plCult}\nConfirmados:${conf.join(", ")}`,1200);setPlRef(p);setLoadRef(false);
  }

  const NAV_TOP4=[
    {id:"dashboard",icon:"📊",label:"Inicio"},
    {id:"registro",icon:"📝",label:"Registrar"},
    {id:"asistente",icon:"🤖",label:"Asistente IA"},
    {id:"alertas",icon:"🚨",label:"Alertas",badge:alertas.length||null},
  ];
  const NAV=[
    {id:"trazabilidad",icon:"📜",label:"Trazabilidad"},
    {id:"campos",icon:"🌾",label:"Mis campos"},
    {id:"prediccion",icon:"🔮",label:"Predicción IA"},
    {id:"inteligencia",icon:"🐛",label:"Detector de plagas"},
    {id:"trabajadores",icon:"👷",label:"Trabajadores"},
    {id:"reporte",icon:"📄",label:"Reporte semanal"},
  ];
  const NAV_ALL=[...NAV_TOP4,...NAV];
  if(cargando) return(
    <div style={{background:G.bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,fontFamily:"'DM Sans',sans-serif"}}>
      <svg width="64" height="64" viewBox="0 0 120 120"><path d="M28,10 C-8,25 -5,75 22,95 C35,65 40,30 28,10 Z" fill={G.verde}/><circle cx="60" cy="65" r="42" fill="white"/><ellipse cx="60" cy="90" rx="44" ry="16" fill="#43a047"/><circle cx="32" cy="52" r="12" fill="#ff7b00"/><polygon points="72,32 79,56 65,56" fill={G.verde}/></svg>
      <div style={{fontWeight:900,fontSize:20,color:G.verde,letterSpacing:"2px"}}>AGROTECH</div>
      <div style={{fontSize:13,color:G.suave}}>Cargando datos...</div>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",overflow:"hidden",background:G.bg}}>

      {/* ──── SIDEBAR ──── */}
      <div style={{width:sb?215:52,minWidth:sb?215:52,background:G.sidebar,display:"flex",flexDirection:"column",transition:"all 0.2s",overflow:"hidden",flexShrink:0}}>

        {/* Logo AGROTECH — solo en sidebar, completamente separado */}
        <div style={{background:"linear-gradient(135deg,#0a1628,#1e3a5f 60%,#0f2d1a)",padding:sb?"16px 14px":"12px 0",display:"flex",alignItems:"center",gap:11,justifyContent:sb?"flex-start":"center",borderBottom:"1px solid rgba(255,255,255,0.08)",minHeight:68,flexShrink:0}}>
          <div style={{width:sb?44:36,height:sb?44:36,borderRadius:12,background:"linear-gradient(135deg,#2563eb,#16a34a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(37,99,235,0.5)",flexShrink:0,transition:"all 0.2s"}}>
            <svg width={sb?28:22} height={sb?28:22} viewBox="0 0 120 120">
              <path d="M28,10 C-8,25 -5,75 22,95 C35,65 40,30 28,10 Z" fill="rgba(255,255,255,0.5)"/>
              <circle cx="60" cy="65" r="42" fill="white"/>
              <ellipse cx="60" cy="90" rx="40" ry="14" fill="#16a34a"/>
              <ellipse cx="60" cy="84" rx="30" ry="8" fill="#22c55e"/>
              <circle cx="32" cy="52" r="13" fill="#f59e0b"/>
              <circle cx="32" cy="52" r="8" fill="#fbbf24"/>
              <polygon points="72,28 81,57 63,57" fill="#166534"/>
              <polygon points="88,38 95,59 81,59" fill="#166534"/>
            </svg>
          </div>
          {sb&&<div>
            <div style={{color:"white",fontWeight:900,fontSize:17,letterSpacing:"2px",lineHeight:1,fontFamily:"Arial Black,sans-serif",textShadow:"0 1px 6px rgba(0,0,0,0.3)"}}>AGROTECH</div>
            <div style={{color:"rgba(255,255,255,0.4)",fontSize:8,marginTop:3,letterSpacing:"0.8px",textTransform:"uppercase"}}>Automatiza · Valida · Analiza</div>
          </div>}
        </div>

        {/* Stats */}
        {sb&&<div style={{padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{color:"rgba(255,255,255,0.3)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>Registros totales</div>
          <div style={{color:"white",fontWeight:900,fontSize:20,lineHeight:1}}>{regs.length}</div>
          <div style={{color:"rgba(255,255,255,0.25)",fontSize:10,marginTop:2}}>{kpis.campos} campos · {kpis.cultivos} cultivos</div>
        </div>}

        {/* Nav */}
        <div style={{flex:1,overflowY:"auto",padding:"6px 5px"}}>
          {NAV.map(item=>(
            <button key={item.id} onClick={()=>setVista(item.id)} title={!sb?item.label:""} style={{
              width:"100%",display:"flex",alignItems:"center",gap:sb?9:0,justifyContent:sb?"flex-start":"center",
              padding:sb?"8px 10px":"9px 0",borderRadius:8,border:"none",cursor:"pointer",
              background:vista===item.id?"rgba(76,175,80,0.22)":"transparent",
              borderLeft:vista===item.id?"3px solid #66bb6a":"3px solid transparent",
              marginBottom:1,fontFamily:"inherit",transition:"background 0.15s",
            }}>
              <span style={{fontSize:15,flexShrink:0}}>{item.icon}</span>
              {sb&&<span style={{fontSize:12,fontWeight:vista===item.id?700:400,color:vista===item.id?"white":"rgba(255,255,255,0.5)",flex:1,textAlign:"left",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>}
              {sb&&item.badge>0&&<span style={{background:G.rojo,color:"white",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,flexShrink:0}}>{item.badge}</span>}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{padding:"8px 5px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          {sb&&stOk&&<button onClick={async()=>{if(window.confirm("¿Borrar todos los registros?")){setRegs(DEMO);try{await window.storage.delete("ag:regs");}catch{}toast("Datos borrados.");}}} style={{width:"100%",background:"rgba(198,40,40,0.15)",border:"1px solid rgba(198,40,40,0.2)",color:"rgba(255,120,120,0.8)",borderRadius:7,padding:"5px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:5}}>🗑️ Borrar registros</button>}

        </div>
      </div>

      {/* ──── ÁREA DERECHA ──── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Header blanco — SOLO botones, sin logo */}
        <div style={{background:"white",borderBottom:`1px solid ${G.borde}`,padding:"0 14px",display:"flex",alignItems:"center",height:52,gap:8,flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
          {/* ☰ */}
          <button onClick={()=>setSb(s=>!s)} style={{background:"none",border:`1px solid ${G.borde}`,borderRadius:8,width:32,height:32,cursor:"pointer",color:G.suave,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>☰</button>

          {/* 4 botones nav */}
          <div style={{display:"flex",gap:5,flex:1}}>
            {NAV_TOP4.map(item=>(
              <button key={item.id} onClick={()=>setVista(item.id)} style={{
                display:"flex",alignItems:"center",gap:5,position:"relative",
                background:vista===item.id?G.verde:"transparent",
                border:`1px solid ${vista===item.id?G.verde:G.borde}`,
                borderRadius:8,color:vista===item.id?"white":G.suave,
                padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",
                fontSize:11,fontWeight:vista===item.id?700:400,
                transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0
              }}>
                <span style={{fontSize:13}}>{item.icon}</span>
                {item.label}
                {item.badge>0&&<span style={{position:"absolute",top:-4,right:-4,background:G.rojo,color:"white",fontSize:9,fontWeight:700,padding:"0 4px",borderRadius:8,minWidth:14,textAlign:"center"}}>{item.badge}</span>}
              </button>
            ))}
          </div>

          {/* KG + IA */}
          <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
            <div style={{background:G.doradoC,border:`1px solid ${G.dorado}30`,borderRadius:8,padding:"3px 10px",textAlign:"center"}}>
              <div style={{fontSize:8,color:G.dorado,fontWeight:700}}>KG HOY</div>
              <div style={{fontSize:13,fontWeight:800,color:G.dorado,lineHeight:1}}>{kpis.totalHoy.toLocaleString()}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,background:G.verdeC,border:`1px solid ${G.verde}25`,borderRadius:20,padding:"3px 10px"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:G.verde,animation:"pulse 1.5s infinite"}}/>
              <span style={{fontSize:10,fontWeight:600,color:G.verde}}>IA Activa</span>
            </div>
          </div>
        </div>

        {notif&&<div style={{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",background:notif.tipo==="ok"?G.verde:G.rojo,color:"white",padding:"8px 18px",borderRadius:20,fontSize:12,fontWeight:700,zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 3px 12px rgba(0,0,0,0.2)"}}>{notif.msg}</div>}

        {/* Contenido scrollable */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px 40px"}}>

          {/* ── DASHBOARD ── */}
          {vista==="dashboard"&&(<>
            {/* MODAL DETALLE KPI */}
            {kpiModal&&(()=>{
              const regsHoy=regs.filter(r=>r.fecha===hoy);
              const regsProb=regs.filter(r=>r.problema&&!r.problema.includes("Ninguno"));
              const camposLista=[...new Set(regs.map(r=>r.campo||r.lote).filter(Boolean))];
              const configs={
                hoy:{titulo:"☀️ Cosecha de hoy",color:G.verde,items:regsHoy},
                total:{titulo:"📦 Todo lo cosechado",color:G.azul,items:regs},
                campos:{titulo:"🌿 Campos activos",color:G.morado,items:null},
                problemas:{titulo:"⚠️ Registros con problemas",color:G.rojo,items:regsProb},
              };
              const cfg=configs[kpiModal];
              return(
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(3px)"}} onClick={()=>setKpiModal(null)}>
                  <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:640,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                    {/* Header */}
                    <div style={{background:`linear-gradient(135deg,${cfg.color},${cfg.color}cc)`,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                      <div style={{color:"white",fontWeight:800,fontSize:16}}>{cfg.titulo}</div>
                      <button onClick={()=>setKpiModal(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>

                    <div style={{overflowY:"auto",flex:1,padding:"14px 18px"}}>

                      {/* Vista campos activos */}
                      {kpiModal==="campos"&&(
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:G.suave,marginBottom:12}}>{camposLista.length} campos con registros</div>
                          {camposLista.map((campo,i)=>{
                            const rs=regs.filter(r=>(r.campo||r.lote)===campo);
                            const kg=rs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
                            const prob=rs.filter(r=>r.problema&&!r.problema.includes("Ninguno")).length;
                            const ha=campos[campo];
                            return(
                              <div key={i} style={{border:`1px solid ${G.borde}`,borderLeft:`4px solid ${G.morado}`,borderRadius:10,padding:"12px 14px",marginBottom:9}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                  <div style={{fontWeight:700,fontSize:14,color:G.texto}}>📍 {campo}</div>
                                  <div style={{fontWeight:800,fontSize:15,color:G.morado}}>{kg.toLocaleString()} kg</div>
                                </div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                  <Chip bg={G.moradoC} color={G.morado}>📋 {rs.length} registros</Chip>
                                  {ha&&<Chip bg={G.verdeC} color={G.verde}>📐 {ha} ha · {Math.round(kg/ha).toLocaleString()} kg/ha</Chip>}
                                  {!ha&&<Chip bg={G.doradoC} color={G.dorado}>📐 Sin hectáreas</Chip>}
                                  {prob>0&&<Chip bg={G.rojoC} color={G.rojo}>⚠️ {prob} problemas</Chip>}
                                  <Chip bg={G.azulC} color={G.azul}>🌱 {[...new Set(rs.map(r=>r.cultivo))].join(", ")}</Chip>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Vista registros (hoy, total, problemas) */}
                      {cfg.items&&(
                        <div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                            {[
                              {l:"Registros",v:cfg.items.length,c:cfg.color},
                              {l:"Total kg",v:cfg.items.reduce((s,r)=>s+Number(r.cantidad_kg||0),0).toLocaleString(),c:cfg.color},
                              {l:"Cultivos",v:[...new Set(cfg.items.map(r=>r.cultivo))].length,c:cfg.color},
                            ].map((k,i)=>(
                              <div key={i} style={{background:`${k.c}10`,borderRadius:9,padding:"10px",textAlign:"center",border:`1px solid ${k.c}20`}}>
                                <div style={{fontWeight:800,fontSize:17,color:k.c}}>{k.v}</div>
                                <div style={{fontSize:10,color:G.suave,marginTop:2}}>{k.l}</div>
                              </div>
                            ))}
                          </div>

                          {/* Por cultivo */}
                          {(()=>{
                            const cultivos=[...new Set(cfg.items.map(r=>r.cultivo))];
                            return cultivos.length>0&&(
                              <div style={{marginBottom:14}}>
                                <div style={{fontSize:11,fontWeight:700,color:G.suave,textTransform:"uppercase",marginBottom:8}}>Por cultivo</div>
                                {cultivos.map((cv,i)=>{
                                  const rs=cfg.items.filter(r=>r.cultivo===cv);
                                  const kg=rs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
                                  const pct=Math.round(kg/cfg.items.reduce((s,r)=>s+Number(r.cantidad_kg||0),0)*100);
                                  return(
                                    <div key={i} style={{marginBottom:8}}>
                                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                                        <span style={{fontWeight:600,color:G.texto}}>🌱 {cv}</span>
                                        <span style={{fontWeight:700,color:cfg.color}}>{kg.toLocaleString()} kg · {pct}%</span>
                                      </div>
                                      <div style={{height:6,background:G.borde,borderRadius:3,overflow:"hidden"}}>
                                        <div style={{height:"100%",width:`${pct}%`,background:cfg.color,borderRadius:3}}/>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Registros individuales */}
                          <div style={{fontSize:11,fontWeight:700,color:G.suave,textTransform:"uppercase",marginBottom:8}}>Registros detallados</div>
                          {cfg.items.slice(0,50).map((r,i)=>(
                            <div key={i} style={{border:`1px solid ${G.borde}`,borderLeft:`4px solid ${TC[r.tipo]||G.verde}`,borderRadius:9,padding:"10px 12px",marginBottom:7}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                                <div style={{fontWeight:600,fontSize:13,color:G.texto}}>{r.cultivo}</div>
                                <div style={{fontWeight:700,fontSize:14,color:TC[r.tipo]||G.verde}}>{Number(r.cantidad_kg).toLocaleString()} kg</div>
                              </div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                <Chip bg={G.moradoC} color={G.morado}>📍 {r.campo||r.lote}</Chip>
                                <Chip bg={G.azulC} color={G.azul}>📅 {r.fecha}</Chip>
                                <Chip>{r.calidad}</Chip>
                                {r.problema&&!r.problema.includes("Ninguno")&&<Chip bg={G.rojoC} color={G.rojo}>⚠️ {r.problema}</Chip>}
                              </div>
                            </div>
                          ))}
                          {cfg.items.length>50&&<div style={{textAlign:"center",fontSize:12,color:G.suave,padding:"8px"}}>Mostrando 50 de {cfg.items.length} registros</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* KPI cards clickeables */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                {id:"hoy",l:"Kg cosechados hoy",v:kpis.totalHoy.toLocaleString(),i:"⚖️",c:G.verde},
                {id:"total",l:"Total acumulado",v:(kpis.total/1000).toFixed(1)+"t",i:"📦",c:G.azul},
                {id:"campos",l:"Campos activos",v:kpis.campos,i:"🌿",c:G.morado},
                {id:"problemas",l:"Tasa problemas",v:kpis.tasaProb+"%",i:"⚠️",c:kpis.tasaProb>20?G.rojo:G.verde},
              ].map((k,i)=>(
                <div key={i} onClick={()=>setKpiModal(k.id)} style={{background:"white",borderRadius:11,padding:"14px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:`1px solid ${G.borde}`,borderTop:`3px solid ${k.c}`,cursor:"pointer",transition:"all 0.15s",userSelect:"none"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 4px 16px ${k.c}25`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.06)";}}>
                  <div style={{fontSize:20,marginBottom:7}}>{k.i}</div>
                  <div style={{fontWeight:800,fontSize:20,color:k.c,lineHeight:1}}>{k.v}</div>
                  <div style={{fontSize:11,color:G.suave,marginTop:3}}>{k.l}</div>
                  <div style={{fontSize:9,color:"#bbb",marginTop:5}}>Toca para ver detalle →</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:10,marginBottom:12}}>
              <Card style={{marginBottom:0}}>
                <Titulo icon="📈" text="Producción últimos 7 días"/>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={kpis.dias} barSize={22}>
                    <XAxis dataKey="dia" tick={{fontSize:11,fill:"#aaa"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:"#aaa"}} axisLine={false} tickLine={false} width={30}/>
                    <Tooltip contentStyle={{borderRadius:8,border:"none",fontSize:12}} formatter={v=>[`${v.toLocaleString()} kg`]}/>
                    <Bar dataKey="kg" fill={G.verde} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card style={{marginBottom:0}}>
                <Titulo icon="🌱" text="Por cultivo"/>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart><Pie data={kpis.porCultivo} cx="50%" cy="50%" innerRadius={25} outerRadius={46} paddingAngle={3} dataKey="value">{kpis.porCultivo.map((_,i)=><Cell key={i} fill={PC[i%PC.length]}/>)}</Pie><Tooltip contentStyle={{borderRadius:8,border:"none",fontSize:11}} formatter={(v,_,p)=>[`${v.toLocaleString()} kg`,p.payload.name]}/></PieChart>
                </ResponsiveContainer>
                {kpis.porCultivo.slice(0,3).map((cv,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,marginTop:4}}>
                    <div style={{width:7,height:7,borderRadius:2,background:PC[i],flexShrink:0}}/>
                    <span style={{color:G.suave,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cv.name}</span>
                    <span style={{fontWeight:700,color:G.verde}}>{cv.value.toLocaleString()} kg</span>
                  </div>
                ))}
              </Card>
            </div>

            <Card>
              <Titulo icon="🗺️" text="Rendimiento por campo"/>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:`2px solid ${G.borde}`}}>{["Campo","Total kg","Registros","Problemas","Estado"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                <tbody>{kpis.porCampo.map((c,i)=>{const s=sem(c.campo,regs);return(<tr key={i} style={{borderBottom:`1px solid ${G.borde}`}}><td style={{padding:"8px",fontWeight:600,color:G.texto}}>📍 {c.campo}</td><td style={{padding:"8px",fontWeight:700,color:G.verde}}>{c.kg.toLocaleString()} kg</td><td style={{padding:"8px",color:G.suave}}>{c.registros}</td><td style={{padding:"8px"}}><Chip bg={c.problemas>0?G.rojoC:G.verdeC} color={c.problemas>0?G.rojo:G.verde}>{c.problemas>0?`⚠️ ${c.problemas}`:"✅ 0"}</Chip></td><td style={{padding:"8px"}}><Chip bg={SC[s]+"20"} color={SC[s]}>{SL[s]}</Chip></td></tr>);})}</tbody>
              </table>
            </Card>

            <Card>
              <Titulo icon="🕐" text="Últimos registros"/>
              {regs.slice(0,5).map((r,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<4?`1px solid ${G.borde}`:"none"}}>
                  <div style={{width:34,height:34,borderRadius:8,background:TB[r.tipo]||G.verdeC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{r.tipo==="ok"?"✅":r.tipo==="alerta"?"⚠️":"🚨"}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:G.texto,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.cultivo} · {r.campo||r.lote}</div><div style={{fontSize:10,color:"#aaa"}}>{r.fecha}{r.hora?` · ${r.hora}`:""}</div></div>
                  <div style={{fontWeight:700,fontSize:13,color:G.verde,flexShrink:0}}>{Number(r.cantidad_kg).toLocaleString()} kg</div>
                  <Chip bg={TB[r.tipo]} color={TC[r.tipo]}>{r.calidad}</Chip>
                </div>
              ))}
            </Card>
          </>)}

          {/* ── REGISTRO ── */}
          {vista==="registro"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[{id:"natural",icon:"💬",label:"Escribe libremente",sub:"Con tus propias palabras"},{id:"formulario",icon:"📋",label:"Formulario guiado",sub:"Campos paso a paso"}].map(t=>(
                <div key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"white":G.bg,border:`2px solid ${tab===t.id?G.verde:G.borde}`,borderRadius:11,padding:"13px",cursor:"pointer",transition:"all 0.15s"}}>
                  <div style={{fontSize:22}}>{t.icon}</div>
                  <div style={{fontWeight:700,fontSize:13,color:tab===t.id?G.verde:G.suave,marginTop:5}}>{t.label}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{t.sub}</div>
                </div>
              ))}
            </div>

            {tab==="natural"&&(
              <Card>
                <Titulo icon="💬" text="¿Qué cosechaste hoy?"/>
                <div style={{position:"relative"}}>
                  <textarea value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Escribe con tus palabras o usa el micrófono... Ej: Hoy cosechamos 350 kilos de espárrago en La Loma, calidad primera." style={{...inp,minHeight:95,resize:"none",lineHeight:1.6,paddingRight:52}}/>
                  {soportaVoz&&(
                    <button onClick={escuchando?detenerVoz:iniciarVoz} title={escuchando?"Detener":"Hablar para registrar"}
                      style={{position:"absolute",bottom:10,right:10,width:36,height:36,borderRadius:"50%",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:escuchando?"#dc2626":"#16a34a",boxShadow:escuchando?"0 0 0 4px rgba(220,38,38,0.25)":"0 2px 8px rgba(22,163,74,0.4)",transition:"all 0.2s"}}>
                      {escuchando?"⏹":"🎙️"}
                    </button>
                  )}
                </div>
                {escuchando&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,background:"#fee2e2",borderRadius:8,padding:"7px 12px",marginBottom:8,border:"1px solid #fca5a5"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#dc2626",animation:"pulse 0.8s ease-in-out infinite"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:"#dc2626"}}>Escuchando... Habla claro y describe tu cosecha</span>
                  </div>
                )}
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                  {[{k:"Hoy cosechamos 420 kilos de espárrago verde en La Loma, calidad primera. Trabajaron Juan y Carmen.",l:"🥦 Normal"},{k:"Cosecha de palta hass, 280 kg de segunda, detectamos hongos. Solo Pedro.",l:"⚠️ Problema"},{k:"Arándano en El Bajo, 45 kg, plaga de áfidos. Revisión urgente.",l:"🚨 Urgente"},{k:"650 kilos de palta Hass en zona norte, calidad primera, todo perfecto. Equipo: Ana, Luis, Rosa.",l:"🥑 Palta"}].map((e,i)=>(
                    <button key={i} onClick={()=>{setTxt(e.k);setRespIA(null);setDatos(null);}} style={{background:G.verdeC,color:G.verde,border:"none",borderRadius:20,padding:"4px 11px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{e.l}</button>
                  ))}
                </div>
                <Btn onClick={doAnalizar} loading={loadIA} label="🤖 Analizar con IA" lblLoad="⏳ Analizando..." color={G.verde}/>
                <RespIA r={respIA}/>
                {datos&&(
                  <div style={{marginTop:10,background:G.verdeC,borderRadius:9,padding:12,border:`1px solid ${G.verde}18`}}>
                    <div style={{fontWeight:700,fontSize:12,color:G.verde,marginBottom:9}}>📦 Datos identificados:</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      {[{k:"cultivo",l:"Cultivo"},{k:"cantidad_kg",l:"Kg"},{k:"campo",l:"Campo"},{k:"calidad",l:"Calidad"},{k:"fecha",l:"Fecha"},{k:"problema",l:"Problema"}].map(c=>{
                        const v=datos[c.k];const d=Array.isArray(v)?v.join(", "):v;const f=!d;
                        return(<div key={c.k} style={{background:f?"#ffebee":"white",border:`1px solid ${f?"#ef9a9a":G.borde}`,borderRadius:7,padding:"7px 9px"}}><div style={{fontSize:9,fontWeight:700,color:f?G.rojo:"#aaa",textTransform:"uppercase",marginBottom:2}}>{c.l}</div><div style={{fontSize:12,fontWeight:600,color:f?G.rojo:G.texto}}>{f?"No indicado":d}</div></div>);
                      })}
                    </div>
                    {respIA?.tipo!=="error"&&<button onClick={confirmar} style={{width:"100%",background:G.dorado,color:"white",border:"none",borderRadius:8,padding:"10px",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:9}}>✅ Confirmar y Guardar</button>}
                  </div>
                )}
              </Card>
            )}
            {tab==="formulario"&&(
              <Card>
                <Titulo icon="📋" text="Registro detallado"/>
                <div style={{marginBottom:10}}><label style={lbl}>🌱 Cultivo *</label><select value={form.producto} onChange={e=>sF("producto",e.target.value)} style={inp}><option value="">— Elige —</option>{CULTIVOS.map(c=><option key={c}>{c}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
                  <div><label style={lbl}>⚖️ Kilos *</label><input type="number" value={form.cantidad} onChange={e=>sF("cantidad",e.target.value)} placeholder="Ej: 350" style={inp}/></div>
                  <div><label style={lbl}>🏷️ Calidad *</label><select value={form.calidad} onChange={e=>sF("calidad",e.target.value)} style={inp}><option value="">— Elige —</option><option>Primera (Premium)</option><option>Segunda</option><option>Tercera</option><option>Descarte</option></select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
                  <div><label style={lbl}>📍 Campo *</label><input type="text" value={form.lote} onChange={e=>sF("lote",e.target.value)} placeholder="Ej: La Loma" style={inp}/></div>
                  <div><label style={lbl}>📅 Fecha *</label><input type="date" value={form.fecha} onChange={e=>sF("fecha",e.target.value)} style={inp}/></div>
                </div>
                <div style={{marginBottom:10}}><label style={lbl}>⚠️ Problema</label><select value={form.problema} onChange={e=>sF("problema",e.target.value)} style={inp}>{PROBLEMAS.map(p=><option key={p}>{p}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
                  <div><label style={lbl}>👷 Trabajadores</label><input type="text" value={form.trabajadores} onChange={e=>sF("trabajadores",e.target.value)} placeholder="Juan, María..." style={inp}/></div>
                  <div><label style={lbl}>📝 Observaciones</label><input type="text" value={form.obs} onChange={e=>sF("obs",e.target.value)} placeholder="Notas..." style={inp}/></div>
                </div>
                <Btn onClick={doForm} loading={loadF} label="🤖 Validar con IA y Guardar" lblLoad="⏳ Validando..." color={G.verde}/>
                <RespIA r={respF}/>
              </Card>
            )}
          </>)}

          {/* ── ASISTENTE ── */}
          {vista==="asistente"&&(
            <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
              <div style={{background:`linear-gradient(135deg,${G.sidebar},#1a3a1a)`,borderRadius:12,padding:"14px 18px",marginBottom:9,display:"flex",alignItems:"center",gap:13,flexShrink:0}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,border:"2px solid rgba(255,255,255,0.15)",position:"relative",flexShrink:0}}>
                  🌿<div style={{position:"absolute",bottom:1,right:1,width:11,height:11,borderRadius:"50%",background:"#4caf50",border:"2px solid #1a3a1a"}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{color:"white",fontWeight:800,fontSize:14}}>AGROTECH IA</div>
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:11,marginTop:1}}>{regs.length} registros · {kpis.total.toLocaleString()} kg totales</div>
                </div>
                <div style={{textAlign:"right"}}><div style={{color:"rgba(255,255,255,0.4)",fontSize:8}}>KG TOTALES</div><div style={{color:G.dorado,fontWeight:800,fontSize:16}}>{kpis.total.toLocaleString()}</div></div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:9,flexShrink:0}}>
                {["¿Cómo va mi cosecha? 🌿","¿Qué campo rinde mejor? 📊","¿Hay alertas urgentes? 🚨","¿Cuánto cosechamos en total? ⚖️","¿Qué me recomiendas? 💡","¿Cómo combato la plaga? 🐛"].map((q,i)=>(
                  <button key={i} onClick={()=>doChat(q)} disabled={loadChat} style={{background:"white",border:`1px solid ${G.borde}`,borderRadius:20,padding:"4px 11px",fontSize:11,fontWeight:600,color:G.verde,cursor:loadChat?"not-allowed":"pointer",fontFamily:"inherit"}}>{q}</button>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",background:"white",borderRadius:11,padding:12,marginBottom:9,border:`1px solid ${G.borde}`,display:"flex",flexDirection:"column",gap:9}}>
                {chatMs.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:m.role==="user"?G.azulC:`linear-gradient(135deg,${G.sidebar},${G.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{m.role==="user"?"👤":"🌿"}</div>
                    <div style={{maxWidth:"80%",background:m.role==="user"?G.verde:"#f7faf7",color:m.role==="user"?"white":G.texto,borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",padding:"9px 13px",fontSize:13,lineHeight:1.6,border:m.role==="assistant"?`1px solid ${G.borde}`:"none"}}>{m.content.split("\n").map((line,li)=>(
                        <div key={li} style={{marginBottom:line===""?4:1}}>
                          {line.startsWith("•")?<span><span style={{color:m.role==="user"?"rgba(255,255,255,0.85)":G.verde,fontWeight:700}}>•</span>{line.slice(1)}</span>
                          :line.startsWith("➤")?<span style={{fontWeight:700,color:m.role==="user"?"#a5d6a7":G.verde}}>➤{line.slice(1)}</span>
                          :line.startsWith("💡")?<span style={{fontWeight:600}}>{line}</span>
                          :line}
                        </div>
                      ))}</div>
                  </div>
                ))}
                {loadChat&&<div style={{display:"flex",gap:8}}><div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${G.sidebar},${G.verde})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🌿</div><div style={{background:"#f7faf7",borderRadius:"12px 12px 12px 3px",padding:"9px 13px",display:"flex",gap:5,alignItems:"center",border:`1px solid ${G.borde}`}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:G.verde,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>)}</div></div>}
                <div ref={chatRef}/>
              </div>
              <div style={{display:"flex",gap:7,background:"white",borderRadius:11,padding:"8px 11px",border:`1px solid ${G.verde}35`,flexShrink:0}}>
                <input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();doChat();}}} placeholder="Escribe tu pregunta..." disabled={loadChat} style={{flex:1,border:"none",outline:"none",fontSize:13,fontFamily:"inherit",color:G.texto,background:"transparent"}}/>
                <button onClick={()=>doChat()} disabled={loadChat||!chatIn.trim()} style={{width:36,height:36,borderRadius:9,border:"none",background:loadChat||!chatIn.trim()?"#e0e0e0":G.verde,color:"white",cursor:loadChat||!chatIn.trim()?"not-allowed":"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>➤</button>
              </div>
            </div>
          )}

          {/* ── TRAZABILIDAD ── */}
          {regEditando&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(3px)"}} onClick={()=>setRegEditando(null)}>
              <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:640,maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{background:`linear-gradient(135deg,${G.azul},#1976d2)`,padding:"15px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                  <div style={{flex:1}}><div style={{color:"white",fontWeight:800,fontSize:15}}>✏️ Editar Registro</div><div style={{color:"rgba(255,255,255,0.65)",fontSize:11,marginTop:1}}>Modifica y guarda los cambios</div></div>
                  <button onClick={()=>setRegEditando(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"white",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"15px 18px"}}>
                  <div style={{marginBottom:11}}><label style={{...lbl,color:G.azul}}>🌱 Cultivo *</label><select value={formEdit.cultivo} onChange={e=>setFormEdit(f=>({...f,cultivo:e.target.value}))} style={inp}><option value="">— Elige —</option>{CULTIVOS.map(c=><option key={c}>{c}</option>)}</select></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
                    <div><label style={{...lbl,color:G.azul}}>⚖️ Kilos *</label><input type="number" value={formEdit.cantidad_kg} onChange={e=>setFormEdit(f=>({...f,cantidad_kg:e.target.value}))} style={inp}/></div>
                    <div><label style={{...lbl,color:G.azul}}>🏷️ Calidad *</label><select value={formEdit.calidad} onChange={e=>setFormEdit(f=>({...f,calidad:e.target.value}))} style={inp}><option value="">— Elige —</option><option>Primera (Premium)</option><option>Segunda</option><option>Tercera</option><option>Descarte</option></select></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
                    <div><label style={{...lbl,color:G.azul}}>📍 Campo *</label><input type="text" value={formEdit.campo} onChange={e=>setFormEdit(f=>({...f,campo:e.target.value}))} style={inp}/></div>
                    <div><label style={{...lbl,color:G.azul}}>📅 Fecha</label><input type="date" value={formEdit.fecha} onChange={e=>setFormEdit(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
                  </div>
                  <div style={{marginBottom:11}}><label style={{...lbl,color:G.azul}}>⚠️ Problema</label><select value={formEdit.problema} onChange={e=>setFormEdit(f=>({...f,problema:e.target.value}))} style={inp}>{PROBLEMAS.map(p=><option key={p}>{p}</option>)}</select></div>
                  <div style={{marginBottom:11}}><label style={{...lbl,color:G.azul}}>👷 Trabajadores</label><input type="text" value={formEdit.trabajadores} onChange={e=>setFormEdit(f=>({...f,trabajadores:e.target.value}))} placeholder="Juan, María..." style={inp}/></div>
                </div>
                <div style={{padding:"11px 18px",borderTop:`1px solid ${G.borde}`,display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>eliminarRegistro(regEditando._idx)} style={{background:"#fff5f5",border:`1px solid ${G.rojo}30`,color:G.rojo,borderRadius:9,padding:"9px 14px",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑️ Eliminar</button>
                  <button onClick={()=>setRegEditando(null)} style={{flex:1,background:G.bg,border:`1px solid ${G.borde}`,color:G.suave,borderRadius:9,padding:"9px",fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
                  <button onClick={guardarEdicion} style={{flex:2,background:`linear-gradient(135deg,${G.azul},#1976d2)`,border:"none",color:"white",borderRadius:9,padding:"9px",fontFamily:"inherit",fontSize:13,fontWeight:800,cursor:"pointer"}}>✅ Guardar cambios</button>
                </div>
              </div>
            </div>
          )}

          {vista==="trazabilidad"&&(
            <Card>
              <Titulo icon="📜" text="Historial de cosechas"/>
              <div style={{marginBottom:11}}><select value={filtroT} onChange={e=>setFiltroT(e.target.value)} style={{...inp,fontSize:13}}><option value="todos">Todos los campos ({regs.length})</option>{[...new Set(regs.map(r=>r.campo||r.lote).filter(Boolean))].map(c=><option key={c} value={c}>{c} ({regs.filter(r=>(r.campo||r.lote)===c).length})</option>)}</select></div>
              {filtroT!=="todos"&&(()=>{const rs=regs.filter(r=>(r.campo||r.lote)===filtroT);const tot=rs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);return(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:11}}>{[{l:"Total kg",v:tot.toLocaleString(),c:G.verde},{l:"Promedio",v:Math.round(tot/rs.length).toLocaleString()+" kg",c:G.azul},{l:"Problemas",v:rs.filter(r=>r.problema&&!r.problema.includes("Ninguno")).length,c:G.rojo}].map((k,i)=><div key={i} style={{background:`${k.c}10`,borderRadius:8,padding:"9px",textAlign:"center",border:`1px solid ${k.c}20`}}><div style={{fontWeight:800,fontSize:17,color:k.c}}>{k.v}</div><div style={{fontSize:10,color:"#aaa",marginTop:2}}>{k.l}</div></div>)}</div>);})()}
              {(filtroT==="todos"?regs:regs.filter(r=>(r.campo||r.lote)===filtroT)).map((r,i)=>(
                <div key={i} style={{border:`1px solid ${G.borde}`,borderLeft:`4px solid ${TC[r.tipo]||G.verde}`,borderRadius:9,padding:"10px 12px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                    <div><div style={{fontWeight:600,fontSize:13,color:G.texto}}>{r.cultivo}</div><div style={{fontSize:10,color:"#aaa"}}>{r.fecha}{r.hora?` · ${r.hora}`:""}</div></div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <Chip bg={TB[r.tipo]} color={TC[r.tipo]}>{r.tipo==="ok"?"✅ OK":r.tipo==="alerta"?"⚠️ Alerta":"🚨 Crítico"}</Chip>
                      <button onClick={()=>abrirEdicion(r,regs.indexOf(r))} style={{background:"none",border:`1px solid ${G.borde}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:11,color:G.suave,fontFamily:"inherit",fontWeight:600}}>✏️</button>
                    </div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {r.cantidad_kg&&<Chip>{`⚖️ ${r.cantidad_kg} kg`}</Chip>}
                    {(r.campo||r.lote)&&<Chip bg={G.moradoC} color={G.morado}>{`📍 ${r.campo||r.lote}`}</Chip>}
                    {r.calidad&&<Chip bg={G.azulC} color={G.azul}>{`🏷️ ${r.calidad}`}</Chip>}
                    {r.problema&&!r.problema.includes("Ninguno")&&<Chip bg={G.naranjaC} color={G.naranja}>{`⚠️ ${r.problema}`}</Chip>}
                  </div>
                  {r.ia_comentario&&<div style={{marginTop:7,fontSize:11,color:G.suave,padding:"5px 8px",background:`${G.borde}60`,borderRadius:5}}>🤖 {r.ia_comentario}</div>}
                </div>
              ))}
            </Card>
          )}

          {/* ── SEMÁFORO ── */}
          {/* ── ALERTAS ── */}
          {vista==="alertas"&&(<>
            <Card>
              <Titulo icon="🚨" text="Alertas Tempranas Inteligentes" color={G.rojo}/>
              <div style={{fontSize:13,color:G.suave,marginBottom:10}}>La IA analiza patrones en tu historial y detecta problemas antes de que se agraven.</div>
              <Btn onClick={doAlertas} loading={loadA} label="🔍 Analizar historial" lblLoad="⏳ Analizando..." color={G.rojo}/>
            </Card>
            {resA&&<Card style={{borderLeft:`4px solid ${G.azul}`}}><div style={{fontWeight:700,fontSize:13,color:G.azul,marginBottom:5}}>📊 Estado general</div><div style={{fontSize:13,color:G.texto,lineHeight:1.6}}>{resA}</div></Card>}
            {!loadA&&!alertas.length&&<div style={{textAlign:"center",padding:40,color:"#aaa",background:"white",borderRadius:11}}><div style={{fontSize:38,marginBottom:7}}>🔍</div><div>Presiona "Analizar" para revisar tu historial.</div></div>}
            {alertas.map((a,i)=>(
              <div key={i} style={{background:"white",border:`1px solid ${NC[a.nivel]||G.borde}`,borderLeft:`5px solid ${NC[a.nivel]||G.verde}`,borderRadius:11,padding:"13px",marginBottom:9,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                  <div><div style={{fontWeight:700,fontSize:13,color:NC[a.nivel]}}>{a.nivel==="critica"?"🚨":a.nivel==="alta"?"⚠️":"📢"} {a.titulo}</div><div style={{fontSize:10,color:"#aaa",marginTop:2}}>📍 {a.campo} · 🌱 {a.cultivo}</div></div>
                  <Chip bg={NC[a.nivel]+"20"} color={NC[a.nivel]}>{a.nivel}</Chip>
                </div>
                <div style={{fontSize:13,color:G.texto,lineHeight:1.6,marginBottom:9}}>{a.mensaje}</div>
                <div style={{background:G.verdeC,borderRadius:7,padding:"7px 11px",fontSize:12,fontWeight:600,color:G.verde}}>💡 {a.accion}</div>
              </div>
            ))}
          </>)}

          {/* ── PREDICCIÓN ── */}
          {/* ── MIS CAMPOS ── */}
          {vista==="campos"&&(()=>{
            const camposRegistrados=[...new Set(regs.map(r=>r.campo||r.lote).filter(Boolean))];
            return(<div>
              {/* Hero */}
              <div style={{background:`linear-gradient(135deg,${G.verde},#388e3c)`,borderRadius:12,padding:"16px 20px",marginBottom:12,color:"white"}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>🌾 Gestión de Mis Campos</div>
                <div style={{fontSize:12,opacity:0.85}}>Registra el tamaño de cada campo en hectáreas para cálculos más precisos</div>
              </div>

              {/* Formulario agregar campo */}
              <Card>
                <Titulo icon="➕" text="Agregar o actualizar campo"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,marginBottom:10}}>
                  <div>
                    <label style={lbl}>📍 Nombre del campo</label>
                    <input value={campoNombre} onChange={e=>setCampoNombre(e.target.value)}
                      placeholder="Ej: La Loma, Chacra Norte, El Bajo..."
                      list="campos-sugeridos" style={inp}/>
                    <datalist id="campos-sugeridos">
                      {camposRegistrados.map(c=><option key={c} value={c}/>)}
                    </datalist>
                  </div>
                  <div>
                    <label style={lbl}>📐 Hectáreas</label>
                    <input type="number" value={campoHas} onChange={e=>setCampoHas(e.target.value)}
                      placeholder="Ej: 3.5" min="0.1" step="0.1"
                      style={{...inp,width:100}}/>
                  </div>
                </div>
                <Btn onClick={guardarCampo} label="💾 Guardar campo" color={G.verde}/>
                <div style={{marginTop:8,fontSize:11,color:G.suave}}>
                  💡 Los campos que ya tienes registrados aparecen como sugerencias al escribir el nombre
                </div>
              </Card>

              {/* Lista de campos con ha */}
              {Object.keys(campos).length>0&&(
                <Card>
                  <Titulo icon="📋" text={`Campos registrados (${Object.keys(campos).length})`}/>
                  {Object.entries(campos).sort((a,b)=>b[1]-a[1]).map(([nombre,ha],i)=>{
                    const kgCampo=regs.filter(r=>(r.campo||r.lote)===nombre).reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
                    const regsCampo=regs.filter(r=>(r.campo||r.lote)===nombre).length;
                    const kgPorHa=ha>0?Math.round(kgCampo/ha):0;
                    return(
                      <div key={i} style={{border:`1px solid ${G.borde}`,borderLeft:`4px solid ${G.verde}`,borderRadius:10,padding:"13px 15px",marginBottom:9}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{fontWeight:700,fontSize:14,color:G.texto}}>📍 {nombre}</div>
                            <div style={{fontSize:11,color:G.suave,marginTop:2}}>{regsCampo} registros de cosecha</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{background:G.verdeC,borderRadius:20,padding:"4px 12px",textAlign:"center"}}>
                              <div style={{fontWeight:900,fontSize:18,color:G.verde,lineHeight:1}}>{ha}</div>
                              <div style={{fontSize:9,color:G.suave,marginTop:1}}>hectáreas</div>
                            </div>
                            <button onClick={()=>eliminarCampo(nombre)} style={{background:"none",border:`1px solid ${G.borde}`,borderRadius:8,padding:"5px 8px",cursor:"pointer",color:G.rojo,fontSize:12,fontFamily:"inherit"}}>🗑️</button>
                          </div>
                        </div>
                        {/* Stats del campo */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                          {[
                            {l:"Total cosechado",v:`${kgCampo.toLocaleString()} kg`,c:G.verde},
                            {l:"Kg por hectárea",v:kgPorHa>0?`${kgPorHa.toLocaleString()} kg/ha`:"Sin datos",c:G.azul},
                            {l:"Rendimiento",v:kgPorHa>0?(kgPorHa>=8000?"🟢 Bueno":kgPorHa>=4000?"🟡 Regular":"🔴 Bajo"):"⚪ Sin datos",c:kgPorHa>=8000?G.verde:kgPorHa>=4000?G.dorado:G.rojo},
                          ].map((k,i)=>(
                            <div key={i} style={{background:`${k.c}10`,borderRadius:8,padding:"8px 10px",textAlign:"center",border:`1px solid ${k.c}20`}}>
                              <div style={{fontWeight:700,fontSize:13,color:k.c}}>{k.v}</div>
                              <div style={{fontSize:9,color:G.suave,marginTop:2}}>{k.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}

              {/* Campos detectados en registros pero sin hectáreas */}
              {(()=>{
                const sinHa=camposRegistrados.filter(c=>!campos[c]);
                if(!sinHa.length) return null;
                return(
                  <Card style={{borderLeft:`4px solid ${G.dorado}`}}>
                    <Titulo icon="⚠️" text="Campos sin hectáreas definidas" color={G.dorado}/>
                    <div style={{fontSize:12,color:G.suave,marginBottom:10}}>Estos campos aparecen en tus registros pero aún no tienen tamaño definido:</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                      {sinHa.map((c,i)=>(
                        <button key={i} onClick={()=>setCampoNombre(c)}
                          style={{background:G.doradoC,border:`1px solid ${G.dorado}30`,borderRadius:20,padding:"5px 13px",cursor:"pointer",fontSize:12,fontWeight:600,color:G.dorado,fontFamily:"inherit"}}>
                          📍 {c} — toca para definir ha
                        </button>
                      ))}
                    </div>
                  </Card>
                );
              })()}

              {/* Resumen total */}
              {Object.keys(campos).length>0&&(
                <Card>
                  <Titulo icon="📊" text="Resumen total de la finca"/>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                    {[
                      {l:"Total hectáreas",v:`${Object.values(campos).reduce((s,v)=>s+v,0).toFixed(1)} ha`,c:G.verde},
                      {l:"Campos registrados",v:Object.keys(campos).length,c:G.azul},
                      {l:"Kg totales",v:`${regs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0).toLocaleString()} kg`,c:G.morado},
                    ].map((k,i)=>(
                      <div key={i} style={{background:`${k.c}10`,borderRadius:10,padding:"12px",textAlign:"center",border:`1px solid ${k.c}20`}}>
                        <div style={{fontWeight:800,fontSize:16,color:k.c}}>{k.v}</div>
                        <div style={{fontSize:10,color:G.suave,marginTop:3}}>{k.l}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>);
          })()}

          {vista==="prediccion"&&(<>
            <Card style={{marginBottom:12}}>
              <Titulo icon="🌤️" text="Predicción climática — próximos 7 días" color={G.azul}/>
              <div style={{fontSize:12,color:G.suave,marginBottom:10}}>AGROTECH estima el clima de tu zona y su impacto en tus cultivos esta semana.</div>
              <Btn onClick={predecirClima} loading={loadClima} label="🌤️ Predecir clima de mi zona" lblLoad="⏳ Analizando clima..." color={G.azul}/>
              {climaData&&!climaData.error&&(()=>{
                const condIcon={"Soleado":"☀️","Nublado":"⛅","Lluvioso":"🌧️","Viento fuerte":"💨","Niebla costera":"🌫️","Parcialmente nublado":"🌤️"};
                const alertC={ninguna:G.verde,moderada:G.dorado,alta:G.rojo};
                return(<div style={{marginTop:11}}>
                  <div style={{background:G.azulC,borderRadius:9,padding:"8px 12px",marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontWeight:700,fontSize:12,color:G.azul}}>📍 {climaData.zona}</div><div style={{fontSize:11,color:G.suave}}>🗓️ {climaData.epoca}</div></div>
                    {climaData.alerta_general&&climaData.alerta_general!=="ninguna"&&<div style={{background:alertC[climaData.alerta_general]||G.dorado,color:"white",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20}}>⚠️ Alerta {climaData.alerta_general}</div>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:9}}>
                    {(climaData.prediccion_7dias||[]).map((d,i)=>(
                      <div key={i} style={{background:"white",borderRadius:8,padding:"6px 3px",textAlign:"center",border:`1px solid ${G.borde}`}}>
                        <div style={{fontSize:9,fontWeight:700,color:G.suave,marginBottom:2}}>{d.dia}</div>
                        <div style={{fontSize:14}}>{condIcon[d.condicion]||"🌡️"}</div>
                        <div style={{fontSize:10,fontWeight:700,color:"#c62828"}}>{d.temp_max}°</div>
                        <div style={{fontSize:9,color:G.azul}}>{d.temp_min}°</div>
                        <div style={{fontSize:8,color:G.suave}}>💧{d.probabilidad_lluvia}%</div>
                        {d.alerta&&d.alerta!=="ninguna"&&<div style={{fontSize:8,color:G.rojo,fontWeight:700}}>⚠️</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{background:G.verdeC,borderRadius:8,padding:"8px 11px",marginBottom:8,borderLeft:`4px solid ${G.verde}`}}>
                    <div style={{fontSize:9,fontWeight:700,color:G.verde,marginBottom:2}}>📋 RESUMEN</div>
                    <div style={{fontSize:12,color:G.texto}}>{climaData.resumen_semana}</div>
                  </div>
                  {(climaData.recomendaciones_climaticas||[]).map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:6,marginBottom:5}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:G.verde,flexShrink:0,marginTop:4}}/>
                      <div style={{fontSize:12,color:G.texto}}>{r}</div>
                    </div>
                  ))}
                  {climaData.fenomeno_especial&&climaData.fenomeno_especial!=="ninguno"&&(
                    <div style={{marginTop:8,background:"#fff3e0",borderRadius:7,padding:"7px 11px",border:`1px solid ${G.dorado}30`}}>
                      <div style={{fontSize:11,fontWeight:700,color:G.dorado}}>🌊 {climaData.fenomeno_especial}</div>
                    </div>
                  )}
                </div>);
              })()}
              {climaData?.error&&<div style={{marginTop:8,background:G.rojoC,borderRadius:7,padding:"8px 12px",color:G.rojo,fontSize:12}}>{climaData.error}</div>}
            </Card>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{flex:1,height:1,background:G.borde}}/>
              <div style={{fontSize:11,color:G.suave,fontWeight:600,whiteSpace:"nowrap"}}>ANÁLISIS DE PRODUCCIÓN</div>
              <div style={{flex:1,height:1,background:G.borde}}/>
            </div>
            <div style={{background:`linear-gradient(135deg,${G.morado},#9c27b0)`,borderRadius:12,padding:"14px 18px",marginBottom:12,color:"white"}}><div style={{fontWeight:800,fontSize:15,marginBottom:2}}>🔮 Centro de Predicción</div><div style={{fontSize:12,opacity:0.8}}>Pregúntame sobre tu producción futura o genera una predicción automática</div></div>
            <Card style={{marginBottom:12}}>
              <Titulo icon="💬" text="Consulta tu planificación" color={G.morado}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                {["¿Cuánto cosecharé en un mes? 📅","¿Cuántas hectáreas para 5,000 kg? 🌱","¿Cultivo más rentable? 💰","¿Cuándo sembrar? 🗓️"].map((q,i)=>(
                  <button key={i} onClick={()=>doPredChat(q)} disabled={loadPredChat} style={{background:G.moradoC,color:G.morado,border:"none",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:loadPredChat?"not-allowed":"pointer",fontFamily:"inherit"}}>{q}</button>
                ))}
              </div>
              {predChat.length===0?(<div style={{textAlign:"center",padding:"18px",color:"#bbb"}}><div style={{fontSize:28,marginBottom:4}}>🔮</div><div style={{fontSize:13}}>Hazme una pregunta sobre tu producción futura</div></div>):(
                <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:7,marginBottom:9}}>
                  {predChat.map((m,i)=>(
                    <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
                      <div style={{width:25,height:25,borderRadius:"50%",background:m.role==="user"?G.morado:G.moradoC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{m.role==="user"?"👤":"🔮"}</div>
                      <div style={{maxWidth:"80%",background:m.role==="user"?G.morado:"#f8f4ff",color:m.role==="user"?"white":G.texto,borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px",padding:"8px 11px",fontSize:12,lineHeight:1.6,border:m.role==="assistant"?`1px solid ${G.moradoC}`:"none",whiteSpace:"pre-wrap"}}>
                        {m.content.split("\n").map((line,li)=>(
                          <div key={li} style={{marginBottom:line===""?3:0}}>
                            {line.startsWith("•")?<span><span style={{color:m.role==="user"?"rgba(255,255,255,0.8)":G.morado,fontWeight:700}}>•</span>{line.slice(1)}</span>
                            :line.startsWith("➤")?<span style={{fontWeight:700,color:m.role==="user"?"#ce93d8":G.morado}}>➤{line.slice(1)}</span>
                            :line.startsWith("💡")?<span style={{fontWeight:600}}>{line}</span>:line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {loadPredChat&&<div style={{display:"flex",gap:7}}><div style={{width:25,height:25,borderRadius:"50%",background:G.moradoC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🔮</div><div style={{background:"#f8f4ff",borderRadius:"10px 10px 10px 3px",padding:"8px 11px",display:"flex",gap:4,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:G.morado,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>)}</div></div>}
                  <div ref={predChatRef}/>
                </div>
              )}
              <div style={{display:"flex",gap:6,background:"#f8f4ff",borderRadius:9,padding:"7px 10px",border:`1px solid ${G.morado}25`}}>
                <input value={predInput} onChange={e=>setPredInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();doPredChat();}}} placeholder="¿En cuánto tiempo recupero mi inversión?" disabled={loadPredChat} style={{flex:1,border:"none",outline:"none",fontSize:12,fontFamily:"inherit",color:G.texto,background:"transparent"}}/>
                <button onClick={()=>doPredChat()} disabled={loadPredChat||!predInput.trim()} style={{width:30,height:30,borderRadius:7,border:"none",background:loadPredChat||!predInput.trim()?"#ddd":G.morado,color:"white",cursor:loadPredChat||!predInput.trim()?"not-allowed":"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>➤</button>
              </div>
              {predChat.length>0&&<button onClick={()=>setPredChat([])} style={{marginTop:5,background:"none",border:"none",color:"#bbb",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>🗑️ Limpiar</button>}
            </Card>
            <Card>
              <Titulo icon="📊" text="Predicción automática — 7 días" color={G.morado}/>
              <Btn onClick={doPreds} loading={loadP} label="🔮 Generar predicción automática" lblLoad="⏳ Analizando..." color={G.morado}/>
            </Card>
            {kpiP&&<div style={{background:`linear-gradient(135deg,${G.morado},#9c27b0)`,borderRadius:11,padding:"16px 20px",marginBottom:11,color:"white",textAlign:"center"}}><div style={{fontSize:11,opacity:0.7,marginBottom:3}}>PRODUCCIÓN PROYECTADA — 7 DÍAS</div><div style={{fontWeight:900,fontSize:30}}>{kpiP.toLocaleString()} <span style={{fontSize:15}}>kg</span></div></div>}
            {recGen&&<Card style={{borderLeft:`4px solid ${G.morado}`}}><div style={{fontWeight:700,fontSize:13,color:G.morado,marginBottom:5}}>🧠 Recomendación estratégica</div><div style={{fontSize:13,color:G.texto,lineHeight:1.6}}>{recGen}</div></Card>}
            {!loadP&&!preds.length&&<div style={{textAlign:"center",padding:40,color:"#aaa",background:"white",borderRadius:11}}><div style={{fontSize:38,marginBottom:7}}>🔮</div><div>Presiona "Generar predicciones".</div></div>}
            {preds.map((p,i)=>(
              <Card key={i}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                  <div><div style={{fontWeight:700,fontSize:13,color:G.texto}}>{p.cultivo}</div><div style={{fontSize:10,color:"#aaa",marginTop:2}}>📍 {p.campo}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:17,color:G.morado}}>{p.kg_estimado?.toLocaleString()} kg</div><div style={{fontSize:10,color:"#aaa"}}>estimado/semana</div></div>
                </div>
                <div style={{display:"flex",gap:6,marginBottom:9}}>
                  <Chip bg={p.tendencia==="subiendo"?G.verdeC:p.tendencia==="estable"?G.azulC:G.rojoC} color={p.tendencia==="subiendo"?G.verde:p.tendencia==="estable"?G.azul:G.rojo}>{p.tendencia==="subiendo"?"📈 Subiendo":p.tendencia==="estable"?"➡️ Estable":"📉 Bajando"}</Chip>
                  <Chip bg={p.confianza==="alta"?G.verdeC:G.doradoC} color={p.confianza==="alta"?G.verde:G.dorado}>Conf: {p.confianza}</Chip>
                </div>
                <div style={{background:G.moradoC,borderRadius:7,padding:"7px 11px",fontSize:12,fontWeight:600,color:G.morado}}>💡 {p.recomendacion}</div>
              </Card>
            ))}
          </>)}

          {/* ── DETECTOR PLAGAS ── */}
          {vista==="inteligencia"&&(<>
            <div style={{background:`linear-gradient(135deg,${G.naranja},#f57c00)`,borderRadius:12,padding:"16px 20px",marginBottom:12,color:"white"}}>
              <div style={{fontWeight:800,fontSize:16,marginBottom:3}}>🔬 Diagnóstico Inteligente de Cultivos</div>
              <div style={{fontSize:13,opacity:0.85}}>Describe los síntomas. AGROTECH identifica la plaga y el tratamiento exacto.</div>
            </div>
            {/* ── ANÁLISIS DE FOTO ── */}
            <Card style={{marginBottom:12}}>
              <Titulo icon="📸" text="Analizar foto del cultivo" color={G.naranja}/>
              <div style={{fontSize:12,color:G.suave,marginBottom:12}}>Sube una foto de tu cultivo y la IA detecta plagas, enfermedades o problemas al instante.</div>

              {/* Selector cultivo ANTES de la foto */}
              <div style={{marginBottom:12}}>
                <label style={{...lbl,color:G.naranja}}>🌱 ¿De qué cultivo es la foto? (obligatorio)</label>
                <select value={plCult} onChange={e=>setPlCult(e.target.value)} style={{...inp,borderColor:!plCult?G.naranja:G.borde}}>
                  <option value="">— Elige el cultivo para un diagnóstico preciso —</option>
                  {CULTIVOS.map(cv=><option key={cv}>{cv}</option>)}
                </select>
                {!plCult&&<div style={{fontSize:10,color:G.naranja,marginTop:3}}>⚠️ Selecciona el cultivo para que la IA identifique correctamente</div>}
              </div>

              <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{display:"none"}}/>
              {!fotoPreview?(
                <div onClick={()=>fotoInputRef.current?.click()} style={{border:`2px dashed ${G.naranja}50`,borderRadius:11,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:"#fff8f4"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=G.naranja} onMouseLeave={e=>e.currentTarget.style.borderColor=`${G.naranja}50`}>
                  <div style={{fontSize:38,marginBottom:7}}>📷</div>
                  <div style={{fontWeight:700,fontSize:14,color:G.naranja,marginBottom:3}}>Toca para subir una foto</div>
                  <div style={{fontSize:11,color:G.suave}}>Desde tu galería o toma una foto ahora</div>
                </div>
              ):(
                <div>
                  <div style={{position:"relative",marginBottom:9}}>
                    <img src={fotoPreview} alt="Cultivo" style={{width:"100%",maxHeight:240,objectFit:"cover",borderRadius:9,border:`1px solid ${G.borde}`}}/>
                    <button onClick={()=>{setFoto(null);setFotoPreview(null);setFotoResult(null);}} style={{position:"absolute",top:7,right:7,background:"rgba(0,0,0,0.55)",border:"none",color:"white",borderRadius:"50%",width:26,height:26,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                    <button onClick={()=>fotoInputRef.current?.click()} style={{background:G.bg,border:`1px solid ${G.borde}`,borderRadius:8,padding:"8px",fontFamily:"inherit",fontSize:12,fontWeight:600,color:G.suave,cursor:"pointer"}}>📷 Cambiar</button>
                    <button onClick={()=>{
                      if(!plCult){toast("Selecciona el cultivo primero ↑","error");return;}
                      analizarFoto();
                    }} disabled={loadFoto} style={{background:loadFoto?"#ccc":`linear-gradient(135deg,${G.naranja},#f57c00)`,border:"none",borderRadius:8,padding:"8px",fontFamily:"inherit",fontSize:12,fontWeight:700,color:"white",cursor:loadFoto?"not-allowed":"pointer"}}>
                      {loadFoto?"⏳ Analizando...":"🔬 Analizar con IA"}
                    </button>
                  </div>
                </div>
              )}
              {fotoResult&&!fotoResult.error&&(()=>{
                const r=fotoResult;
                const estC={Saludable:G.verde,"Con problemas":G.naranja,Crítico:G.rojo};
                const urgC={Inmediata:G.rojo,"Esta semana":G.naranja,Monitorear:G.dorado,"Sin acción necesaria":G.verde};
                return(<div style={{marginTop:11}}>
                  <div style={{background:`${estC[r.estado_general]||G.verde}15`,border:`2px solid ${estC[r.estado_general]||G.verde}`,borderRadius:11,padding:"13px 15px",marginBottom:9}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:14,color:estC[r.estado_general]||G.verde}}>{r.estado_general==="Saludable"?"✅":r.estado_general==="Con problemas"?"⚠️":"🚨"} {r.estado_general}</div>
                        {r.cultivo_detectado&&r.cultivo_detectado!=="No identificado"&&<div style={{fontSize:11,color:G.suave,marginTop:2}}>🌱 {r.cultivo_detectado}</div>}
                      </div>
                      <div style={{background:urgC[r.urgencia]||G.verde,color:"white",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,flexShrink:0}}>⚡ {r.urgencia}</div>
                    </div>
                    <div style={{fontSize:13,color:G.texto,lineHeight:1.6}}>{r.diagnostico_principal}</div>
                  </div>
                  {r.problemas_detectados?.filter(p=>p.tipo!=="Ninguno").map((p,i)=>{
                    const sevC={Leve:G.dorado,Moderada:G.naranja,Severa:G.rojo};
                    return(<div key={i} style={{border:`1px solid ${G.borde}`,borderLeft:`4px solid ${sevC[p.severidad]||G.naranja}`,borderRadius:8,padding:"9px 12px",marginBottom:7}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <div style={{fontWeight:700,fontSize:12,color:G.texto}}>{p.nombre}</div>
                        <Chip bg={`${sevC[p.severidad]}20`} color={sevC[p.severidad]||G.naranja} style={{fontSize:10}}>{p.severidad}</Chip>
                      </div>
                      <div style={{fontSize:11,color:G.suave}}>{p.tipo} · {p.descripcion}</div>
                    </div>);
                  })}
                  {r.accion_inmediata&&<div style={{background:G.verdeC,borderRadius:9,padding:"9px 12px",borderLeft:`4px solid ${G.verde}`,marginBottom:7}}>
                    <div style={{fontSize:9,fontWeight:700,color:G.verde,textTransform:"uppercase",marginBottom:3}}>⚡ Acción inmediata</div>
                    <div style={{fontSize:12,color:G.texto}}>{r.accion_inmediata}</div>
                  </div>}
                  {r.observaciones&&<div style={{background:G.bg,borderRadius:8,padding:"8px 11px",fontSize:11,color:G.suave}}> 💡 {r.observaciones}</div>}
                  <button onClick={()=>{const s=r.problemas_detectados?.filter(p=>p.tipo!=="Ninguno").map(p=>p.descripcion).join(". ")||"";if(s){setPlSint(s);if(r.cultivo_detectado&&r.cultivo_detectado!=="No identificado")setPlCult(r.cultivo_detectado);}}} style={{width:"100%",marginTop:8,background:G.bg,border:`1px solid ${G.borde}`,borderRadius:8,padding:"8px",fontFamily:"inherit",fontSize:11,fontWeight:600,color:G.suave,cursor:"pointer"}}>
                    🐛 Usar síntomas en el detector →
                  </button>
                </div>);
              })()}
              {fotoResult?.error&&<div style={{marginTop:9,background:G.rojoC,borderRadius:8,padding:"10px 12px",color:G.rojo,fontSize:12}}>{fotoResult.error}</div>}
            </Card>

            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{flex:1,height:1,background:G.borde}}/>
              <div style={{fontSize:11,color:G.suave,fontWeight:600,whiteSpace:"nowrap"}}>O DESCRIBE LOS SÍNTOMAS</div>
              <div style={{flex:1,height:1,background:G.borde}}/>
            </div>

            <Card>
              <div style={{marginBottom:10}}><label style={{...lbl,color:G.naranja}}>🌱 ¿En qué cultivo?</label><select value={plCult} onChange={e=>setPlCult(e.target.value)} style={inp}><option value="">— Elige el cultivo afectado —</option>{CULTIVOS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div style={{marginBottom:10}}><label style={{...lbl,color:G.naranja}}>🔍 Describe los síntomas</label><textarea value={plSint} onChange={e=>setPlSint(e.target.value)} placeholder="Ej: Las hojas tienen manchas amarillas, están enroscadas y hay bichitos verdes debajo..." style={{...inp,minHeight:110,resize:"none",lineHeight:1.7}}/></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                {[{s:"Hojas amarillas con puntos negros y telaraña fina en el envés",c:"Espárrago verde",l:"🥦"},{s:"Frutos con manchas marrones hundidas y olor a fermentado",c:"Palta Hass",l:"🥑"},{s:"Plantas con hojas retorcidas y bichitos blancos que vuelan",c:"Arándano",l:"🫐"},{s:"Racimos con hongos grises y bayas que se arrugan",c:"Uva Red Globe",l:"🍇"}].map((e,i)=>(
                  <button key={i} onClick={()=>{setPlSint(e.s);setPlCult(e.c);}} style={{background:G.naranjaC,color:G.naranja,border:"none",borderRadius:20,padding:"4px 11px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{e.l} {e.c.split(" ")[0]}</button>
                ))}
              </div>
              <Btn onClick={doPl} loading={loadPl} disabled={!plSint.trim()} label="🔬 Diagnosticar plaga con IA" lblLoad="⏳ Analizando síntomas..." color={G.naranja}/>
            </Card>

            {plRes&&!plRes.error&&(()=>{
              const urgC={Inmediata:G.rojo,"Esta semana":G.naranja,Monitorear:G.dorado};
              const urgBg={Inmediata:G.rojoC,"Esta semana":G.naranjaC,Monitorear:G.doradoC};
              return(<>
                <div style={{background:urgBg[plRes.urgencia]||G.verdeC,border:`2px solid ${urgC[plRes.urgencia]||G.verde}`,borderRadius:12,padding:"16px 18px",marginBottom:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                    <div><div style={{fontWeight:800,fontSize:15,color:urgC[plRes.urgencia]||G.verde}}>🔬 {plRes.plaga_probable}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>Certeza: <strong style={{color:plRes.certeza==="Alta"?G.verde:G.dorado}}>{plRes.certeza}</strong></div></div>
                    <div style={{background:urgC[plRes.urgencia]||G.verde,color:"white",fontSize:11,fontWeight:700,padding:"4px 11px",borderRadius:20}}>⚡ {plRes.urgencia}</div>
                  </div>
                  <div style={{fontSize:13,color:G.texto,lineHeight:1.6}}>{plRes.descripcion}</div>
                  {plRes.alerta_vecinos&&<div style={{marginTop:9,background:G.rojoC,borderRadius:7,padding:"7px 11px",fontSize:12,fontWeight:700,color:G.rojo}}>🚨 Esta plaga puede contagiar campos vecinos. ¡Notifica inmediatamente!</div>}
                </div>

                <Card>
                  <div style={{fontWeight:700,fontSize:13,color:G.texto,marginBottom:3}}>🔍 ¿Ves también estos síntomas?</div>
                  <div style={{fontSize:12,color:G.suave,marginBottom:10}}>Márcalos para refinar el diagnóstico.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {(plRes.sintomas_confirmacion||[]).map((s,i)=>{
                      const m=sConf.includes(s);
                      return(<div key={i} onClick={()=>{const n=m?sConf.filter(x=>x!==s):[...sConf,s];setSConf(n);setPlRef(null);}} style={{display:"flex",gap:9,alignItems:"center",background:m?G.verdeC:"#f9f9f9",borderRadius:8,padding:"8px 11px",cursor:"pointer",border:`1.5px solid ${m?G.verde:G.borde}`,transition:"all 0.15s"}}>
                        <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${m?G.verde:G.borde}`,background:m?G.verde:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{m&&<span style={{color:"white",fontSize:11,fontWeight:900}}>✓</span>}</div>
                        <div style={{fontSize:13,color:m?G.verde:G.texto,fontWeight:m?600:400}}>{s}</div>
                      </div>);
                    })}
                  </div>
                  {sConf.length>0&&<div style={{marginTop:10}}>
                    <div style={{fontSize:12,color:G.verde,fontWeight:700,marginBottom:7}}>✅ {sConf.length} síntoma{sConf.length>1?"s":""} confirmado{sConf.length>1?"s":""}</div>
                    <Btn onClick={()=>doRef(sConf,plRes)} loading={loadRef} label="🎯 Refinar diagnóstico" lblLoad="⏳ Refinando..." color={G.dorado}/>
                  </div>}
                  {plRef&&!plRef.error&&(
                    <div style={{marginTop:12,borderRadius:10,border:`2px solid ${G.dorado}`,overflow:"hidden"}}>
                      <div style={{background:`linear-gradient(135deg,${G.verde},${G.dorado})`,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div><div style={{color:"white",fontWeight:800,fontSize:13}}>🎯 Diagnóstico Refinado</div><div style={{color:"rgba(255,255,255,0.65)",fontSize:10,marginTop:1}}>{plRef.confirmacion_nivel}</div></div>
                        <div style={{background:"rgba(255,255,255,0.2)",color:"white",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20}}>Certeza: {plRef.certeza}</div>
                      </div>
                      <div style={{padding:"13px 15px",background:"white"}}>
                        <div style={{fontWeight:700,fontSize:14,color:G.verde,marginBottom:7}}>{plRef.plaga_probable}</div>
                        <div style={{fontSize:13,color:G.texto,lineHeight:1.6,marginBottom:9}}>{plRef.analisis_refinado}</div>
                        <div style={{background:G.verdeC,borderRadius:8,padding:"9px 11px",marginBottom:7,borderLeft:`4px solid ${G.verde}`}}><div style={{fontSize:9,fontWeight:700,color:G.verde,marginBottom:2,textTransform:"uppercase"}}>⚡ Acción inmediata</div><div style={{fontSize:13,color:G.texto}}>{plRef.tratamiento_urgente}</div></div>
                        <div style={{background:G.doradoC,borderRadius:8,padding:"9px 11px",borderLeft:`4px solid ${G.dorado}`}}><div style={{fontSize:9,fontWeight:700,color:G.dorado,marginBottom:2,textTransform:"uppercase"}}>🔮 Pronóstico</div><div style={{fontSize:13,color:G.texto}}>{plRef.pronostico}</div></div>
                      </div>
                    </div>
                  )}
                </Card>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
                  {plRes.tratamiento_organico&&<Card style={{marginBottom:0,borderTop:`3px solid ${G.verde}`}}><div style={{fontWeight:700,fontSize:11,color:G.verde,marginBottom:7}}>🌿 ORGÁNICO</div><div style={{fontWeight:600,fontSize:13,color:G.texto,marginBottom:5}}>{plRes.tratamiento_organico.producto}</div><div style={{fontSize:11,color:G.suave,lineHeight:1.6}}><div>📏 {plRes.tratamiento_organico.dosis}</div><div>🔄 {plRes.tratamiento_organico.frecuencia}</div><div>⏰ {plRes.tratamiento_organico.momento}</div></div></Card>}
                  {plRes.tratamiento_quimico&&<Card style={{marginBottom:0,borderTop:`3px solid ${G.dorado}`}}><div style={{fontWeight:700,fontSize:11,color:G.dorado,marginBottom:7}}>⚗️ QUÍMICO</div><div style={{fontWeight:600,fontSize:13,color:G.texto,marginBottom:5}}>{plRes.tratamiento_quimico.producto}</div><div style={{fontSize:11,color:G.suave,lineHeight:1.6}}><div>🧪 {plRes.tratamiento_quimico.ingrediente_activo}</div><div>📏 {plRes.tratamiento_quimico.dosis}</div><div>⚠️ {plRes.tratamiento_quimico.precaucion}</div></div></Card>}
                </div>
              </>);
            })()}
          </>)}

          {/* ── REPORTE ── */}
          {vista==="trabajadores"&&(()=>{
            const trabajadores=calcTrabajadores(regs);
            const totalRegs=regs.length;
            const totalKgG=regs.reduce((s,r)=>s+Number(r.cantidad_kg||0),0);
            return(<div>
              <div style={{background:`linear-gradient(135deg,${G.azul},#1976d2)`,borderRadius:12,padding:"16px 20px",marginBottom:12,color:"white",display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:34}}>👷</div>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:15}}>Panel de Trabajadores</div><div style={{fontSize:12,opacity:0.8,marginTop:2}}>{trabajadores.length} trabajadores · {totalRegs} jornadas</div></div>
              </div>
              {trabajadorSel&&(()=>{
                const t=trabajadorSel;
                const jornadas=regs.filter(r=>{const raw=r.trabajadores;const ws=Array.isArray(raw)?raw.flatMap(x=>x.split(/[,;y ]+/).map(s=>s.trim())).filter(s=>s.length>=2):(typeof raw==="string"?raw.split(/[,;]+/).map(x=>x.trim()).filter(s=>s.length>=2):[]);return ws.some(w=>w.toLowerCase()===t.nombre.toLowerCase());}).sort((a,b)=>b.fecha.localeCompare(a.fecha));
                return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(3px)"}} onClick={()=>setTrabajadorSel(null)}>
                  <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:640,maxHeight:"80vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                    <div style={{background:`linear-gradient(135deg,${G.sidebar},#1a3a1a)`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                      <div style={{flex:1}}><div style={{color:"white",fontWeight:800,fontSize:16}}>{t.nombre}</div><div style={{color:"rgba(255,255,255,0.55)",fontSize:12,marginTop:1}}>{jornadas.length} jornadas · {t.totalKg.toLocaleString()} kg · {t.promedioKg} kg/jornada</div></div>
                      <button onClick={()=>setTrabajadorSel(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"white",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",borderBottom:`1px solid ${G.borde}`,flexShrink:0}}>
                      {[{l:"Total kg",v:t.totalKg.toLocaleString(),c:G.verde},{l:"Jornadas",v:jornadas.length,c:G.azul},{l:"Con problema",v:t.conProblema,c:t.conProblema>0?G.rojo:G.verde}].map((k,i)=>(
                        <div key={i} style={{padding:"12px",textAlign:"center",borderRight:i<2?`1px solid ${G.borde}`:"none"}}>
                          <div style={{fontWeight:800,fontSize:18,color:k.c}}>{k.v}</div>
                          <div style={{fontSize:10,color:G.suave,marginTop:2}}>{k.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{overflowY:"auto",flex:1,padding:"12px 16px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:G.suave,textTransform:"uppercase",marginBottom:10}}>Historial de jornadas</div>
                      {jornadas.map((r,i)=>(
                        <div key={i} style={{border:`1px solid ${G.borde}`,borderLeft:`4px solid ${TC[r.tipo]||G.verde}`,borderRadius:9,padding:"11px 13px",marginBottom:7}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <div><div style={{fontWeight:700,fontSize:13,color:G.texto}}>{r.cultivo}</div><div style={{fontSize:11,color:G.suave}}>📅 {r.fecha}{r.hora?" · "+r.hora:""}</div></div>
                            <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:14,color:TC[r.tipo]||G.verde}}>{Number(r.cantidad_kg).toLocaleString()} kg</div><div style={{fontSize:10,color:G.suave}}>{r.calidad}</div></div>
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {(r.campo||r.lote)&&<Chip bg={G.moradoC} color={G.morado}>📍 {r.campo||r.lote}</Chip>}
                            {r.problema&&!r.problema.includes("Ninguno")&&<Chip bg={G.rojoC} color={G.rojo}>⚠️ {r.problema}</Chip>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>);
              })()}
              {trabajadores.length===0?(<div style={{textAlign:"center",padding:50,color:"#aaa",background:"white",borderRadius:11}}><div style={{fontSize:44,marginBottom:9}}>👷</div><div>Sin trabajadores aún. Agrégalos al registrar cosechas.</div></div>):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)",gap:9,marginBottom:12}}>
                    {[{l:"Total trabajadores",v:trabajadores.length,i:"👷",c:G.azul},{l:"Mayor productor",v:trabajadores[0]?.nombre.split(" ")[0]||"-",i:"🏆",c:G.dorado},{l:"Promedio kg/jornada",v:totalRegs>0?Math.round(totalKgG/totalRegs).toLocaleString()+" kg":"-",i:"⚖️",c:G.verde}].map((k,i)=>(
                      <div key={i} style={{background:"white",borderRadius:11,padding:"13px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:`1px solid ${G.borde}`,borderTop:`3px solid ${k.c}`}}>
                        <div style={{fontSize:20,marginBottom:6}}>{k.i}</div>
                        <div style={{fontWeight:800,fontSize:18,color:k.c,lineHeight:1}}>{k.v}</div>
                        <div style={{fontSize:11,color:G.suave,marginTop:3}}>{k.l}</div>
                      </div>
                    ))}
                  </div>
                  {trabajadores.map((t,i)=>{
                    const pct=Math.round((t.registros/totalRegs)*100);
                    const medalla=i===0?"🥇":i===1?"🥈":i===2?"🥉":"👷";
                    return(<div key={i} onClick={()=>setTrabajadorSel(t)} style={{background:"white",borderRadius:12,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:`1px solid ${G.borde}`,cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=G.azul}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=G.borde}>
                      <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:10}}>
                        <div style={{width:42,height:42,borderRadius:"50%",background:i===0?G.doradoC:i<3?G.verdeC:G.azulC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{medalla}</div>
                        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:14,color:G.texto}}>{t.nombre}</div><div style={{fontSize:11,color:G.suave,marginTop:1}}>Última jornada: {t.ultimaFecha||"—"} · <span style={{color:G.azul,fontWeight:600}}>Toca para ver historial →</span></div></div>
                        <div style={{textAlign:"right",flexShrink:0}}><div style={{fontWeight:800,fontSize:15,color:G.verde}}>{t.totalKg.toLocaleString()} kg</div><div style={{fontSize:10,color:G.suave}}>total</div></div>
                      </div>
                      <div style={{marginBottom:9}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G.suave,marginBottom:3}}><span>Participación</span><span style={{fontWeight:700,color:G.azul}}>{pct}%</span></div>
                        <div style={{height:5,background:G.borde,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${G.azul},${G.verde})`,borderRadius:3}}/></div>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        <Chip bg={G.verdeC} color={G.verde}>⚖️ {t.promedioKg} kg/jornada</Chip>
                        <Chip bg={G.azulC} color={G.azul}>📋 {t.registros} jornada{t.registros!==1?"s":""}</Chip>
                        {t.campos.length>0&&<Chip bg={G.moradoC} color={G.morado}>📍 {t.campos.slice(0,2).join(", ")}{t.campos.length>2?` +${t.campos.length-2}`:""}</Chip>}
                        {t.conProblema>0&&<Chip bg={G.rojoC} color={G.rojo}>⚠️ {t.conProblema} con incidencia</Chip>}
                      </div>
                    </div>);
                  })}
                </>
              )}
            </div>);
          })()}

          {vista==="reporte"&&(<>
            <div style={{background:`linear-gradient(135deg,${G.dorado},#e0a000)`,borderRadius:12,padding:"16px 20px",marginBottom:12,color:"white",boxShadow:`0 4px 14px ${G.dorado}30`}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{fontSize:32}}>📄</div>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:15}}>Reporte AGROTECH</div><div style={{fontSize:12,opacity:0.8,marginTop:1}}>{regs.length} registros disponibles</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>
                {[{id:"hoy",icon:"📅",label:"Hoy"},{id:"semana",icon:"📆",label:"Esta semana"},{id:"mes",icon:"🗓️",label:"Este mes"}].map(p=>(
                  <button key={p.id} onClick={()=>{setPeriodoRep(p.id);setRep(null);}} style={{background:periodoRep===p.id?"white":"rgba(255,255,255,0.15)",color:periodoRep===p.id?G.dorado:"white",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"7px 5px",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    <span>{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
              <button onClick={()=>doRep(periodoRep)} disabled={loadRep} style={{width:"100%",background:loadRep?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.25)",border:"1.5px solid rgba(255,255,255,0.4)",color:"white",borderRadius:9,padding:"10px",fontFamily:"inherit",fontSize:13,fontWeight:800,cursor:loadRep?"not-allowed":"pointer"}}>
                {loadRep?"⏳ Generando reporte...":"🔄 Generar reporte"}
              </button>
            </div>
            {rep?.error&&<div style={{background:G.rojoC,borderRadius:10,padding:"14px 16px",marginBottom:11,border:`1px solid ${G.rojo}25`,display:"flex",gap:10}}><div style={{fontSize:20}}>❌</div><div><div style={{fontWeight:700,color:G.rojo,fontSize:13,marginBottom:3}}>Error al generar</div><div style={{fontSize:13,color:G.texto}}>{rep.error}</div></div></div>}
            {!loadRep&&!rep&&<div style={{textAlign:"center",padding:50,color:"#aaa",background:"white",borderRadius:11}}><div style={{fontSize:44,marginBottom:9}}>📊</div><div style={{fontWeight:600,fontSize:14,color:"#555",marginBottom:5}}>Reporte visual de la semana</div><div style={{fontSize:13}}>La IA genera un informe completo con KPIs, logros y recomendaciones.</div></div>}
            {rep&&!rep.error&&(()=>{
              const calC={"Excelente":G.verde,"Buena":"#43a047","Regular":G.dorado,"Difícil":G.rojo}[rep.calificacion_semana]||G.verde;
              const priC={"Alta":G.rojo,"Media":G.naranja};
              return(<>
                <div style={{background:`linear-gradient(135deg,${calC},${calC}cc)`,borderRadius:12,padding:"18px 22px",marginBottom:11,color:"white",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{fontSize:42}}>{rep.emoji_semana||"🌿"}</div>
                  <div><div style={{fontSize:10,opacity:0.7,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>Calificación de la semana</div><div style={{fontWeight:900,fontSize:22}}>{rep.calificacion_semana}</div><div style={{fontSize:13,opacity:0.85,marginTop:3,lineHeight:1.4}}>{rep.resumen_ejecutivo}</div></div>
                </div>
                {rep.kpis?.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7,marginBottom:11}}>{rep.kpis.map((k,i)=><div key={i} style={{background:"white",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:`1px solid ${G.borde}`,borderLeft:`4px solid ${{verde:G.verde,rojo:G.rojo,amarillo:G.dorado}[k.color]||G.verde}`}}><div style={{fontSize:22}}>{k.icono}</div><div><div style={{fontWeight:800,fontSize:15,color:{verde:G.verde,rojo:G.rojo,amarillo:G.dorado}[k.color]||G.verde,lineHeight:1}}>{k.valor}</div><div style={{fontSize:10,color:G.suave,marginTop:2}}>{k.label}</div></div></div>)}</div>}
                {rep.logros?.length>0&&<Card><Titulo icon="🏆" text="Logros de la semana"/><div style={{display:"flex",flexDirection:"column",gap:6}}>{rep.logros.map((l,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",background:G.verdeC,borderRadius:7,padding:"7px 11px"}}><div style={{width:18,height:18,borderRadius:"50%",background:G.verde,color:"white",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div><div style={{fontSize:13,color:G.texto}}>{l}</div></div>)}</div></Card>}
                {rep.recomendaciones?.length>0&&<Card><Titulo icon="💡" text="Recomendaciones"/>{rep.recomendaciones.map((r,i)=><div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"7px 0",borderBottom:i<rep.recomendaciones.length-1?`1px solid ${G.borde}`:"none"}}><Chip bg={(priC[r.prioridad]||G.dorado)+"20"} color={priC[r.prioridad]||G.dorado} style={{flexShrink:0}}>{r.prioridad}</Chip><div><div style={{fontSize:13,fontWeight:600,color:G.texto}}>{r.accion}</div><div style={{fontSize:10,color:"#aaa",marginTop:1}}>Campo: {r.campo}</div></div></div>)}</Card>}
                {rep.proyeccion&&<div style={{background:`linear-gradient(135deg,${G.morado},#9c27b0)`,borderRadius:11,padding:"13px 16px",color:"white"}}><div style={{fontWeight:700,fontSize:11,opacity:0.7,marginBottom:4}}>🔮 Proyección próxima semana</div><div style={{fontSize:13,lineHeight:1.6}}>{rep.proyeccion}</div></div>}
              </>);
            })()}
          </>)}

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.5}40%{transform:scale(1);opacity:1}}
        select{appearance:none;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
      `}</style>
    </div>
  );
}
