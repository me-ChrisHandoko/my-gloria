#!/bin/bash

echo "🚀 Starting Clerk Token Generator Server..."
echo "========================================="
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found. Starting server..."
    echo ""
    echo "📋 Instructions:"
    echo "1. Server will start on: http://localhost:8080"
    echo "2. Open your browser to: http://localhost:8080/clerk-token-simple.html"
    echo "3. Sign in with your Clerk account"
    echo "4. Copy the JWT token displayed"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "========================================="
    echo ""
    
    # Start Python HTTP server
    python3 -m http.server 8080
else
    echo "❌ Python 3 not found. Trying Node.js..."
    
    if command -v node &> /dev/null; then
        echo "✅ Node.js found. Installing http-server..."
        npx http-server -p 8080
    else
        echo "❌ Neither Python 3 nor Node.js found."
        echo "Please install one of them to run the server."
        exit 1
    fi
fi