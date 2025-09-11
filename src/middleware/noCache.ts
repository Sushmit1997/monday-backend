import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to disable caching for API responses
 * Sets headers to prevent 304 Not Modified responses
 */
export const noCache = (req: Request, res: Response, next: NextFunction): void => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
};
