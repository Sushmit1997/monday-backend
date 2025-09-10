#!/bin/bash

# Monday.com Backend Startup Script

echo "🚀 Starting Monday.com Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from env.example..."
    cp env.example .env
    echo "📝 Please update .env with your configuration before running again."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Build the project
echo "🔨 Building TypeScript..."
yarn build

# Start the application
echo "🌟 Starting application..."
yarn start
