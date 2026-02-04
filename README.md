# IgKnight Chess

A full-stack online multiplayer chess platform featuring real-time gameplay, intelligent matchmaking, and modern authentication. The application demonstrates microservices architecture, real-time communication protocols, and secure user management.

## Overview

IgKnight Chess is an online chess application that enables players to compete against each other in real-time. The system handles user authentication, game state management, player matchmaking, and live game synchronization. Built with enterprise-grade technologies, the application showcases best practices in distributed systems, security, and user experience design.

## Core Features

### Game Functionality
- Real-time multiplayer chess with WebSocket-based synchronization
- Server-side chess engine with complete rules validation (castling, en passant, promotion, check/checkmate)
- Multiple time controls: Bullet (1 min), Blitz (3/5 min), Rapid (10/15 min)
- In-game chat system using STOMP messaging protocol
- Complete game history and move logging

### User Management
- JWT-based authentication with 24-hour token expiration
- Google OAuth2 integration for third-party authentication
- User profiles with statistics (wins, losses, draws, ELO rating)
- Session persistence with automatic token management

### Matchmaking System
- ELO-based rating system for skill assessment
- Queue-based matchmaking by rating and time control preference
- Support for both rated and casual games
- Automatic opponent pairing

## System Architecture

The application follows a microservices architecture pattern with six independent services, each handling specific business capabilities:

| Service | Port | Responsibility |
|---------|------|----------------|
| API Gateway | 8083 | Request routing, authentication validation, CORS configuration |
| Auth Service | 8084 | User registration, login, OAuth2 integration, JWT issuance |
| Game Service | 8082 | Chess logic, move validation, game state management |
| User Profile Service | 8085 | User data, statistics, ELO ratings |
| Matchmaking Service | 8086 | Player queue management, opponent matching |
| Realtime Game Service | 8087 | WebSocket server, live game updates, chat |

### Architecture Highlights
- **Backend-Driven Logic**: All chess rules and validations executed server-side
- **Stateless Authentication**: JWT tokens enable horizontal scaling
- **Event-Driven Communication**: WebSocket/STOMP for real-time synchronization
- **Service Independence**: Each microservice can be deployed and scaled independently

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.5.10
- **Gateway**: Spring Cloud Gateway (Reactive WebFlux)
- **Security**: Spring Security with OAuth2 Client
- **Database**: Microsoft SQL Server with JPA/Hibernate
- **Authentication**: JJWT 0.11.5, BCrypt password hashing
- **Real-time**: Spring WebSocket with STOMP protocol
- **Build Tool**: Maven 3.6+

### Frontend
- **Framework**: React 18.3 with TypeScript 5.6
- **Build Tool**: Vite 6.0
- **UI Library**: Radix UI components with Tailwind CSS 3.4
- **HTTP Client**: Axios with automatic JWT injection
- **Real-time**: Native WebSocket API with @stomp/stompjs 7.3
- **Routing**: React Router 6.29

### Infrastructure
- **Java**: Version 21
- **Node.js**: Version 18+
- **Database**: SQL Server 2019+ (3 separate databases for service isolation)

## Project Structure

```
IgKnight Chess/
├── IgKnightBackendMicroservices/
│   ├── api-gateway/              # Spring Cloud Gateway (Port 8083)
│   ├── auth-service/             # Authentication service (Port 8084)
│   ├── game-service/             # Chess engine (Port 8082)
│   ├── user-profile-service/     # User management (Port 8085)
│   ├── matchmaking-service/      # Matchmaking logic (Port 8086)
│   └── realtime-game-service/    # WebSocket server (Port 8087)
│
├── IgKnightFrontend/
│   ├── src/
│   │   ├── app/                  # React components and pages
│   │   ├── services/             # API clients and WebSocket handlers
│   │   ├── types/                # TypeScript type definitions
│   │   └── config/               # Environment configuration
│   └── public/                   # Static assets
│
└── Documentation/
    ├── API_CONTRACT_SPECIFICATION.md
    ├── BACKEND_DRIVEN_ARCHITECTURE_IMPLEMENTATION.md
    └── FINAL_PRE_PRODUCTION_AUDIT_REPORT.md
```

## Setup Instructions

