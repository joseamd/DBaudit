import { useState, useEffect, useCallback } from "react";
import { Search, Download, RefreshCw, ChevronDown, X, ChevronRight, ChevronLeft } from "lucide-react";

import { EventService, DatabaseService } from "../services/api";;
import { OP_COLOR, SEVERITY_COLOR, SEVERITY_BG, fmtDate, unwrap } from "../constants/constants";
import { fakeEvents, fakeDbs } from "../mocks/mockData";
import { Card, SeverityBadge, OpBadge, SectionHeader, Btn, Input, Select, Spinner, EmptyState } from "../components/ui";

const PER_PAGE = 20;

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventModal({ event, onClose }) {
  if (!event) return null;

  const rows = [
    ["ID",            event.id],
    ["Base de datos", event.database_name || event.database],
    ["Operación",     event.operation],
    ["Severidad",     event.severity],
    ["Usuario DB",    event.db_user],
    ["Aplicación",    event.application_name || "—"],
    ["IP cliente",    event.client_host || "—"],
    ["Puerto cliente",event.client_port || "—"],
    ["Schema",        event.schema_name || "—"],
    ["Tabla",         event.table_name || "—"],
    ["Filas afectadas",event.rows_affected ?? "—"],
    ["Duración (ms)", event.duration_ms != null ? event.duration_ms.toFixed(2) : "—"],
    ["Estado",        event.success ? "✓ Exitoso" : "✗ Error"],
    ["Ocurrió en",    fmtDate(event.occurred_at)],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 660, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e8ecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <OpBadge op={event.operation} />
            <SeverityBadge severity={event.severity} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Detalle del Evento</span>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Field grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
            {rows.map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#0f172a", fontFamily: typeof value === "string" && value.includes("-") ? "inherit" : "inherit", wordBreak: "break-all" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Query */}
          {event.query && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Query SQL</div>
              <pre style={{ background: "#0d1117", color: "#7dd3fc", fontFamily: "'DM Mono', monospace", fontSize: 12, padding: 14, borderRadius: 10, margin: 0, overflowX: "auto", lineHeight: 1.7 }}>
                {event.query}
              </pre>
            </div>
          )}

          {/* Error */}
          {event.error_message && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Mensaje de Error</div>
              <div style={{ background: "#fef2f2", color: "#dc2626", fontSize: 12, padding: 12, borderRadius: 10, fontFamily: "'DM Mono', monospace" }}>{event.error_message}</div>
            </div>
          )}

          {/* old / new data */}
          {(event.old_data || event.new_data) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {event.old_data && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Datos Anteriores</div>
                  <pre style={{ background: "#fef2f2", color: "#dc2626", fontSize: 11, padding: 12, borderRadius: 10, margin: 0, overflowX: "auto" }}>{JSON.stringify(event.old_data, null, 2)}</pre>
                </div>
              )}
              {event.new_data && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Datos Nuevos</div>
                  <pre style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 11, padding: 12, borderRadius: 10, margin: 0, overflowX: "auto" }}>{JSON.stringify(event.new_data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Events View ──────────────────────────────────────────────────────────────

export default function EventsView() {
  const [events, setEvents]       = useState([]);
  const [dbs, setDbs]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [opFilter, setOpFilter]   = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [dbFilter, setDbFilter]   = useState("");
  const [page, setPage]           = useState(0);
  const [selected, setSelected]   = useState(null);  

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evData, dbData] = await Promise.all([
        EventService.getEvents({ limit: 500 }),
        DatabaseService.getDatabases(),
      ]);
      // console.log("EVENTS RAW:", evData);   
      // console.log("DBS RAW:", dbData); 

      setEvents(unwrap(evData, fakeEvents));
      setDbs(unwrap(dbData, fakeDbs));
    } catch {
      setEvents(fakeEvents);
      setDbs(fakeDbs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtering
  const filtered = events.filter(e => {
    if (opFilter  && e.operation !== opFilter)   return false;
    if (sevFilter && e.severity  !== sevFilter)  return false;
    if (dbFilter  && e.database  !== dbFilter && e.database_name !== dbFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.query       || "").toLowerCase().includes(q) ||
             (e.db_user     || "").toLowerCase().includes(q) ||
             (e.table_name  || "").toLowerCase().includes(q) ||
             (e.client_host || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged      = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const resetPage  = () => setPage(0);

  // CSV export
  const exportCSV = () => {
    const cols = ["occurred_at","database_name","operation","severity","db_user","table_name","rows_affected","client_host","success","duration_ms","query"];
    const csv  = [cols.join(","), ...filtered.map(e => cols.map(c => `"${(e[c]??"")}"`).join(","))].join("\n");
    const a    = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "dbaudit-events.csv" });
    a.click();
  };
  

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}

      <SectionHeader
        title="Audit Events"
        subtitle={`${filtered.length.toLocaleString()} eventos ${events.length !== filtered.length ? `(de ${events.length.toLocaleString()} totales)` : ""}`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={load}><RefreshCw size={13} /></Btn>
            <Btn variant="secondary" onClick={exportCSV}><Download size={13} /> CSV</Btn>
          </div>
        }
      />

      {/* Filters */}
      <Card style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              placeholder="Buscar por query, usuario, tabla, IP…"
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          {/* Operation */}
          <Select value={opFilter} onChange={e => { setOpFilter(e.target.value); resetPage(); }} style={{ flex: "0 0 auto" }}>
            <option value="">Todas las operaciones</option>
            {["SELECT","INSERT","UPDATE","DELETE","CREATE","ALTER","DROP","GRANT","REVOKE","TRUNCATE","LOGIN","LOGOUT"].map(o => <option key={o}>{o}</option>)}
          </Select>
          {/* Severity */}
          <Select value={sevFilter} onChange={e => { setSevFilter(e.target.value); resetPage(); }} style={{ flex: "0 0 auto" }}>
            <option value="">Toda severidad</option>
            {["critical","high","medium","low"].map(s => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
          </Select>
          {/* DB */}
          <Select value={dbFilter} onChange={e => { setDbFilter(e.target.value); resetPage(); }} style={{ flex: "0 0 auto" }}>
            <option value="">Todas las BDs</option>
            {dbs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
          {/* Clear */}
          {(search || opFilter || sevFilter || dbFilter) && (
            <Btn variant="ghost" size="sm" onClick={() => { setSearch(""); setOpFilter(""); setSevFilter(""); setDbFilter(""); resetPage(); }}>
              <X size={12} /> Limpiar
            </Btn>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={32} /></div>
        ) : paged.length === 0 ? (
          <EmptyState icon={Search} title="Sin resultados" sub="Ajusta los filtros para encontrar eventos" />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e8ecf0" }}>
                    {["Tiempo","Base de datos","Operación","Severidad","Usuario","Tabla","Filas","IP / Puerto","Duración","Estado"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((e, i) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: i % 2 === 0 ? "#fff" : "#fafbfc", transition: "background 0.1s" }}
                      onMouseEnter={ev => ev.currentTarget.style.background = "#f0f4ff"}
                      onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc"}
                    >
                      <td style={{ padding: "9px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 10, whiteSpace: "nowrap" }}>
                        {fmtDate(e.occurred_at)}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>{e.database_name || e.database}</div>
                      </td>
                      <td style={{ padding: "9px 14px" }}><OpBadge op={e.operation} /></td>
                      <td style={{ padding: "9px 14px" }}><SeverityBadge severity={e.severity} /></td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", color: "#374151", whiteSpace: "nowrap" }}>{e.db_user}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", color: "#374151" }}>{e.table_name || "—"}</td>
                      <td style={{ padding: "9px 14px", color: "#64748b", textAlign: "right" }}>{e.rows_affected ?? "—"}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {e.client_host || "—"}{e.client_port ? `:${e.client_port}` : ""}
                      </td>
                      <td style={{ padding: "9px 14px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                        {e.duration_ms != null ? `${e.duration_ms.toFixed(0)}ms` : "—"}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        {e.success
                          ? <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 11 }}>✓ OK</span>
                          : <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 11 }}>✗ Error</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Mostrando {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length.toLocaleString()} eventos
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Btn variant="secondary" size="sm" onClick={() => setPage(0)} disabled={page === 0}>«</Btn>
                <Btn variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}><ChevronLeft size={13} /></Btn>
                <span style={{ fontSize: 12, color: "#374151", padding: "0 8px" }}>Pág. {page + 1} / {totalPages || 1}</span>
                <Btn variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}><ChevronRight size={13} /></Btn>
                <Btn variant="secondary" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</Btn>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
