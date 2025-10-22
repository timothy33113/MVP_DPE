#!/bin/bash
# Script de déploiement automatique pour DPE-Matching

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement de DPE-Matching en production"
echo "=============================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo "Installer Docker : https://docs.docker.com/get-docker/"
    exit 1
fi

# Vérifier si docker compose est disponible
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    echo "Installer Docker Compose : https://docs.docker.com/compose/install/"
    exit 1
fi

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé${NC}"
    echo "Copie de .env.example vers .env..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Veuillez éditer le fichier .env avec vos vraies valeurs avant de continuer${NC}"
    echo "nano .env"
    exit 1
fi

# Vérifier si les variables critiques sont configurées
source .env
if [ "$JWT_SECRET" = "CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_KEY" ] || [ "$POSTGRES_PASSWORD" = "CHANGE_THIS_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Certaines variables d'environnement critiques n'ont pas été changées${NC}"
    echo "Veuillez éditer le fichier .env et changer au moins :"
    echo "  - JWT_SECRET"
    echo "  - POSTGRES_PASSWORD"
    exit 1
fi

echo -e "${GREEN}✓${NC} Vérifications préliminaires OK"
echo ""

# Demander confirmation
read -p "Continuer le déploiement ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Déploiement annulé"
    exit 0
fi

# Arrêter les anciens containers si ils existent
echo "🛑 Arrêt des anciens containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build des images
echo "🔨 Build des images Docker..."
docker compose -f docker-compose.prod.yml build --no-cache

# Démarrer les services
echo "🚀 Démarrage des services..."
docker compose -f docker-compose.prod.yml up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services (30s)..."
sleep 30

# Vérifier la santé des services
echo "🏥 Vérification de la santé des services..."
if docker compose -f docker-compose.prod.yml ps | grep -q "unhealthy"; then
    echo -e "${RED}❌ Certains services ne sont pas en bonne santé${NC}"
    docker compose -f docker-compose.prod.yml ps
    exit 1
fi

# Afficher les logs
echo ""
echo -e "${GREEN}✅ Déploiement réussi !${NC}"
echo ""
echo "Services déployés :"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "URLs :"
echo "  - Frontend : http://localhost"
echo "  - Backend  : http://localhost:3001"
echo "  - Health   : http://localhost:3001/health"
echo ""
echo "Commandes utiles :"
echo "  - Voir les logs        : docker compose -f docker-compose.prod.yml logs -f"
echo "  - Arrêter les services : docker compose -f docker-compose.prod.yml down"
echo "  - Redémarrer           : docker compose -f docker-compose.prod.yml restart"
echo "  - Backup DB            : docker compose -f docker-compose.prod.yml run --rm backup"
echo ""
echo -e "${GREEN}🎉 Application prête à l'emploi !${NC}"
