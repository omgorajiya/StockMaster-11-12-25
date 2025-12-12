# 📚 StockMaster Project - Complete Understanding Guide

## 🎯 What is StockMaster?

StockMaster is a **Warehouse Management System (WMS)** that helps you manage:
- **Products** - Your inventory items
- **Warehouses** - Storage locations
- **Stock Movements** - Receipts, Deliveries, Transfers, Adjustments
- **Operations** - Cycle Counts, Returns, Pick Waves
- **Tracking** - Move History, Audit Logs

---

## 🚀 Quick Start - Understanding the Project

### Step 1: Setup and Run Demo Data

```bash
# Navigate to backend directory
cd backend

# Run migrations (if not done)
python manage.py migrate

# Create demo data (IMPORTANT!)
python manage.py seed_demo_data

# Start backend server
python manage.py runserver

# In another terminal, navigate to frontend
cd frontend

# Install dependencies (if not done)
npm install

# Start frontend server
npm run dev
```

### Step 2: Login
- **URL**: http://localhost:3000/login
- **Email**: `demo@stockmaster.com`
- **Password**: `Demo1234!`

---

## 📖 Understanding Through Demo Data Example

### 🎬 Complete Workflow Example: "Laptop Order Fulfillment"

Follow this example to understand the entire system flow:

#### **Scenario**: Customer orders 2 laptops, we receive 10 from supplier, then ship 2 to customer

---

### **Step 1: View Products** 📦
**Navigate to**: Products (Sidebar)

**What you'll see:**
- **Laptop 15-inch** (SKU: LAP-001)
- **Tablet 11-inch Pro** (SKU: TAB-201)
- **Steel Rods** (SKU: STL-001)
- And more products...

**Understanding**: 
- Products are your inventory items
- Each has SKU, category, stock levels
- You can see current stock across all warehouses

**Try**: Click on "Laptop 15-inch" to see details

---

### **Step 2: View Warehouses** 🏢
**Navigate to**: Settings → Warehouse Management

**What you'll see:**
- **Main Warehouse** (WH-001)
- **Secondary Warehouse** (WH-002)
- **Micro Fulfillment Hub** (WH-003)

**Understanding**:
- Warehouses are storage locations
- Products are stored in warehouses
- You can transfer stock between warehouses

---

### **Step 3: Receipt - Stock Coming In** 📥
**Navigate to**: Receipts

**Demo Data Example:**
- **REC-000001**: Received 10 laptops from "Global Electronics"
- Status: **Done** (already validated)

**Understanding**:
1. **Receipt** = Stock coming INTO warehouse from supplier
2. When you create a receipt:
   - Select warehouse
   - Add products and quantities
   - Set status to "ready"
   - Click **Validate** → Stock increases automatically

**Try This**:
1. Click "New Receipt"
2. Select "Main Warehouse"
3. Add "Laptop 15-inch" with quantity 5
4. Save as "ready"
5. Go back to Receipts list
6. Click **Validate** button
7. Check Products page → Stock increased!

---

### **Step 4: Delivery - Stock Going Out** 📤
**Navigate to**: Deliveries

**Demo Data Example:**
- **DEL-000001**: Delivered 2 laptops to "Acme Corp"
- Status: **Done** (already validated)

**Understanding**:
1. **Delivery** = Stock going OUT to customer
2. When you create a delivery:
   - Select warehouse (where stock is)
   - Add customer info
   - Add products and quantities
   - Set status to "ready"
   - Click **Validate** → Stock decreases automatically

**Try This**:
1. Click "New Delivery"
2. Select "Main Warehouse"
3. Customer: "Test Customer"
4. Add "Laptop 15-inch" with quantity 1
5. Save as "ready"
6. Go back to Deliveries list
7. Click **Validate** button
8. Check Products page → Stock decreased!

---

### **Step 5: Transfer - Moving Stock Between Warehouses** 🔄
**Navigate to**: Transfers

