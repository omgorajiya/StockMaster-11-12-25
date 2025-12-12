# StockMaster - Inventory Management System

A comprehensive, modular Inventory Management System (IMS) that digitizes and streamlines all stock-related operations within a business.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (React with App Router, TypeScript, Tailwind CSS)
- **Backend API**: Django REST Framework (Python)
- **Database**: MongoDB
- **Microservices**: Flask (for reports and background tasks)
- **Authentication**: JWT-based with OTP password reset

## ✨ Features

### Core Modules

1. **Product Management**
   - Create/update products with SKU, category, unit of measure
   - Stock availability per location
   - Reordering rules and low stock alerts

2. **Receipts (Incoming Stock)**
   - Track goods received from vendors
   - Automatic stock updates
   - Document workflow (Draft → Waiting → Ready → Done)

3. **Delivery Orders (Outgoing Stock)**
   - Manage customer shipments
   - Pick, pack, and validate orders
   - Stock validation before delivery

4. **Internal Transfers**
   - Move stock between warehouses/locations
   - Complete audit trail
   - Real-time stock updates

5. **Stock Adjustments**
   - Fix inventory discrepancies
   - Physical count reconciliation
   - Support for increase, decrease, and set operations

6. **Dashboard**
   - Real-time KPIs (Total Products, Low Stock, Pending Operations)
   - Recent activities feed
   - Low stock alerts
   - Dynamic filters

7. **Stock Ledger**
   - Complete audit trail of all stock movements
   - Transaction history
   - Filterable by product, warehouse, date range

## 📁 Project Structure

```
StockMaster project/
├── frontend/              # Next.js application
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── lib/             # API services and utilities
│   └── package.json
├── backend/              # Django REST API
│   ├── accounts/        # Authentication app
│   ├── products/        # Product management app
│   ├── operations/      # Receipts, deliveries, transfers, adjustments
│   ├── dashboard/       # Dashboard KPIs
│   └── stockmaster/     # Django settings
├── flask-service/        # Flask microservice for reports
│   └── app.py           # Report endpoints
├── README.md
└── StockMaster.pdf      # Project requirements
```

## 🛠️ Getting Started

> **📖 For detailed step-by-step instructions, see [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)**

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **MongoDB** 6.0+ (running locally or connection string)
- **Git**

### Quick Start

