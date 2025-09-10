import { Factor, History } from '../models';
import { createMondayApiService } from './MondayApiService';
import { HistoryDocument } from '../types';

// Service configuration type
type CalculationServiceConfig = {
  mondayApi: ReturnType<typeof createMondayApiService>;
  inputColumnId: string;
  resultColumnId: string;
};

// Calculation result type
type CalculationResult = {
  inputValue: number;
  factor: number;
  resultValue: number;
  success: boolean;
};

// Factor update result type
type FactorUpdateResult = {
  oldFactor: number | null;
  newFactor: number;
  success: boolean;
};

// Trigger type
type TriggerType = 'api' | 'webhook' | 'system';

// Create calculation service factory
const createCalculationService = (config: CalculationServiceConfig) => {
  const { mondayApi, inputColumnId, resultColumnId } = config;

  // Pure function to calculate result
  const calculateResult = (inputValue: number, factor: number): number => {
    return inputValue * factor;
  };

  // Pure function to validate input value
  const validateInputValue = (inputValueText: string): number => {
    const inputValue = parseFloat(inputValueText);
    if (isNaN(inputValue)) {
      throw new Error(`Invalid input value: ${inputValueText}`);
    }
    return inputValue;
  };

  // Log calculation to history
  const logCalculation = async (
    itemId: string,
    inputValue: number,
    factor: number,
    resultValue: number,
    triggeredBy: TriggerType
  ): Promise<void> => {
    try {
      await History.create({
        itemId,
        action: 'recalculation',
        newValue: resultValue,
        inputValue,
        resultValue,
        triggeredBy,
        metadata: {
          factor,
          calculation: `${inputValue} * ${factor} = ${resultValue}`,
        },
      });
    } catch (error) {
      console.error(`[CalculationService] Error logging calculation:`, error);
    }
  };

  // Log factor update to history
  const logFactorUpdate = async (
    itemId: string,
    oldFactor: number | null,
    newFactor: number,
    triggeredBy: TriggerType
  ): Promise<void> => {
    try {
      await History.create({
        itemId,
        action: 'factor_updated',
        oldValue: oldFactor,
        newValue: newFactor,
        triggeredBy,
        metadata: {
          change: oldFactor ? `${oldFactor} → ${newFactor}` : `New factor: ${newFactor}`,
        },
      });
    } catch (error) {
      console.error(`[CalculationService] Error logging factor update:`, error);
    }
  };

  // Log error to history
  const logError = async (
    itemId: string,
    error: Error,
    triggeredBy: TriggerType
  ): Promise<void> => {
    try {
      await History.create({
        itemId,
        action: 'recalculation',
        newValue: 0,
        triggeredBy,
        metadata: {
          error: error.message,
          errorType: error.constructor.name,
        },
      });
    } catch (logError) {
      console.error(`[CalculationService] Error logging error:`, logError);
    }
  };

  // Main calculation function
  const calculateAndUpdateResult = async (
    itemId: string,
    triggeredBy: TriggerType = 'api'
  ): Promise<CalculationResult> => {
    try {
      // Get the current factor for this item
      const factorDoc = await Factor.findOne({ itemId });
      if (!factorDoc) {
        throw new Error(`No factor found for item ${itemId}`);
      }

      // Get the current input value from Monday.com
      const inputValueText = await mondayApi.getColumnValue(itemId, inputColumnId);
      if (!inputValueText) {
        throw new Error(`No input value found for item ${itemId}`);
      }

      const inputValue = validateInputValue(inputValueText);
      const resultValue = calculateResult(inputValue, factorDoc.factor);

      // Update the result column in Monday.com
      const updateSuccess = await mondayApi.updateColumnValue(
        itemId,
        resultColumnId,
        resultValue,
        process.env.DEFAULT_BOARD_ID
      );

      if (!updateSuccess) {
        throw new Error('Failed to update result column in Monday.com');
      }

      // Log the calculation to history
      await logCalculation(itemId, inputValue, factorDoc.factor, resultValue, triggeredBy);

      return {
        inputValue,
        factor: factorDoc.factor,
        resultValue,
        success: true,
      };
    } catch (error) {
      console.error(`[CalculationService] Error calculating for item ${itemId}:`, error);
      
      // Log the error to history
      await logError(itemId, error as Error, triggeredBy);

      return {
        inputValue: 0,
        factor: 0,
        resultValue: 0,
        success: false,
      };
    }
  };

  // Update factor function
  const updateFactor = async (
    itemId: string,
    newFactor: number,
    triggeredBy: TriggerType = 'api'
  ): Promise<FactorUpdateResult> => {
    try {
      const existingFactor = await Factor.findOne({ itemId });
      const oldFactor = existingFactor?.factor || null;

      if (existingFactor) {
        existingFactor.factor = newFactor;
        await existingFactor.save();
      } else {
        await Factor.create({ itemId, factor: newFactor });
      }

      // Log the factor update to history
      await logFactorUpdate(itemId, oldFactor, newFactor, triggeredBy);

      return {
        oldFactor,
        newFactor,
        success: true,
      };
    } catch (error) {
      console.error(`[CalculationService] Error updating factor for item ${itemId}:`, error);
      return {
        oldFactor: null,
        newFactor: 0,
        success: false,
      };
    }
  };

  // Get factor function
  const getFactor = async (itemId: string): Promise<number | null> => {
    try {
      const factorDoc = await Factor.findOne({ itemId });
      return factorDoc?.factor || null;
    } catch (error) {
      console.error(`[CalculationService] Error getting factor for item ${itemId}:`, error);
      return null;
    }
  };

  // Get history function
  const getHistory = async (itemId: string, limit: number = 50): Promise<HistoryDocument[]> => {
    try {
      return await History.find({ itemId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error(`[CalculationService] Error getting history for item ${itemId}:`, error);
      return [];
    }
  };

  // Get all items function
  const getAllItems = async (boardId: string): Promise<any[]> => {
    try {
      const board = await mondayApi.getBoardById(boardId);
      return board.items_page?.items || [];
    } catch (error) {
      console.error(`[CalculationService] Error getting all items:`, error);
      return [];
    }
  };

  // Return service object with all functions
  return {
    calculateAndUpdateResult,
    updateFactor,
    getFactor,
    getHistory,
    getAllItems,
  };
};

// Export the factory function and types
export { createCalculationService };
export type { CalculationServiceConfig, CalculationResult, FactorUpdateResult, TriggerType };



