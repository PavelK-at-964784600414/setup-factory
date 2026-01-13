# User Parameters Feature

## Overview

The User Parameters feature allows users to store reusable configuration values (usernames, IPs, endpoints, credentials, etc.) in their profile. These parameters can be automatically used when running scripts, eliminating the need to re-enter common values every time.

## Features

- **Centralized Storage**: Store all your commonly used values in one place
- **Auto-Fill**: Automatically fills script parameters based on matching user parameters
- **Categories**: Organize parameters by category (credentials, network, endpoints, general, other)
- **Export**: Export all parameters as JSON for backup or sharing
- **Description Support**: Add descriptions to remember what each parameter is for
- **CRUD Operations**: Full Create, Read, Update, Delete support

## Database Schema

### UserParameter Model

```prisma
model UserParameter {
  id          String   @id @default(uuid())
  user_id     String
  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  key         String   // e.g., "default_host", "default_user", "api_endpoint"
  value       String   // The actual value
  description String?  // Optional description
  category    String?  // Optional category
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@unique([user_id, key])
  @@index([user_id])
}
```

## API Endpoints

### GET /api/user-parameters
Get all parameters for the current user.

**Response:**
```json
[
  {
    "id": "uuid",
    "key": "default_host",
    "value": "server.example.com",
    "description": "Primary production server",
    "category": "network",
    "created_at": "2026-01-11T...",
    "updated_at": "2026-01-11T..."
  }
]
```

### GET /api/user-parameters/:key
Get a specific parameter by key.

### POST /api/user-parameters
Create or update a parameter.

**Body:**
```json
{
  "key": "default_host",
  "value": "server.example.com",
  "description": "Primary production server",
  "category": "network"
}
```

### PUT /api/user-parameters/:key
Update an existing parameter.

**Body:**
```json
{
  "value": "new-server.example.com",
  "description": "Updated server address",
  "category": "network"
}
```

### DELETE /api/user-parameters/:key
Delete a specific parameter.

### DELETE /api/user-parameters
Delete all parameters for the current user.

### GET /api/user-parameters/export/json
Export all parameters as JSON.

## Usage

### 1. Configure Parameters

1. Navigate to **Parameters** in the navigation menu
2. Click **Add Parameter**
3. Enter:
   - **Key**: Identifier (e.g., `default_host`, `api_token`)
   - **Value**: The actual value
   - **Description** (optional): What this parameter is for
   - **Category**: Group related parameters

### 2. Auto-Fill in Scripts

When running a script, the form will automatically attempt to fill parameters by matching:
- Exact key name: `host` → user parameter `host`
- Prefixed with `default_`: `host` → user parameter `default_host`
- Suffixed match: `host` → user parameter `production_host`

### 3. Parameter Naming Conventions

**Recommended naming patterns:**

```
default_host          # Default server hostname
default_user          # Default SSH username  
default_template      # Default template path
api_endpoint          # API base URL
api_key               # API authentication key
db_host               # Database hostname
db_name               # Database name
production_host       # Production server
staging_host          # Staging server
admin_password        # Admin password (will be sanitized in logs)
```

### 4. Categories

Use categories to organize your parameters:

- **general**: General purpose parameters
- **credentials**: Usernames, passwords, API keys
- **network**: IP addresses, hostnames, ports
- **endpoints**: API endpoints, URLs
- **other**: Custom category

## Example Workflow

### Scenario: Running deployment scripts

1. **Setup Parameters Once:**
   ```
   Key: default_host          Value: prod-server-01.internal
   Key: default_user          Value: deploy-user
   Key: default_template      Value: /templates/prod-config.yaml
   ```

2. **Run Script:**
   - Navigate to Scripts → "Repro: Deploy Example"
   - Form is pre-filled with your saved values
   - Modify if needed or use as-is
   - Click **Run**

3. **Benefits:**
   - No need to remember server names
   - No typos in hostnames or usernames
   - Consistent values across script runs
   - Faster execution

## Security Notes

1. **Output Sanitization**: Parameters containing sensitive keywords (password, api_key, token, etc.) are automatically sanitized in logs
2. **User Isolation**: Parameters are user-specific and not shared between users
3. **Audit Trail**: Consider enabling audit logging for parameter changes
4. **Encryption**: Consider encrypting sensitive values at rest (future enhancement)

## Authentication Integration

### Current State
The user parameters routes currently use a **mock user ID** for development:

```typescript
const userId = 'mock-user-id'; // TODO: Get user from session/token
```

### Integration with Kerberos/OIDC

To integrate with the authentication system, update `/api/src/routes/userParameters.ts`:

#### 1. Extract User from Authentication Middleware

Replace all instances of `const userId = 'mock-user-id';` with:

```typescript
// Option A: Using JWT token (after authentication middleware)
const userId = request.user?.id;
if (!userId) {
  return reply.status(401).send({ error: 'Unauthorized' });
}

// Option B: Using Kerberos principal
const username = request.user?.username; // e.g., "user@DOMAIN.COM"
if (!username) {
  return reply.status(401).send({ error: 'Unauthorized' });
}
```

#### 2. Authentication Flow

**Kerberos/SPNEGO (Primary):**
1. User authenticates via Kerberos SSO (Windows domain)
2. API extracts username from Kerberos ticket principal
3. Session/JWT stores user identity
4. User parameters are linked to their domain username

**OIDC Fallback (Secondary):**
1. Non-domain users login via OIDC (Azure AD/Okta)
2. JWT token contains user claims (sub, email, username)
3. User parameters are linked to their OIDC identity

#### 3. User Auto-Creation

When a user authenticates for the first time, automatically create their User record:

```typescript
// In authentication middleware or auth route
const user = await prisma.user.upsert({
  where: { username: kerberosUsername },
  update: { updated_at: new Date() },
  create: {
    username: kerberosUsername,
    email: userEmail, // optional, from OIDC or AD
  },
});
```

#### 4. Required Middleware Setup

Add authentication middleware to protect user parameter routes:

```typescript
// In server.ts
fastify.register(userParametersRoutes, { 
  prefix: '/api/user-parameters',
  onRequest: [fastify.authenticate] // Requires authentication
});
```

#### 5. Authentication Middleware Example

Create or update authentication middleware:

```typescript
// api/src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // JWT verification (already handled by @fastify/jwt)
    await request.jwtVerify();
    
    // request.user now contains: { id, username, email }
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
```

### Important Notes

- **User Parameters vs Credentials**: User parameters store configuration values (server names, IPs, default options). They do NOT store actual credentials for authentication.
- **Credentials Source**: Actual authentication credentials come from:
  - **Agent Mode**: User's local Windows Credential Manager, Kerberos tickets, SSH keys
  - **Server Mode**: HashiCorp Vault with short-lived credentials
- **Parameter Usage**: Parameters might store "which server to connect to" but authentication uses Kerberos tickets/SSH keys

## Migration

To apply the database changes:

```bash
cd api
npx prisma migrate dev --name add_user_parameters
npx prisma generate
```

## Future Enhancements

- [ ] **Integrate with Kerberos/OIDC authentication** (see Authentication Integration section above)
- [ ] Encryption for sensitive values
- [ ] Import parameters from JSON/CSV
- [ ] Share parameters within teams/groups
- [ ] Parameter templates by role
- [ ] Audit log for parameter changes
- [ ] Parameter validation rules
- [ ] Environment-specific parameters (dev, staging, prod)
