/**
 * Shared types for DPE-Leboncoin matching system
 * These types are used across both backend and frontend
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Type de bâtiment
 */
export enum TypeBatiment {
  MAISON = 'MAISON',
  APPARTEMENT = 'APPARTEMENT',
  TERRAIN = 'TERRAIN',
}

/**
 * Étiquette énergétique (DPE et GES)
 */
export enum EtiquetteDpe {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
}

/**
 * Statut de validation du match
 */
export enum StatutValidation {
  NON_VERIFIE = 'NON_VERIFIE',
  EN_COURS = 'EN_COURS',
  ADRESSE_CONFIRMEE = 'ADRESSE_CONFIRMEE',
  FAUX_POSITIF = 'FAUX_POSITIF',
  IGNORE = 'IGNORE',
}

/**
 * Niveau de confiance du match
 */
export enum NiveauConfiance {
  CERTAIN = 'CERTAIN',
  TRES_FIABLE = 'TRES_FIABLE',
  PROBABLE = 'PROBABLE',
  POSSIBLE = 'POSSIBLE',
  DOUTEUX = 'DOUTEUX',
}

/**
 * Type de chauffage
 */
export enum TypeChauffage {
  ELECTRIQUE = 'ELECTRIQUE',
  GAZ = 'GAZ',
  FIOUL = 'FIOUL',
  BOIS = 'BOIS',
  POMPE_CHALEUR = 'POMPE_CHALEUR',
  AUTRE = 'AUTRE',
}

// ============================================================================
// Zod Schemas for validation
// ============================================================================

export const TypeBatimentSchema = z.nativeEnum(TypeBatiment);
export const EtiquetteDpeSchema = z.nativeEnum(EtiquetteDpe);
export const StatutValidationSchema = z.nativeEnum(StatutValidation);
export const NiveauConfianceSchema = z.nativeEnum(NiveauConfiance);
export const TypeChauffageSchema = z.nativeEnum(TypeChauffage);

// ============================================================================
// DPE Record Types
// ============================================================================

/**
 * Enregistrement DPE complet
 */
export interface DpeRecord {
  id: string;
  numeroDpe: string;
  adresseBan: string;
  codePostalBan: string;
  typeBatiment: TypeBatiment;
  surfaceHabitable: number;
  anneConstruction: number | null;
  etiquetteDpe: EtiquetteDpe;
  etiquetteGes: EtiquetteDpe;
  coordonneeX: number | null;
  coordonneeY: number | null;
  dateEtablissement: Date;
  rawData?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * DTO pour créer un DPE record
 */
export const CreateDpeRecordSchema = z.object({
  numeroDpe: z.string().min(1),
  adresseBan: z.string().min(1),
  codePostalBan: z.string().length(5),
  typeBatiment: TypeBatimentSchema,
  surfaceHabitable: z.number().positive(),
  anneConstruction: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  etiquetteDpe: EtiquetteDpeSchema,
  etiquetteGes: EtiquetteDpeSchema,
  coordonneeX: z.number().nullable(),
  coordonneeY: z.number().nullable(),
  dateEtablissement: z.coerce.date(),
  rawData: z.record(z.unknown()).optional(),
});

export type CreateDpeRecordDto = z.infer<typeof CreateDpeRecordSchema>;

// ============================================================================
// Leboncoin Annonce Types
// ============================================================================

/**
 * Annonce Leboncoin
 */
export interface LeboncoinAnnonce {
  id: string;
  listId: bigint;
  url: string;
  codePostal: string;
  typeBien: TypeBatiment;
  surface: number | null;
  pieces: number | null;
  anneConstruction: number | null;
  etiquetteDpe: EtiquetteDpe | null;
  etiquetteGes: EtiquetteDpe | null;
  lat: number | null;
  lng: number | null;
  datePublication: Date;
  dpeCorrected?: boolean;
  dpeCorrectId?: string | null;
  rawData?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * DTO pour créer une annonce Leboncoin
 */
export const CreateLeboncoinAnnonceSchema = z.object({
  listId: z.union([z.bigint(), z.number(), z.string().transform((val) => BigInt(val))]),
  url: z.string().url(),
  codePostal: z.string().length(5),
  typeBien: TypeBatimentSchema,
  surface: z.number().positive().nullable(),
  pieces: z.number().int().positive().nullable(),
  anneConstruction: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  etiquetteDpe: EtiquetteDpeSchema.nullable(),
  etiquetteGes: EtiquetteDpeSchema.nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  datePublication: z.coerce.date(),
  rawData: z.record(z.unknown()).optional(),
});

export type CreateLeboncoinAnnonceDto = z.infer<typeof CreateLeboncoinAnnonceSchema>;

// ============================================================================
// Matching Types
// ============================================================================

/**
 * Détails du score de matching
 */
export interface ScoreDetails {
  // Critères éliminatoires
  eliminatoires: {
    codePostal: boolean;
    typeBien: boolean;
  };

