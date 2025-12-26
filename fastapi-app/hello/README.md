# Go REST API - Multi-File Structure

This is a properly structured Go REST API using Gin framework with GORM ORM.

## Project Structure

```
hello/
├── main.go              # Application entry point
├── go.mod              # Go module file
├── go.sum              # Go dependencies checksum
├── README.md           # This file
├── config/             # Configuration package
│   └── database.go     # Database connection and migrations
├── handlers/           # HTTP handlers
│   ├── user.go        # User-related HTTP handlers
│   └── health.go      # Health check handler
├── middleware/         # Custom middleware
│   ├── cors.go        # CORS middleware
│   └── json.go        # JSON response middleware
├── models/            # Data models and DTOs
│   ├── user.go        # User models and request/response structs
│   └── error.go       # Error response models
└── utils/             # Utility functions
    ├── password.go    # Password hashing utilities
    └── response.go     # Response utilities
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Users
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update existing user
- `DELETE /api/v1/users/:id` - Delete user

## Environment Variables

Required environment variables for database connection:

```bash
DB_HOST=localhost     # Database host
DB_PORT=3306         # Database port
DB_USER=user         # Database username
DB_PASSWORD=password # Database password
DB_NAME=dbname       # Database name
PORT=8080            # Application port (optional, defaults to 8080)
```

## Safety Improvements

✅ **Password Security**: Passwords are hashed using bcrypt before storage
✅ **No Password Exposure**: Passwords never appear in JSON responses
✅ **Input Validation**: All inputs are validated before processing
✅ **Database Security**: Uses environment variables for credentials
✅ **Error Handling**: Proper HTTP status codes and error responses
✅ **CORS Support**: Configured for cross-origin requests

## Running the Application

1. Set up your MySQL database
2. Set environment variables:
   ```bash
   export DB_HOST=localhost
   export DB_USER=your_username
   export DB_PASSWORD=your_password
   export DB_NAME=your_database
   ```
3. Install dependencies:
   ```bash
   go mod tidy
   ```
4. Run the application:
   ```bash
   go run main.go
   ```

Or build and run:
```bash
go build
./hello
```

## API Usage Examples

### Create a User
```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "phone": "+1234567890"
  }'
```

### Get All Users
```bash
curl http://localhost:8080/api/v1/users
```

### Get User by ID
```bash
curl http://localhost:8080/api/v1/users/1
```

### Update User
```bash
curl -X PUT http://localhost:8080/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_updated",
    "phone": "+0987654321"
  }'
```

### Delete User
```bash
curl -X DELETE http://localhost:8080/api/v1/users/1
```

## Dependencies

- `github.com/gin-gonic/gin` - HTTP web framework
- `gorm.io/gorm` - ORM library
- `gorm.io/driver/mysql` - MySQL driver for GORM
- `golang.org/x/crypto` - Cryptographic functions (bcrypt)