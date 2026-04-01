import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Shield, Database, Bell, FileText, Activity, AlertTriangle,
  CheckCircle, XCircle, Clock, Search, Download, RefreshCw,
  ChevronRight, User, Server, Zap, TrendingUp, Lock,
  Wifi, WifiOff, Terminal, Copy, Eye, EyeOff, Plus,
  Radio, HardDrive, Globe, Key
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_COLOR = { critical:"#ef4444", high:"#f97316", medium:"#eab308", low:"#22c55e" };
const SEVERITY_BG    = { critical:"#fef2f2", high:"#fff7ed", medium:"#fefce8", low:"#f0fdf4" };
const OP_COLOR = {
  SELECT:"#3b82f6", INSERT:"#22c55e", UPDATE:"#f59e0b", DELETE:"#ef4444",
  DROP:"#8b5cf6", ALTER:"#ec4899", CREATE:"#06b6d4", GRANT:"#f97316", REVOKE:"#dc2626",
};
const STATUS_AGENT = {
  active:   { color:"#22c55e", bg:"#f0fdf4", label:"Activo",    icon: Wifi },
  warning:  { color:"#f59e0b", bg:"#fffbeb", label:"Warning",   icon: Radio },
  offline:  { color:"#ef4444", bg:"#fef2f2", label:"Offline",   icon: WifiOff },
  pending:  { color:"#6366f1", bg:"#eef2ff", label:"Pendiente", icon: Clock },
  disabled: { color:"#9ca3af", bg:"#f9fafb", label:"Desactivado",icon: XCircle },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const fakeAgents = [
  {
    id:"ag-1", name:"prod-postgres-01 agent", server_host:"10.0.1.10",
    server_os:"Ubuntu 22.04 LTS", agent_version:"1.0.0",
    status:"active", is_healthy:true, queue_size:0,
    last_heartbeat: new Date(Date.now()-45000).toISOString(),
    last_event_at:  new Date(Date.now()-75000).toISOString(),
    database_name:"prod-postgres-01", events_today:3821,
    token:"tok_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  },
  {
    id:"ag-2", name:"mysql-billing agent", server_host:"10.0.1.20",
    server_os:"CentOS 7", agent_version:"1.0.0",
    status:"active", is_healthy:true, queue_size:12,
    last_heartbeat: new Date(Date.now()-30000).toISOString(),
    last_event_at:  new Date(Date.now()-30000).toISOString(),
    database_name:"prod-mysql-billing", events_today:2104,
    token:"tok_b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f600",
  },
  {
    id:"ag-3", name:"legacy-pg-erp agent", server_host:"10.0.2.5",
    server_os:"Debian 10", agent_version:"1.0.0",
    status:"warning", is_healthy:false, queue_size:847,
    last_heartbeat: new Date(Date.now()-360000).toISOString(),
    last_event_at:  new Date(Date.now()-380000).toISOString(),
    database_name:"legacy-pg-erp", events_today:890,
    token:"tok_c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60000",
  },
  {
    id:"ag-4", name:"mysql-crm-v2 agent", server_host:"10.0.1.30",
    server_os:"Ubuntu 20.04", agent_version:"1.0.0",
    status:"offline", is_healthy:false, queue_size:0,
    last_heartbeat: new Date(Date.now()-7200000).toISOString(),
    last_event_at:  new Date(Date.now()-7200000).toISOString(),
    database_name:"mysql-crm-v2", events_today:0,
    token:"tok_d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6000000",
  },
];

const fakeDbs = [
  { id:"1", name:"prod-postgres-01", engine:"postgresql", host:"10.0.1.10", port:5432, status:"active", connection_mode:"agent", last_checked:new Date(Date.now()-45000).toISOString() },
  { id:"2", name:"prod-mysql-billing", engine:"mysql", host:"10.0.1.20", port:3306, status:"active", connection_mode:"agent", last_checked:new Date(Date.now()-30000).toISOString() },
  { id:"3", name:"legacy-pg-erp", engine:"postgresql", host:"10.0.2.5", port:5432, status:"active", connection_mode:"agent", last_checked:new Date(Date.now()-380000).toISOString() },
  { id:"4", name:"mysql-crm-v2", engine:"mysql", host:"10.0.1.30", port:3306, status:"error", connection_mode:"agent", last_checked:new Date(Date.now()-7200000).toISOString() },
];

const fakeEvents = Array.from({length:80},(_,i)=>{
  const ops=["SELECT","INSERT","UPDATE","DELETE","CREATE","DROP","ALTER","GRANT"];
  const users=["admin","app_user","etl_job","bi_reader","deploy_bot","root"];
  const tables=["users","orders","payments","invoices","products","sessions","roles"];
  const db=fakeDbs[i%fakeDbs.length];
  const op=ops[i%ops.length];
  const sev=op==="DROP"||op==="GRANT"?"critical":op==="DELETE"||op==="ALTER"?"high":op==="INSERT"||op==="UPDATE"?"medium":"low";
  return {
    id:`evt-${i}`, database:db.id, database_name:db.name, database_engine:db.engine,
    operation:op, severity:sev, db_user:users[i%users.length],
    table_name:tables[i%tables.length], schema_name:"public",
    query:`${op} ${op==="SELECT"?"* FROM":"INTO"} ${tables[i%tables.length]} WHERE id=${1000+i}`,
    rows_affected:Math.floor(Math.random()*200),
    client_host:`192.168.1.${(i%20)+10}`,
    occurred_at:new Date(Date.now()-i*180000).toISOString(),
    success:i%12!==0, duration_ms:Math.random()*500,
  };
});

const fakeAlerts = [
  { id:"a1", rule_name:"Mass Delete Detected", title:"Mass Delete Detected", description:"User etl_job deleted 1,204 rows from orders table", severity:"critical", status:"open", triggered_at:new Date(Date.now()-3600000).toISOString(), database_name:"prod-postgres-01" },
  { id:"a2", rule_name:"Privilege Modification", title:"Privilege Modification", description:"GRANT ALL PRIVILEGES ejecutado por deploy_bot en payments", severity:"critical", status:"open", triggered_at:new Date(Date.now()-7200000).toISOString(), database_name:"prod-mysql-billing" },
  { id:"a3", rule_name:"Off-Hours Access", title:"Off-Hours Access", description:"User root realizó SELECT en users a las 03:14 AM", severity:"medium", status:"acknowledged", triggered_at:new Date(Date.now()-86400000).toISOString(), database_name:"legacy-pg-erp" },
  { id:"a4", rule_name:"Agent Offline", title:"Agente sin conexión", description:"El agente mysql-crm-v2 lleva más de 2 horas sin enviar heartbeat", severity:"high", status:"open", triggered_at:new Date(Date.now()-7100000).toISOString(), database_name:"mysql-crm-v2" },
];

const statsData = {
  total_events:18432, critical_events:27, failed_events:89,
  by_operation:[
    {operation:"SELECT",count:9821},{operation:"INSERT",count:4210},
    {operation:"UPDATE",count:2841},{operation:"DELETE",count:987},
    {operation:"ALTER",count:312},{operation:"CREATE",count:198},
    {operation:"DROP",count:43},{operation:"GRANT",count:20},
  ],
  by_severity:[
    {severity:"low",count:9821},{severity:"medium",count:7051},
    {severity:"high",count:1533},{severity:"critical",count:27},
  ],
  by_user:[
    {db_user:"app_user",count:8901},{db_user:"bi_reader",count:5432},
    {db_user:"etl_job",count:2100},{db_user:"admin",count:987},
    {db_user:"deploy_bot",count:512},{db_user:"root",count:500},
  ],
  by_day:Array.from({length:7},(_,i)=>{
    const d=new Date(Date.now()-(6-i)*86400000);
    return {day:d.toISOString().split("T")[0], count:Math.floor(2000+Math.random()*1500)};
  }),
};

// ─── UI Primitives ────────────────────────────────────────────────────────────

const Card = ({children,style={}}) => (
  <div style={{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",padding:24,...style}}>{children}</div>
);
const StatCard = ({icon:Icon,label,value,sub,color="#3b82f6",onClick}) => (
  <div onClick={onClick} style={{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",padding:"20px 24px",display:"flex",alignItems:"center",gap:16,cursor:onClick?"pointer":"default",transition:"box-shadow 0.2s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)";}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)";}}>
    <div style={{background:`${color}15`,borderRadius:12,padding:12}}><Icon size={22} color={color}/></div>
    <div>
      <div style={{fontSize:26,fontWeight:800,color:"#111827",lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:13,color:"#6b7280",fontWeight:500}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{sub}</div>}
    </div>
  </div>
);
const Badge = ({severity,label}) => (
  <span style={{background:SEVERITY_BG[severity]||"#f3f4f6",color:SEVERITY_COLOR[severity]||"#374151",border:`1px solid ${SEVERITY_COLOR[severity]||"#d1d5db"}`,borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase"}}>{label||severity}</span>
);
const OpBadge = ({op}) => (
  <span style={{background:OP_COLOR[op]?`${OP_COLOR[op]}18`:"#f3f4f6",color:OP_COLOR[op]||"#374151",border:`1px solid ${OP_COLOR[op]||"#d1d5db"}40`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{op}</span>
);
const NavItem = ({icon:Icon,label,active,onClick,badge}) => (
  <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",borderRadius:10,border:"none",cursor:"pointer",background:active?"#1e3a5f":"transparent",color:active?"#fff":"#94a3b8",fontSize:14,fontWeight:active?600:400,transition:"all 0.15s",textAlign:"left"}}>
    <Icon size={17}/><span style={{flex:1}}>{label}</span>
    {badge!=null&&<span style={{background:"#ef4444",color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 6px"}}>{badge}</span>}
  </button>
);

function relTime(iso) {
  if(!iso) return "nunca";
  const diff=Date.now()-new Date(iso).getTime();
  if(diff<60000) return "hace "+Math.floor(diff/1000)+"s";
  if(diff<3600000) return "hace "+Math.floor(diff/60000)+"m";
  if(diff<86400000) return "hace "+Math.floor(diff/3600000)+"h";
  return "hace "+Math.floor(diff/86400000)+"d";
}

// ─── Agents View ──────────────────────────────────────────────────────────────

function AgentCard({agent, onShowScript, onToggle}) {
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied]       = useState(false);
  const st = STATUS_AGENT[agent.status] || STATUS_AGENT.offline;
  const St = st.icon;

  const copyToken = () => {
    navigator.clipboard?.writeText(agent.token);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <Card style={{padding:0,overflow:"hidden"}}>
      {/* Header strip */}
      <div style={{background:st.bg,borderBottom:"1px solid #e5e7eb",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <St size={18} color={st.color}/>
          <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>{agent.name}</span>
        </div>
        <span style={{background:st.bg,color:st.color,border:`1px solid ${st.color}40`,borderRadius:20,fontSize:11,fontWeight:700,padding:"3px 10px"}}>{st.label}</span>
      </div>

      <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
        {/* Server info */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
          <div>
            <div style={{color:"#9ca3af",fontWeight:500,marginBottom:2}}>Servidor</div>
            <div style={{fontFamily:"monospace",color:"#374151",fontWeight:600}}>{agent.server_host}</div>
          </div>
          <div>
            <div style={{color:"#9ca3af",fontWeight:500,marginBottom:2}}>Sistema</div>
            <div style={{color:"#374151"}}>{agent.server_os||"—"}</div>
          </div>
          <div>
            <div style={{color:"#9ca3af",fontWeight:500,marginBottom:2}}>Base de datos</div>
            <div style={{color:"#374151",fontWeight:600}}>{agent.database_name||"Sin asignar"}</div>
          </div>
          <div>
            <div style={{color:"#9ca3af",fontWeight:500,marginBottom:2}}>Versión agente</div>
            <div style={{color:"#374151"}}>{agent.agent_version||"—"}</div>
          </div>
        </div>

        {/* Metrics bar */}
        <div style={{display:"flex",gap:12,padding:"10px 14px",background:"#f8fafc",borderRadius:10}}>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:agent.queue_size>500?"#ef4444":agent.queue_size>50?"#f97316":"#22c55e"}}>{agent.queue_size}</div>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>Cola pendiente</div>
          </div>
          <div style={{width:1,background:"#e5e7eb"}}/>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#3b82f6"}}>{agent.events_today.toLocaleString()}</div>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>Eventos (24h)</div>
          </div>
          <div style={{width:1,background:"#e5e7eb"}}/>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:12,fontWeight:700,color:agent.is_healthy?"#22c55e":"#ef4444"}}>{relTime(agent.last_heartbeat)}</div>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>Último heartbeat</div>
          </div>
        </div>

        {/* Token */}
        <div style={{background:"#0f172a",borderRadius:8,padding:"10px 14px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,color:"#64748b",fontWeight:600,letterSpacing:"0.05em"}}>TOKEN DE AUTENTICACIÓN</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowToken(t=>!t)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748b",padding:2}}>
                {showToken?<EyeOff size={13}/>:<Eye size={13}/>}
              </button>
              <button onClick={copyToken} style={{background:"none",border:"none",cursor:"pointer",color:copied?"#22c55e":"#64748b",padding:2}}>
                <Copy size={13}/>
              </button>
            </div>
          </div>
          <code style={{fontSize:11,color:showToken?"#a5f3fc":"#334155",fontFamily:"monospace",wordBreak:"break-all",display:"block"}}>
            {showToken ? agent.token : "•".repeat(40)}
          </code>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onShowScript(agent)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px 0",borderRadius:8,border:"none",background:"#1e3a5f",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:600}}>
            <Terminal size={14}/> Ver Script
          </button>
          <button onClick={()=>onToggle(agent)} style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",color:agent.status==="disabled"?"#22c55e":"#ef4444",fontSize:12,cursor:"pointer",fontWeight:600}}>
            {agent.status==="disabled"?"Activar":"Desactivar"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function InstallScriptModal({agent, onClose}) {
  const [copied, setCopied] = useState(false);
  const script = `# 1. Descargar el agente
curl -fsSL "https://10.0.0.1:8000/download/dbaudit-agent.py" \\
     -o /usr/local/bin/dbaudit-agent.py
chmod +x /usr/local/bin/dbaudit-agent.py

# 2. Crear directorios
mkdir -p /etc/dbaudit /var/lib/dbaudit

# 3. Configuración
cat > /etc/dbaudit/agent.env << 'ENV'
AUDIT_SERVER_URL=https://10.0.0.1:8000
AGENT_TOKEN=${agent.token}
AGENT_ID=${agent.id}
DB_ENGINE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mi_base_de_datos
DB_USER=dbaudit_agent
DB_PASSWORD=CAMBIAR_ESTO
POLL_INTERVAL=30
BATCH_SIZE=200
ENV
chmod 600 /etc/dbaudit/agent.env

# 4. Instalar schema en la BD
python3 /usr/local/bin/dbaudit-agent.py --setup-db

# 5. Instalar y arrancar servicio systemd
python3 /usr/local/bin/dbaudit-agent.py --install
systemctl start dbaudit-agent
systemctl status dbaudit-agent`;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:700,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:"#111827"}}>Script de instalación</div>
            <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{agent.name} — {agent.server_host}</div>
          </div>
          <button onClick={onClose} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#374151"}}>✕ Cerrar</button>
        </div>

        {/* Steps */}
        <div style={{padding:"16px 24px",background:"#fffbeb",borderBottom:"1px solid #fde68a",fontSize:13,color:"#92400e"}}>
          <strong>⚡ Instrucciones:</strong> Ejecuta este script como <code>root</code> en el servidor <strong>{agent.server_host}</strong>. Edita <code>DB_PASSWORD</code> antes de correrlo.
        </div>

        {/* Script */}
        <div style={{flex:1,overflow:"auto",background:"#0f172a",padding:"20px 24px",position:"relative"}}>
          <button onClick={()=>{navigator.clipboard?.writeText(script);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
            style={{position:"absolute",top:16,right:16,background:copied?"#22c55e":"#1e3a5f",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            <Copy size={12}/>{copied?"Copiado!":"Copiar"}
          </button>
          <pre style={{color:"#e2e8f0",fontFamily:"monospace",fontSize:12,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{script}</pre>
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:"1px solid #e5e7eb",display:"flex",gap:12,fontSize:12,color:"#6b7280"}}>
          <span>📋 Logs: <code>journalctl -u dbaudit-agent -f</code></span>
          <span>📊 Estado: <code>systemctl status dbaudit-agent</code></span>
        </div>
      </div>
    </div>
  );
}

function AgentsView({onNavigate}) {
  const [agents, setAgents] = useState(fakeAgents);
  const [scriptAgent, setScriptAgent] = useState(null);
  const [showAddForm, setShowAddForm]  = useState(false);
  const [newName, setNewName]           = useState("");
  const [newHost, setNewHost]           = useState("");

  const healthy = agents.filter(a=>a.is_healthy).length;
  const warning = agents.filter(a=>a.status==="warning").length;
  const offline = agents.filter(a=>a.status==="offline").length;

  const toggleAgent = (agent) => {
    setAgents(prev=>prev.map(a=>a.id===agent.id?{...a,status:a.status==="disabled"?"active":"disabled"}:a));
  };

  const addAgent = () => {
    if (!newName || !newHost) return;
    const newAgent = {
      id:`ag-${Date.now()}`, name:newName, server_host:newHost,
      server_os:"", agent_version:"", status:"pending", is_healthy:false,
      queue_size:0, last_heartbeat:null, last_event_at:null,
      database_name:"Sin asignar", events_today:0,
      token:`tok_${Math.random().toString(36).slice(2).padEnd(60,"0")}`,
    };
    setAgents(prev=>[...prev,newAgent]);
    setNewName(""); setNewHost(""); setShowAddForm(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {scriptAgent && <InstallScriptModal agent={scriptAgent} onClose={()=>setScriptAgent(null)}/>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,color:"#111827",margin:0}}>Agentes Remotos</h1>
          <p style={{color:"#6b7280",fontSize:14,margin:"4px 0 0"}}>
            Agentes instalados en servidores con BDs sin acceso directo
          </p>
        </div>
        <button onClick={()=>setShowAddForm(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:9,border:"none",background:"#1e3a5f",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}>
          <Plus size={15}/> Registrar Agente
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        <StatCard icon={Globe} label="Agentes totales" value={agents.length} color="#3b82f6"/>
        <StatCard icon={Wifi} label="Activos y saludables" value={healthy} color="#22c55e"/>
        <StatCard icon={Radio} label="Con advertencia" value={warning} color="#f59e0b" onClick={()=>{}}/>
        <StatCard icon={WifiOff} label="Offline" value={offline} color="#ef4444" onClick={()=>onNavigate("alerts")}/>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card style={{padding:"18px 24px",border:"2px dashed #3b82f6",background:"#eff6ff"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1d4ed8",marginBottom:14}}>Registrar nuevo agente</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Nombre del agente</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="prod-oracle-01 agent"
                style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #bfdbfe",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>IP del servidor</label>
              <input value={newHost} onChange={e=>setNewHost(e.target.value)} placeholder="10.0.3.15"
                style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #bfdbfe",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <button onClick={addAgent} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#1e3a5f",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}>Crear</button>
            <button onClick={()=>setShowAddForm(false)} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",color:"#374151",fontSize:13,cursor:"pointer"}}>Cancelar</button>
          </div>
          <p style={{fontSize:12,color:"#6b7280",margin:"10px 0 0"}}>
            💡 Después de crear el agente, haz clic en <strong>"Ver Script"</strong> para obtener el comando de instalación listo para copiar y pegar en el servidor remoto.
          </p>
        </Card>
      )}

      {/* Architecture diagram */}
      <Card style={{padding:"18px 24px",background:"linear-gradient(135deg,#0f2744 0%,#1e3a5f 100%)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",letterSpacing:"0.08em",marginBottom:12}}>ARQUITECTURA ACTUAL</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,flexWrap:"wrap",rowGap:16}}>
          {agents.map((a,i)=>{
            const st=STATUS_AGENT[a.status];
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:0}}>
                <div style={{textAlign:"center"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${st.color}20`,border:`2px solid ${st.color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}>
                    <HardDrive size={20} color={st.color}/>
                  </div>
                  <div style={{fontSize:10,color:"#94a3b8",maxWidth:80,lineHeight:1.3}}>{a.server_host}</div>
                  <div style={{fontSize:9,color:st.color,fontWeight:700,marginTop:2}}>{st.label}</div>
                </div>
                {/* Arrow */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",margin:"0 8px",marginBottom:20}}>
                  <div style={{fontSize:9,color:a.is_healthy?"#22c55e":"#ef4444",fontWeight:600,marginBottom:2}}>
                    {a.is_healthy?"HTTPS →":"✗"}
                  </div>
                  <div style={{height:2,width:40,background:a.is_healthy?"#22c55e22":"#ef444422",position:"relative"}}>
                    {a.is_healthy&&<div style={{position:"absolute",height:2,width:"100%",background:"linear-gradient(90deg,transparent,#22c55e,transparent)",animation:"none"}}/>}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Central server */}
          <div style={{textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",boxShadow:"0 0 20px #3b82f640"}}>
              <Shield size={26} color="#fff"/>
            </div>
            <div style={{fontSize:11,color:"#e2e8f0",fontWeight:700}}>DBaudit</div>
            <div style={{fontSize:9,color:"#64748b"}}>10.0.0.1:8000</div>
          </div>
        </div>
      </Card>

      {/* Agent cards grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
        {agents.map(agent=>(
          <AgentCard key={agent.id} agent={agent}
            onShowScript={setScriptAgent}
            onToggle={toggleAgent}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Other Views (condensed) ──────────────────────────────────────────────────

function Dashboard({onNavigate}) {
  const openAlerts=fakeAlerts.filter(a=>a.status==="open").length;
  const healthyAgents=fakeAgents.filter(a=>a.is_healthy).length;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,color:"#111827",margin:0}}>Security Overview</h1>
          <p style={{color:"#6b7280",fontSize:14,margin:"4px 0 0"}}>Últimos 7 días · {fakeDbs.filter(d=>d.status==="active").length} BDs activas · {healthyAgents}/{fakeAgents.length} agentes online</p>
        </div>
        <button style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:"#1e3a5f",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}>
          <Download size={14}/> Export Report
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        <StatCard icon={Activity} label="Total Eventos (7d)" value={statsData.total_events.toLocaleString()} color="#3b82f6"/>
        <StatCard icon={AlertTriangle} label="Eventos Críticos" value={statsData.critical_events} color="#ef4444" onClick={()=>onNavigate("alerts")}/>
        <StatCard icon={Bell} label="Alertas Abiertas" value={openAlerts} color="#f97316" onClick={()=>onNavigate("alerts")}/>
        <StatCard icon={Wifi} label="Agentes Saludables" value={`${healthyAgents}/${fakeAgents.length}`} color="#22c55e" onClick={()=>onNavigate("agents")}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:16}}>Volumen de Eventos — 7 días</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={statsData.by_day}>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="day" tick={{fontSize:11}} tickLine={false} axisLine={false}/>
              <YAxis tick={{fontSize:11}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{borderRadius:8,border:"1px solid #e5e7eb",fontSize:12}}/>
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#grad)" name="Eventos"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:16}}>Por Severidad</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statsData.by_severity} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                {statsData.by_severity.map((e,i)=><Cell key={i} fill={SEVERITY_COLOR[e.severity]}/>)}
              </Pie>
              <Tooltip contentStyle={{borderRadius:8,border:"1px solid #e5e7eb",fontSize:12}}/>
              <Legend formatter={v=><span style={{fontSize:12,textTransform:"capitalize"}}>{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {/* Agents status strip */}
      <Card style={{padding:"16px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>Estado de Agentes</div>
          <button onClick={()=>onNavigate("agents")} style={{fontSize:13,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",gap:4}}>Ver todos <ChevronRight size={14}/></button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {fakeAgents.map((a,i)=>{
            const st=STATUS_AGENT[a.status];
            const St=st.icon;
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:i<fakeAgents.length-1?"1px solid #f3f4f6":"none"}}>
                <St size={16} color={st.color}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{a.name}</div>
                  <div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace"}}>{a.server_host} · {a.database_name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:a.queue_size>100?"#ef4444":"#6b7280"}}>Cola: {a.queue_size}</div>
                  <div style={{fontSize:10,color:"#9ca3af"}}>{relTime(a.last_heartbeat)}</div>
                </div>
                <span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:st.bg,color:st.color}}>{st.label}</span>
              </div>
            );
          })}
        </div>
      </Card>
      {/* Recent alerts */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>Alertas Recientes</div>
          <button onClick={()=>onNavigate("alerts")} style={{fontSize:13,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",gap:4}}>Ver todas <ChevronRight size={14}/></button>
        </div>
        {fakeAlerts.slice(0,4).map((alert,i)=>(
          <div key={alert.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<3?"1px solid #f3f4f6":"none"}}>
            <Badge severity={alert.severity}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{alert.title}</div>
              <div style={{fontSize:12,color:"#6b7280"}}>{alert.description}</div>
            </div>
            <div style={{textAlign:"right",fontSize:11,color:"#9ca3af"}}>
              <div>{relTime(alert.triggered_at)}</div>
              <div style={{fontFamily:"monospace"}}>{alert.database_name}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function EventsView() {
  const [search,setSearch]=useState("");
  const [opFilter,setOpFilter]=useState("");
  const [page,setPage]=useState(0);
  const PER=15;
  const filtered=fakeEvents.filter(e=>{
    if(opFilter&&e.operation!==opFilter) return false;
    if(search&&!e.query.toLowerCase().includes(search.toLowerCase())&&!e.db_user.includes(search)&&!e.table_name.includes(search)) return false;
    return true;
  });
  const paged=filtered.slice(page*PER,(page+1)*PER);
  const total=Math.ceil(filtered.length/PER);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h1 style={{fontSize:24,fontWeight:800,color:"#111827",margin:0}}>Audit Events</h1><p style={{color:"#6b7280",fontSize:13,margin:"4px 0 0"}}>{filtered.length.toLocaleString()} eventos</p></div>
        <button style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:"#1e3a5f",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}><Download size={14}/> CSV</button>
      </div>
      <Card style={{padding:"14px 18px"}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{position:"relative",flex:1}}>
            <Search size={15} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af"}}/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Buscar por query, usuario, tabla..." style={{width:"100%",paddingLeft:34,paddingRight:12,paddingTop:8,paddingBottom:8,borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <select value={opFilter} onChange={e=>{setOpFilter(e.target.value);setPage(0);}} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,color:"#374151",background:"#fff"}}>
            <option value="">Todas las operaciones</option>
            {["SELECT","INSERT","UPDATE","DELETE","CREATE","ALTER","DROP","GRANT","REVOKE"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </Card>
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
            {["Tiempo","Base de datos","Operación","Usuario","Tabla","Filas","IP","Estado"].map(h=>(
              <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {paged.map((e,i)=>(
              <tr key={e.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 16px",color:"#6b7280",fontFamily:"monospace",fontSize:11,whiteSpace:"nowrap"}}>{new Date(e.occurred_at).toLocaleString("es",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</td>
                <td style={{padding:"10px 16px"}}><div style={{fontSize:12,fontWeight:600,color:"#111827",fontFamily:"monospace"}}>{e.database_name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{e.database_engine}</div></td>
                <td style={{padding:"10px 16px"}}><OpBadge op={e.operation}/></td>
                <td style={{padding:"10px 16px",fontFamily:"monospace",fontSize:12,color:"#374151"}}>{e.db_user}</td>
                <td style={{padding:"10px 16px",fontFamily:"monospace",fontSize:12,color:"#374151"}}>{e.table_name}</td>
                <td style={{padding:"10px 16px",color:"#6b7280",fontSize:12}}>{e.rows_affected??"-"}</td>
                <td style={{padding:"10px 16px",fontFamily:"monospace",fontSize:11,color:"#9ca3af"}}>{e.client_host}</td>
                <td style={{padding:"10px 16px"}}>{e.success?<CheckCircle size={15} color="#22c55e"/>:<XCircle size={15} color="#ef4444"/>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:"1px solid #f3f4f6"}}>
          <span style={{fontSize:12,color:"#6b7280"}}>Página {page+1} de {total}</span>
          <div style={{display:"flex",gap:6}}>
            <button disabled={page===0} onClick={()=>setPage(p=>p-1)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e5e7eb",background:page===0?"#f9fafb":"#fff",color:page===0?"#d1d5db":"#374151",cursor:page===0?"default":"pointer",fontSize:12}}>← Prev</button>
            <button disabled={page>=total-1} onClick={()=>setPage(p=>p+1)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e5e7eb",background:page>=total-1?"#f9fafb":"#fff",color:page>=total-1?"#d1d5db":"#374151",cursor:page>=total-1?"default":"pointer",fontSize:12}}>Next →</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AlertsView() {
  const [alerts,setAlerts]=useState(fakeAlerts);
  const [sf,setSf]=useState("");
  const filtered=sf?alerts.filter(a=>a.status===sf):alerts;
  const counts={open:alerts.filter(a=>a.status==="open").length,acknowledged:alerts.filter(a=>a.status==="acknowledged").length,resolved:alerts.filter(a=>a.status==="resolved").length};
  const ack=(id)=>setAlerts(p=>p.map(a=>a.id===id?{...a,status:"acknowledged"}:a));
  const res=(id)=>setAlerts(p=>p.map(a=>a.id===id?{...a,status:"resolved"}:a));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800,color:"#111827",margin:0}}>Alertas</h1><p style={{color:"#6b7280",fontSize:13,margin:"4px 0 0"}}>Alertas de seguridad y anomalías</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        <StatCard icon={AlertTriangle} label="Alertas Abiertas" value={counts.open} color="#ef4444"/>
        <StatCard icon={Clock} label="Confirmadas" value={counts.acknowledged} color="#f97316"/>
        <StatCard icon={CheckCircle} label="Resueltas" value={counts.resolved} color="#22c55e"/>
      </div>
      <div style={{display:"flex",gap:8}}>
        {["","open","acknowledged","resolved"].map(s=>(
          <button key={s} onClick={()=>setSf(s)} style={{padding:"6px 14px",borderRadius:8,border:"1px solid",borderColor:sf===s?"#1e3a5f":"#e5e7eb",background:sf===s?"#1e3a5f":"#fff",color:sf===s?"#fff":"#374151",fontSize:13,fontWeight:500,cursor:"pointer",textTransform:"capitalize"}}>{s||"Todas"}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map(alert=>(
          <Card key={alert.id} style={{padding:"16px 20px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <AlertTriangle size={20} color={SEVERITY_COLOR[alert.severity]}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#111827"}}>{alert.title}</span>
                  <Badge severity={alert.severity}/>
                </div>
                <p style={{fontSize:13,color:"#6b7280",margin:"0 0 8px"}}>{alert.description}</p>
                <div style={{display:"flex",gap:16,fontSize:11,color:"#9ca3af"}}>
                  <span>🗄 {alert.database_name}</span><span>🕐 {relTime(alert.triggered_at)}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                <span style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:alert.status==="open"?"#fef2f2":alert.status==="acknowledged"?"#fffbeb":"#f0fdf4",color:alert.status==="open"?"#dc2626":alert.status==="acknowledged"?"#d97706":"#16a34a"}}>{alert.status.toUpperCase()}</span>
                {alert.status==="open"&&<button onClick={()=>ack(alert.id)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",color:"#374151",fontSize:12,cursor:"pointer",fontWeight:500}}>Confirmar</button>}
                {alert.status==="acknowledged"&&<button onClick={()=>res(alert.id)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#22c55e",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:600}}>Resolver</button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DatabasesView() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h1 style={{fontSize:24,fontWeight:800,color:"#111827",margin:0}}>Bases de Datos</h1><p style={{color:"#6b7280",fontSize:13,margin:"4px 0 0"}}>BDs monitoreadas (directas y por agente)</p></div>
        <button style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:"#1e3a5f",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:600}}><Plus size={14}/> Agregar BD</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
        {fakeDbs.map(db=>{
          const agent=fakeAgents.find(a=>a.database_name===db.name);
          const agentStatus=agent?STATUS_AGENT[agent.status]:null;
          return (
            <Card key={db.id}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:10,background:db.engine==="postgresql"?"#3b82f615":"#f9731615",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Server size={20} color={db.engine==="postgresql"?"#3b82f6":"#f97316"}/>
                  </div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>{db.name}</div>
                    <div style={{fontSize:12,color:"#6b7280",textTransform:"capitalize"}}>{db.engine}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:db.status==="active"?"#f0fdf4":"#fef2f2",color:db.status==="active"?"#16a34a":"#dc2626"}}>
                    {db.status==="active"?"● Activa":"● Error"}
                  </span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#f3f4f6",color:"#6b7280",fontWeight:500}}>
                    {db.connection_mode==="agent"?"📡 Agente":"🔌 Directa"}
                  </span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:12,color:"#6b7280"}}>
                <div style={{display:"flex",gap:8}}><span style={{fontWeight:600,color:"#374151",width:80}}>Host</span><span style={{fontFamily:"monospace"}}>{db.host}:{db.port}</span></div>
                <div style={{display:"flex",gap:8}}><span style={{fontWeight:600,color:"#374151",width:80}}>Última check</span><span>{relTime(db.last_checked)}</span></div>
                {agent&&agentStatus&&(
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontWeight:600,color:"#374151",width:80}}>Agente</span>
                    <span style={{color:agentStatus.color,fontWeight:600,fontSize:11}}>● {agentStatus.label}</span>
                    <span style={{color:"#9ca3af"}}>· cola: {agent.queue_size}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ReportsView() {
  const types=[
    {id:"activity_summary",label:"Resumen de Actividad",icon:Activity,desc:"Visión general de operaciones en un período",color:"#3b82f6"},
    {id:"user_activity",label:"Actividad por Usuario",icon:User,desc:"Detalle de acciones por usuario de BD",color:"#8b5cf6"},
    {id:"schema_changes",label:"Cambios de Esquema",icon:Database,desc:"DDL: CREATE, ALTER, DROP ejecutados",color:"#f97316"},
    {id:"privilege_changes",label:"Cambios de Privilegios",icon:Lock,desc:"Todos los GRANT y REVOKE registrados",color:"#ef4444"},
    {id:"compliance_gdpr",label:"GDPR Compliance",icon:Shield,desc:"Acceso a datos personales con trazabilidad",color:"#22c55e"},
    {id:"anomaly_report",label:"Reporte de Anomalías",icon:Zap,desc:"Patrones inusuales y actividad sospechosa",color:"#ec4899"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800,color:"#111827",margin:0}}>Reportes</h1><p style={{color:"#6b7280",fontSize:13,margin:"4px 0 0"}}>Generación de reportes de cumplimiento y auditoría</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {types.map(r=>(
          <Card key={r.id} style={{cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:9,background:`${r.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}><r.icon size={18} color={r.color}/></div>
              <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{r.label}</span>
            </div>
            <p style={{fontSize:12,color:"#6b7280",margin:"0 0 14px",lineHeight:1.5}}>{r.desc}</p>
            <button style={{width:"100%",padding:"7px 0",borderRadius:7,border:"none",background:r.color,color:"#fff",fontSize:12,cursor:"pointer",fontWeight:600}}>Generar Reporte</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view,setView]=useState("dashboard");
  const openAlerts=fakeAlerts.filter(a=>a.status==="open").length;
  const offlineAgents=fakeAgents.filter(a=>!a.is_healthy).length;

  const nav=[
    {id:"dashboard",label:"Overview",icon:TrendingUp},
    {id:"agents",label:"Agentes",icon:Radio,badge:offlineAgents||null},
    {id:"events",label:"Audit Events",icon:Activity},
    {id:"alerts",label:"Alertas",icon:Bell,badge:openAlerts},
    {id:"databases",label:"Bases de Datos",icon:Database},
    {id:"reports",label:"Reportes",icon:FileText},
  ];

  const views={dashboard:Dashboard,agents:AgentsView,events:EventsView,alerts:AlertsView,databases:DatabasesView,reports:ReportsView};
  const View=views[view];

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#f8fafc",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <aside style={{width:220,background:"#0f2744",display:"flex",flexDirection:"column",padding:"0 12px 24px",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        <div style={{padding:"22px 8px 20px",borderBottom:"1px solid #ffffff12",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center"}}><Shield size={18} color="#fff"/></div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",letterSpacing:"-0.3px"}}>DB Audit</div>
              <div style={{fontSize:10,color:"#64748b",fontWeight:500}}>v1.0 · Enterprise</div>
            </div>
          </div>
        </div>
        <nav style={{display:"flex",flexDirection:"column",gap:3}}>
          {nav.map(n=><NavItem key={n.id} icon={n.icon} label={n.label} active={view===n.id} onClick={()=>setView(n.id)} badge={n.badge}/>)}
        </nav>
        <div style={{marginTop:"auto",paddingTop:20,borderTop:"1px solid #ffffff12"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"#1e3a5f",display:"flex",alignItems:"center",justifyContent:"center"}}><User size={14} color="#94a3b8"/></div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>Security Admin</div>
              <div style={{fontSize:10,color:"#64748b"}}>admin@empresa.com</div>
            </div>
          </div>
        </div>
      </aside>
      <main style={{flex:1,padding:28,overflowY:"auto"}}><View onNavigate={setView}/></main>
    </div>
  );
}
