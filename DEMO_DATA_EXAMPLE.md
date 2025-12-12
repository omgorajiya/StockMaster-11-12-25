# 🎬 StockMaster - Complete Demo Data Example

## 📋 Scenario: "Complete Laptop Business Cycle"

This example walks you through a complete business cycle using demo data to understand every feature.

---

## 🎯 Setup Instructions

### 1. Seed Demo Data
```bash
cd backend
python manage.py seed_demo_data
```

This creates:
- ✅ 3 Warehouses
- ✅ 10 Products (including Laptops, Tablets, etc.)
- ✅ 4 Suppliers
- ✅ Initial stock levels
- ✅ Sample receipts, deliveries, transfers, adjustments
- ✅ Cycle counts, returns, pick waves
- ✅ Audit log entries

### 2. Login
- **URL**: http://localhost:3000
- **Email**: `demo@stockmaster.com`
- **Password**: `Demo1234!`

---

## 📖 Complete Example Walkthrough

### **PART 1: Understanding Current State**

#### Step 1: Check Products
**Navigate**: Products → Search "Laptop"

**You'll see:**
- **Laptop 15-inch** (SKU: LAP-001)
- Current Stock: **40 units** (in Main Warehouse)
- Status: Active
- Category: Electronics

**Understanding**: This is your starting inventory.

---

#### Step 2: Check Warehouses
**Navigate**: Settings → Warehouse Management

**You'll see:**
- **Main Warehouse** (WH-001) - Primary storage
- **Secondary Warehouse** (WH-002) - Backup storage
- **Micro Fulfillment Hub** (WH-003) - Fast fulfillment

**Understanding**: Products are stored in these locations.

---

### **PART 2: Stock Coming In (Receipt)**

#### Step 3: View Existing Receipts
**Navigate**: Receipts

**Demo Receipt Example:**
- **REC-000001**: Received 10 laptops from "Global Electronics"
- Warehouse: Main Warehouse
- Status: **Done** ✅
- This receipt was already validated, so stock was increased

**What Happened:**
- Before: 0 laptops
- After: 10 laptops (then more were added, now showing 40)

#### Step 4: Create New Receipt (Try It!)
1. Click **"New Receipt"**
2. Select:
   - Warehouse: **Main Warehouse**
   - Supplier: **Global Electronics**
   - Status: **Ready**
3. Add Item:
   - Product: **Laptop 15-inch**
   - Quantity Ordered: **5**
   - Quantity Received: **5**
   - Unit Price: **$800**
4. Click **Save**
5. Go back to Receipts list
6. Find your receipt → Click **"Validate"** button
7. **Result**: 
   - Stock increases from 40 → 45 laptops
   - Status changes to "Done"
   - Entry appears in Move History

**Check**: Go to Products → Laptop stock should be 45!

---

### **PART 3: Stock Going Out (Delivery)**

#### Step 5: View Existing Deliveries
**Navigate**: Deliveries

**Demo Delivery Example:**
- **DEL-000001**: Delivered 2 laptops to "Acme Corp"
- Warehouse: Main Warehouse
- Status: **Done** ✅

**What Happened:**
- Stock decreased when validated

#### Step 6: Create New Delivery (Try It!)
1. Click **"New Delivery"**
2. Select:
   - Warehouse: **Main Warehouse** (where stock is)
   - Customer: **Test Customer**
   - Status: **Ready**
3. Add Item:
   - Product: **Laptop 15-inch**
   - Quantity: **2**
4. Click **Save**
5. Go back to Deliveries list
6. Find your delivery → Click **"Validate"** button
7. **Result**:
   - Stock decreases from 45 → 43 laptops
   - Status changes to "Done"
   - Entry appears in Move History

**Check**: Go to Products → Laptop stock should be 43!

---

### **PART 4: Moving Stock (Transfer)**

#### Step 7: View Existing Transfers
**Navigate**: Transfers

**Demo Transfer Example:**
- **TRF-000001**: Transferred 50kg Steel Rods
- From: Main Warehouse
- To: Secondary Warehouse
- Status: **Done** ✅

#### Step 8: Create New Transfer (Try It!)
1. Click **"New Transfer"**
2. Select:
   - From Warehouse: **Main Warehouse**
   - To Warehouse: **Secondary Warehouse**
   - Status: **Ready**
3. Add Item:
   - Product: **Laptop 15-inch**
   - Quantity: **3**