### Prerequisites
- Java 21
- Node.js 18+
- Maven 3.6+ (or use included Maven wrapper)
- SQL Server 2019+
- Git

### Database Configuration

Create three databases in SQL Server:
```sql
CREATE DATABASE IgKnightauthservicedb;
CREATE DATABASE IgKnightgameservicedb;
CREATE DATABASE IgKnightuserservicedb;
```

### Environment Configuration

Create a `.env` file in `IgKnightBackendMicroservices/` directory:

```properties
# Database Configuration
DB_URL=jdbc:sqlserver://localhost:1433;encrypt=true;trustServerCertificate=true
DB_USERNAME=your_sql_server_username
DB_PASSWORD=your_sql_server_password

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRATION=86400000

# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Google OAuth2 Setup:**
1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add redirect URI: `http://localhost:8083/api/auth/login/oauth2/code/google`
3. Update `.env` with client ID and secret

### Running the Application

**Backend Services** (start each in a separate terminal):
```bash
cd IgKnightBackendMicroservices

cd api-gateway && mvn spring-boot:run
cd auth-service && mvn spring-boot:run
cd game-service && mvn spring-boot:run
cd user-profile-service && mvn spring-boot:run
cd matchmaking-service && mvn spring-boot:run
cd realtime-game-service && mvn spring-boot:run
```

**Frontend**:
```bash
cd IgKnightFrontend
npm install
npm run dev
```

Access the application at `http://localhost:5173`

## API Overview

### Authentication Endpoints

**Sign Up**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "password123"
}
```

**Sign In**
```http
POST /api/auth/signin
Content-Type: application/json

{
  "username": "player1",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "userId": 1,
  "username": "player1"
}
```

**Google OAuth**
```http
GET /api/auth/oauth2/authorization/google
```

### Game Endpoints

**Create Game**
```http
POST /api/chess/games/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "timeControl": "BLITZ_5",
  "isRated": true
}
```

**Get Legal Moves**
```http
GET /api/chess/games/{gameId}/legal-moves/{square}
Authorization: Bearer {token}
```

**Make Move**
```http
POST /api/chess/games/{gameId}/moves
Authorization: Bearer {token}
Content-Type: application/json

{
  "from": "e2",
  "to": "e4"
}
```

### Matchmaking Endpoints

**Join Queue**
```http
POST /matchmaking/queue/join
Authorization: Bearer {token}
Content-Type: application/json

{
  "timeControl": "BLITZ_5",
  "isRated": true
}
```

### WebSocket Communication

**Connection**: `ws://localhost:8087/ws`

**Subscribe to game updates**: `/topic/game/{gameId}`

**Subscribe to chat**: `/topic/game/{gameId}/chat`

**Send chat message**: `/app/chat.send/{gameId}`

## Security Implementation

- **Authentication**: JWT tokens with 24-hour expiration, BCrypt password hashing
- **Authorization**: API Gateway validates all requests, injects user context headers
- **OAuth2**: Google authentication via Spring Security OAuth2 Client
- **CORS**: Configured for cross-origin requests
- **Data Protection**: Parameterized queries via JPA to prevent SQL injection
- **Secret Management**: Environment variables for sensitive configuration

## Key Technical Decisions

### Backend-Driven Chess Engine
All chess logic resides in the backend Game Service. The frontend only displays game state and sends move requests. This approach:
- Prevents client-side manipulation and cheating
- Ensures consistent rule enforcement
- Simplifies frontend complexity
- Centralizes business logic for easier maintenance

### Microservices Architecture
Each service handles a specific domain with clear boundaries:
- Enables independent development and deployment
- Allows technology-specific optimizations (reactive gateway, traditional services)
- Facilitates horizontal scaling based on service load
- Isolates failures to specific components

### Real-time Communication
WebSocket with STOMP protocol for game synchronization:
- Bidirectional communication for instant updates
- Message routing via topic subscriptions
- Lower latency than HTTP polling
- Efficient resource usage


## Development Team

**Tejdeep Gurramkonda**
- GitHub: [@tejdeepgurramkonda](https://github.com/tejdeepgurramkonda)
- Project Repository: [IgKnight Chess](https://github.com/tejdeepgurramkonda/IgKnight-Chess)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
