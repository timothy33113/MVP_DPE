#!/bin/bash

# Nettoyer TOUT
echo "🧹 Nettoyage en cours..."
killall -9 node tsx 2>/dev/null
sleep 3
lsof -ti:3001,5173 | xargs kill -9 2>/dev/null
sleep 1

# Nettoyer le cache Vite
cd /Users/timothy/MVP_DPE/packages/frontend
rm -rf node_modules/.vite .vite dist

# Démarrer le backend
echo "🚀 Démarrage backend..."
cd /Users/timothy/MVP_DPE/packages/backend
npm run dev > /tmp/backend.log 2>&1 &
sleep 3

# Démarrer le frontend
echo "🚀 Démarrage frontend..."
cd /Users/timothy/MVP_DPE/packages/frontend
npm run dev > /tmp/frontend.log 2>&1 &
sleep 3

echo "✅ Démarrage terminé!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Logs backend: tail -f /tmp/backend.log"
echo "Logs frontend: tail -f /tmp/frontend.log"
