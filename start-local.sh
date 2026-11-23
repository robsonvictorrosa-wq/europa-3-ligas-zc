#!/bin/bash
# Sobe Postgres local (porta 55432) + servidor Node 20 (porta 3040).
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.local/node-v20.18.3/bin:$PATH"
PG=/usr/lib/postgresql/17/bin
PGDATA="$(pwd)/.pgdata"
export PGSSL=0
export DATABASE_URL="postgres://box@127.0.0.1:55432/europa_zc"
export PORT=3040
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Postgres local ainda não foi inicializado." >&2
  exit 1
fi
$PG/pg_ctl -D "$PGDATA" -w status >/dev/null 2>&1 || $PG/pg_ctl -D "$PGDATA" -w start
$PG/psql -h 127.0.0.1 -p 55432 -U box -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='europa_zc'" | grep -q 1 || $PG/createdb -h 127.0.0.1 -p 55432 -U box europa_zc
[ -f data/game.db ] || { node import.js && python3 scripts/gen-crests.py; }
echo "Europa 3 Ligas ZC em http://localhost:3040 (Node $(node -v))"
exec node server.js