1. **Start MongoDB** (ensure it's running on `localhost:27017`)

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # OR source venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   # Create .env file (see .env.example)
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   # Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000/api
   npm run dev
   ```

4. **Open Browser:** http://localhost:3000

### Step 1: Clone and Setup Backend (Django)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
# Set your SECRET_KEY, MONGODB_URI, etc.

# Run migrations (Note: MongoDB with djongo may not require traditional migrations)
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

The Django API will be available at `http://localhost:8000`

### Step 2: Setup Frontend (Next.js)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file
# NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Run development server
npm run dev
```

The Next.js app will be available at `http://localhost:3000`

### Step 3: Setup Flask Service (Optional)

```bash
# Navigate to flask-service directory
cd flask-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
# MONGODB_URI=mongodb://localhost:27017/
# DB_NAME=stockmaster

# Run Flask service
python app.py
```

The Flask service will be available at `http://localhost:5000`

## ⚙️ Environment Variables

### Backend (.env)

```env
SECRET_KEY=your-django-secret-key-here
DEBUG=True
DB_NAME=stockmaster
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET_KEY=your-jwt-secret-key
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Flask Service (.env)

```env
MONGODB_URI=mongodb://localhost:27017/
DB_NAME=stockmaster
FLASK_ENV=development
FLASK_PORT=5000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/password-reset/` - Request OTP
- `POST /api/auth/password-reset/verify/` - Verify OTP and reset password
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/update/` - Update profile

### Products
- `GET /api/products/products/` - List products
- `POST /api/products/products/` - Create product
- `GET /api/products/products/{id}/` - Get product details
- `PATCH /api/products/products/{id}/` - Update product
- `GET /api/products/products/low_stock/` - Get low stock products
- `GET /api/products/categories/` - List categories
- `GET /api/products/warehouses/` - List warehouses

### Operations
- `GET /api/operations/receipts/` - List receipts
- `POST /api/operations/receipts/` - Create receipt
- `POST /api/operations/receipts/{id}/validate/` - Validate receipt
- `GET /api/operations/deliveries/` - List deliveries
- `POST /api/operations/deliveries/` - Create delivery
- `POST /api/operations/deliveries/{id}/validate/` - Validate delivery
- `GET /api/operations/transfers/` - List transfers
- `POST /api/operations/transfers/` - Create transfer
- `POST /api/operations/transfers/{id}/validate/` - Validate transfer
- `GET /api/operations/adjustments/` - List adjustments
- `POST /api/operations/adjustments/` - Create adjustment
- `POST /api/operations/adjustments/{id}/validate/` - Validate adjustment
- `GET /api/operations/ledger/` - Stock ledger (audit trail)

### Dashboard
- `GET /api/dashboard/kpis/` - Dashboard KPIs
- `GET /api/dashboard/recent-activities/` - Recent activities
- `GET /api/dashboard/low-stock/` - Low stock products

### Flask Reports (Optional)
- `GET /health` - Health check
- `GET /api/reports/stock-summary` - Stock summary
- `GET /api/reports/movement-history` - Movement history
- `GET /api/reports/export-excel` - Export to Excel
- `GET /api/reports/low-stock-alert` - Low stock alerts

## 🎯 Usage Flow

### 1. Receive Goods from Vendor
1. Navigate to **Receipts** → **New Receipt**
2. Select warehouse, add supplier details
3. Add products and quantities received
4. Set status to "Ready"
5. Click "Validate" to update stock automatically

### 2. Move Stock Internally
1. Navigate to **Transfers** → **New Transfer**
2. Select source and destination warehouses
3. Add products and quantities
4. Set status to "Ready"
5. Click "Validate" to move stock

### 3. Deliver to Customer
1. Navigate to **Deliveries** → **New Delivery**
2. Select warehouse, add customer details
3. Add products and quantities
4. Set status to "Ready"
5. Click "Validate" to decrease stock

### 4. Adjust Stock
1. Navigate to **Adjustments** → **New Adjustment**
2. Select warehouse and adjustment type
3. Add products with current and adjustment quantities
4. Set status to "Ready"
5. Click "Validate" to apply adjustment

## 🔒 Authentication

- Users must register/login to access the system
- JWT tokens are used for API authentication
- Tokens are automatically refreshed
- OTP-based password reset is available

## 📊 Dashboard Features

- **Total Products**: Count of active products
- **Low Stock Items**: Products below reorder level
- **Out of Stock**: Products with zero stock
- **Pending Receipts**: Receipts waiting for validation
- **Pending Deliveries**: Deliveries waiting for validation
- **Scheduled Transfers**: Transfers waiting for validation

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod` or check your MongoDB service
- Verify connection string in `.env` file
- Check if MongoDB port (27017) is accessible

### Django Migration Issues
- If using MongoDB with djongo, migrations may not be required
- Try: `python manage.py migrate --run-syncdb`

### CORS Issues
- Ensure `django-cors-headers` is installed
- Check `CORS_ALLOWED_ORIGINS` in `settings.py`
- Verify frontend URL matches allowed origins

### Frontend API Connection
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check if Django server is running on port 8000
- Check browser console for CORS errors

## 📝 Notes

- This project uses MongoDB with Django via djongo. For production, consider using PostgreSQL with Django or a native MongoDB driver.
- The Flask service is optional and can be used for advanced reporting features.
- All stock movements are logged in the Stock Ledger for audit purposes.
- Document statuses: Draft → Waiting → Ready → Done (or Canceled)

## 🤝 Contributing

This is a complete implementation of the StockMaster Inventory Management System. Feel free to extend and customize according to your needs.

## 📄 License

MIT License - Feel free to use this project for learning and commercial purposes.

---

**Built with ❤️ using Next.js, Django, MongoDB, and Flask**

