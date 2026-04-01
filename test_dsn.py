#!/usr/bin/env python
"""Debug DSN construction and connection"""

import os
import sys
from urllib.parse import quote
from pathlib import Path

# Load config
sys.path.insert(0, str(Path(__file__).parent))
os.chdir(Path(__file__).parent / "backend")

import dbaudit_agent
cfg = dbaudit_agent.load_config()

print("📋 Configuración cargada:")
print(f"  DB_HOST: {cfg['DB_HOST']}")
print(f"  DB_PORT: {cfg['DB_PORT']}")
print(f"  DB_NAME: {cfg['DB_NAME']}")
print(f"  DB_USER: {cfg['DB_USER']}")
print(f"  DB_PASSWORD: {cfg['DB_PASSWORD']}")

# Construir DSN
user_encoded = quote(cfg['DB_USER'], safe='')
pass_encoded = quote(cfg['DB_PASSWORD'], safe='')
dsn = f"postgresql://{user_encoded}:{pass_encoded}@{cfg['DB_HOST']}:{int(cfg['DB_PORT'])}/{cfg['DB_NAME']}"

print("\n🔗 DSN Construido:")
print(f"  {dsn[:50]}...{dsn[-30:]}")

print("\n🔍 Bytes en DSN:")
dsn_bytes = dsn.encode('utf-8')
print(f"  Longitud: {len(dsn_bytes)} bytes")
for i, byte in enumerate(dsn_bytes):
    if byte == 0xf3:
        print(f"  ⚠️  Byte 0xf3 encontrado en posición {i}")
        print(f"      Contexto: {dsn[max(0, i-10):i+10]}")

print("\n🧪 Intentando conectar con psycopg2...")
try:
    import psycopg2
    conn = psycopg2.connect(
        dsn,
        connect_timeout=10,
        client_encoding='UTF8',
    )
    print("✅ Conexión exitosa!")
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
