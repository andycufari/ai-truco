#!/bin/bash
# Make script executable: chmod +x start.sh

echo "🃏 HayTruco - AI vs AI Truco Simulator"
echo "======================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env and add your API keys"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "🚀 Starting HayTruco server..."
echo "🌐 Open http://localhost:3001 in your browser"
echo ""

npm start
