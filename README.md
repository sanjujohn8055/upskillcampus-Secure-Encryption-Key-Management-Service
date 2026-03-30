# Secure Encryption & Key Management Service

A production-ready REST API with web UI providing encryption, decryption, and key management capabilities for web applications and fintech products.

## Features

### Cryptography
- **Symmetric Encryption**: AES-256-GCM and ChaCha20-Poly1305
- **Asymmetric Encryption**: RSA-2048/4096 and X25519
- **Key Derivation**: Argon2id and PBKDF2-HMAC-SHA256
- **Authenticated Encryption**: All symmetric algorithms include authentication tags
- **Secure Random Generation**: OS CSPRNG for all random operations

### Key Management
- **Key Lifecycle**: Create, rotate, disable, revoke keys
- **Master Key Management**: Secure storage with OS keyring support
- **Key Encryption at Rest**: All keys encrypted with master key
- **Key Rotation**: Atomic re-encryption with rollback support
- **Key Backup & Recovery**: Encrypted backup and restore functionality

### Authentication & Authorization
- **User Management**: Registration, login, logout
- **Session Management**: Redis-backed sessions with 24-hour TTL
- **JWT Authentication**: Stateless API authentication
- **Multi-Factor Authentication**: TOTP-based MFA with backup codes
- **Role-Based Access Control**: User and Admin roles
- **Account Lockout**: Brute force protection with 30-minute lockout

### Security Controls
- **Rate Limiting**: Token bucket algorithm per IP and user
- **HTTPS Enforcement**: TLS 1.2+ with strong cipher suites
- **Input Validation**: JSON schema validation for all endpoints
- **IDOR Prevention**: Ownership verification on all resources
- **Secure Logging**: Log redaction for sensitive data

### Audit Logging
- **Comprehensive Logging**: All security-relevant events logged
- **Cryptographic Signatures**: HMAC-SHA256 signatures on all logs
- **Log Integrity**: Verification of log entry signatures
- **Log Retention**: 90-day retention policy with cleanup
- **Queryable Logs**: Filter by event type, user, date range

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Applications                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Load Balancer / API Gateway                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Express.js API Server                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Authentication │ Key Management │ Cryptography  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼──┐    ┌───▼────┐  ┌───▼────┐
   │  PostgreSQL │    │  Redis  │  │ OS Keyring │
   └─────────────┘    └─────────┘  └────────────┘
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration (database, Redis, env)
│   ├── services/
│   │   ├── crypto/       # Cryptographic operations
│   │   ├── auth/         # Authentication & authorization
│   │   ├── key-management/  # Key lifecycle management
│   │   └── audit/        # Audit logging
│   ├── migrations/       # Database migrations
│   ├── utils/            # Utilities (logging, etc.)
│   ├── app.ts            # Express application
│   └── server.ts         # Server entry point
├── package.json
├── tsconfig.json
└── knexfile.ts

frontend/
├── src/
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tsconfig.json
```

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- npm or yarn

### Setup

1. **Clone repository**
```bash
git clone <repository>
cd secure-encryption-service
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure environment**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
cd backend
npm run migrate
```

5. **Start services**
```bash
# Backend (development)
npm run dev

# Frontend (development)
cd ../frontend
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/mfa/enable` - Enable MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA code

### Key Management
- `POST /api/v1/keys` - Create key
- `GET /api/v1/keys` - List keys
- `GET /api/v1/keys/:keyId` - Get key details
- `POST /api/v1/keys/:keyId/rotate` - Rotate key
- `PUT /api/v1/keys/:keyId/disable` - Disable key
- `PUT /api/v1/keys/:keyId/revoke` - Revoke key

### Cryptographic Operations
- `POST /api/v1/encrypt` - Encrypt data
- `POST /api/v1/decrypt` - Decrypt data
- `POST /api/v1/encrypt/asymmetric` - Asymmetric encryption
- `POST /api/v1/decrypt/asymmetric` - Asymmetric decryption

### Audit Logging
- `GET /api/v1/audit/logs` - Query audit logs
- `GET /api/v1/audit/logs/:logId` - Get audit log entry

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics

## Security Features

### Encryption
- All keys encrypted at rest with master key
- Authenticated encryption (AES-GCM, ChaCha20-Poly1305)
- Unique nonce for each encryption operation
- Constant-time comparison for authentication tags

### Authentication
- Argon2id password hashing (64MB memory, 3 iterations)
- TOTP-based multi-factor authentication
- Secure session management with Redis
- JWT tokens with 24-hour expiration

### Authorization
- Role-based access control (User/Admin)
- Ownership verification on all resources
- IDOR prevention with UUID identifiers
- Admin-only operations for sensitive functions

### Rate Limiting
- 5 authentication attempts per IP per 15 minutes
- 100 API requests per user per minute
- 30-minute account lockout after 5 failed attempts
- Automatic email notification on lockout

### Audit Logging
- All security events logged with signatures
- 90-day retention policy
- Queryable logs with filtering
- Tamper-evident log entries

## Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_encryption_service
DB_USER=postgres
DB_PASSWORD=password
DB_POOL_MAX=20
DB_POOL_MIN=5

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
MASTER_KEY_ENV=your_master_key_here

# Rate Limiting
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW=900
RATE_LIMIT_API_MAX=100
RATE_LIMIT_API_WINDOW=60

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Development

### Running Tests
```bash
cd backend
npm run test
npm run test:coverage
```

### Building
```bash
cd backend
npm run build

cd ../frontend
npm run build
```

### Linting
```bash
cd backend
npm run lint
npm run lint:fix
```

## Deployment

### Docker
```bash
# Build images
docker build -t encryption-service-backend ./backend
docker build -t encryption-service-frontend ./frontend

# Run with docker-compose
docker-compose up
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## Security Considerations

1. **Master Key**: Store in OS keyring or secure key management system
2. **TLS Certificates**: Use valid certificates in production
3. **Database**: Enable SSL connections and use strong passwords
4. **Redis**: Use password authentication and disable public access
5. **Secrets**: Never commit secrets to version control
6. **Backups**: Encrypt backups and store securely
7. **Monitoring**: Monitor for suspicious activity and failed operations

## Performance

- Symmetric encryption: ~1ms per MB
- Asymmetric encryption: ~10ms per operation
- Key derivation: ~100ms (Argon2id with default params)
- Database queries: <10ms with proper indexing
- Rate limiting: <1ms per request

## Compliance

- OWASP Top 10 security controls
- NIST cryptographic standards
- GDPR-compliant audit logging
- SOC 2 security practices

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
