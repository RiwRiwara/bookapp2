#!/bin/bash

# Fix "damaged" app error on macOS
# Run this script if users report the app is "damaged" and can't be opened

echo "🔧 Book Siam Reader - Fix 'Damaged' App Error"
echo "=============================================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    exit 1
fi

# Find the app
APP_PATH=""
if [ -d "/Applications/Book Siam Reader.app" ]; then
    APP_PATH="/Applications/Book Siam Reader.app"
elif [ -d "$(pwd)/Book Siam Reader.app" ]; then
    APP_PATH="$(pwd)/Book Siam Reader.app"
elif [ -d "release/build/mac/Book Siam Reader.app" ]; then
    APP_PATH="release/build/mac/Book Siam Reader.app"
else
    echo "📁 Please drag and drop the Book Siam Reader.app here and press Enter:"
    read APP_PATH
    
    # Remove quotes if present
    APP_PATH="${APP_PATH%\"}"
    APP_PATH="${APP_PATH#\"}"
fi

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found at: $APP_PATH"
    exit 1
fi

echo "📱 Found app at: $APP_PATH"
echo ""

# Remove quarantine attributes
echo "🔓 Removing quarantine attributes..."
sudo xattr -cr "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Successfully removed quarantine attributes"
else
    echo "❌ Failed to remove quarantine attributes"
    echo "💡 Try running: sudo xattr -cr \"$APP_PATH\""
    exit 1
fi

# Verify the fix
echo ""
echo "🔍 Verifying the fix..."
QUARANTINE_CHECK=$(xattr -l "$APP_PATH" | grep com.apple.quarantine)

if [ -z "$QUARANTINE_CHECK" ]; then
    echo "✅ App is now clean and should open without issues"
    echo ""
    echo "🚀 You can now open Book Siam Reader normally"
    echo "📝 If you still have issues, try:"
    echo "   1. Right-click the app → Open"
    echo "   2. System Preferences → Security & Privacy → General → Click 'Open Anyway'"
else
    echo "⚠️  Some quarantine attributes may still be present"
    echo "🔄 Try running the script again or contact support"
fi

echo ""
echo "✨ Done!"
