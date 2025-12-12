# 🚀 How to Run StockMaster - Visual Guide

## ⚡ Super-Quick Start (SQLite focus)

1. `cd backend && python -m venv .venv && source .venv/bin/activate` (or `.venv\Scripts\activate` on Windows)
2. `pip install -r requirements.txt && python manage.py migrate && python manage.py runserver`
3. In another terminal: `cd frontend && npm install && npm run dev`
4. Open `http://localhost:3000` in your browser

👉 MongoDB + Flask stay in the project, but you can skip them for the default SQLite workflow. Start them only if you rely on those services.

## 📋 What You Need (3 Terminal Windows)

```
┌─────────────────────────────────────────────────────────┐
│  TERMINAL 1: Django Backend (Port 8000, SQLite ready)  │
│  TERMINAL 2: Next.js Frontend (Port 3000)              │
│  TERMINAL 3: Flask Service (Port 5000) - Optional      │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Run Commands

### **1️⃣ Start MongoDB (only if needed)**

**Windows:**
```cmd
net start MongoDB
```

**macOS/Linux:**
```bash
brew services start mongodb-community
# OR
mongod
```

---

### **2️⃣ Terminal 1: Django Backend**

```bash
# Navigate to backend
cd "D:\StockMaster project\backend"

# Activate virtual environment
venv\Scripts\activate

# Start server
python manage.py runserver
```

✅ **Should see:** `Starting development server at http://127.0.0.1:8000/`

---

### **3️⃣ Terminal 2: Next.js Frontend**

```bash
# Navigate to frontend
cd "D:\StockMaster project\frontend"

# Start server
npm run dev
```

✅ **Should see:** `Local: http://localhost:3000`

---

### **4️⃣ Open Browser**

🌐 **Go to:** http://localhost:3000

---

## 🎯 First Time Setup (One-Time Only)

### **Backend Setup (First Time):**

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate  # Windows
# OR source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
# Add your SECRET_KEY, MONGODB_URI, etc.

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser
```

### **Frontend Setup (First Time):**

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
# Add: NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 📝 Environment Files Needed

### **backend/.env**
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=stockmaster
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET_KEY=your-jwt-secret
```

### **frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## ✅ Verification Checklist

Before running, check:

- [ ] MongoDB is running
- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed
- [ ] Backend `.env` file exists
- [ ] Frontend `.env.local` file exists
- [ ] Virtual environment activated (backend)
- [ ] Dependencies installed (both backend & frontend)

---

## 🎉 Success Indicators

### **Backend Running:**
```
✅ Starting development server at http://127.0.0.1:8000/
✅ Django version X.X.X
```

### **Frontend Running:**
```
✅ ready started server on 0.0.0.0:3000
✅ Local: http://localhost:3000
```

### **Browser:**
```
✅ Login page loads
✅ Can register/login
✅ Dashboard appears after login
```

---

## 🛑 To Stop Everything

Press `Ctrl+C` in each terminal window, then:

```bash
deactivate  # Deactivate virtual environment
```

---

## 🆘 Common Issues

### **"Port already in use"**
- Change port: `python manage.py runserver 8001`
- Update frontend `.env.local` accordingly

### **"Module not found"**
- Activate virtual environment
- Run: `pip install -r requirements.txt` (backend)
- Run: `npm install` (frontend)

### **"MongoDB connection failed"**
- Ensure MongoDB is running
- Check: `mongosh` (should connect)

### **"CORS error"**
- Ensure Django server is running
- Check API URL in frontend `.env.local`

---

## 📚 For Detailed Instructions

See **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** for complete step-by-step guide with troubleshooting.

---

**🎯 TL;DR:**
1. Start MongoDB
2. `cd backend` → `venv\Scripts\activate` → `python manage.py runserver`
3. `cd frontend` → `npm run dev`
4. Open http://localhost:3000

**That's it!** 🎉


