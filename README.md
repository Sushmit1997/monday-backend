# Monday.com Backend Integration

A TypeScript Express backend for Monday.com integration with MongoDB, featuring automatic calculation updates via webhooks and comprehensive API endpoints.

## 🚀 Features

- **Monday.com API Integration**: Full integration with Monday.com GraphQL API
- **Webhook Support**: Real-time updates when input columns change
- **MongoDB Storage**: Persistent storage for multiplication factors and calculation history
- **Auto-calculation**: Automatic result calculation when input values change
- **RESTful API**: Complete API for factor management and recalculation
- **Retry Logic**: Robust error handling with exponential backoff
- **TypeScript**: Full type safety and modern development experience

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **API Integration**: Monday.com GraphQL API
- **Package Manager**: Yarn

## 📋 Prerequisites

- Node.js 18 or higher
- MongoDB (local or cloud instance)
- Monday.com account with API access
- Yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd monday-backend
yarn install
```

### 2. Environment Setup

Copy the environment example file and configure your variables:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/monday-backend

# Monday.com API Configuration
MONDAY_API_TOKEN=your_monday_api_token_here
DEFAULT_BOARD_ID=your_default_board_id_here

# Column IDs for Monday.com board
INPUT_NUMBER_COLUMN_ID=your_input_number_column_id_here
RESULT_NUMBER_COLUMN_ID=your_result_number_column_id_here

# Server Configuration
PORT=3000
NODE_ENV=development

### 3. Get Monday.com Configuration

#### API Token
1. Go to [Monday.com Developer](https://developer.monday.com/)
2. Create a new app or use existing
3. Generate an API token with read/write permissions

#### Board and Column IDs
1. Open your Monday.com board
2. For Board ID: Look at the URL `https://your-domain.monday.com/boards/BOARD_ID`
3. For Column IDs: Use Monday.com's GraphQL API to query column information:

```graphql
query {
  boards(ids: ["YOUR_BOARD_ID"]) {
    columns {
      id
      title
      type
    }
  }
}
```

### 4. Start the Application

```bash
# Development mode with hot reload
yarn dev

# Production build and start
yarn build
yarn start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Items Management

##### Get Factor
```http
GET /api/items/:itemId/factor
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "1234567890",
    "factor": 2.5
  }
}
```

##### Set Factor
```http
POST /api/items/:itemId/factor
Content-Type: application/json

{
  "factor": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "1234567890",
    "oldFactor": 1.0,
    "newFactor": 2.5
  }
}
```

##### Recalculate Result
```http
POST /api/items/:itemId/recalculate
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "1234567890",
    "inputValue": 10,
    "factor": 2.5,
    "resultValue": 25
  }
}
```

##### Get History
```http
GET /api/items/:itemId/history?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "1234567890",
    "history": [
      {
        "action": "recalculation",
        "newValue": 25,
        "inputValue": 10,
        "resultValue": 25,
        "triggeredBy": "webhook",
        "metadata": {
          "factor": 2.5,
          "calculation": "10 * 2.5 = 25"
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 1
  }
}
```

##### Get All Items
```http
GET /api/items
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1234567890",
      "name": "Item 1",
      "column_values": [
        {
          "id": "input_column_id",
          "text": "10",
          "value": "10"
        },
        {
          "id": "result_column_id", 
          "text": "25",
          "value": "25"
        }
      ]
    }
  ]
}
```

### Webhook Endpoints

#### Monday.com Webhook
```http
POST /webhooks/monday
Content-Type: application/json
X-Monday-Signature: your_signature

{
  "event": {
    "app": "string",
    "type": "update_column_value",
    "triggerTime": "ISO 8601 timestamp",
    "subscriptionId": "number",
    "isRetry": "boolean",
    "userId": "number",
    "originalTriggerUuid": "string | null",
    "boardId": "number",
    "groupId": "string",
    "pulseId": "number",
    "pulseName": "string",
    "columnId": "string",
    "columnType": "string",
    "columnTitle": "string",
    "value": {
      "value": "number",
      "unit": "string | null"
    },
    "previousValue": {
      "value": "number",
      "unit": "string | null"
    },
    "changedAt": "number",
    "isTopGroup": "boolean",
    "triggerUuid": "string"
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `MONDAY_API_TOKEN` | Monday.com API token | Yes | - |
| `DEFAULT_BOARD_ID` | Default Monday.com board ID | Yes | - |
| `INPUT_NUMBER_COLUMN_ID` | Column ID for input numbers | Yes | - |
| `RESULT_NUMBER_COLUMN_ID` | Column ID for calculated results | Yes | - |
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment (development/production) | No | development |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No | * |

### Monday.com Webhook Setup

1. Go to your Monday.com board
2. Navigate to Integrations → Webhooks
3. Create a new webhook with:
   - **URL**: `https://your-domain.com/webhooks/monday`
   - **Event**: Column value changes
   - **Column**: Select your input number column
4. Copy the webhook secret to your environment variables

## 🏗 Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.ts   # MongoDB connection
│   └── environment.ts # Environment validation
├── middleware/       # Express middleware
│   ├── errorHandler.ts
│   ├── noCache.ts
│   └── index.ts
├── models/          # MongoDB schemas
│   ├── Factor.ts    # Factor model
│   ├── History.ts   # History model
│   └── index.ts
├── routes/          # API routes
│   ├── items.ts     # Items API endpoints
│   └── index.ts
├── services/        # Business logic
│   ├── MondayApiService.ts    # Monday.com API client
│   ├── CalculationService.ts  # Calculation logic
│   └── index.ts
├── types/           # TypeScript type definitions
│   └── index.ts
├── webhooks/        # Webhook handlers
│   ├── MondayWebhookHandler.ts
│   └── index.ts
└── index.ts         # Application entry point
```


## 🔍 Monitoring and Logging

The application includes comprehensive logging:

- **Error Logging**: Detailed error information with stack traces
- **Monday API Logging**: All API calls with retry information
- **Webhook Logging**: Webhook events and processing status

## 🛠 Development

### Available Scripts

```bash
yarn dev          # Start development server with hot reload
yarn build        # Build TypeScript to JavaScript
yarn start        # Start production server
yarn lint         # Run ESLint
yarn lint:fix     # Fix ESLint errors
```

### Code Style

The project uses ESLint with TypeScript rules. Run `yarn lint:fix` to automatically fix style issues.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the [API Documentation](#-api-documentation)
2. Review the [Configuration](#-configuration) section
3. Check the logs for error details
4. Open an issue in the repository

## 🔄 Changelog

### v1.0.0
- Initial release
- Monday.com API integration
- Webhook support for real-time updates
- MongoDB storage for factors and history
- Complete REST API
- TypeScript implementation
- Comprehensive error handling and retry logic
- Backend for jetpack monday.com technical task 
