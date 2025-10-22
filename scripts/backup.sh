#!/bin/sh
# Script de backup automatique de la base de données PostgreSQL

set -e

echo "🔄 Starting database backup..."

# Variables
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dpe_matching_${TIMESTAMP}.sql.gz"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"

# Créer le répertoire de backup s'il n'existe pas
mkdir -p ${BACKUP_DIR}

# Effectuer le backup
echo "📦 Creating backup: ${BACKUP_FILE}"
PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
  -h ${POSTGRES_HOST} \
  -U ${POSTGRES_USER} \
  -d ${POSTGRES_DB} \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > ${BACKUP_FILE}

# Vérifier la taille du backup
BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
echo "✅ Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Nettoyer les anciens backups (garder les 7 derniers jours)
echo "🧹 Cleaning old backups (keeping last 7 days)..."
find ${BACKUP_DIR} -name "dpe_matching_*.sql.gz" -type f -mtime +7 -delete

echo "✅ Backup complete!"
