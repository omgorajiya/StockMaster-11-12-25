# 📚 StockMaster - How It Works Guide

## 🎯 Simple Example: "The Laptop Journey"

Let me explain how this inventory system works with a real-world example!

---

## 📦 **Example Scenario: Selling Laptops**

Imagine you run a computer store. Here's how StockMaster tracks a laptop from supplier to customer:

### **Step 1: Product Setup** ✅
**What happens:** You add a product to your system
- **Navigate:** Click "Products" in the left sidebar → Click "Add Product"
- **Fill in:**
  - Name: "Laptop 15-inch"
  - SKU: "LAP-001"
  - Category: Electronics
  - Stock Unit: Pieces
  - Reorder Level: 10 (when stock goes below 10, you'll get an alert)
- **Result:** Product is now in your system, but stock = 0

**💡 Think of it like:** Adding a new item to your catalog before you have any in stock.

---

### **Step 2: Stock IN - Receiving from Supplier** 📥
**What happens:** Your supplier delivers 20 laptops

**Navigate:** Click "Receipts" → "New Receipt"

**Fill in:**
- Warehouse: Main Warehouse
- Supplier: Global Electronics
- Status: **Ready** (important!)
- Add Item:
  - Product: Laptop 15-inch
  - Quantity Received: 20
  - Unit Price: $800

**Click "Save"** → Then click **"Validate"** button

**Result:**
- ✅ Stock increases: 0 → 20 laptops
- ✅ Status changes: Ready → Done
- ✅ Recorded in Move History
- ✅ You can see it in Products page

**💡 Think of it like:** Unloading a truck and counting items into your warehouse.

---

### **Step 3: Stock OUT - Selling to Customer** 📤
**What happens:** A customer buys 5 laptops

**Navigate:** Click "Deliveries" → "New Delivery"

**Fill in:**
- Warehouse: Main Warehouse
- Customer: ABC Company
- Status: **Ready**
- Add Item:
  - Product: Laptop 15-inch
  - Quantity: 5

**Click "Save"** → Then click **"Validate"** button

**Result:**
- ✅ Stock decreases: 20 → 15 laptops
- ✅ Status changes: Ready → Done
- ✅ Recorded in Move History
- ✅ System checks you have enough stock (won't let you deliver more than available)

**💡 Think of it like:** Packing items for a customer order and shipping them out.

---

### **Step 4: Stock TRANSFER - Moving Between Warehouses** 🔄
**What happens:** You want to move 3 laptops to your secondary warehouse

**Navigate:** Click "Transfers" → "New Transfer"

**Fill in:**
- From Warehouse: Main Warehouse
- To Warehouse: Secondary Warehouse
- Status: **Ready**
- Add Item:
  - Product: Laptop 15-inch
  - Quantity: 3

**Click "Save"** → Then click **"Validate"** button

**Result:**
- ✅ Main Warehouse: 15 → 12 laptops
- ✅ Secondary Warehouse: 0 → 3 laptops
- ✅ Total stock still = 15 (just moved location)
- ✅ Recorded in Move History

**💡 Think of it like:** Moving items from one shelf to another in your store.

---

### **Step 5: Stock ADJUSTMENT - Fixing Mistakes** 🔧
**What happens:** You found 2 damaged laptops that need to be removed

**Navigate:** Click "Adjustments" → "New Adjustment"

**Fill in:**
- Warehouse: Main Warehouse
- Reason: "Damaged items found"
- Adjustment Type: **Decrease**
- Status: **Ready**
- Add Item:
  - Product: Laptop 15-inch
  - Current Quantity: 12 (system shows this)
  - Adjustment Quantity: 2

**Click "Save"** → Then click **"Validate"** button

**Result:**
- ✅ Stock decreases: 12 → 10 laptops
- ✅ Status changes: Ready → Done
- ✅ Recorded in Move History with reason

**💡 Think of it like:** Writing off damaged or lost items.

---

### **Step 6: Check STOCK REPORT** 📊
**Navigate:** Click "Move History" in the sidebar

**You'll see:**
- ✅ All 4 transactions listed:
  1. Receipt: +20 laptops
  2. Delivery: -5 laptops
  3. Transfer Out: -3 laptops (from Main)
  4. Transfer In: +3 laptops (to Secondary)
  5. Adjustment: -2 laptops

**Navigate:** Click "Products" → Click on "Laptop 15-inch"

**You'll see:**
- Current Stock: 10 laptops (in Main Warehouse)
- Plus 3 laptops (in Secondary Warehouse)
- Total: 13 laptops

**💡 Think of it like:** A complete audit trail showing every movement.

---

## 🔑 **Key Concepts Explained Simply**

### **Status Flow (Important!):**
Every document (Receipt, Delivery, Transfer, Adjustment) follows this flow:

```
Draft → Waiting → Ready → Done
```

**What this means:**
- **Draft:** You're still working on it (can edit)
- **Waiting:** Needs approval (if approval is required)
- **Ready:** Ready to process (click "Validate" to execute)
- **Done:** Completed (stock has been updated)

**⚠️ Important:** Stock only changes when you click **"Validate"** on a **"Ready"** document!

---

### **Stock Levels:**
- **Total Stock:** Sum of all stock across all warehouses
- **Available Stock:** Total - Reserved (items reserved for pending orders)
- **Low Stock:** When stock ≤ Reorder Level (you'll see yellow warning)
- **Out of Stock:** When stock = 0 (you'll see red warning)

---

## 🎨 **How to Change Product Status (Active/Inactive)**

### **Method 1: From Products List Page**
1. **Navigate:** Click "Products" in the left sidebar
2. **Find your product** in the list
3. **Click the "Edit" icon** (pencil icon) next to the product
4. **On the edit page:**
   - Find the "Active" checkbox at the bottom
   - ✅ Check = Active (product is available)
   - ❌ Uncheck = Inactive (product is hidden/disabled)
5. **Click "Save Changes"**

### **Method 2: From Product Detail Page**
1. **Navigate:** Click "Products" → Click on any product name
2. **Click "Edit Product"** button (top right)
3. **Toggle the "Active" checkbox**
4. **Click "Save Changes"**

**💡 What does Active/Inactive mean?**
- **Active:** Product appears in searches, can be used in receipts/deliveries
- **Inactive:** Product is hidden from normal operations (but data is preserved)

**Note:** You cannot change product status directly from the navigation bar. You must go to the Products page and edit the product.

---

## 🚀 **Easy Steps to Run the Project**

### **Prerequisites (Install These First):**
- ✅ **Python 3.10+** - [Download here](https://www.python.org/downloads/)
- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
- ✅ **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use MongoDB Atlas (cloud)

---

### **STEP 1: Setup Backend (Django API)**

**Open Terminal/PowerShell and run:**

```bash
# Navigate to backend folder
cd backend

# Activate virtual environment (Windows)
venv\Scripts\activate

# OR if on Mac/Linux:
# source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Create .env file (if it doesn't exist)
# Copy this content into backend/.env:
```

**Create `backend/.env` file with:**
```env
SECRET_KEY=django-insecure-change-this-in-production-12345
DEBUG=True
DB_NAME=stockmaster
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET_KEY=your-jwt-secret-key-here-12345
```

**Then run:**
```bash
# Create database tables
python manage.py migrate

# Create demo data (optional but recommended!)
python manage.py seed_demo_data

# Start the server
python manage.py runserver
```

**✅ You should see:** `Starting development server at http://127.0.0.1:8000/`

**⚠️ KEEP THIS TERMINAL OPEN!**

---

### **STEP 2: Setup Frontend (Next.js)**

**Open a NEW Terminal/PowerShell window:**

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies (first time only)
npm install

# Create .env.local file (if it doesn't exist)
# Copy this content into frontend/.env.local:
```

**Create `frontend/.env.local` file with:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Then run:**
```bash
# Start the frontend server
npm run dev
```

**✅ You should see:** `Local: http://localhost:3000`

**⚠️ KEEP THIS TERMINAL OPEN TOO!**

---

### **STEP 3: Start MongoDB**

**If using local MongoDB:**
- Make sure MongoDB service is running
- On Windows: Check Services → MongoDB should be running
- On Mac/Linux: Run `mongod` in a terminal

**If using MongoDB Atlas (cloud):**
- Update `MONGODB_URI` in `backend/.env` with your connection string
- Example: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/`

---

### **STEP 4: Open in Browser**

**Go to:** **http://localhost:3000**

**Login with demo account:**
- **Email:** `demo@stockmaster.com`
- **Password:** `Demo1234!`

**OR create your own account by clicking "Register"!**

---

## 🎯 **Quick Test - Verify Everything Works**

1. **Login** → You should see the Dashboard
2. **Click "Products"** → You should see demo products (Laptops, Tablets, etc.)
3. **Click "Receipts"** → You should see sample receipts
4. **Click "Move History"** → You should see transaction history
5. **Click "Dashboard"** → You should see KPIs and charts

**If all of these work, you're ready to go! 🎉**

---

## 🐛 **Troubleshooting**

### **Backend won't start?**
- ✅ Check MongoDB is running
- ✅ Check `.env` file exists in `backend/` folder
- ✅ Check virtual environment is activated (see `(venv)` in terminal)
- ✅ Try: `pip install -r requirements.txt` again

### **Frontend won't start?**
- ✅ Check `.env.local` file exists in `frontend/` folder
- ✅ Check backend is running on port 8000
- ✅ Try: `npm install` again
- ✅ Check Node.js version: `node --version` (should be 18+)

### **Can't login?**
- ✅ Make sure you ran `python manage.py seed_demo_data`
- ✅ Try creating a new account
- ✅ Check browser console for errors (F12)

### **No data showing?**
- ✅ Run `python manage.py seed_demo_data` again
- ✅ Check MongoDB connection in `.env` file
- ✅ Check backend logs for errors

---

## 📖 **Navigation Bar Guide**

The **left sidebar** contains all main features:

1. **Dashboard** - Overview of your inventory
2. **Products** - Manage products (add, edit, view)
3. **Receipts** - Stock coming IN from suppliers
4. **Deliveries** - Stock going OUT to customers
5. **Transfers** - Move stock between warehouses
6. **Adjustments** - Fix inventory mistakes
7. **Cycle Counts** - Physical inventory counting
8. **Returns** - Customer returns
9. **Pick Waves** - Batch picking for orders
10. **Suppliers** - Manage suppliers
11. **Storage** - View storage locations
12. **Analytics** - Reports and analytics
13. **Move History** - Complete transaction history
14. **Audit Log** - Who did what, when
15. **Settings** - System settings

**💡 Tip:** Click any menu item to navigate. The active page is highlighted in blue.

---

## 🎓 **Learning Path**

### **Beginner (30 minutes):**
1. ✅ Login and explore dashboard
2. ✅ View Products list
3. ✅ View one Receipt (click on it)
4. ✅ Click "Validate" on a Ready receipt
5. ✅ Check Products - stock should increase
6. ✅ Check Move History - see the transaction

### **Intermediate (1 hour):**
1. ✅ Create your own Receipt
2. ✅ Create your own Delivery
3. ✅ Create a Transfer
4. ✅ Create an Adjustment
5. ✅ Check all in Move History

### **Advanced (2 hours):**
1. ✅ Complete a Cycle Count
2. ✅ Process a Return
3. ✅ Create a Pick Wave
4. ✅ Use Analytics dashboard
5. ✅ Check Audit Log

---

## 💡 **Pro Tips**

1. **Always validate in order:** Receipts before Deliveries (need stock first!)
2. **Check stock before delivery:** System won't let you deliver more than available
3. **Use Move History:** Verify everything was recorded correctly
4. **Check Audit Log:** See who did what and when
5. **Use filters:** Save time with saved views on list pages
6. **Status matters:** Only "Ready" documents can be validated
7. **Active products:** Inactive products won't appear in dropdowns

---

## 🎉 **You're Ready!**

Now you understand:
- ✅ How the system works (with the Laptop example)
- ✅ How to change product status (via Edit page)
- ✅ How to run the project (4 simple steps)

**Start exploring and have fun! 🚀**

---

**Need more help?** Check these files:
- `QUICK_START_GUIDE.md` - Quick reference
- `DEMO_DATA_EXAMPLE.md` - Detailed walkthrough
- `EASIEST_STEPS_TO_RUN.md` - Setup instructions

