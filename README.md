# 🛡️ DBaudit — Sistema de Auditoría de Bases de Datos

![Python](https://img.shields.io/badge/Python-3.12+-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 1. 📌 Descripción del proyecto y arquitectura

**DBaudit** es una solución de auditoría de bases de datos que permite monitorear eventos (INSERT, UPDATE, DELETE, etc.) en motores como **PostgreSQL** y **MySQL**.

### Arquitectura

- 🖥️ **Backend (Django)**: Django REST API (centraliza agentes, bases de datos y eventos)
- 🎨 **Frontend (React + Vite)**: Dashboard para la visualización de agentes, bases de datos y eventos
- ⚙️ **Agente (Python)**: Script en Python que se instala en servidores con bases de datos y envía eventos al backend

---

## 2. ⚙️ Requisitos previos

- **Python 3.12+**
- **Node.js 18+**
- **npm**
- **PostgreSQL 15+** o **MySQL 8+**
- **Git**

Actualizar pip:

```bash
pip install --upgrade pip
```

---

## 3. 🖥️ Instalación backend (Django + venv)

3.1 Crear entorno virtual

```bash
python -m venv venv
```

```bash
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate    # Windows
```

3.2 Instalar dependencias:

```bash
pip install -r requirements.txt
```

3.3 Ejecutar migraciones:

```bash
cd backend
python manage.py migrate
```

3.4 Correr servidor de desarrollo:

```bash
python manage.py runserver
```

---

## 4. 🎨 Instalación frontend (React + Vite)

4.1 Instalar dependencias:

```bash
cd frontend
npm install
```

4.2 Correr servidor de desarrollo:

```bash
npm run dev
```

---

## 5. ⚙️ Configuración del agente

5.1 Crear archivos de configuración por agente

Se puede manejar múltiples agentes creando un archivo .env por cada base de datos. Ejemplo de estructura:

```bash
PROYECTO_DBAUDIT/
├── agent_nombre_bd_1.env
├── agent_nombre_bd_2.env
```

Ejemplo de configuración (agent_nombre_bd_1.env):

```env
AUDIT_SERVER_URL=http://localhost:8000
AGENT_TOKEN=tu_token_aqui
AGENT_ID=uuid_del_agente
DB_ENGINE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nombre_bd_1
DB_USER=postgres
DB_PASSWORD=tu_password

POLL_INTERVAL=15
BATCH_SIZE=100
RETRY_INTERVAL=30
MAX_QUEUE_SIZE=10000
LOG_LEVEL=INFO
VERIFY_SSL=false
```
Nota: reemplaza AGENT_TOKEN y AGENT_ID con los valores obtenidos desde el backend.

5.2 Ejecutar múltiples agentes

Cada agente se ejecuta en una terminal independiente:

```bash
# Linux / Mac - Terminal 1
export AGENT_ENV="agent_nombre_bd_1.env"
python dbaudit-agent.py --run

# Linux / Mac - Terminal 2
export AGENT_ENV="agent_nombre_bd_2.env"
python dbaudit-agent.py --run
```

```PowerShell
# Windows PowerShell - Terminal 1
$env:AGENT_ENV="agent_nombre_bd_1.env"
python dbaudit-agent.py --run

# Windows PowerShell - Terminal 2
$env:AGENT_ENV="agent_nombre_bd_2.env"
python dbaudit-agent.py --run
```

5.3 Archivos generados automáticamente

El agente crea archivos independientes por cada configuración:

```bash
AppData/Local/DBaudit/
├── agent_nombre_bd_1.env
├── agent_nombre_bd_2.env
├── queue_agent_nombre_bd_1.db
├── queue_agent_nombre_bd_2.db
└── logs/
    ├── agent_nombre_bd_1.log
    └── agent_nombre_bd_2.log
```

- queue_*.db: cola local de eventos (SQLite)
- logs/: registros del agente
- Permite tolerancia a fallos y reintentos

---

## 6. 🔐 Cómo registrar un agente nuevo

1. Crear el agente desde el backend (admin o API).
2. Obtener:
   - AGENT_ID
   - AGENT_TOKEN
3. Configurarlos en el archivo `.env` del agente.
4. Ejecutar el agente (ver sección 5.2)

---

## 7. 🚀 Cómo correr en desarrollo

Backend:
```bash
python manage.py runserver
```

Frontend:
```bash
npm run dev
```

Agente:
```bash
python dbaudit-agent.py --run
```

---

## 8. 🏭 Producción (referencia)

- Backend: Gunicorn + Nginx
- Frontend: build estático con `npm run build`
- Agente: Configurado como servicio systemd

---

## 9. 📁 Estructura del proyecto

```bash
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
│   │   ├── tests.py
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── __init__.py
│   ├── dbaudit_project/
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── __init__.py
│   ├── manage.py
│   ├── .env
│   └── dbaudit-agent.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── agent_ases.env
├── agent_product.env
├── dbaudit-agent.py
├── extend_audit_schema.sql
├── README.md
├── requirements.txt
├── test_dsn.py
├── .gitignore
└── venv/  (no subir a GitHub)
```

---

## 10. 👨‍💻 Autor

Proyecto desarrollado por Alex Muñoz.

---

## 11. 📄 Licencia

MIT License
