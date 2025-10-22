/**
 * Service d'authentification
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { config } from '@config/index';
import { prisma } from '@config/database';
import { UnauthorizedError, ConflictError } from '@utils/errors';
import { ERROR_CODES } from '@dpe-matching/shared';
import { logger } from '@utils/logger';

import type { RegisterBody, LoginBody, AuthResponse } from './auth.types';

export class AuthService {
  /**
   * Enregistrer un nouvel utilisateur
   */
  async register(data: RegisterBody): Promise<AuthResponse> {
    const { email, password } = data;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Cet email est déjà utilisé', ERROR_CODES.RESOURCE_ALREADY_EXISTS);
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Générer le token JWT
    const token = this.generateToken(user.id, user.email, user.role);

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Connecter un utilisateur
   */
  async login(data: LoginBody): Promise<AuthResponse> {
    const { email, password } = data;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError(
        'Email ou mot de passe incorrect',
        ERROR_CODES.AUTH_INVALID_CREDENTIALS
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError(
        'Email ou mot de passe incorrect',
        ERROR_CODES.AUTH_INVALID_CREDENTIALS
      );
    }

    // Générer le token JWT
    const token = this.generateToken(user.id, user.email, user.role);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Générer un token JWT
   */
  private generateToken(userId: string, email: string, role: string): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign(
      {
        userId,
        email,
        role,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      } as any
    );
  }
}

export const authService = new AuthService();
