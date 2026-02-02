# IgKnight Chess - Full-Stack Chess Application

A modern, full-stack multiplayer chess application with real-time gameplay, matchmaking, chat, and OAuth2 authentication.

## 🎯 Features

- **Real-time Multiplayer Chess** - Play chess with opponents in real-time using WebSocket
- **Smart Matchmaking** - ELO-based matchmaking system
- **Live Chat** - In-game chat using STOMP protocol
- **OAuth2 Authentication** - Google OAuth2 login support
- **User Profiles** - Track your stats, ELO rating, and game history
- **Move Validation** - Complete chess rules validation including castling, en passant, and check/checkmate
- **Responsive UI** - Modern React-based frontend with TypeScript

## 🏗️ Architecture

### Backend - Microservices Architecture
- **API Gateway** (Port 8083) - Entry point for all requests
- **Auth Service** (Port 8084) - JWT & OAuth2 authentication
- **Game Service** (Port 8082) - Chess game logic and move validation
- **User Profile Service** (Port 8085) - User data and statistics
- **Matchmaking Service** (Port 8086) - ELO-based matchmaking
- **Realtime Game Service** (Port 8087) - WebSocket for real-time gameplay

### Frontend
- **React + TypeScript + Vite** (Port 5173)
- Modern UI with Tailwind CSS
- Real-time updates via WebSocket/STOMP

## 📋 Prerequisites

- **Java** 17 or higher
- **Node.js** 18 or higher
- **Maven** 3.6+
- **SQL Server** (local or remote)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tejdeepgurramkonda/IgKnight-Chess.git
cd IgKnight-Chess
```

### 2. Database Setup

Create the following databases in SQL Server:
- `IgKnightauthservicedb`
- `IgKnightgameservicedb`
- `IgKnightuserservicedb`

### 3. Backend Configuration

#### Set Environment Variables

Create a `.env` file in `IgKnightBackendMicroservices/` directory (use `.env.example` as template):

```properties
# Database Configuration
DB_URL=jdbc:sqlserver://localhost:1433;databaseName=YOUR_DATABASE_NAME;encrypt=true;trustServerCertificate=true
DB_USERNAME=your_database_username
DB_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_minimum_256_bits
JWT_EXPIRATION=86400000

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Configure Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:8083/api/auth/login/oauth2/code/google`
4. Update `.env` with your credentials

#### Start Backend Services

```bash
cd IgKnightBackendMicroservices

# Start each service in separate terminals:
cd api-gateway && mvn spring-boot:run
cd auth-service && mvn spring-boot:run
cd game-service && mvn spring-boot:run
cd user-profile-service && mvn spring-boot:run
cd matchmaking-service && mvn spring-boot:run
cd realtime-game-service && mvn spring-boot:run
```

### 4. Frontend Setup

```bash
cd IgKnightFrontend
npm install
npm run dev
```

Access the application at: **http://localhost:5173**

## 📡 API Endpoints

### Authentication Service (via API Gateway: http://localhost:8083)

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "token": "string",
  "userId": "number",
  "username": "string"
}
```

#### Google OAuth2 Login
```http
GET /api/auth/oauth2/authorization/google
```

### User Profile Service

#### Get User Profile
```http
GET /api/users/{userId}
Authorization: Bearer {token}

Response:
{
  "userId": "number",
  "username": "string",
  "email": "string",
  "eloRating": "number",
  "wins": "number",
  "losses": "number",
  "draws": "number"
}
```

#### Update User Profile
```http
PUT /api/users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "string"
}
```

### Game Service

#### Create New Game
```http
POST /api/games
Authorization: Bearer {token}
Content-Type: application/json

{
  "whitePlayerId": "number",
  "blackPlayerId": "number"
}
```

#### Get Game by ID
```http
GET /api/games/{gameId}
Authorization: Bearer {token}
```

#### Make a Move
```http
POST /api/games/{gameId}/move
Authorization: Bearer {token}
Content-Type: application/json

{
  "playerId": "number",
  "fromSquare": "string",  // e.g., "e2"
  "toSquare": "string",     // e.g., "e4"
  "promotionPiece": "string" // optional, e.g., "QUEEN"
}
```

#### Get Game History
```http
GET /api/games/user/{userId}/history
Authorization: Bearer {token}
```

### Matchmaking Service

#### Join Matchmaking Queue
```http
POST /api/matchmaking/join
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "number"
}
```

#### Leave Queue
```http
POST /api/matchmaking/leave
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "number"
}
```

### Real-time Game Service

#### WebSocket Connection
```
ws://localhost:8087/ws
```

#### Subscribe to Game Updates
```
STOMP Subscribe: /topic/game/{gameId}
```

#### Subscribe to Chat
```
STOMP Subscribe: /topic/game/{gameId}/chat
```

#### Send Chat Message
```
STOMP Send: /app/chat.send/{gameId}
Body: {
  "senderId": "number",
  "senderName": "string",
  "content": "string"
}
```

## 🎮 How to Use the App

1. **Sign Up/Login**
   - Create account or use Google OAuth2
   - Receive JWT token for authentication

2. **Find a Match**
   - Click "Find Match" to join matchmaking queue
   - Get matched with opponent based on ELO rating

3. **Play Chess**
   - Drag and drop pieces to make moves
   - All chess rules are validated server-side
   - Real-time board updates via WebSocket

4. **Chat with Opponent**
   - Use in-game chat during matches
   - Messages are delivered in real-time

5. **View Stats**
   - Check your profile for wins/losses/draws
   - Track your ELO rating progression

## 🔐 Security Features

- JWT-based authentication
- Password encryption with BCrypt
- OAuth2 integration with Google
- CORS protection
- Environment-based sensitive data management
- SQL injection prevention via JPA

## 🛠️ Technology Stack

### Backend
- Spring Boot 3.x
- Spring Cloud Gateway
- Spring Security + OAuth2
- Spring Data JPA
- WebSocket/STOMP
- SQL Server
- JWT (JJWT)

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- STOMP.js
- Chess.js

## 📝 Development Notes

- Backend services use reactive programming where applicable
- All services are independently scalable
- Database migrations handled by JPA/Hibernate
- Frontend uses modern React hooks and context API

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Tejdeep Gurramkonda**
- GitHub: [@tejdeepgurramkonda](https://github.com/tejdeepgurramkonda)

## 🙏 Acknowledgments

- Chess.js for chess logic
- Spring Framework team
- React community
