# JWT Authentication System with WhatsApp OTP

## Overview

This authentication system provides JWT-based login using WhatsApp OTP verification. No passwords are required - users authenticate using their mobile number and receive a verification code via WhatsApp.

## Features

- 📱 **WhatsApp OTP**: Users receive login codes via WhatsApp
- 🔒 **JWT Tokens**: Secure authentication with JSON Web Tokens
- 👤 **Simple User Model**: Just user_id and mobile_number required
- ⏰ **OTP Expiry**: Configurable OTP expiration (default: 5 minutes)
- 🔄 **Token Refresh**: Ability to refresh JWT tokens
- 🛡️ **Security**: Protected endpoints with authentication middleware

## API Endpoints

### Authentication Flow

1. **Request OTP** - `POST /auth/request-otp`
2. **Verify OTP & Login** - `POST /auth/verify-otp`
3. **Get User Info** - `GET /auth/me` (Protected)
4. **Refresh Token** - `POST /auth/refresh-token` (Protected)
5. **Logout** - `POST /auth/logout` (Protected)

## Usage Examples

### 1. Request OTP

```bash
curl -X POST "http://localhost:8000/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "+1234567890"
  }'
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "expires_in_minutes": 5,
  "mobile_number": "+1234567890"
}
```

### 2. Verify OTP and Login

```bash
curl -X POST "http://localhost:8000/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile_number": "+1234567890",
    "otp_code": "123456"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "user_id": "uuid-generated-id",
    "mobile_number": "+1234567890",
    "is_active": true,
    "created_at": "2025-10-11T10:00:00"
  },
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 2592000,
    "user_id": "uuid-generated-id"
  }
}
```

### 3. Access Protected Endpoints

```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "user_id": "uuid-generated-id", 
  "mobile_number": "+1234567890",
  "is_active": true,
  "created_at": "2025-10-11T10:00:00"
}
```

### 4. Refresh Token

```bash
curl -X POST "http://localhost:8000/auth/refresh-token" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5. Logout

```bash
curl -X POST "http://localhost:8000/auth/logout" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Environment Configuration

Add these variables to your `.env` file:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/legalaid_db

# JWT Settings
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# OTP Settings
OTP_EXPIRE_MINUTES=5
OTP_LENGTH=6

# WhatsApp (existing)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
BUSINESS_PHONE_NUMBER_ID=your_phone_number_id
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    user_id VARCHAR PRIMARY KEY,
    mobile_number VARCHAR UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### OTP Codes Table
```sql
CREATE TABLE otp_codes (
    mobile_number VARCHAR PRIMARY KEY,
    otp_code VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Using Authentication in Your Endpoints

### Protect Routes with Authentication

```python
from fastapi import Depends
from app.core.auth_utils import get_current_user
from app.models.user import User

@router.get("/protected-endpoint")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {
        "message": f"Hello {current_user.user_id}!",
        "user_mobile": current_user.mobile_number
    }
```

### Optional Authentication

```python
from app.core.auth_utils import get_current_user_optional

@router.get("/optional-auth-endpoint")
async def optional_auth_route(current_user: User = Depends(get_current_user_optional)):
    if current_user:
        return {"message": f"Authenticated user: {current_user.user_id}"}
    else:
        return {"message": "Anonymous user"}
```

## WhatsApp OTP Message Format

Users receive this message format:

```
🔐 Legal Aid Login Code

Your verification code is: *123456*

This code will expire in 5 minutes.

If you didn't request this code, please ignore this message.

🔒 Keep this code secure and don't share it with anyone.
```

## Security Features

- **JWT Secret Key**: Configurable secret for signing tokens
- **Token Expiration**: Configurable token lifetime (default: 30 days)
- **OTP Expiration**: Short-lived OTP codes (default: 5 minutes)
- **One-time Use**: OTP codes are marked as used after successful verification
- **User Deactivation**: Ability to deactivate user accounts
- **Input Validation**: Mobile number format validation
- **Error Handling**: Comprehensive error responses

## Migration

Run the database migration to create tables:

```bash
# If using Alembic
alembic upgrade head

# Or apply the migration file manually
# File: alembic/versions/create_users_otp_tables.py
```

## Testing the System

1. **Start the API server**:
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Test OTP request** (replace with valid WhatsApp number):
   ```bash
   curl -X POST "http://localhost:8000/auth/request-otp" \
     -H "Content-Type: application/json" \
     -d '{"mobile_number": "+1234567890"}'
   ```

3. **Check WhatsApp for OTP code**

4. **Test login with received OTP**:
   ```bash
   curl -X POST "http://localhost:8000/auth/verify-otp" \
     -H "Content-Type: application/json" \
     -d '{"mobile_number": "+1234567890", "otp_code": "123456"}'
   ```

5. **Use the returned JWT token for authenticated requests**

## Error Handling

The API returns standard HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (invalid/expired token/OTP)
- `500`: Internal Server Error

Example error response:
```json
{
  "detail": "Invalid or expired OTP code"
}
```

## Next Steps

You can now:
- Protect any endpoint with `Depends(get_current_user)`
- Use `current_user.user_id` and `current_user.mobile_number` in your business logic
- Integrate with your existing WhatsApp message processing
- Add user roles/permissions if needed
- Implement user profile management

The authentication system is ready to use and integrates seamlessly with your existing WhatsApp service!