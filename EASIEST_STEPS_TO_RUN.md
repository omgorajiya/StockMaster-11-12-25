# 🚀 EASIEST STEPS TO RUN STOCKMASTER

## ⚡ Super Simple Guide (Just Copy & Paste!)

---

## 📋 BEFORE YOU START

Make sure you have:
- ✅ Python 3.10+ installed
- ✅ Node.js 18+ installed  
- ✅ MongoDB running (on port 27017)

---

## 🎯 STEP 1: Setup Backend (First Time Only)

**Open Terminal/PowerShell and run these commands:**

```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
```

**✅ You should see:** `Demo data seeded successfully.`

**⚠️ IMPORTANT:** 
- If you see `ModuleNotFoundError: No module named 'django'`, install dependencies: `pip install -r requirements.txt`
- If you see `ModuleNotFoundError: No module named 'pkg_resources'`, install: `pip install setuptools`

**📦 This creates:**
- Demo user: `demo@stockmaster.com` / `Demo1234!`
- 10 products (Laptops, Steel Rods, Tablets, etc.)
- 3 warehouses (Main, Secondary, Micro Hub)
- 4 categories (Electronics, Raw Materials, etc.)
- 4 suppliers
- Sample receipts, deliveries, transfers, and adjustments

**💡 Skip this step if you already have data!**

---

## 🎯 STEP 2: Start Backend Server

**In the same terminal (or new one if you closed it):**

```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

**✅ You should see:** `Starting development server at http://127.0.0.1:8000/`

**⚠️ KEEP THIS TERMINAL OPEN!**

---

## 🎯 STEP 3: Start Frontend (Next.js)

**Open a NEW Terminal/PowerShell window and run:**

```bash
cd frontend
npm install
npm run dev
```

**✅ You should see:** `Local: http://localhost:3000`

**⚠️ KEEP THIS TERMINAL OPEN TOO!**

---

## 🎯 STEP 4: Open in Browser

**Go to:** **http://localhost:3000**

**That's it! 🎉**

---

## 📝 Quick Checklist

If something doesn't work, check:

### Backend Issues?
- [ ] Virtual environment activated? (see `(venv)` in terminal)
- [ ] `.env` file exists in `backend` folder?
- [ ] MongoDB is running?

### Frontend Issues?
- [ ] `.env.local` file exists in `frontend` folder?
- [ ] Backend is running on port 8000?
- [ ] Ran `npm install`?

---

## 🔧 Create Missing Files (If Needed)

### Backend `.env` file:
**Location:** `backend/.env`
**Content:**
```
SECRET_KEY=django-insecure-change-this-in-production-12345
DEBUG=True
DB_NAME=stockmaster
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET_KEY=your-jwt-secret-key-here-12345
```

### Frontend `.env.local` file:
**Location:** `frontend/.env.local`
**Content:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 🛑 To Stop Servers

Press `Ctrl+C` in each terminal window

---

## 🎉 YOU'RE DONE!

**Login at:** http://localhost:3000

**Use demo account:**
- **Email:** `demo@stockmaster.com`
- **Password:** `Demo1234!`

**OR create your own account!**

---

## 💡 Pro Tips

1. **First time setup?** Run migrations and seed data (Step 1)
2. **Want fresh demo data?** Run `python manage.py seed_demo_data` again (it's safe to run multiple times)
3. **No superuser?** Run `python manage.py createsuperuser` in backend folder
4. **Port already in use?** Change port: `python manage.py runserver 8001`

---

## 🎁 What's in the Demo Data?

The seed command creates:
- ✅ **Demo User:** `demo@stockmaster.com` / `Demo1234!`
- ✅ **10 Products:** Laptops, Steel Rods, Tablets, Servo Drives, Batteries, Filament, Maintenance Kits, Mailers, Sensors, Boxes
- ✅ **3 Warehouses:** Main Warehouse (WH-001), Secondary Warehouse (WH-002), Micro Fulfillment Hub (WH-003)
- ✅ **4 Categories:** Electronics, Raw Materials, Spare Parts, Packaging Supplies
- ✅ **4 Suppliers:** Global Electronics, Steel Corp, Northern Components, EcoPack Solutions
- ✅ **Stock Levels:** Pre-populated stock across all warehouses
- ✅ **Sample Operations:** Receipts, Deliveries, Transfers, and Adjustments with real data

**Perfect for testing and demos! 🚀**

---

**That's it! Just 4 simple steps! 🎉**

