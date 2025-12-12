# ⚡ SUPER QUICK START - Run in Seconds!

## 🚀 2-Command Quick Start (If Already Setup)

### Terminal 1: Backend
```bash
cd backend && venv\Scripts\activate && python manage.py runserver
```

### Terminal 2: Frontend  
```bash
cd frontend && npm run dev
```

### Open Browser
**http://localhost:3000**

**Login:** `demo@stockmaster.com` / `Demo1234!`

---

## 🎯 First Time Setup (One-Time, 2 Minutes)

### Step 1: Backend Setup
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

### Step 2: Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 3: Open Browser
**http://localhost:3000**

---

## ✅ That's It! 

**After first setup, just use the 2-command quick start above!**

