# Distribution Guide for Book Siam Reader

This guide helps you build and distribute your Electron app without "damaged" errors or dark screen issues.

## 🚀 Quick Build

```bash
# Make the build script executable (first time only)
chmod +x build-app.sh

# Build the app
./build-app.sh
```

## 🔧 Manual Build Commands

### For macOS:
```bash
npm run build
npm run package -- --mac --x64 --arm64
```

### For Windows:
```bash
npm run build
npm run package -- --win --x64 --ia32
```

### For Linux:
```bash
npm run build
npm run package -- --linux
```

## 🍎 macOS "Damaged" App Fix

### For Development/Testing:
1. **Right-click method**: Right-click the app → "Open" → Click "Open" in the dialog
2. **Terminal method**: 
   ```bash
   sudo xattr -cr "/path/to/Book Siam Reader.app"
   ```
3. **System Preferences**: System Preferences → Security & Privacy → General → Click "Open Anyway"

### For Distribution:
1. **Get Apple Developer Account** ($99/year)
2. **Code Signing Certificate**: Download from Apple Developer Portal
3. **Update package.json**:
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name (TEAM_ID)",
     "notarize": true
   }
   ```
4. **Environment Variables**:
   ```bash
   export APPLE_ID="your@email.com"
   export APPLE_ID_PASS="app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

## 🪟 Windows Distribution

### For Development:
- The portable version doesn't require installation
- Users might see Windows Defender warnings (normal for unsigned apps)

### For Distribution:
1. **Get Code Signing Certificate** (from DigiCert, Sectigo, etc.)
2. **Update package.json**:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.p12",
     "certificatePassword": "certificate-password"
   }
   ```

## 🐧 Linux Distribution

Linux builds work out of the box. Consider:
- AppImage (universal)
- Snap packages
- Flatpak
- Debian packages (.deb)

## 🛠️ Troubleshooting

### Dark Screen Issues:
✅ **Fixed in this update:**
- Added `backgroundColor: '#ffffff'` to prevent dark screen
- Improved window initialization
- Better error handling

### App Won't Start:
1. Check console for errors: `Console.app` (macOS) or Event Viewer (Windows)
2. Try running from terminal to see error messages
3. Verify all dependencies are included in the build

### Performance Issues:
- Use `asar: true` for faster loading (already enabled)
- Minimize bundle size by excluding dev dependencies
- Use `asarUnpack` for native modules (already configured)

## 📦 Build Outputs

After building, find your distributables in:
```
release/build/
├── mac/
│   ├── Book Siam Reader.app
│   ├── Book Siam Reader-1.0.0.dmg
│   └── Book Siam Reader-1.0.0-mac.zip
├── win-unpacked/
├── Book Siam Reader Setup 1.0.0.exe
├── Book Siam Reader 1.0.0.exe (portable)
└── linux-unpacked/
```

## 🔐 Security Notes

This app includes:
- Content protection against screenshots
- Screen recording detection
- Secure IPC communication
- Proper entitlements for macOS

## 📋 Pre-Distribution Checklist

- [ ] Test on clean machines (macOS/Windows/Linux)
- [ ] Verify all features work in production build
- [ ] Check app signing (for distribution)
- [ ] Test auto-updater (if enabled)
- [ ] Verify app icons and metadata
- [ ] Test installation/uninstallation process

## 🆘 Support

If you encounter issues:
1. Check the console logs
2. Verify Node.js and npm versions
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Try building on a different machine

## 📚 Additional Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
