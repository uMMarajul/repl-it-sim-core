# 🚀 Development Workflow Guide - replit-sim-core

## ✅ Setup Verification Complete

Your development environment is fully configured and ready to use:

- **Node.js**: v24.11.1
- **npm**: 11.6.2  
- **Git**: 2.52.0 (connected to https://github.com/moolamoney/replit-sim-core)
- **Current Branch**: `fresh-main`
- **Dependencies**: All installed and builds verified

---

## 📁 Project Structure

```
replit-sim-core/
├── sim-core/          → TypeScript financial simulation engine
│   ├── src/           → Source code
│   ├── dist/          → Compiled JavaScript (after build)
│   └── tests/         → Test files
│
└── app-ui/            → React + Vite development UI
    ├── src/           → React components and UI code
    └── dist/          → Production build output
```

---

## 🔧 Common Development Commands

### Starting Development Server

```powershell
# Navigate to app-ui directory
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\app-ui

# Start the development server with hot reload
npm run dev
```

This will start the Vite dev server, typically at `http://localhost:5173`

### Building the Projects

```powershell
# Build sim-core (TypeScript compilation)
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\sim-core
npm run build

# Build app-ui (production bundle)
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\app-ui
npm run build
```

### Running Tests

```powershell
# Run sim-core tests
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\sim-core
npm run test
```

### Type Checking

```powershell
# Type check app-ui
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\app-ui
npm run typecheck
```

### Linting

```powershell
# Lint app-ui code
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\app-ui
npm run lint
```

---

## 🔄 Making Changes & Testing Locally

### 1. Make Your Code Changes

Edit files in either `sim-core/src/` or `app-ui/src/` as needed.

### 2. If Changing sim-core

```powershell
# Rebuild sim-core after changes
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\sim-core
npm run build
```

The app-ui uses sim-core via `"@financial-sandbox/sim-core": "file:../sim-core"`, so rebuilding sim-core makes changes available to app-ui.

### 3. Test in Development Mode

```powershell
# Start dev server to see changes live
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core\app-ui
npm run dev
```

---

## 📊 Git Workflow (Pull-Only)

> **Configuration**: Read-only access via HTTPS. You can pull updates but cannot push changes.

### Check Status

```powershell
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core
git status
```

### Pull Latest Changes from GitHub

```powershell
# Get latest updates from the main repository
git pull origin fresh-main
```

### Working with Local Changes

```powershell
# Create a local branch for your experiments/changes
git checkout -b local/my-changes

# Stage and commit locally (stays on your machine only)
git add .
git commit -m "Description of local changes"

# Switch back to fresh-main when needed
git checkout fresh-main
```

### Updating After Pulling New Changes

```powershell
# 1. Commit or stash your local changes first
git add .
git commit -m "WIP: local changes"
# OR
git stash

# 2. Pull latest changes
git pull origin fresh-main

# 3. Rebuild if needed
cd sim-core
npm run build

# 4. Restart dev server if running
cd ../app-ui
# (Ctrl+C to stop, then npm run dev)
```

> **Note**: All your changes stay local. This setup is perfect for testing and experimenting without affecting the upstream repository.

---

## 🎯 Quick Start Development Session

```powershell
# 1. Navigate to project
cd c:\Users\harri\Downloads\replit-sim-core\replit-sim-core

# 2. Pull latest changes
git pull origin fresh-main

# 3. Start development server
cd app-ui
npm run dev

# 4. Open browser to http://localhost:5173
```

---

## 💡 Tips

- **Hot Reload**: The Vite dev server automatically reloads when you save changes
- **Build Before Testing**: If changing sim-core, rebuild it before testing in app-ui
- **Check Console**: Watch browser console and terminal for errors
- **TypeScript Errors**: Run `npm run typecheck` to catch type issues early

---

## 📦 Package Scripts Reference

### sim-core
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run CLI in development mode  
- `npm run test` - Run simulation tests

### app-ui
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run preview` - Preview production build
- `npm run start` - Serve production build

---

## 🐛 Troubleshooting

### "Module not found" errors
```powershell
# Reinstall dependencies
npm install
```

### TypeScript errors in app-ui after sim-core changes
```powershell
# Rebuild sim-core
cd ../sim-core
npm run build
```

### Port already in use
```powershell
# Vite will automatically try the next available port
# Check the terminal output for the actual URL
```

---

**Ready to develop!** 🎉 Start with `npm run dev` in the app-ui directory.
