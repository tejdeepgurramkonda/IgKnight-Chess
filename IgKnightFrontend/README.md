# IgKnight - Frontend UI Template

## ⚠️ IMPORTANT: This is a Pure Frontend Demo

This application is a **static UI template** with **zero backend dependencies**. It serves as a visual demonstration and frontend contract for a chess platform interface.

### What This Is

- ✅ A complete, responsive frontend UI shell
- ✅ Fully functional client-side chess board (using chess.js)
- ✅ Mock data for all features (users, games, leaderboards, etc.)
- ✅ Presentational components ready for API integration
- ✅ Dark blue theme with modern design
- ✅ Downloadable and runnable without any backend

### What This Is NOT

- ❌ NO real authentication or user accounts
- ❌ NO actual matchmaking or multiplayer
- ❌ NO persistent data storage
- ❌ NO backend services or APIs
- ❌ NO real leaderboards or rankings
- ❌ NO friends system or social features

## Features Overview

### ✨ Fully Implemented (UI Only)

All features below work visually but use **mock/static data**:

1. **Dashboard**
   - Player stats (hardcoded numbers)
   - Recent games list (static data)
   - Quick play modes (UI buttons only)

2. **Find Game / Lobby**
   - Time control selection (UI only)
   - Open challenges list (fake players)
   - "Find Game" simulates navigation
   - No actual matchmaking occurs

3. **Game Page**
   - Functional chess board (chess.js library)
   - Move validation (client-side only)
   - Timer simulation (visual countdown)
   - Move history tracking
   - **Note**: Supports local 2-player hotseat, not online play

4. **Leaderboard**
   - Top players ranking (static list)
   - Country rankings (mock data)
   - Clearly marked as demo data

5. **Game History**
   - Past games table (hardcoded records)
   - Filterable by result
   - Searchable by opponent name
   - All data is static

6. **Profile**
   - User information display
   - Achievements system (static)
   - Opening statistics (mock)
   - Editable in UI only (no persistence)

7. **Settings**
   - Visual preference toggles
   - Settings stored in component state
   - Changes reset on page refresh
   - No backend persistence

## Architecture

### Technology Stack

- **React 18** - UI framework
- **React Router** - Client-side routing
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **chess.js** - Chess game logic (client-side)
- **Lucide Icons** - Icon library
- **Radix UI** - Headless UI components

### Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (buttons, cards, etc.)
│   │   ├── ChessBoard.tsx  # Interactive chess board
│   │   ├── Layout.tsx      # Main app shell with navigation
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx
│   │   ├── LobbyPage.tsx
│   │   ├── GamePage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   └── SettingsPage.tsx
│   ├── data/
│   │   └── mockData.ts     # Centralized mock data
│   └── App.tsx             # Main app entry
└── styles/                  # Global styles
```

### Mock Data

All mock data is centralized in `/src/app/data/mockData.ts`:

- `MOCK_CURRENT_USER` - Current user profile
- `MOCK_USER_STATS` - Dashboard statistics
- `MOCK_RECENT_GAMES` - Recent games list
- `MOCK_TIME_CONTROLS` - Available time controls
- `MOCK_OPEN_CHALLENGES` - Open game challenges
- `MOCK_ONLINE_FRIENDS` - Friends list
- `MOCK_GAME_HISTORY` - Past game records
- `MOCK_GLOBAL_LEADERS` - Leaderboard rankings
- `MOCK_TOP_COUNTRIES` - Country rankings
- `MOCK_ACHIEVEMENTS` - User achievements
- `MOCK_OPENINGS` - Opening statistics

## Installation & Usage

### Prerequisites

- Node.js 18+ installed
- pnpm, npm, or yarn package manager

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

The app will run on `http://localhost:5173` (or your configured port).

### Deployment

This is a **static site** that can be deployed anywhere:

- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

No server-side rendering or backend is required.

## Design Theme

- **Primary Color**: Blue (#3B82F6, #60A5FA)
- **Background**: Dark Slate (#0F172A, #1E293B)
- **Accent**: Various blues for highlights
- **Typography**: System fonts, bold headings
- **No Gradients**: Per design requirements

## Component Patterns

All components are designed as **presentational components** that:

1. Accept props for data (currently using mock data)
2. Handle local UI state only
3. Have no backend logic or API calls
4. Are ready for future API integration

### Example Integration Pattern

When adding a backend, you would:

```tsx
// Current (mock data)
import { MOCK_USER_STATS } from '@/app/data/mockData';
const stats = MOCK_USER_STATS;

// Future (with API)
const { data: stats } = useQuery('userStats', fetchUserStats);
```

## Development Notes

### Chess Game Logic

The chess board uses the `chess.js` library which provides:
- Full chess rule validation
- Move generation
- Game state management
- PGN/FEN support

This runs entirely in the browser - no chess engine or backend required.

### Routing

Uses React Router for client-side navigation. All routes are defined in `/src/app/App.tsx`.

### Responsive Design

- Mobile-first approach
- Breakpoints: `sm`, `md`, `lg`, `xl`
- Collapsible sidebar on mobile
- Responsive grid layouts

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This is a demo/template project. Modify and use as needed.

## Future Backend Integration

To convert this into a real application, you would need:

1. **Authentication System**
   - User registration/login
   - JWT or session management
   - Protected routes

2. **Game Matching Service**
   - WebSocket server for real-time play
   - Matchmaking algorithm
   - ELO rating calculation

3. **Database**
   - User profiles
   - Game history
   - Leaderboards
   - Settings persistence

4. **Real-time Communication**
   - WebSocket or Socket.io
   - Game state synchronization
   - Move validation on server

5. **Additional Services**
   - Chess engine for computer opponents
   - Game analysis
   - Tournament management

## Support

This is a static demo. For issues or questions about the UI template, please refer to the codebase documentation.

---

**Remember**: This is a frontend-only demo. All data is mock/placeholder. No real services are implemented.
