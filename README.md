# 📦 OrderPilot AI — Frontend

**Modern React + TypeScript Enterprise SPA** | Real-time Order Management System | AI-Powered Invoice Processing

![React 19](https://img.shields.io/badge/React-19-blue) ![TypeScript 6](https://img.shields.io/badge/TypeScript-6-blue) ![Vite 8](https://img.shields.io/badge/Vite-8-purple) ![Status](https://img.shields.io/badge/Status-Production%20Ready-green)

---

## 🎯 What Is OrderPilot AI?

**OrderPilot AI** is an enterprise-grade **AI-powered Order Management System** that automates the entire purchase order (PO) lifecycle:

1. **📧 Email Inbox** — Automatically ingest purchase orders from customer mailboxes (IMAP)
2. **🤖 AI Extraction** — Parse PDF/image attachments using Groq's Vision & Text LLMs
3. **✅ Smart Validation** — Cross-check extracted data against inventory & customers
4. **📋 Order Management** — Manage orders through manufacturing, invoicing, and dispatch
5. **📊 Real-time Dashboard** — Track inventory, billing, reports, and order status
6. **🚀 Async Processing** — Background job queues for reliable, scalable extraction

---

## 🆕 Recent Features & Fixes (July 2026)

### ✨ Email Re-Parse Feature
- **New Refresh Button**: Directly in the Email Detail page — re-parse already-extracted emails without resending
- **Smart Polling**: Frontend intelligently waits for async extraction completion (1-second intervals)
- **Error Handling**: Clear error messages when re-parse fails, with user-friendly error banner
- **Two Entry Points**: 
  - ♻️ **Attachments Section** — Reparse button visible after extraction completes
  - 🔄 **AI Summary Header** — Circular refresh button with rotating animation

### 🎯 Advanced PDF Parsing
- **Scanned PDF Detection**: Automatically detects image-based PDFs (scanned documents)
- **Vision API Fallback**: When text extraction fails, routes to Groq Vision API for OCR
- **Confidence Scoring**: Reports extraction confidence (high/medium/low)
- **Page Counting**: Tracks PDF page count for diagnostics

### 🐛 Bug Fixes
- **FIXED**: Backend now allows re-parsing emails in `PROCESSED` status (was rejecting them)
- **FIXED**: Error responses now visible to users (was silently swallowing API errors)
- **FIXED**: Polling now properly triggered after extraction request
- **NEW**: Debug logging with `[DEBUG]` prefix for troubleshooting extraction pipeline

---

## 🏗️ Technology Stack

### Frontend Architecture
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React + TypeScript | 19.x / 6.x | UI & type safety |
| **Build Tool** | Vite | 8.x | Fast development & production builds |
| **State Management** | Zustand | 5.x | Auth state, session storage |
| **Data Fetching** | React Query | 5.x | API caching, mutations, polling |
| **Animations** | Framer Motion | 12.x | Smooth transitions & micro-interactions |
| **Icons** | Lucide React | 1.x | Unified icon system |
| **Styling** | CSS Variables | Custom | Dark-mode enterprise theme |

### Key Dependencies
```json
{
  "react": "19.x",
  "react-dom": "19.x",
  "@tanstack/react-query": "5.x",
  "zustand": "5.x",
  "framer-motion": "12.x",
  "lucide-react": "1.x",
  "vite": "8.x"
}
```

---

## 📋 Main Features

### 1️⃣ Dashboard
- Real-time order statistics
- Key metrics: pending orders, revenue, inventory status
- Quick action cards

### 2️⃣ AI Inbox
- Display incoming emails from configured mailboxes
- Show extracted products with confidence scores
- Manually approve/reject AI extractions
- **NEW**: Re-parse button for re-extracting failed emails

### 3️⃣ Orders Management
- View all orders with filtering by status
- Track order lifecycle (PENDING → MANUFACTURING → INVOICED → DISPATCHED → DELIVERED)
- Manage individual order details
- Interactive order timeline

### 4️⃣ Email Details
- Full email body display with attachments
- **NEW**: View extraction results with re-parse capability
- Two refresh buttons for convenience
- Error messages displayed prominently
- Real-time polling feedback

### 5️⃣ Inventory Dashboard
- Stock levels for all products
- Health indicators (HEALTHY, LOW, CRITICAL)
- Reserve quantities tracking
- Quick stock adjustments

### 6️⃣ Billing
- Invoice history and status
- Payment tracking
- Tax calculations
- PDF invoice download

### 7️⃣ Dispatch & Logistics
- Shipment tracking
- Waybill (AWB) numbers
- Delivery status updates

### 8️⃣ Reports
- Order analytics
- Revenue tracking
- Performance metrics

### 9️⃣ User Management
- Role-based access (ADMIN, OPERATOR, VIEWER)
- Profile management
- Session management

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20 LTS
- npm or yarn package manager
- Backend API running on `http://localhost:3000`

### Installation

```bash
# 1. Navigate to frontend directory
cd OrderPilotAI

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your backend URL and settings

# 4. Start development server
npm run dev
```

### Available Scripts

```bash
# Development server (hot reload on http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📱 Using the New Re-Parse Feature

### When Would You Use This?

✅ **PDF didn't extract correctly** — Click refresh to try again  
✅ **Scanned PDF (image-based)** — Re-parse triggers Vision API  
✅ **Network blip caused failure** — Re-parse without resending email  
✅ **Testing extraction logic** — Quick iteration without re-mailing  

### Step-by-Step Guide

1. **Open Email Detail Page**
   - Click on any email in the AI Inbox

2. **Look for Refresh Buttons** (Two Locations)
   - **Option A**: In the Attachments section → "Reparse" button (appears after extraction)
   - **Option B**: In the AI Summary header → Circular refresh icon (♻️)

3. **Click Refresh**
   - Button disables to prevent double-clicks
   - Rotating animation shows processing

4. **Watch Polling Progress**
   - Console shows `[DEBUG] Poll #1: status = QUEUED`
   - Extraction processes in the background

5. **See Results**
   - Products populate when extraction completes
   - Error banner displays if something fails
   - Extracted data refreshes automatically

### Example Console Output
```
[DEBUG] Triggering extraction for email abc123...
[DEBUG] Poll #1: status = QUEUED
[DEBUG] Poll #2: status = PROCESSING
[DEBUG] Poll #3: status = PROCESSING
[DEBUG] Poll #4: status = COMPLETED
✅ Extraction complete! Products loaded.
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# Feature flags (optional)
VITE_DEBUG_MODE=true
```

### Build Configuration
- **Vite Config**: `vite.config.ts`
- **TypeScript Config**: `tsconfig.json`
- **Oxlint Config**: `.oxlintrc.json`

---

## 📂 Project Structure

```
OrderPilotAI/
├── src/
│   ├── components/          # Reusable React components
│   │   └── layout/         # Layout components
│   ├── pages/              # Page components (Email, Orders, Dashboard, etc.)
│   ├── store/              # Zustand state stores
│   ├── lib/                # Utility functions (API client, helpers)
│   ├── data/               # Mock data for development
│   ├── styles/             # Global CSS & theme variables
│   ├── assets/             # Images, fonts, static files
│   ├── App.tsx             # Root app component
│   └── main.tsx            # Entry point
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── README.md               # This file
```

---

## 🔌 API Integration

The frontend communicates with the backend REST API:

### Key Endpoints Used
- `GET /emails` — List all emails
- `GET /emails/:id` — Get email details
- `POST /emails/:id/process` — **Trigger extraction (NEW re-parse support)**
- `GET /emails/:id/extraction-job` — Check extraction status (used for polling)
- `GET /orders` — List orders
- `POST /orders` — Create order
- And many more...

### Polling Mechanism
```typescript
// Frontend polls every 1 second until extraction completes
setInterval(async () => {
  const result = await refetchEmail();
  if (status === 'COMPLETED' || status === 'FAILED') {
    clearInterval(interval); // Stop polling
  }
}, 1000);
```

---

## 🎨 Design System

### Color Palette (CSS Variables)
- `--purple-400` — Primary brand color
- `--purple-dim` — Subdued purple
- `--background-secondary` — Card backgrounds
- `--text-primary` — Main text color
- `--text-muted` — Secondary text

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Flex/grid layouts for responsiveness

---

## 🧪 Testing & Debugging

### Debug Mode
Set `VITE_DEBUG_MODE=true` in `.env` for verbose logging:
```
[DEBUG] API call: GET /emails
[DEBUG] Response: 200 OK
[DEBUG] Triggering extraction...
```

### Console Logs
Look for `[DEBUG]` prefix in browser console for:
- API requests/responses
- Extraction status polling
- Error conditions

### Network Tab
In DevTools, watch:
- `POST /emails/:id/process` — Re-parse request
- `GET /emails/:id` — Polling status checks

---

## 🐛 Known Issues & Workarounds

| Issue | Status | Workaround |
|-------|--------|-----------|
| Large PDF files take long to extract | Expected | Use Vision API (auto-fallback on scanned PDFs) |
| IMAP polling every 60s | By design | Check email manually for immediate inbox sync |

---

## 🔐 Security

- ✅ JWT authentication with refresh tokens
- ✅ XSS protection via React's built-in escaping
- ✅ No sensitive data in localStorage (JWT only)
- ✅ CORS configured on backend
- ✅ No API keys exposed in frontend code

---

## 📊 Performance

- **Dev Server Startup**: < 2 seconds (Vite)
- **Build Time**: < 30 seconds
- **Bundle Size**: ~250KB gzipped
- **API Response Time**: < 500ms (typical)
- **Extraction Polling**: 1-second intervals, auto-stops on completion

---

## 🤝 Contributing

### Local Development Workflow

```bash
# 1. Start backend (separate terminal)
cd ../backend
npm run dev

# 2. Start frontend (this directory)
npm run dev

# 3. Make changes to src/
# 4. Hot reload happens automatically
# 5. Run type check before committing
npm run type-check
```

### Before Pushing

```bash
npm run build     # Verify build succeeds
npm run type-check # Ensure no type errors
```

---

## 📞 Support & Troubleshooting

### Re-Parse Button Not Working?
1. Check browser console for `[DEBUG]` logs
2. Verify backend is running and accessible
3. Check extraction job status: `GET /emails/:id/extraction-job`
4. Look for error banner at top of page

### Extraction Shows "0 Items"?
1. Email may have scanned PDF (image-based) — re-parse to trigger Vision API
2. Check extraction job in backend logs
3. Verify Groq API key is configured on backend

### Polling Stuck?
1. Check if extraction job is actually running: `GET /emails/:id/extraction-job`
2. Verify WebSocket/polling isn't blocked by network
3. Check browser Network tab for 500 errors

---

## 📝 Changelog

### v2.1.0 (July 2026) — Email Re-Parse & PDF Enhancement
- ✨ Added email re-parse refresh buttons with polling
- ✨ Added scanned PDF detection & Vision API fallback
- 🐛 Fixed backend status check to allow PROCESSED emails re-parsing
- 🐛 Added comprehensive error handling & error banners
- 📝 Added debug logging with [DEBUG] prefix
- 📝 New documentation: PDF enhancement guide, re-parse feature guide

### v2.0.0 — Email Inbox & AI Extraction
- Automatic email ingestion via IMAP
- AI-powered PDF parsing with Groq LLMs
- Validation engine for SKU/price matching

### v1.0.0 — Initial Release
- Order management dashboard
- Inventory tracking
- Invoice generation & dispatch

---

## 📄 License

Proprietary — Eaton OrderPilot AI System

---

## 👨‍💻 Development Team

**Latest Update**: July 25, 2026  
**Commit**: `a9c2e36` on GitHub  
**Repository**: [janhavinaidu/Automated-Order-Entry](https://github.com/janhavinaidu/Automated-Order-Entry)

---

## 📖 Additional Documentation

- [PDF Enhancement Guide](../PDF_ENHANCEMENT_GUIDE.md) — How PDF parsing works & Vision API fallback
- [Re-Parse Feature Guide](../EMAIL_REPARSE_FEATURE.md) — Detailed re-parse implementation
- [PDF Parsing Analysis](../PDF_PARSING_ANALYSIS.md) — Root cause analysis of PDF issues
- [System Architecture](../description.md) — Full technical details & database schema

---

**Start building amazing things with OrderPilot AI! 🚀**