  // Score de base
  scoreBase: {
    dpe: number; // 0 ou 25
    ges: number; // 0 ou 25
    surface: number; // 0, 10 ou 15
    annee: number; // 0 ou 10
    pieces: number; // 0 ou 10
    niveauxEtage: number; // 0 ou 5
    chauffage: number; // 0 ou 5
    timing: number; // 0, 1, 3 ou 5
  };

  // Bonus
  bonus: {
    distanceGPS: number; // 0, 4, 7 ou 10
    quartier: number; // 0 ou 5
    rue: number; // 0 ou 5
    chambres: number; // 0 ou 3
    orientation: number; // 0 ou 2
    exterieur: number; // 0 ou 2
  };
}

/**
 * Critères de matching
 */
export interface MatchingCriteria {
  eliminatoires: {
    codePostal: boolean;
    typeBien: boolean;
  };
  scoreBase: {
    dpe: 0 | 25;
    ges: 0 | 25;
    surface: 0 | 3 | 5; // Très réduit car souvent imprécis
    surfaceTerrain: 0 | 3 | 6 | 10; // Score basé sur l'écart de surface terrain
    annee: 0 | 10;
    pieces: 0 | 10;
    niveauxEtage: 0 | 5;
    chauffage: 0 | 5;
    timing: 0 | 3 | 8 | 12 | 15; // Très augmenté car le plus discriminant après coût énergie
    coutEnergie: 0 | 5 | 10 | 15 | 20 | 25 | 30; // Coût énergie annuel (TRÈS discriminant - poids triplé)
  };
  bonus: {
    distanceGPS: 0 | 4 | 7 | 10;
    quartier: 0 | 5;
    rue: 0 | 5;
    chambres: 0 | 3;
    orientation: 0 | 2;
    exterieur: 0 | 2;
    traversant: 0 | 3; // Logement traversant
  };
}

/**
 * Candidat de match
 */
export interface MatchCandidat {
  id: string;
  clusterId: string;
  dpeId: string;
  scoreTotal: number;
  scoreBase: number;
  scoreBonus: number;
  scoreNormalized: number;
  confiance: NiveauConfiance;
  scoreDetails: ScoreDetails;
  distanceGps: number | null;
  rang: number;
  estSelectionne: boolean;
  createdAt: Date;
  dpe?: DpeRecord;
}

/**
 * Cluster de matchs
 */
export interface MatchCluster {
  id: string;
  annonceId: string;
  nombreCandidats: number;
  meilleurScore: number;
  statut: StatutValidation;
  dpeConfirmeId: string | null;
  dateValidation: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  annonce?: LeboncoinAnnonce;
  candidats?: MatchCandidat[];
}

/**
 * Options pour l'algorithme de matching
 */
export interface MatchingOptions {
  maxCandidats?: number;
  seuilScoreMinimum?: number;
  distanceMaxGPS?: number; // en mètres
  includeScoreDetails?: boolean;
}

/**
 * Résultat du matching
 */
export interface MatchingResult {
  clusterId: string;
  annonceId: string;
  candidats: MatchCandidat[];
  nombreCandidats: number;
  meilleurScore: number;
  executionTimeMs: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Réponse API standard
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Réponse paginée
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Paramètres de pagination
 */
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Utilisateur
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rôles utilisateur
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * Schéma de login
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginDto = z.infer<typeof LoginSchema>;

/**
 * Schéma de registration
 */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

/**
 * Payload JWT
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Réponse d'authentification
 */
export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Coordonnées géographiques
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Adresse
 */
export interface Address {
  rue?: string;
  codePostal: string;
  ville?: string;
  quartier?: string;
  coordinates?: GeoCoordinates;
}
