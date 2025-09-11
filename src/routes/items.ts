import { Router, Request, Response, NextFunction } from 'express';
import { createCalculationService } from '../services/CalculationService';
import { ApiError } from '../types';

const router = Router();

// Middleware to inject CalculationService
export const createItemsRouter = (calculationService: ReturnType<typeof createCalculationService>): Router => { 
  // GET /items/:itemId/factor - Get factor for an item

  router.get('/:itemId/factor', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemId } = req.params;
      if (!itemId) {
        const error = new Error('Item ID is required') as ApiError;
        error.statusCode = 400;
        throw error;
      }

      const factor = await calculationService.getFactor(itemId);

      if (factor === null) {
        const error = new Error(`No factor found for item ${itemId}`) as ApiError;
        error.statusCode = 404;
        throw error;
      }

      res.json({
        success: true,
        data: {
          itemId,
          factor,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /items/:itemId/factor - Set factor for an item
  router.post('/:itemId/factor', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemId } = req.params;
      const { factor } = req.body;

      if (!itemId) {
        const error = new Error('Item ID is required') as ApiError;
        error.statusCode = 400;
        throw error;
      }

      if (typeof factor !== 'number' || factor < 0) {
        const error = new Error('Factor must be a non-negative number') as ApiError;
        error.statusCode = 400;
        throw error;
      }

      const result = await calculationService.updateFactor(itemId, factor, 'api');

      if (!result.success) {
        const error = new Error('Failed to update factor') as ApiError;
        error.statusCode = 500;
        throw error;
      }
      res.status(201);
      res.json({
        success: true,
        data: {
          itemId,
          oldFactor: result.oldFactor,
          newFactor: result.newFactor,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /items/:itemId/recalculate - Recalculate result for an item
  router.post('/:itemId/recalculate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        const error = new Error('Item ID is required') as ApiError;
        error.statusCode = 400;
        throw error;
      }

      const result = await calculationService.calculateAndUpdateResult(itemId, 'api');

      if (!result.success) {
        const error = new Error('Failed to recalculate result') as ApiError;
        error.statusCode = 500;
        throw error;
      }

      res.json({
        success: true,
        data: {
          itemId,
          inputValue: result.inputValue,
          factor: result.factor,
          resultValue: result.resultValue,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /items/:itemId/history - Get calculation history for an item
  router.get('/:itemId/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { itemId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!itemId) {
        const error = new Error('Item ID is required') as ApiError;
        error.statusCode = 400;
        throw error;
      }

      if (limit < 1 || limit > 100) {
        const error = new Error('Limit must be between 1 and 100') as ApiError;
        error.statusCode = 400;
        throw error;
      }

      const history = await calculationService.getHistory(itemId, limit);

      res.json({
        success: true,
        data: {
          itemId,
          history,
          count: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });


  //Create router for fetching all items
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await calculationService.getAllItems(process.env.DEFAULT_BOARD_ID as string);
      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};