4. Click **Save**
5. Go back to Transfers list
6. Find your transfer → Click **"Validate"** button
7. **Result**:
   - Main Warehouse: 43 → 40 laptops ✅
   - Secondary Warehouse: 0 → 3 laptops ✅
   - Entry appears in Move History (2 entries: transfer_out and transfer_in)

**Check**: 
- Main Warehouse: 40 laptops
- Secondary Warehouse: 3 laptops

---

### **PART 5: Correcting Stock (Adjustment)**

#### Step 9: View Existing Adjustments
**Navigate**: Adjustments

**Demo Adjustment Example:**
- **ADJ-000001**: Adjusted box quantity (found 10 damaged)
- Type: **Set** (set exact quantity)
- Status: **Done** ✅

#### Step 10: Create New Adjustment (Try It!)
1. Click **"New Adjustment"**
2. Select:
   - Warehouse: **Main Warehouse**
   - Type: **Decrease** (found damaged item)
   - Reason: **"Found 1 damaged laptop during inspection"**
   - Status: **Ready**
3. Add Item:
   - Product: **Laptop 15-inch**
   - Current Quantity: **40** (system shows current)
   - Adjustment Quantity: **1** (decrease by 1)
4. Click **Save**
5. Go back to Adjustments list
6. Find your adjustment → Click **"Validate"** button
7. **Result**:
   - Stock decreases from 40 → 39 laptops
   - Status changes to "Done"
   - Entry appears in Move History

**Check**: Go to Products → Laptop stock should be 39!

---

### **PART 6: Customer Returns**

#### Step 11: View Existing Returns
**Navigate**: Returns

**Demo Return Example:**
- **RET-000001**: Customer returned 1 laptop
- Disposition: **Restock** (product is good)
- Status: **Done** ✅

**What Happened:**
- Stock increased when validated (because restock)

#### Step 12: Create New Return (Try It!)
1. Click **"New Return"**
2. Select:
   - Warehouse: **Main Warehouse**
   - Disposition: **Restock** (product is in good condition)
   - Reason: **"Customer changed mind, product unused"**
   - Status: **Ready**
3. Add Item:
   - Product: **Laptop 15-inch**
   - Quantity: **1**
4. Click **Save**
5. Go back to Returns list
6. Find your return → Click **"Validate"** button
7. **Result**:
   - Stock increases from 39 → 40 laptops (restock)
   - Status changes to "Done"
   - Entry appears in Move History

**Check**: Go to Products → Laptop stock should be 40!

---

### **PART 7: Physical Inventory (Cycle Count)**

#### Step 13: View Cycle Counts
**Navigate**: Cycle Counts

**Demo Cycle Count Example:**
- **CC-000001**: Partial count for Main Warehouse
- Method: **Partial** (count specific items)
- Status: **Ready** (can be started)

#### Step 14: Complete Cycle Count (Try It!)
1. Click on a cycle count task (e.g., CC-000001)
2. You'll see:
   - Expected Quantity: **40** (system stock)
   - Counted Quantity: **0** (you need to enter)
3. Enter Counted Quantity: **42** (you counted 42 laptops)
4. Click **"Save Counts"**
5. System shows: **Variance: +2** (found 2 extra)
6. Click **"Complete"** button
7. **Result**:
   - System creates automatic adjustment
   - Stock updated to 42 laptops
   - Cycle count status: **Done**

**Check**: Go to Products → Laptop stock should be 42!

---

### **PART 8: Batch Picking (Pick Waves)**

#### Step 15: View Pick Waves
**Navigate**: Pick Waves

**Demo Pick Wave Example:**
- **Morning Wave 001**: Multiple delivery orders grouped
- Status: **Planned** or **Picking**

**Understanding**: Instead of picking orders one-by-one, group them for efficiency.

#### Step 16: Create Pick Wave (Try It!)
1. Click **"New Pick Wave"**
2. Select:
   - Warehouse: **Main Warehouse**
   - Date Range: Today
3. System automatically finds ready delivery orders
4. Click **"Generate Pick Wave"**
5. **Result**:
   - Pick wave created with multiple orders
   - Shows consolidated pick list (all products needed)
6. Click on the pick wave
7. See consolidated list:
   - Product: Laptop 15-inch
   - Total Quantity: 5 (from 2 orders)
   - Pick from: Bin A1-01
8. Click **"Start Picking"** → Status: Picking
9. After picking, click **"Complete"** → Status: Completed

---

### **PART 9: Tracking Everything**

#### Step 17: Move History - Complete Audit Trail
**Navigate**: Move History

**What You'll See:**
All your transactions in chronological order:

| Date | Type | Product | Warehouse | Quantity | Balance |
|------|------|---------|-----------|----------|---------|
| Today 10:00 | RECEIPT | Laptop | Main | +5 | 45 |
| Today 11:00 | DELIVERY | Laptop | Main | -2 | 43 |
| Today 12:00 | TRANSFER_OUT | Laptop | Main | -3 | 40 |
| Today 12:00 | TRANSFER_IN | Laptop | Secondary | +3 | 3 |
| Today 13:00 | ADJUSTMENT | Laptop | Main | -1 | 39 |
| Today 14:00 | RETURN | Laptop | Main | +1 | 40 |
| Today 15:00 | ADJUSTMENT | Laptop | Main | +2 | 42 |

**Understanding**:
- Every transaction is recorded
- You can see stock balance after each transaction
- Filter by type, warehouse, or search

**Try This**:
1. Filter by "receipt" → See all stock coming in
2. Filter by "delivery" → See all stock going out
3. Search "LAP-001" → See all laptop movements
4. Filter by "Main Warehouse" → See all movements in that warehouse

---

#### Step 18: Audit Log - Who Did What
**Navigate**: Audit Log

**What You'll See:**
All validation and approval actions:

| Timestamp | Document | Action | User | Message |
|-----------|----------|--------|------|---------|
| Today 10:05 | receipt #1 | validate | demo@... | Receipt validated and stock updated |
| Today 11:10 | deliveryorder #1 | validate | demo@... | Delivery validated and stock reduced |
| Today 12:15 | internaltransfer #1 | validate | demo@... | Internal transfer validated |

**Understanding**:
- Complete accountability
- See who validated what
- Track all important actions

**Try This**:
1. Filter by document_type: "receipt"
2. See all receipt validations
3. Filter by action: "validate"
4. See all validation actions

---

## 🎯 Complete Flow Summary

### **Starting Point**
- Laptop Stock: **40 units** (Main Warehouse)

### **Transactions Made**
1. ✅ **Receipt**: +5 laptops → **45 total**
2. ✅ **Delivery**: -2 laptops → **43 total**
3. ✅ **Transfer**: -3 laptops (Main) +3 (Secondary) → **40 Main, 3 Secondary**
4. ✅ **Adjustment**: -1 laptop (damaged) → **39 Main**
5. ✅ **Return**: +1 laptop (restock) → **40 Main**
6. ✅ **Cycle Count**: Found +2 laptops → **42 Main**

### **Final State**
- Main Warehouse: **42 laptops**
- Secondary Warehouse: **3 laptops**
- **Total**: 45 laptops across all warehouses

### **Verification**
- ✅ Move History shows all 6+ transactions
- ✅ Audit Log shows all validations
- ✅ Products page shows correct stock
- ✅ Everything is tracked and auditable

---

## 💡 Key Learnings

### **1. Stock Flow**
```
Receipt → Stock IN (+)
Delivery → Stock OUT (-)
Transfer → Stock MOVES (between warehouses)
Adjustment → Stock CORRECTED
Return → Stock BACK (if restock)
Cycle Count → Stock VERIFIED
```

### **2. Validation Process**
- Only "ready" status documents can be validated
- Validation updates stock automatically
- Creates Move History entry
- Creates Audit Log entry
- Changes status to "done"

### **3. Status Flow**
```
Draft → Waiting → Ready → Done
                    ↓
                Canceled
```

### **4. Always Check**
- ✅ Stock availability before delivery
- ✅ Move History after validation
- ✅ Products page to verify stock
- ✅ Audit Log for accountability

---

## 🎓 Practice Exercises

### **Exercise 1: Complete Order Fulfillment**
1. Create receipt for 10 tablets
2. Validate receipt
3. Create delivery for 3 tablets
4. Validate delivery
5. Check stock: Should be 7 tablets
6. Check Move History: Should show both transactions

### **Exercise 2: Warehouse Rebalancing**
1. Check stock in Main Warehouse
2. Create transfer: Move 5 items to Secondary
3. Validate transfer
4. Check stock in both warehouses
5. Verify in Move History (2 entries: out and in)

### **Exercise 3: Stock Correction**
1. Create adjustment: Found 2 extra items
2. Type: Increase, Quantity: 2
3. Validate adjustment
4. Check stock increased
5. Verify in Move History

---

## 🚀 You're Now an Expert!

After following this example, you understand:
- ✅ How stock moves in and out
- ✅ How to track everything
- ✅ How to correct mistakes
- ✅ How the complete system works

**Start with the demo data and follow the steps above!** 🎉

