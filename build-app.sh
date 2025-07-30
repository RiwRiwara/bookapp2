#!/bin/bash

# Build script for Book Siam Reader
# This script helps build the app for distribution on different platforms

echo "🚀 Building Book Siam Reader..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf release/build/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Build for distribution
echo "📱 Building for distribution..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building for macOS..."
    # For macOS - build both architectures
    npm run package -- --mac --x64 --arm64
    
    echo "✅ macOS build complete!"
    echo "📁 Built files are in: release/build/"
    echo ""
    echo "🔐 To avoid 'damaged' errors on other Macs:"
    echo "1. For development/testing: Right-click app → Open (bypass Gatekeeper)"
    echo "2. For distribution: You need to sign with Apple Developer certificate"
    echo "3. Alternative: Users can run: sudo xattr -cr /path/to/app"
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Building for Windows..."
    npm run package -- --win --x64 --ia32
    
    echo "✅ Windows build complete!"
    echo "📁 Built files are in: release/build/"
    
else
    echo "🐧 Building for Linux..."
    npm run package -- --linux
    
    echo "✅ Linux build complete!"
    echo "📁 Built files are in: release/build/"
fi

echo ""
echo "🎉 Build process completed!"
echo "📋 Next steps:"
echo "1. Test the built application"
echo "2. For macOS: Consider code signing for distribution"
echo "3. For Windows: Consider code signing for distribution"
echo "4. Upload to your distribution platform"
