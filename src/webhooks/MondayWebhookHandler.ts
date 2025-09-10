import { Request, Response } from 'express';
import { MondayWebhookPayload } from '../types';
import { createMondayApiService } from '../services/MondayApiService';
import { createCalculationService } from '../services/CalculationService';

// Service configuration type
type MondayWebhookHandlerConfig = {
  mondayApi: ReturnType<typeof createMondayApiService>;
  calculationService: ReturnType<typeof createCalculationService>;
  inputColumnId: string;
};

// Pure function to handle webhook verification challenge
const handleWebhookChallenge = (req: Request, res: Response): void => {
  if (req.body.challenge) {
    console.log('[Webhook] Responding to challenge:', req.body.challenge);
    res.status(200).json({ challenge: req.body.challenge });
  }
};

// Pure function to check if webhook should be processed
const shouldProcessWebhook = (payload: MondayWebhookPayload, inputColumnId: string): boolean => {
  const eventType = payload.event?.type;
  const columnId = payload.event?.columnId;
  return eventType === 'update_column_value' && columnId === inputColumnId;
};

// Pure function to parse input value
const parseInputValue = (value: any): number | null => {
  const parsed = parseFloat(String(value?.value || '0'));
  return isNaN(parsed) ? null : parsed;
};

// Handle column change function
const handleColumnChange = async (
  payload: MondayWebhookPayload,
  calculationService: ReturnType<typeof createCalculationService>
): Promise<void> => {
  try {
    const event = payload.event;
    const itemId = event?.pulseId;
    const value = event?.value;
    const previousValue = event?.previousValue;

    console.log(`[Webhook] Column change detected for item ${itemId}:`, {
      oldValue: previousValue?.value,
      newValue: value?.value,
    });

    // Parse the new input value
    const newInputValue = parseInputValue(value);
    if (newInputValue === null) {
      console.warn(`[Webhook] Invalid input value for item ${itemId}: ${value?.value}`);
      return;
    }

    // Trigger recalculation
    const result = await calculationService.calculateAndUpdateResult(String(itemId), 'webhook');

    if (result.success) {
      console.log(`[Webhook] Successfully recalculated for item ${itemId}:`, {
        inputValue: result.inputValue,
        factor: result.factor,
        resultValue: result.resultValue,
      });
    } else {
      console.error(`[Webhook] Failed to recalculate for item ${itemId}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error handling column change for item ${payload.event?.pulseId}:`, error);
  }
};

// Create Monday webhook handler factory
const createMondayWebhookHandler = (config: MondayWebhookHandlerConfig) => {
  const { mondayApi, calculationService, inputColumnId } = config;

  // Handle webhook function
  const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[Webhook] Received webhook:', JSON.stringify(req.body, null, 2));

      // Handle webhook verification challenge
      if (req.body.challenge) {
        handleWebhookChallenge(req, res);
        return;
      }

      const payload: MondayWebhookPayload = req.body;

      // Check if this is a column change event for our input column
      if (shouldProcessWebhook(payload, inputColumnId)) {
        await handleColumnChange(payload, calculationService);
      } else {
        const eventType = payload.event?.type;
        const columnId = payload.event?.columnId;
        console.log('[Webhook] Ignoring webhook event:', eventType, 'for column:', columnId);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Webhook] Error handling webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Handle webhook verification function
  const handleWebhookVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { challenge } = req.body;
      
      if (challenge) {
        console.log('[Webhook] Verification challenge received:', challenge);
        res.status(200).json({ challenge });
      } else {
        res.status(400).json({ error: 'No challenge provided' });
      }
    } catch (error) {
      console.error('[Webhook] Error handling verification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Return handler object with all functions
  return {
    handleWebhook,
    handleWebhookVerification,
  };
};

// Export the factory function and types
export { createMondayWebhookHandler };
export type { MondayWebhookHandlerConfig };
