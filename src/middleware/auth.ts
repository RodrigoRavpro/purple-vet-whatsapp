import { Request, Response, NextFunction } from 'express';

export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.API_SECRET;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      error: 'API_SECRET not configured',
    });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
    });
  }

  next();
};
