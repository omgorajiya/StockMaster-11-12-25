# StockMaster Setup Guide

## Quick Start

Follow these steps to get StockMaster up and running:

## 1. Prerequisites Installation

### Install MongoDB
- **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- **macOS**: `brew install mongodb-community`
- **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

Start MongoDB:
```bash
# Windows (if installed as service, it starts automatically)
# Or run: mongod

# macOS/Linux
mongod
```

### Install Python 3.10+
- Download from [python.org](https://www.python.org/downloads/)
- Verify: `python --version`

### Install Node.js 18+
- Download from [nodejs.org](https://nodejs.org/)
- Verify: `node --version` and `npm --version`

## 2. Backend Setup (Django)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Copy the example and fill in your values
# SECRET_KEY=generate-a-secret-key
# MONGODB_URI=mongodb://localhost:27017/
# DB_NAME=stockmaster
# DEBUG=True

# Note: With MongoDB and djongo, migrations work differently
# Run this to sync models
python manage.py makemigrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser
# Enter email, username, and password when prompted

# Start Django server
python manage.py runserver
```

Backend will run on `http://localhost:8000`

## 3. Frontend Setup (Next.js)

```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install

# Create .env.local file
# NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## 4. Flask Service Setup (Optional)

```bash
# Navigate to flask-service (in a new terminal)
cd flask-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
# MONGODB_URI=mongodb://localhost:27017/
# DB_NAME=stockmaster

# Start Flask service
python app.py
```

Flask service will run on `http://localhost:5000`

## 5. First Login

1. Open `http://localhost:3000` in your browser
2. Click "Create your account" or use the superuser credentials
3. Register a new account
4. You'll be redirected to the dashboard

## 6. Initial Setup Steps

### Create Warehouses
1. Go to Settings → Warehouse Management (or use Django admin)
2. Create at least one warehouse (e.g., "Main Warehouse", code: "WH-001")

### Create Categories
1. Go to Products → Categories
2. Create product categories (e.g., "Electronics", "Furniture", "Raw Materials")

### Create Products
1. Go to Products → Add Product
2. Fill in:
   - Name: Product name
   - SKU: Unique SKU code
   - Category: Select category
   - Unit of Measure: kg, pcs, liters, etc.
   - Reorder Level: Minimum stock level
   - Initial Stock (optional): Starting quantity

## 7. Testing the System

### Test Receipt Flow
1. Go to Receipts → New Receipt
2. Select warehouse, enter supplier name
3. Add products and quantities
4. Set status to "Ready"
5. Click "Validate" - stock should increase

### Test Transfer Flow
1. Create a second warehouse
2. Go to Transfers → New Transfer
3. Select source and destination warehouses
4. Add products and quantities
5. Set status to "Ready"
6. Click "Validate" - stock should move

### Test Delivery Flow
1. Go to Deliveries → New Delivery
2. Select warehouse, enter customer name
3. Add products and quantities
4. Set status to "Ready"
5. Click "Validate" - stock should decrease

## Common Issues

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify MongoDB is accessible on port 27017

### Django djongo Issues
- If djongo doesn't work, you can switch to PostgreSQL:
  - Install PostgreSQL
  - Update `DATABASES` in `settings.py` to use PostgreSQL
  - Run migrations normally

### Port Already in Use
- Django (8000): Change in `manage.py runserver 8001`
- Next.js (3000): Change in `package.json` or use `npm run dev -- -p 3001`
- Flask (5000): Change `FLASK_PORT` in `.env`

### CORS Errors
- Ensure `django-cors-headers` is installed
- Check `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`
- Restart Django server after changes

## Production Deployment

For production:
1. Set `DEBUG=False` in Django settings
2. Use environment variables for all secrets
3. Use a production database (PostgreSQL recommended)
4. Set up proper CORS origins
5. Use HTTPS
6. Configure proper JWT token expiration
7. Set up proper logging
8. Use a process manager (PM2, supervisor) for services

## Support

For issues or questions, check:
- Django logs in terminal
- Browser console for frontend errors
- MongoDB logs for database issues

