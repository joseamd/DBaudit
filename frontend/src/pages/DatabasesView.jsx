import { useState, useEffect } from "react";
import { Server, Plus, Edit2, Trash2, RefreshCw, X, CheckCircle, XCircle, Eye, EyeOff, WifiOff  } from "lucide-react";

import { DatabaseService, AgentService } from "../services/api";;
import { ENGINE_COLOR, STATUS_AGENT, relTime, unwrap } from "../constants/constants";
// import { fakeDbs, fakeAgents } from "../mocks/mockData";
import { Card, StatCard, SectionHeader, Btn, Input, Select, Spinner, EmptyState, EngineTag } from "../components/ui";

// ─── DB Form Modal ────────────────────────────────────────────────────────────

function DbModal({ db, onClose, onSave }) {
  const isEdit = !!db?.id;
  const [form, setForm] = useState({
    name: db?.name || "",
    engine: db?.engine || "postgresql",
    host: db?.host || "",
    port: db?.port || 5432,
    database_name: db?.database_name || "",
    username: db?.username || "",
    password: "",
    connection_mode: db?.connection_mode || "direct",
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving]  = useState(false);
  const [error, setError]    = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.host || !form.database_name) {
      setError("Nombre, host y nombre de BD son requeridos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let result;
      if (isEdit) result = await DatabaseService.updateDatabase(db.id, form);
      else        result = await DatabaseService.createDatabase(form);
      onSave(result, isEdit);
      onClose();
    } catch (e) {
      setError(e.message || "Error guardando la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  const engines = ["postgresql","mysql","sqlite","mssql","oracle"];
  const defaultPort = { postgresql:5432, mysql:3306, sqlite:0, mssql:1433, oracle:1521 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 540, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e8ecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{isEdit ? "Editar Base de Datos" : "Nueva Base de Datos"}</div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}><X size={14} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ background: "#fef2f2", color: "#dc2626", fontSize: 12, padding: "10px 14px", borderRadius: 9, border: "1px solid #fecaca" }}>{error}</div>
          )}

          {/* Row 1 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Nombre amigable *</label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="prod-postgres-billing" />
          </div>

          {/* Row 2: engine + mode */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Motor</label>
              <Select value={form.engine} onChange={e => { set("engine", e.target.value); set("port", defaultPort[e.target.value] || 5432); }} style={{ width: "100%" }}>
                {engines.map(e => <option key={e} value={e}>{e}</option>)}
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Modo de conexión</label>
              <Select value={form.connection_mode} onChange={e => set("connection_mode", e.target.value)} style={{ width: "100%" }}>
                <option value="direct">Directa</option>
                <option value="agent">Agente</option>
              </Select>
            </div>
          </div>

          {/* Row 3: host + port */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Host / IP *</label>
              <Input value={form.host} onChange={e => set("host", e.target.value)} placeholder="10.0.1.10 o db.ejemplo.com" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Puerto</label>
              <Input type="number" value={form.port} onChange={e => set("port", parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Row 4: db name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Nombre de la base de datos *</label>
            <Input value={form.database_name} onChange={e => set("database_name", e.target.value)} placeholder="mi_base_de_datos" />
          </div>

          {/* Row 5: user + pass */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Usuario</label>
              <Input value={form.username} onChange={e => set("username", e.target.value)} placeholder="dbaudit_reader" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Contraseña {isEdit && <span style={{ color: "#94a3b8", fontWeight: 400 }}>(dejar en blanco para no cambiar)</span>}</label>
              <div style={{ position: "relative" }}>
                <Input type={showPw ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder={isEdit ? "••••••••" : "contraseña"} style={{ paddingRight: 36 }} />
                <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e8ecf0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear BD"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── DB Card ──────────────────────────────────────────────────────────────────

function DbCard({ db, agent, onEdit, onDelete }) {
  const agentStatus = agent ? STATUS_AGENT[agent.status] : null;

  return (
    <Card hover>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `${ENGINE_COLOR[db.engine] || "#64748b"}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Server size={20} color={ENGINE_COLOR[db.engine] || "#64748b"} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{db.name}</div>
            <EngineTag engine={db.engine} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
            background: db.status === "active" ? "#f0fdf4" : db.status === "error" ? "#fef2f2" : "#f8fafc",
            color: db.status === "active" ? "#16a34a" : db.status === "error" ? "#dc2626" : "#64748b",
          }}>
            {db.status === "active" ? "● Activa" : db.status === "error" ? "● Error" : "● Inactiva"}
          </span>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", fontWeight: 500 }}>
            {db.connection_mode === "agent" ? "📡 Agente" : "🔌 Directa"}
          </span>
        </div>
      </div>

      {/* Connection info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#64748b", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontWeight: 600, color: "#374151", width: 90, flexShrink: 0 }}>Host</span>
          <span style={{ fontFamily: "'DM Mono', monospace" }}>{db.host}:{db.port}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontWeight: 600, color: "#374151", width: 90, flexShrink: 0 }}>Base de datos</span>
          <span style={{ fontFamily: "'DM Mono', monospace" }}>{db.database_name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontWeight: 600, color: "#374151", width: 90, flexShrink: 0 }}>Usuario</span>
          <span style={{ fontFamily: "'DM Mono', monospace" }}>{db.username || "—"}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontWeight: 600, color: "#374151", width: 90, flexShrink: 0 }}>Última check</span>
          <span>{relTime(db.last_checked)}</span>
        </div>
        {agentStatus && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#374151", width: 90, flexShrink: 0 }}>Agente</span>
            <span style={{ color: agentStatus.color, fontWeight: 600, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: agentStatus.color }} />
              {agentStatus.label}
            </span>
            <span style={{ color: "#94a3b8", fontSize: 11 }}>· cola: {agent.queue_size}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
        <Btn variant="secondary" size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => onEdit(db)}>
          <Edit2 size={12} /> Editar config
        </Btn>
        <Btn variant="danger" size="sm" onClick={() => onDelete(db)}>
          <Trash2 size={12} />
        </Btn>
      </div>
    </Card>
  );
}

// ─── Databases View ───────────────────────────────────────────────────────────

export default function DatabasesView() {
  const [dbs, setDbs]         = useState([]);
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | "new" | db object
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    let dbError = false;
    let agError = false;

    try {
      const dbData = await DatabaseService.getDatabases();
      setDbs(Array.isArray(dbData) ? dbData : dbData?.results || []);
    } catch (e) {
      console.error("Error databases:", e);
      dbError = true;
      setDbs([]);
    }

    try {
      const agData = await AgentService.getAgents();
      setAgents(Array.isArray(agData) ? agData : agData?.results || []);
    } catch (e) {
      console.error("Error agents:", e);
      agError = true;
      setAgents([]);
    }

    if (dbError && agError) {
      setError("No se pudo conectar con el servidor");
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  // useEffect(() => {
  //   console.log("DBS:", dbs);
  // }, [dbs]);

  const handleSave = (result, isEdit) => {
    if (isEdit) setDbs(p => p.map(d => d.id === result.id ? result : d));
    else        setDbs(p => [result, ...p]);
  };

  const handleDelete = async (db) => {
    if (!window.confirm(`¿Eliminar "${db.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await DatabaseService.deleteDatabase(db.id);
      setDbs(p => p.filter(d => d.id !== db.id));
    } catch (e) {
      alert("Error eliminando: " + e.message);
    }
  };

  const active   = dbs.filter(d => d.status === "active").length;
  const errored  = dbs.filter(d => d.status === "error").length;
  const inactive = dbs.filter(d => d.status === "inactive").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {modal && (
        <DbModal
          db={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <SectionHeader
        title="Bases de Datos"
        subtitle="BDs monitoreadas — directas y por agente"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={load}><RefreshCw size={13} /></Btn>
            <Btn variant="primary" onClick={() => setModal("new")}><Plus size={13} /> Agregar BD</Btn>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon={Server}       label="Total BDs"     value={dbs.length} color="#6366f1" />
        <StatCard icon={CheckCircle}  label="Activas"       value={active}     color="#22c55e" />
        <StatCard icon={XCircle}      label="Con error"     value={errored}    color="#ef4444" />
        <StatCard icon={RefreshCw}    label="Inactivas"     value={inactive}   color="#94a3b8" />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={32} /></div>
      ) : error ? (
        <EmptyState
          icon={WifiOff}
          title="Error de conexión"
          sub="No se pudo obtener la información del servidor"
        />
      ) : dbs.length === 0 ? (
        <EmptyState 
          icon={Server} 
          title="Sin bases de datos" 
          sub='Haz clic en "Agregar BD" para añadir la primera' 
          />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {dbs.map(db => {
            const agent = agents.find(a => a.database === db.id || a.database_name === db.name);
            return (
              <DbCard key={db.id} db={db} agent={agent} onEdit={setModal} onDelete={handleDelete} />
            );
          })}
        </div>
      )}
    </div>
  );
}