**Demo Data Example:**
- **TRF-000001**: Transferred 50kg Steel Rods from Main to Secondary Warehouse
- Status: **Done**

**Understanding**:
1. **Transfer** = Moving stock from one warehouse to another
2. When you create a transfer:
   - Select source warehouse
   - Select destination warehouse
   - Add products and quantities
   - Set status to "ready"
   - Click **Validate** → Stock moves automatically

**Try This**:
1. Click "New Transfer"
2. From: "Main Warehouse"
3. To: "Secondary Warehouse"
4. Add "Tablet 11-inch Pro" with quantity 3
5. Save as "ready"
6. Click **Validate**
7. Check Products → Stock moved between warehouses!

---

### **Step 6: Adjustment - Correcting Stock** ⚖️
**Navigate to**: Adjustments

**Demo Data Example:**
- **ADJ-000001**: Adjusted box quantity (found 10 damaged boxes)
- Status: **Done**

**Understanding**:
1. **Adjustment** = Correcting stock when physical count differs
2. Types:
   - **Increase**: Add stock (found extra items)
   - **Decrease**: Remove stock (damaged/lost items)
   - **Set**: Set exact quantity (physical count)
3. When you create an adjustment:
   - Select warehouse
   - Choose adjustment type
   - Add reason
   - Add products and new quantities
   - Set status to "ready"
   - Click **Validate** → Stock updated

**Try This**:
1. Click "New Adjustment"
2. Select "Main Warehouse"
3. Type: "Decrease"
4. Reason: "Damaged items found"
5. Add "Laptop 15-inch" with quantity 1 (to decrease)
6. Save as "ready"
7. Click **Validate**
8. Check Products → Stock decreased!

---

### **Step 7: Cycle Count - Physical Inventory Check** 📊
**Navigate to**: Cycle Counts

**Demo Data Example:**
- **CC-000001**: Partial count scheduled for Main Warehouse
- Status: **Ready** (can be started)

**Understanding**:
1. **Cycle Count** = Physical inventory counting
2. Methods:
   - **Full**: Count everything
   - **Partial**: Count specific items
   - **ABC**: Count high-value items more frequently
3. Process:
   - Create cycle count task
   - Start counting (status: ready → picking)
   - Enter counted quantities
   - System compares with expected quantities
   - Generate adjustment if differences found
   - Complete cycle count

**Try This**:
1. Click on a cycle count task (e.g., CC-000001)
2. Click "Start" button
3. Enter counted quantities
4. Click "Save Counts"
5. If differences found, click "Complete" → Auto-generates adjustment

---

### **Step 8: Returns - Customer Returns** 🔙
**Navigate to**: Returns

**Demo Data Example:**
- **RET-000001**: Customer returned 1 laptop (restock)
- Status: **Done**

**Understanding**:
1. **Return** = Customer returning products
2. Dispositions:
   - **Restock**: Product is good, add back to stock
   - **Scrap**: Product damaged, don't add to stock
   - **Repair**: Product needs repair before restocking
3. When you create a return:
   - Link to original delivery (optional)
   - Select warehouse
   - Choose disposition
   - Add returned products
   - Set status to "ready"
   - Click **Validate** → Stock updated based on disposition

**Try This**:
1. Click "New Return"
2. Select "Main Warehouse"
3. Disposition: "Restock"
4. Reason: "Customer changed mind"
5. Add "Laptop 15-inch" with quantity 1
6. Save as "ready"
7. Click **Validate**
8. Check Products → Stock increased (if restock)!

---

### **Step 9: Pick Waves - Batch Picking** 📋
**Navigate to**: Pick Waves

**Demo Data Example:**
- **Morning Wave 001**: Multiple delivery orders grouped together
- Status: **Planned** or **Picking**

**Understanding**:
1. **Pick Wave** = Grouping multiple delivery orders for efficient picking
2. Process:
   - Create pick wave
   - System groups delivery orders
   - Shows consolidated pick list (all products needed)
   - Start picking
   - Complete picking
