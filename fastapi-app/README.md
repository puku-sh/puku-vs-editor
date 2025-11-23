# FastAPI Hello Application

A modular FastAPI application demonstrating best practices with organized project structure.

## 🏗️ Project Structure

```
fastapi-app/
├── app/
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Application configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── response_models.py   # Pydantic response models
│   └── routers/
│       ├── __init__.py
│       ├── hello.py             # Hello endpoints
│       ├── health.py            # Health check endpoints
│       └── info.py              # Root and about endpoints
├── main.py                      # Application entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## ✨ Features

- **Modular Architecture**: Separated concerns with routers, models, and config
- **Type Safety**: Pydantic models for request/response validation
- **Configuration Management**: Environment-based settings with Pydantic Settings
- **CORS Support**: Configurable CORS middleware
- **Auto Documentation**: Swagger UI and ReDoc integration
- **Health Checks**: Dedicated health check endpoints
- **Error Handling**: Proper HTTP exception handling
- **Startup/Shutdown Events**: Application lifecycle management

## 🚀 Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Create a virtual environment**:
```bash
python -m venv venv
```

3. **Activate the virtual environment**:
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

4. **Install dependencies**:
```bash
pip install -r requirements.txt
```

5. **Configure environment variables** (optional):
```bash
cp .env.example .env
# Edit .env with your preferred settings
```

## 🏃 Running the Application

### Development Server

Run the application with automatic reload:
```bash
uvicorn main:app --reload --port 8000
```

Or using the built-in configuration:
```bash
python main.py
```

### Production Server

For production deployment, use:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📚 API Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 🔗 API Endpoints

### Core Endpoints

- **GET /** - Root endpoint returning a welcome message
- **GET /about** - Information about the API and available endpoints

### Hello Endpoints

- **GET /hello/** - Basic hello endpoint
- **GET /hello/{name}** - Personalized hello message with validation

### Health Endpoints

- **GET /health/** - Health check endpoint with service status

## 📖 Example Usage

### Local Development

```bash
# Get welcome message
curl http://localhost:8000/

# Get basic hello
curl http://localhost:8000/hello/

# Get personalized hello
curl http://localhost:8000/hello/John

# Check health status
curl http://localhost:8000/health/

# Get API information
curl http://localhost:8000/about
```

### Docker Container

```bash
# If using Docker Compose
curl http://localhost:8000/

# If running Docker directly
curl http://localhost:8000/

# Development service (port 8001)
curl http://localhost:8001/
```

## ⚙️ Configuration

The application can be configured through environment variables or a `.env` file:

```bash
# Application Settings
APP_NAME=FastAPI Hello App
APP_VERSION=1.0.0
DEBUG=false

# Server Settings
HOST=0.0.0.0
PORT=8000

# API Settings
DOCS_URL=/docs
REDOC_URL=/redoc

# CORS Settings
ALLOW_ORIGINS=["*"]
ALLOW_METHODS=["*"]
ALLOW_HEADERS=["*"]
```

## 🧪 Development

### Code Style

This project follows Python best practices:
- Type hints for better code documentation
- Pydantic models for data validation
- Modular architecture for maintainability
- Proper error handling and logging

### Adding New Endpoints

1. Create response models in `app/models/response_models.py`
2. Add router logic in `app/routers/`
3. Include the router in `main.py`
4. Update documentation as needed

## 📦 Dependencies

- **FastAPI**: Modern, fast web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI applications
- **Pydantic**: Data validation using Python type annotations
- **Pydantic Settings**: Environment-based configuration management

## 🐳 Docker Support

### Building the Docker Image

```bash
# Build the image
docker build -t fastapi-hello-app .

# Build with custom tag
docker build -t fastapi-hello-app:v1.0.0 .
```

### Running with Docker

```bash
# Run the container
docker run -d \
  --name fastapi-hello-app \
  -p 8000:8000 \
  fastapi-hello-app

# Run with environment variables
docker run -d \
  --name fastapi-hello-app \
  -p 8000:8000 \
  -e DEBUG=true \
  -e APP_NAME="My FastAPI App" \
  fastapi-hello-app
```

### Running with Docker Compose

```bash
# Production mode
docker-compose up -d

# Development mode with hot reload
docker-compose --profile dev up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f api
```

### Docker Compose Services

- **api**: Production service with optimized settings
- **api-dev**: Development service with hot reload (dev profile)

### Docker Features

- **Multi-stage builds**: Optimized image size
- **Non-root user**: Enhanced security
- **Health checks**: Automatic health monitoring
- **Environment variables**: Flexible configuration
- **Volume mounting**: Development support
- **Restart policies**: Automatic recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).