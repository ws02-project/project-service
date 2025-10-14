#!/bin/bash

# Development startup script
echo "🚀 Starting project-service development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start Docker Compose
docker-compose up --build