3. Benefits: Pick all items at once instead of order-by-order

**Try This**:
1. Click "New Pick Wave"
2. Select warehouse
3. System auto-groups ready delivery orders
4. Click on created pick wave
5. See consolidated pick list
6. Start picking → Complete picking

---

### **Step 10: Move History - Track Everything** 📜
**Navigate to**: Move History

**What you'll see:**
- All stock movements in chronological order
- Receipts, Deliveries, Transfers, Adjustments, Returns
- Shows: Date, Type, Product, Warehouse, Quantity, Balance

**Understanding**:
- Complete audit trail of all stock movements
- Filter by transaction type, warehouse, or search
- See stock balance after each transaction

**Try This**:
1. Filter by "receipt" → See all stock coming in
2. Filter by "delivery" → See all stock going out
3. Search by product SKU → See all movements for that product

---

### **Step 11: Audit Log - Who Did What** 🔍
**Navigate to**: Audit Log

**What you'll see:**
- All validation, approval, and change actions
- Shows: Timestamp, Document, Action, User, Message

**Understanding**:
- Tracks who validated documents
- Tracks approvals
- Tracks important changes
- Complete accountability

**Try This**:
1. Filter by document type: "receipt"
2. See all receipt validations
3. Filter by action: "validate"
4. See all validation actions

---

## 🎯 Key Concepts to Understand

### **1. Document Status Flow**
```
Draft → Waiting → Ready → Done
                    ↓
                Canceled
```

- **Draft**: Just created, not ready yet
- **Waiting**: Waiting for something (approval, stock, etc.)
- **Ready**: Ready to be validated/processed
- **Done**: Completed and stock updated
- **Canceled**: Cancelled, stock not updated

### **2. Stock Movement Types**

| Type | Stock Effect | Example |
|------|-------------|---------|
| **Receipt** | ➕ Increases | Supplier sends products |
| **Delivery** | ➖ Decreases | Ship to customer |
| **Transfer Out** | ➖ Decreases (source) | Move from Warehouse A |
| **Transfer In** | ➕ Increases (destination) | Move to Warehouse B |
| **Adjustment** | ➕➖ Changes | Physical count correction |
| **Return (Restock)** | ➕ Increases | Customer return (good condition) |
| **Return (Scrap)** | ➖ No change | Customer return (damaged) |

### **3. Validation Process**

**What happens when you click "Validate":**
1. System checks if document is "ready"
2. Checks if stock is available (for deliveries/transfers)
3. Updates stock quantities
4. Creates ledger entry (Move History)
5. Creates audit log entry
6. Changes status to "done"

---

## 📊 Best Demo Data Example to Understand

### **Complete Scenario: "Laptop Business Flow"**

#### **Initial State** (After running seed_demo_data)
- **Laptop 15-inch**: 40 units in Main Warehouse
- **Tablet 11-inch Pro**: 28 units in Main Warehouse

#### **Step-by-Step Flow:**

1. **Receipt** (Stock In)
   - Received 10 laptops from supplier
   - **Before**: 40 laptops
   - **After Validate**: 50 laptops ✅

2. **Delivery** (Stock Out)
   - Shipped 2 laptops to customer
   - **Before**: 50 laptops
   - **After Validate**: 48 laptops ✅

3. **Transfer** (Stock Move)
   - Moved 5 laptops to Secondary Warehouse
   - **Main Warehouse**: 48 → 43 laptops ✅
   - **Secondary Warehouse**: 0 → 5 laptops ✅

4. **Adjustment** (Stock Correction)
   - Found 1 damaged laptop, decrease by 1
   - **Before**: 43 laptops
   - **After Validate**: 42 laptops ✅

5. **Return** (Stock Back)
   - Customer returned 1 laptop (restock)
   - **Before**: 42 laptops
   - **After Validate**: 43 laptops ✅

