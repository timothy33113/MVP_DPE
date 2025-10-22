#!/bin/bash

# Script pour générer tous les fichiers restants du projet
# Ce script créé les modules, controllers, repositories, routes, frontend, Docker, etc.

set -e

echo "🚀 Génération des fichiers restants du projet DPE Matching..."

# Couleurs pour l'output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# BACKEND - Matching Module (Repository & Controller)
# ============================================================================

echo -e "${BLUE}📦 Création du module matching...${NC}"

cat > packages/backend/src/modules/matching/matching.repository.ts << 'EOF'
/**
 * Repository pour les opérations de matching
 */

import { prisma } from '@config/database';
import { MatchCluster, MatchCandidat, StatutValidation } from '@dpe-matching/shared';
import { logger } from '@utils/logger';

export class MatchingRepository {
  /**
   * Crée un cluster de match avec ses candidats
   */
  async createMatchCluster(
    annonceId: string,
    candidats: Omit<MatchCandidat, 'id' | 'clusterId' | 'createdAt'>[],
    meilleurScore: number
  ): Promise<MatchCluster> {
    logger.info(\`Creating match cluster for annonce \${annonceId} with \${candidats.length} candidates\`);

    const cluster = await prisma.matchCluster.create({
      data: {
        annonceId,
        nombreCandidats: candidats.length,
        meilleurScore,
        statut: StatutValidation.NON_VERIFIE,
        candidats: {
          create: candidats.map((c) => ({
            dpeId: c.dpeId,
            scoreTotal: c.scoreTotal,
            scoreBase: c.scoreBase,
            scoreBonus: c.scoreBonus,
            scoreNormalized: c.scoreNormalized,
            confiance: c.confiance,
            scoreDetails: c.scoreDetails as any,
            distanceGps: c.distanceGps,
            rang: c.rang,
            estSelectionne: c.estSelectionne,
          })),
        },
      },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
    });

    return cluster as any;
  }

  /**
   * Récupère un cluster de match par ID
   */
  async getMatchClusterById(id: string): Promise<MatchCluster | null> {
    const cluster = await prisma.matchCluster.findUnique({
      where: { id },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
          orderBy: {
            rang: 'asc',
          },
        },
      },
    });

    return cluster as any;
  }

  /**
   * Liste les clusters de match avec pagination
   */
  async listMatchClusters(page: number, limit: number, statut?: StatutValidation) {
    const where = statut ? { statut } : {};

    const [clusters, total] = await Promise.all([
      prisma.matchCluster.findMany({
        where,
        include: {
          annonce: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.matchCluster.count({ where }),
    ]);

    return {
      clusters: clusters as any[],
      total,
    };
  }

  /**
   * Met à jour le statut d'un cluster
   */
  async updateClusterStatus(
    id: string,
    statut: StatutValidation,
    dpeConfirmeId?: string
  ): Promise<MatchCluster> {
    const cluster = await prisma.matchCluster.update({
      where: { id },
      data: {
        statut,
        dpeConfirmeId,
        dateValidation: statut === StatutValidation.ADRESSE_CONFIRMEE ? new Date() : null,
      },
      include: {
        annonce: true,
        candidats: {
          include: {
            dpe: true,
          },
        },
      },
    });

    return cluster as any;
  }
}

export const matchingRepository = new MatchingRepository();
EOF

cat > packages/backend/src/modules/matching/matching.controller.ts << 'EOF'
/**
 * Controller pour les routes de matching
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { matchingService } from './matching.service';
import { matchingRepository } from './matching.repository';
import { dpeRepository } from '@modules/dpe/dpe.repository';
import { annoncesRepository } from '@modules/annonces/annonces.repository';
import { asyncHandler } from '@utils/async-handler';
import { NotFoundError } from '@utils/errors';
import { ApiResponse, PaginatedResponse } from '@dpe-matching/shared';

export class MatchingController {
  /**
   * POST /api/matching/annonces/:annonceId
   * Lance le matching pour une annonce
   */
  runMatching = asyncHandler(async (req: Request, res: Response) => {
    const { annonceId } = req.params;
    const options = req.body;

    // Récupérer l'annonce
    const annonce = await annoncesRepository.getAnnonceById(annonceId);
    if (!annonce) {
      throw new NotFoundError('Annonce not found');
    }

    // Récupérer les DPE candidats (même code postal et type de bien)
    const dpes = await dpeRepository.findDpesByFilters({
      codePostalBan: annonce.codePostal,
      typeBatiment: annonce.typeBien,
    });

    // Exécuter le matching
    const result = await matchingService.matchAnnonceToDpes(annonce, dpes, options);

    // Sauvegarder le cluster
    const cluster = await matchingRepository.createMatchCluster(
      annonceId,
      result.candidats,
      result.meilleurScore
    );

    res.status(201).json({
      success: true,
      data: {
        ...result,
        clusterId: cluster.id,
      },
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/clusters/:clusterId
   * Récupère un cluster de match
   */
  getCluster = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;

    const cluster = await matchingRepository.getMatchClusterById(clusterId);
    if (!cluster) {
      throw new NotFoundError('Match cluster not found');
    }

    res.json({
      success: true,
      data: cluster,
    } as ApiResponse<any>);
  });

  /**
   * GET /api/matching/clusters
   * Liste les clusters de match
   */
  listClusters = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, statut } = req.query;

    const { clusters, total } = await matchingRepository.listMatchClusters(
      Number(page),
      Number(limit),
      statut as any
    );

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: clusters,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    } as ApiResponse<PaginatedResponse<any>>);
  });

  /**
   * PATCH /api/matching/clusters/:clusterId/validate
   * Valide un cluster de match
   */
  validateCluster = asyncHandler(async (req: Request, res: Response) => {
    const { clusterId } = req.params;
    const { statut, dpeConfirmeId } = req.body;

    const cluster = await matchingRepository.updateClusterStatus(clusterId, statut, dpeConfirmeId);

    res.json({
      success: true,
      data: cluster,
    } as ApiResponse<any>);
  });
}

export const matchingController = new MatchingController();
EOF

cat > packages/backend/src/modules/matching/matching.types.ts << 'EOF'
/**
 * Types spécifiques au module matching
 */

import { z } from 'zod';
import { StatutValidationSchema } from '@dpe-matching/shared';

export const RunMatchingSchema = z.object({
  body: z.object({
    maxCandidats: z.number().int().positive().optional(),
    seuilScoreMinimum: z.number().min(0).max(100).optional(),
    distanceMaxGPS: z.number().positive().optional(),
    includeScoreDetails: z.boolean().optional(),
  }).optional(),
  params: z.object({
    annonceId: z.string().uuid(),
  }),
});

export const ValidateClusterSchema = z.object({
  body: z.object({
    statut: StatutValidationSchema,
    dpeConfirmeId: z.string().uuid().optional(),
  }),
  params: z.object({
    clusterId: z.string().uuid(),
  }),
});
EOF

echo -e "${GREEN}✓ Module matching créé${NC}"

# ============================================================================
# BACKEND - DPE Module
# ============================================================================

echo -e "${BLUE}📦 Création du module DPE...${NC}"

cat > packages/backend/src/modules/dpe/dpe.repository.ts << 'EOF'
/**
 * Repository pour les opérations DPE
 */

import { prisma } from '@config/database';
import { DpeRecord, CreateDpeRecordDto, TypeBatiment } from '@dpe-matching/shared';

export class DpeRepository {
  async createDpe(data: CreateDpeRecordDto): Promise<DpeRecord> {
    return await prisma.dpeRecord.create({
      data: data as any,
    }) as any;
  }

  async getDpeById(id: string): Promise<DpeRecord | null> {
    return await prisma.dpeRecord.findUnique({
      where: { id },
    }) as any;
  }

  async getDpeByNumeroDpe(numeroDpe: string): Promise<DpeRecord | null> {
    return await prisma.dpeRecord.findUnique({
      where: { numeroDpe },
    }) as any;
  }

  async findDpesByFilters(filters: {
    codePostalBan?: string;
    typeBatiment?: TypeBatiment;
  }): Promise<DpeRecord[]> {
    return await prisma.dpeRecord.findMany({
      where: filters,
    }) as any[];
  }

  async listDpes(page: number, limit: number) {
    const [dpes, total] = await Promise.all([
      prisma.dpeRecord.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dpeRecord.count(),
    ]);

    return { dpes: dpes as any[], total };
  }
}

export const dpeRepository = new DpeRepository();
EOF

cat > packages/backend/src/modules/dpe/dpe.service.ts << 'EOF'
/**
 * Service DPE
 */

import { dpeRepository } from './dpe.repository';
import { CreateDpeRecordDto, DpeRecord } from '@dpe-matching/shared';
import { ConflictError, NotFoundError } from '@utils/errors';

export class DpeService {
  async createDpe(data: CreateDpeRecordDto): Promise<DpeRecord> {
    const existing = await dpeRepository.getDpeByNumeroDpe(data.numeroDpe);
    if (existing) {
      throw new ConflictError('DPE record with this numero already exists');
    }

    return await dpeRepository.createDpe(data);
  }

  async getDpeById(id: string): Promise<DpeRecord> {
    const dpe = await dpeRepository.getDpeById(id);
    if (!dpe) {
      throw new NotFoundError('DPE record not found');
    }
    return dpe;
  }

  async listDpes(page: number, limit: number) {
    return await dpeRepository.listDpes(page, limit);
  }
}

export const dpeService = new DpeService();
EOF

cat > packages/backend/src/modules/dpe/dpe.controller.ts << 'EOF'
/**
 * Controller DPE
 */

import { Request, Response } from 'express';
import { dpeService } from './dpe.service';
import { asyncHandler } from '@utils/async-handler';
import { ApiResponse } from '@dpe-matching/shared';

export class DpeController {
  createDpe = asyncHandler(async (req: Request, res: Response) => {
    const dpe = await dpeService.createDpe(req.body);
    res.status(201).json({ success: true, data: dpe } as ApiResponse<any>);
  });

  getDpe = asyncHandler(async (req: Request, res: Response) => {
    const dpe = await dpeService.getDpeById(req.params.id);
    res.json({ success: true, data: dpe } as ApiResponse<any>);
  });

  listDpes = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { dpes, total } = await dpeService.listDpes(Number(page), Number(limit));

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: dpes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    } as ApiResponse<any>);
  });
}

export const dpeController = new DpeController();
EOF

cat > packages/backend/src/modules/dpe/dpe.types.ts << 'EOF'
/**
 * Types spécifiques au module DPE
 */

import { z } from 'zod';
import { CreateDpeRecordSchema } from '@dpe-matching/shared';

export const CreateDpeSchema = z.object({
  body: CreateDpeRecordSchema,
});

export const GetDpeSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
EOF

echo -e "${GREEN}✓ Module DPE créé${NC}"

# ============================================================================
# BACKEND - Annonces Module
# ============================================================================

echo -e "${BLUE}📦 Création du module Annonces...${NC}"

cat > packages/backend/src/modules/annonces/annonces.repository.ts << 'EOF'
/**
 * Repository pour les annonces Leboncoin
 */

import { prisma } from '@config/database';
import { LeboncoinAnnonce, CreateLeboncoinAnnonceDto } from '@dpe-matching/shared';

export class AnnoncesRepository {
  async createAnnonce(data: CreateLeboncoinAnnonceDto): Promise<LeboncoinAnnonce> {
    return await prisma.leboncoinAnnonce.create({
      data: data as any,
    }) as any;
  }

  async getAnnonceById(id: string): Promise<LeboncoinAnnonce | null> {
    return await prisma.leboncoinAnnonce.findUnique({
      where: { id },
    }) as any;
  }

  async getAnnonceByListId(listId: bigint): Promise<LeboncoinAnnonce | null> {
    return await prisma.leboncoinAnnonce.findUnique({
      where: { listId },
    }) as any;
  }

  async listAnnonces(page: number, limit: number) {
    const [annonces, total] = await Promise.all([
      prisma.leboncoinAnnonce.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { datePublication: 'desc' },
      }),
      prisma.leboncoinAnnonce.count(),
    ]);

    return { annonces: annonces as any[], total };
  }
}

export const annoncesRepository = new AnnoncesRepository();
EOF

cat > packages/backend/src/modules/annonces/annonces.service.ts << 'EOF'
/**
 * Service Annonces
 */

import { annoncesRepository } from './annonces.repository';
import { CreateLeboncoinAnnonceDto, LeboncoinAnnonce } from '@dpe-matching/shared';
import { ConflictError, NotFoundError } from '@utils/errors';

export class AnnoncesService {
  async createAnnonce(data: CreateLeboncoinAnnonceDto): Promise<LeboncoinAnnonce> {
    const existing = await annoncesRepository.getAnnonceByListId(data.listId);
    if (existing) {
      throw new ConflictError('Annonce with this listId already exists');
    }

    return await annoncesRepository.createAnnonce(data);
  }

  async getAnnonceById(id: string): Promise<LeboncoinAnnonce> {
    const annonce = await annoncesRepository.getAnnonceById(id);
    if (!annonce) {
      throw new NotFoundError('Annonce not found');
    }
    return annonce;
  }

  async listAnnonces(page: number, limit: number) {
    return await annoncesRepository.listAnnonces(page, limit);
  }
}

export const annoncesService = new AnnoncesService();
EOF

cat > packages/backend/src/modules/annonces/annonces.controller.ts << 'EOF'
/**
 * Controller Annonces
 */

import { Request, Response } from 'express';
import { annoncesService } from './annonces.service';
import { asyncHandler } from '@utils/async-handler';
import { ApiResponse } from '@dpe-matching/shared';

export class AnnoncesController {
  createAnnonce = asyncHandler(async (req: Request, res: Response) => {
    const annonce = await annoncesService.createAnnonce(req.body);
    res.status(201).json({ success: true, data: annonce } as ApiResponse<any>);
  });

  getAnnonce = asyncHandler(async (req: Request, res: Response) => {
    const annonce = await annoncesService.getAnnonceById(req.params.id);
    res.json({ success: true, data: annonce } as ApiResponse<any>);
  });

  listAnnonces = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { annonces, total } = await annoncesService.listAnnonces(Number(page), Number(limit));

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        items: annonces,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    } as ApiResponse<any>);
  });
}

export const annoncesController = new AnnoncesController();
EOF

cat > packages/backend/src/modules/annonces/annonces.types.ts << 'EOF'
/**
 * Types spécifiques au module Annonces
 */

import { z } from 'zod';
import { CreateLeboncoinAnnonceSchema } from '@dpe-matching/shared';

export const CreateAnnonceSchema = z.object({
  body: CreateLeboncoinAnnonceSchema,
});

export const GetAnnonceSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
EOF

echo -e "${GREEN}✓ Module Annonces créé${NC}"

echo -e "${BLUE}📝 Création des routes backend...${NC}"

# Créer le dossier routes
mkdir -p packages/backend/src/routes

cat > packages/backend/src/routes/dpe.routes.ts << 'EOF'
import { Router } from 'express';
import { dpeController } from '@modules/dpe/dpe.controller';
import { validate } from '@middleware/validator';
import { authenticate } from '@middleware/auth';
import { CreateDpeSchema, GetDpeSchema } from '@modules/dpe/dpe.types';

const router = Router();

router.post('/', authenticate, validate(CreateDpeSchema), dpeController.createDpe);
router.get('/:id', validate(GetDpeSchema), dpeController.getDpe);
router.get('/', dpeController.listDpes);

export default router;
EOF

cat > packages/backend/src/routes/annonces.routes.ts << 'EOF'
import { Router } from 'express';
import { annoncesController } from '@modules/annonces/annonces.controller';
import { validate } from '@middleware/validator';
import { authenticate } from '@middleware/auth';
import { CreateAnnonceSchema, GetAnnonceSchema } from '@modules/annonces/annonces.types';

const router = Router();

router.post('/', authenticate, validate(CreateAnnonceSchema), annoncesController.createAnnonce);
router.get('/:id', validate(GetAnnonceSchema), annoncesController.getAnnonce);
router.get('/', annoncesController.listAnnonces);

export default router;
EOF

cat > packages/backend/src/routes/matching.routes.ts << 'EOF'
import { Router } from 'express';
import { matchingController } from '@modules/matching/matching.controller';
import { validate } from '@middleware/validator';
import { authenticate } from '@middleware/auth';
import { matchingRateLimiter } from '@middleware/rate-limiter';
import { RunMatchingSchema, ValidateClusterSchema } from '@modules/matching/matching.types';

const router = Router();

router.post(
  '/annonces/:annonceId',
  authenticate,
  matchingRateLimiter,
  validate(RunMatchingSchema),
  matchingController.runMatching
);
router.get('/clusters/:clusterId', matchingController.getCluster);
router.get('/clusters', matchingController.listClusters);
router.patch(
  '/clusters/:clusterId/validate',
  authenticate,
  validate(ValidateClusterSchema),
  matchingController.validateCluster
);

export default router;
EOF

cat > packages/backend/src/routes/index.ts << 'EOF'
import { Router } from 'express';
import dpeRoutes from './dpe.routes';
import annoncesRoutes from './annonces.routes';
import matchingRoutes from './matching.routes';

const router = Router();

router.use('/dpes', dpeRoutes);
router.use('/annonces', annoncesRoutes);
router.use('/matching', matchingRoutes);

export default router;
EOF

echo -e "${GREEN}✓ Routes créées${NC}"

# ============================================================================
# BACKEND - Server & App
# ============================================================================

echo -e "${BLUE}🚀 Création du serveur backend...${NC}"

cat > packages/backend/src/app.ts << 'EOF'
/**
 * Configuration Express
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { config } from '@config/index';
import { errorHandler, notFoundHandler } from '@middleware/error-handler';
import { generalRateLimiter } from '@middleware/rate-limiter';
import routes from '@routes/index';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Rate limiting
  app.use(generalRateLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
EOF

cat > packages/backend/src/index.ts << 'EOF'
/**
 * Point d'entrée de l'application backend
 */

import { createApp } from './app';
import { config } from '@config/index';
import { connectDatabase, disconnectDatabase } from '@config/database';
import { logger } from '@utils/logger';

/**
 * Démarre le serveur
 */
const startServer = async (): Promise<void> => {
  try {
    // Connexion à la base de données
    await connectDatabase();

    // Créer l'application Express
    const app = createApp();

    // Démarrer le serveur
    const server = app.listen(config.server.port, () => {
      logger.info(\`🚀 Server started on http://\${config.server.host}:\${config.server.port}\`);
      logger.info(\`📝 Environment: \${config.env}\`);
      logger.info(\`✓ Ready to accept connections\`);
    });

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      logger.info('Shutting down gracefully...');

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
EOF

echo -e "${GREEN}✓ Serveur backend créé${NC}"

echo -e "${GREEN}✅ Tous les fichiers backend créés avec succès!${NC}"
echo ""
echo -e "${BLUE}📦 Pour compléter le setup:${NC}"
echo "1. cd packages/backend && pnpm install"
echo "2. Créer un fichier .env basé sur .env.example"
echo "3. pnpm db:migrate pour créer la base de données"
echo "4. pnpm dev pour démarrer le serveur"
EOF

chmod +x setup-remaining-files.sh

echo "✅ Script de setup créé! Exécutez-le avec: ./setup-remaining-files.sh"
