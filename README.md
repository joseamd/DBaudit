# 🛡️ DBaudit — Sistema de Auditoría de Bases de Datos

![Python](https://img.shields.io/badge/Python-3.12+-blue)
![Django](https://img.shields.io/badge/Django-4.x-092E20?logo=django)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 1. 📌 Descripción del Proyecto

**DBaudit** es una plataforma de auditoría de bases de datos distribuida. Su objetivo es monitorear y registrar eventos (INSERT, UPDATE, DELETE, DDL, etc.) que ocurren en bases de datos locales o en servidores remotos, incluso si están en redes aisladas sin acceso directo.

### ¿Qué problema resuelve?

En entornos empresariales con múltiples bases de datos distribuidas en distintos servidores, llevar un registro centralizado de quién hizo qué, cuándo y sobre qué tabla es un requisito crítico de seguridad y cumplimiento normativo (GDPR, SOX, HIPAA).

---

## 2. 🏗️ Arquitectura del Sistema

```
┌─────────────────────┐         HTTPS / HTTP         ┌──────────────────────────┐
│   Servidor remoto   │  ──────────────────────────►  │   Servidor central       │
│                     │                               │                          │
│  ┌───────────────┐  │                               │  ┌────────────────────┐  │
│  │  Base de datos│  │                               │  │  Backend Django    │  │
│  │  PostgreSQL / │  │                               │  │  (REST API)        │  │
│  │  MySQL / etc. │  │                               │  └────────────────────┘  │
│  └──────┬────────┘  │                               │                          │
│         │ triggers  │                               │  ┌────────────────────┐  │
│  ┌──────▼────────┐  │                               │  │  Frontend React    │  │
│  │  audit_log    │  │                               │  │  (Dashboard)       │  │
│  └──────┬────────┘  │                               │  └────────────────────┘  │
│         │           │                               │                          │
│  ┌──────▼────────┐  │                               │  ┌────────────────────┐  │
│  │ dbaudit-agent │──┼───────────────────────────►   │  │  Base de datos     │  │
│  │  (Python)     │  │  POST /api/ingest/events/     │  │  central           │  │
│  └───────────────┘  │                               │  └────────────────────┘  │
└─────────────────────┘                               └──────────────────────────┘
```

**Componentes:**

- **Agente Python (`dbaudit-agent.py`)**: Se instala en cada servidor con base de datos. Lee eventos mediante triggers, los almacena en una cola local SQLite (tolerancia a fallos) y los envía al backend central por HTTP.
- **Backend Django**: Recibe, valida y almacena eventos. Expone una REST API consumida por el frontend. Incluye motor de alertas configurable.
- **Frontend React + Vite**: Dashboard centralizado con visualización de agentes, bases de datos, eventos de auditoría, alertas y reportes de cumplimiento.

---

## 3. ⚙️ Requisitos Previos

| Componente | Versión mínima |
|---|---|
| Python | 3.8+ (recomendado 3.12) |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 15+ |
| MySQL | 8+ (si se usa MySQL) |
| Git | cualquier versión reciente |

Actualizar pip antes de comenzar:

```bash
pip install --upgrade pip
```

---

## 4. 🖥️ Instalación del Backend (Django)

### 4.1 Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/dbaudit.git
cd dbaudit
```

### 4.2 Crear y activar el entorno virtual

```bash
python -m venv venv

# Linux / Mac
source venv/bin/activate

# Windows PowerShell
venv\Scripts\activate
```

### 4.3 Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4.4 Configurar variables de entorno del backend

Crea un archivo `.env` en la carpeta `backend/`:

```env
SECRET_KEY=tu_clave_secreta_django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://usuario:password@localhost:5432/dbaudit_db
```

### 4.5 Ejecutar migraciones

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

### 4.6 Iniciar el servidor

```bash
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`.

---

## 5. 🎨 Instalación del Frontend (React + Vite)

### 5.1 Instalar dependencias

```bash
cd frontend
npm install
```

Las dependencias principales incluyen:

```bash
npm install recharts lucide-react
```

### 5.2 Configurar la URL del backend

Crea un archivo `.env` en la carpeta `frontend/`:

```env
VITE_API_URL=http://localhost:8000/api
```

### 5.3 Iniciar en desarrollo

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

---

## 6. ⚙️ Configuración del Agente

El agente es el componente que se instala en cada servidor con base de datos. Soporta múltiples instancias simultáneas, una por cada base de datos a auditar, cada una con su propia cola y logs independientes.

### 6.1 Crear el archivo de configuración

Se crea un archivo `.env` por cada base de datos a monitorear. En **Windows**, estos archivos deben ubicarse en:

```
C:\Users\<usuario>\AppData\Local\DBaudit\
```

En **Linux**, se ubican en:

```
/etc/dbaudit/
```

**Ejemplo de configuración (`agent_nombre_bd.env`):**

```env
AUDIT_SERVER_URL=http://IP_DEL_SERVIDOR_CENTRAL:8000
AGENT_TOKEN=token_generado_desde_el_dashboard
AGENT_ID=uuid_generado_desde_el_dashboard
DB_ENGINE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nombre_de_la_bd
DB_USER=postgres
DB_PASSWORD=tu_password
POLL_INTERVAL=15
BATCH_SIZE=100
RETRY_INTERVAL=30
MAX_QUEUE_SIZE=10000
LOG_LEVEL=INFO
VERIFY_SSL=false
```

> ⚠️ **Importante**: El `AGENT_TOKEN` y el `AGENT_ID` se obtienen al registrar el agente desde el dashboard de DBaudit (ver sección 7).

**Motores soportados y sus puertos por defecto:**

| Motor | `DB_ENGINE` | Puerto por defecto |
|---|---|---|
| PostgreSQL | `postgresql` | `5432` |
| MySQL / MariaDB | `mysql` | `3306` |
| SQL Server | `mssql` | `1433` |
| Oracle | `oracle` | `1521` |
| SQLite | `sqlite` | `0` |

### 6.2 Ejecutar el agente

Cada agente se ejecuta en su propia terminal. El nombre del archivo `.env` se pasa como variable de entorno `AGENT_ENV`:

**Windows (PowerShell):**

```powershell
# Terminal 1 — Base de datos 1
$env:AGENT_ENV="agent_bd_1.env"
python dbaudit-agent.py --run

# Terminal 2 — Base de datos 2
$env:AGENT_ENV="agent_bd_2.env"
python dbaudit-agent.py --run
```

**Linux / Mac:**

```bash
# Terminal 1 — Base de datos 1
export AGENT_ENV="agent_bd_1.env"
python3 dbaudit-agent.py --run

# Terminal 2 — Base de datos 2
export AGENT_ENV="agent_bd_2.env"
python3 dbaudit-agent.py --run
```

### 6.3 Archivos generados automáticamente

El agente crea archivos independientes por cada instancia, aislando las colas y los logs:

**Windows:**
```
AppData\Local\DBaudit\
├── agent_bd_1.env
├── agent_bd_2.env
├── queue_agent_bd_1.db        ← cola local SQLite (agente 1)
├── queue_agent_bd_2.db        ← cola local SQLite (agente 2)
└── logs\
    ├── agent_bd_1.log
    └── agent_bd_2.log
```

**Linux:**
```
/var/lib/dbaudit/
├── queue_agent_bd_1.db
├── queue_agent_bd_2.db
/var/log/
├── dbaudit-agent_bd_1.log
└── dbaudit-agent_bd_2.log
```

> La cola local SQLite garantiza que los eventos no se pierdan si el servidor central no está disponible temporalmente. El agente los reintenta automáticamente al reconectarse.

---

## 7. 🔐 Registrar un Nuevo Agente

1. Inicia sesión en el dashboard de DBaudit.
2. Ve a la sección **Agentes → Registrar Agente**.
3. Completa el nombre del agente y la IP del servidor donde se instalará.
4. El sistema genera automáticamente un `AGENT_TOKEN` y un `AGENT_ID`.
5. Copia esos valores y agrégalos al archivo `.env` del agente correspondiente.
6. Desde la tarjeta del agente en el dashboard, usa el botón **"Ver Script"** para obtener el comando de instalación completo listo para copiar y pegar.

---

## 8. 🐧 Instalación del Agente en Servidor Linux Remoto

Esta sección cubre la instalación del agente en un servidor Linux al que se tiene acceso por SSH (por ejemplo desde PuTTY).

### 8.1 Verificar Python en el servidor

```bash
python3 --version
```

Si la versión es inferior a 3.8, instalar una versión más reciente:

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install python3.11 python3.11-venv -y

# CentOS / RHEL / Oracle Linux
sudo dnf install python3.11 -y

# CentOS 7 (versión antigua)
sudo yum install python38 -y
```

### 8.2 Crear estructura de directorios

```bash
sudo mkdir -p /etc/dbaudit /var/lib/dbaudit /var/log/dbaudit
```

### 8.3 Crear entorno virtual e instalar dependencias

```bash
cd /etc/dbaudit
python3 -m venv venv
source venv/bin/activate
```

Instalar la librería según el motor de base de datos:

```bash
# PostgreSQL
pip install psycopg2-binary requests

# MySQL / MariaDB
pip install pymysql requests

# Oracle
pip install cx_Oracle requests

# SQL Server
pip install pyodbc requests
```

### 8.4 Copiar el agente al servidor

**Opción A — desde tu PC con `scp`:**

```bash
scp dbaudit-agent.py usuario@192.168.37.215:/etc/dbaudit/
```

**Opción B — directamente desde PuTTY:**

```bash
nano /etc/dbaudit/dbaudit-agent.py
# Pegar el contenido del archivo y guardar con Ctrl+O, salir con Ctrl+X
```

### 8.5 Crear el archivo de configuración

```bash
nano /etc/dbaudit/agent_nombre_bd.env
```

Contenido (ajustar según la BD):

```env
AUDIT_SERVER_URL=http://IP_DE_TU_PC_CENTRAL:8000
AGENT_TOKEN=token_del_dashboard
AGENT_ID=uuid_del_dashboard
DB_ENGINE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nombre_bd
DB_USER=postgres
DB_PASSWORD=tu_password
POLL_INTERVAL=30
BATCH_SIZE=100
RETRY_INTERVAL=60
MAX_QUEUE_SIZE=10000
LOG_LEVEL=INFO
VERIFY_SSL=false
```

### 8.6 Verificar conectividad con el servidor central

Antes de ejecutar el agente, confirma que el servidor Linux puede alcanzar el servidor central:

```bash
curl http://IP_DE_TU_PC_CENTRAL:8000/api/agents/
```

Si hay respuesta JSON, la conexión está bien. Si no responde, revisar el firewall del servidor central (puerto 8000).

### 8.7 Ejecutar el agente

```bash
cd /etc/dbaudit
source venv/bin/activate
export AGENT_ENV="agent_nombre_bd.env"
python3 dbaudit-agent.py --run
```

### 8.8 Ejecutar como servicio systemd (producción)

Para que el agente arranque automáticamente con el servidor:

```bash
sudo nano /etc/systemd/system/dbaudit-agent.service
```

```ini
[Unit]
Description=DBaudit Agent
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/etc/dbaudit
Environment=AGENT_ENV=agent_nombre_bd.env
ExecStart=/etc/dbaudit/venv/bin/python3 /etc/dbaudit/dbaudit-agent.py --run
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable dbaudit-agent
sudo systemctl start dbaudit-agent

# Verificar estado
sudo systemctl status dbaudit-agent

# Ver logs en tiempo real
journalctl -u dbaudit-agent -f
```

---

## 9. 🗄️ Configuración de Triggers en PostgreSQL

El agente lee eventos desde la tabla `dbaudit.audit_log`, que se llena mediante triggers en las tablas que se desean auditar.

> **Recomendación**: No auditar todas las tablas. Seleccionar únicamente las tablas con datos sensibles o críticos para el negocio (pagos, usuarios, roles, inventario, etc.). Crear un trigger individual por tabla permite controlar exactamente qué operaciones auditar en cada una.

### 9.1 Crear el schema y la tabla de auditoría

Ejecutar en pgAdmin o psql conectado a la BD destino:

```sql
CREATE SCHEMA IF NOT EXISTS dbaudit;

CREATE TABLE IF NOT EXISTS dbaudit.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    table_name  TEXT,
    operation   TEXT,
    db_user     TEXT,
    client_host TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    old_data    JSONB,
    new_data    JSONB,
    sent        BOOLEAN DEFAULT FALSE
);
```

### 9.2 Crear la función del trigger

```sql
CREATE OR REPLACE FUNCTION dbaudit.log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO dbaudit.audit_log (
        table_name, operation, db_user, client_host, old_data, new_data
    )
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        current_user,
        inet_client_addr()::text,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 9.3 Aplicar el trigger a una tabla específica

```sql
-- Reemplazar "public.nombre_tabla" con la tabla que se quiere auditar
CREATE TRIGGER audit_nombre_tabla
AFTER INSERT OR UPDATE OR DELETE ON public.nombre_tabla
FOR EACH ROW EXECUTE FUNCTION dbaudit.log_changes();
```

Repetir este paso por cada tabla que se desee auditar. Todos los eventos quedan en la misma tabla `dbaudit.audit_log`, diferenciados por el campo `table_name`.

---

## 10. 🚀 Ejecución en Desarrollo

| Componente | Comando |
|---|---|
| Backend | `python manage.py runserver` |
| Frontend | `npm run dev` |
| Agente (Windows) | `$env:AGENT_ENV="agent.env"; python dbaudit-agent.py --run` |
| Agente (Linux) | `export AGENT_ENV="agent.env" && python3 dbaudit-agent.py --run` |

---

## 11. 🏭 Despliegue en Producción

| Componente | Tecnología recomendada |
|---|---|
| Backend | Gunicorn + Nginx |
| Frontend | `npm run build` → servir estático con Nginx |
| Agente | Servicio systemd (ver sección 8.8) |
| Base de datos central | PostgreSQL con backups automáticos |

---

## 12. 📁 Estructura del Proyecto

```
PROYECTO_DBAUDIT/
├── backend/
│   ├── audit/
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── alert_engine.py
│   │   ├── apps.py
│   │   ├── ingest.py
│   │   ├── models.py
│   │   ├── permissions.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── dbaudit_project/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── constants.js
│   │   ├── mockData.js
│   │   ├── ui.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AgentsView.jsx
│   │   ├── EventsView.jsx
│   │   ├── AlertsView.jsx
│   │   ├── DatabasesView.jsx
│   │   └── ReportsView.jsx
│   ├── package.json
│   └── vite.config.js
├── dbaudit-agent.py
├── extend_audit_schema.sql
├── requirements.txt
├── README.md
└── .gitignore
```

---

## 13. 🔌 Endpoints de la API

| Recurso | Método | Endpoint |
|---|---|---|
| Agentes | GET / POST | `/api/agents/` |
| Agente por ID | GET / PATCH / DELETE | `/api/agents/{id}/` |
| Bases de datos | GET / POST | `/api/databases/` |
| Base de datos por ID | GET / PUT / DELETE | `/api/databases/{id}/` |
| Eventos de auditoría | GET | `/api/events/` |
| Alertas | GET / PATCH | `/api/alerts/` |
| Reglas de alerta | GET / POST | `/api/alert-rules/` |
| Ingest de eventos (agente) | POST | `/api/ingest/events/` |
| Heartbeat (agente) | POST | `/api/ingest/heartbeat/` |
| Config del agente | GET | `/api/ingest/config/` |

---

## 14. 🧪 Prueba de Estrés

Para simular carga y verificar que el agente maneja correctamente grandes volúmenes de eventos:

```python
# simulador.py — ejecutar con el venv activado
import psycopg2, random

NOMBRES = ["Laptop", "Mouse", "Teclado", "Monitor", "Auriculares"]
MARCAS  = ["Samsung", "Logitech", "HP", "Dell", "Sony"]

conn = psycopg2.connect(host="localhost", dbname="nombre_bd", user="postgres", password="password")
cur  = conn.cursor()

for i in range(1000):
    nombre = f"{random.choice(MARCAS)} {random.choice(NOMBRES)}"
    precio = round(random.uniform(10, 2000), 2)
    cur.execute("INSERT INTO productos (nombre, precio) VALUES (%s, %s)", (nombre, precio))
    conn.commit()

cur.close()
conn.close()
print("✅ 1000 productos insertados")
```

Con `BATCH_SIZE=100` y `POLL_INTERVAL=15`, el agente procesa ~400 eventos/minuto. Para mayor throughput ajustar en el `.env`:

```env
BATCH_SIZE=500
POLL_INTERVAL=10
```

---

## 15. 🛠️ Solución de Problemas Comunes

**El agente no envía eventos:**
- Verificar que el `AGENT_TOKEN` en el `.env` corresponde al agente registrado en el dashboard.
- Confirmar que el servidor central es accesible: `curl http://IP_SERVIDOR:8000/api/agents/`
- Revisar que el trigger está creado en la tabla correcta y que `dbaudit.audit_log` recibe registros.

**Dos agentes comparten la misma cola:**
- Verificar que cada agente usa un archivo `.env` distinto con nombre diferente.
- La cola se nombra automáticamente según el `.env`: `queue_agent_nombre.db`.

**La IP del cliente muestra `::1` en lugar de `127.0.0.1`:**
- Es el equivalente IPv6 de localhost. Es correcto y esperado en conexiones locales.
- Para forzar IPv4 cambiar `DB_HOST=127.0.0.1` en lugar de `localhost`.

**Error `ModuleNotFoundError: No module named 'psycopg2'`:**
- El script no se está ejecutando dentro del entorno virtual.
- Activar el venv antes de ejecutar: `source venv/bin/activate` (Linux) o `venv\Scripts\activate` (Windows).

---

## 16. 👨‍💻 Autor

Proyecto desarrollado por **Alex Muñoz**.

---

## 17. 📄 Licencia

MIT License
