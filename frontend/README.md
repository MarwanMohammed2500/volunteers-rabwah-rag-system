# مساعد إدارة التطوع الذكي

A professional Arabic RAG chatbot web interface designed for Rawa Charitable Society volunteer management.

## Features ✨

- **🎨 Custom Arabic Design** - Matches volunteers.rabwah.sa styling
- **🤖 RAG Integration** - Ready for your FastAPI backend  
- **💬 Real-time Chat** - Smooth messaging experience
- **📱 Responsive** - Works on desktop and mobile
- **🎯 Color Accurate** - User (#1CBAB5), Bot (#F69059), Send button (#1CBAB5)
- **🔄 RTL Support** - Full Arabic language support

## Quick Start 🚀

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:5000
```

## RAG Backend Integration 🔌

Your FastAPI backend should run on port 8080 with this endpoint:

```
POST /api/chat/{session_id}/message
```

**Request format:**
```json
{
  "content": "User message in Arabic",
  "chat_history": [
    {"human": "Previous message"},
    {"ai": "Bot response"}
  ]
}
```

**Response format:**
```json
{
  "response": "Bot response in Arabic",
  "source_documents": [],
  "session_id": "session-uuid"
}
```

## Project Structure 📁

```
├── client/          # React TypeScript frontend
├── server/          # Express.js backend with RAG integration
├── shared/          # Shared TypeScript schemas
└── docs/           # Documentation and guides
```

## Key Integration Point 🎯

Edit `server/routes.ts` in the `getRagChatbotResponse` function to connect your RAG system.

## Technologies Used 🛠️

- **Frontend:** React 18, TypeScript, TanStack Query, Tailwind CSS
- **Backend:** Express.js, TypeScript, In-memory storage
- **UI Components:** shadcn/ui with Radix UI primitives
- **Fonts:** Noto Sans Arabic
- **Build Tool:** Vite

## Documentation 📚

- `DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `server/rag-integration-examples.md` - RAG integration examples
- `replit.md` - Technical architecture details

## Ready for Production ✅

This application includes:
- Professional Arabic interface
- Error handling and fallbacks  
- Session management
- Message persistence
- Loading states
- Responsive design
- Type-safe APIs

Start your FastAPI server on port 8080 and you're ready to go!