6. **Cycle Count** (Physical Check)
   - Counted 45 laptops (expected 43)
   - **Difference**: +2 laptops
   - System creates adjustment automatically
   - **After**: 45 laptops ✅

7. **Check Move History**
   - See all 6 transactions listed
   - See stock balance after each transaction
   - Complete audit trail ✅

---

## 🗂️ Project Structure

```
StockMaster-Updated--main/
├── backend/              # Django REST API
│   ├── accounts/         # User authentication
│   ├── products/         # Products, Warehouses, Suppliers
│   ├── operations/       # Receipts, Deliveries, Transfers, etc.
│   ├── integrations/     # Webhooks, API integrations
│   └── notifications/    # Email/SMS notifications
│
├── frontend/             # Next.js React App
│   ├── app/              # Pages (routes)
│   │   ├── dashboard/    # Main dashboard
│   │   ├── products/     # Product management
│   │   ├── receipts/     # Receipt management
│   │   ├── deliveries/   # Delivery management
│   │   └── ...          # Other pages
│   ├── components/        # Reusable components
│   └── lib/              # API services, utilities
│
└── flask-service/        # Additional microservice (optional)
```

---

## 🔑 Key Files to Understand

### **Backend (Django)**
- `backend/operations/models.py` - All document models (Receipt, Delivery, etc.)
- `backend/operations/views.py` - API endpoints
- `backend/operations/management/commands/seed_demo_data.py` - Demo data generator

### **Frontend (Next.js)**
- `frontend/app/dashboard/page.tsx` - Main dashboard
- `frontend/app/products/page.tsx` - Products list
- `frontend/app/receipts/page.tsx` - Receipts list
- `frontend/lib/operations.ts` - API service functions
- `frontend/components/Layout.tsx` - Sidebar navigation

---

## 🎓 Learning Path

### **Day 1: Basics**
1. ✅ Run demo data
2. ✅ Login and explore dashboard
3. ✅ View Products and Warehouses
4. ✅ Understand KPI cards on dashboard

### **Day 2: Stock Movements**
1. ✅ Create a Receipt → Validate → See stock increase
2. ✅ Create a Delivery → Validate → See stock decrease
3. ✅ Create a Transfer → Validate → See stock move
4. ✅ Check Move History to see all transactions

### **Day 3: Advanced Operations**
1. ✅ Create an Adjustment → Validate
2. ✅ Create a Return → Validate
3. ✅ Create a Cycle Count → Complete it
4. ✅ Create a Pick Wave → Process it

### **Day 4: Tracking & Reports**
1. ✅ Explore Move History with filters
2. ✅ Check Audit Log
3. ✅ Use Saved Views (filter presets)
4. ✅ Check Analytics page

---

## 💡 Pro Tips

1. **Always check stock before delivery** - Make sure you have enough stock
2. **Use "ready" status** - Only ready documents can be validated
3. **Check Move History** - Always verify transactions were recorded
4. **Use filters** - Save time with saved views
5. **Validate in order** - Receipts before Deliveries (stock must exist)

---

## 🐛 Common Questions

**Q: Why can't I validate a delivery?**
A: Check if:
- Status is "ready" (not draft)
- Stock is available in the warehouse
- Products exist in the delivery items

**Q: Where did my stock go?**
A: Check Move History → Filter by product → See all movements

**Q: How do I correct wrong stock?**
A: Use Adjustment → Type "Set" → Enter correct quantity → Validate

**Q: Can I undo a validation?**
A: No, but you can create a reverse transaction (e.g., return for delivery)

---

## 📝 Next Steps

1. **Run the demo data**: `python manage.py seed_demo_data`
2. **Follow the "Laptop Business Flow" example above**
3. **Try creating your own transactions**
4. **Explore all navigation pages**
5. **Check Move History after each transaction**

---

## 🎉 You're Ready!

You now understand:
- ✅ How stock moves in and out
- ✅ How to track everything
- ✅ How to correct mistakes
- ✅ How the system works end-to-end

**Happy Managing! 🚀**

