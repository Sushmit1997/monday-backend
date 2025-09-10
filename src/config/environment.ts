import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB configuration
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/monday-backend',
  
  // Monday.com API configuration
  mondayApiToken: process.env.MONDAY_API_TOKEN,
  defaultBoardId: process.env.DEFAULT_BOARD_ID,
  inputNumberColumnId: process.env.INPUT_NUMBER_COLUMN_ID,
  resultNumberColumnId: process.env.RESULT_NUMBER_COLUMN_ID,
  
  // Webhook configuration
  webhookSecret: process.env.WEBHOOK_SECRET,
  
  // API configuration
  apiRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
};

// Validate required environment variables
export const validateEnvironment = (): void => {
  const requiredVars = [
    'MONGODB_URI',
    'MONDAY_API_TOKEN',
    'DEFAULT_BOARD_ID',
    'INPUT_NUMBER_COLUMN_ID',
    'RESULT_NUMBER_COLUMN_ID',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('[Config] Missing required environment variables:', missingVars);
    process.exit(1);
  }

  console.log('[Config] Environment validation passed');
};
