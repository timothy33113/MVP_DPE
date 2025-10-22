/**
 * Types pour l'authentification
 */

import { z } from 'zod';

/**
 * Schema de validation pour le register
 */
export const RegisterBodySchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
      .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  }),
});

/**
 * Schema de validation pour le login
 */
export const LoginBodySchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Le mot de passe est requis'),
  }),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>['body'];
export type LoginBody = z.infer<typeof LoginBodySchema>['body'];

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  token: string;
}
