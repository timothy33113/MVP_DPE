# Monitoring & Métriques - DPE Matching API

## Vue d'ensemble

Ce document décrit les recommandations pour le monitoring et les métriques de l'API DPE-Leboncoin Matching.

## Endpoints de santé

### Health Check
```bash
GET /health
```

Retourne:
```json
{
  "status": "ok",
  "timestamp": "2025-10-02T16:00:00.000Z"
}
```

## Métriques recommandées

### 1. Métriques applicatives

#### Performance
- **Response time** (p50, p95, p99)
  - Par endpoint
  - Par méthode HTTP
- **Throughput** (req/s)
- **Error rate** (%)

#### Business metrics
- Nombre de DPE créés/jour
- Nombre d'annonces importées/jour
- Nombre de matchings exécutés/jour
- Nombre de clusters validés/jour
- Score moyen des matches
- Distribution des étiquettes DPE/GES

### 2. Métriques système

#### Base de données
- Connection pool size
- Query execution time
- Slow queries (> 1s)
- Database size

#### Node.js
- Memory usage (heap used/total)
- CPU usage
- Event loop lag
- Active handles/requests

### 3. Logs structurés

Le logger Winston est configuré avec les niveaux:
- `error`: Erreurs applicatives
- `warn`: Avertissements
- `info`: Informations générales
- `debug`: Détails de débogage

Fichiers de logs:
- `logs/combined.log`: Tous les logs
- `logs/error.log`: Erreurs uniquement

## Stack recommandée

### Option 1: Prometheus + Grafana

**Avantages:**
- Open source
- Excellent pour les métriques time-series
- Grafana offre de beaux dashboards

**Implémentation:**
```bash
npm install prom-client
```

```typescript
import promClient from 'prom-client';

// Créer un registre
const register = new promClient.Registry();

// Métriques par défaut
promClient.collectDefaultMetrics({ register });

// Métriques custom
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Endpoint /metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Option 2: DataDog / New Relic

**Avantages:**
- Solution complète (APM + Logs + Metrics)
- Alerting intégré
- Facile à configurer

**Implémentation DataDog:**
```bash
npm install dd-trace
```

```typescript
import tracer from 'dd-trace';
tracer.init(); // À faire en premier dans l'app
```

### Option 3: Winston + ELK Stack

**Avantages:**
- Déjà en place (Winston)
- Puissant pour l'analyse de logs
- Elasticsearch pour la recherche

**Configuration:**
```typescript
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: { node: 'http://localhost:9200' },
  index: 'dpe-matching-logs',
});

logger.add(esTransport);
```

## Alerting

### Alertes critiques
- Error rate > 5%
- Response time p95 > 2s
- Database connection errors
- Memory usage > 90%

### Alertes warning
- Error rate > 1%
- Response time p95 > 1s
- Slow queries detected
- Event loop lag > 100ms

## Dashboards recommandés

### Dashboard 1: Vue d'ensemble
- Request rate (last 5min)
- Error rate (last 5min)
- Response time p95
- Active users/API keys

### Dashboard 2: Business
- DPE créés (last 24h)
- Annonces importées (last 24h)
- Matchings exécutés (last 24h)
- Distribution scores de matching

### Dashboard 3: Infrastructure
- CPU usage
- Memory usage
- Database connections
- Event loop lag

## Implémentation rapide

Pour commencer rapidement, ajouter:

1. **Middleware de métriques basique:**

```typescript
// src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });

  next();
};
```

2. **Endpoint de stats:**

```typescript
// src/routes/stats.routes.ts
router.get('/stats', async (req, res) => {
  const [dpeCount, annonceCount, clusterCount] = await Promise.all([
    prisma.dpeRecord.count(),
    prisma.leboncoinAnnonce.count(),
    prisma.matchCluster.count(),
  ]);

  res.json({
    success: true,
    data: {
      dpe: dpeCount,
      annonces: annonceCount,
      clusters: clusterCount,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  });
});
```

## Prochaines étapes

1. [ ] Choisir et installer une solution de monitoring
2. [ ] Implémenter les métriques de base
3. [ ] Créer les dashboards
4. [ ] Configurer l'alerting
5. [ ] Documenter les runbooks pour les incidents
