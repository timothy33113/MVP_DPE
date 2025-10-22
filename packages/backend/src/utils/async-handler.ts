/**
 * Wrapper pour les handlers async Express
 * Permet de capturer les erreurs automatiquement sans try/catch dans chaque handler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper pour les handlers asynchrones
 * @param fn Handler asynchrone
 * @returns Handler Express avec gestion d'erreur
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
