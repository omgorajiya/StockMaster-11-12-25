# 📦 How to Reduce Stock Using Delivery Navigation Bar

## 🎯 Complete Step-by-Step Guide

This guide shows you exactly how to reduce product stock using the **Deliveries** feature in StockMaster.

---

## 📋 **Step 1: Navigate to Deliveries**

1. **Open the left sidebar** (navigation bar)
2. **Click on "Deliveries"** (truck icon 🚚)
3. You'll see the **Delivery Orders** page with a list of all deliveries

---

## ➕ **Step 2: Create a New Delivery**

1. **Click the "New Delivery" button** (top right, blue button with + icon)
2. You'll be taken to the **Create New Delivery** page

---

## 📝 **Step 3: Fill in Delivery Information**

Fill in the required fields:

### **Basic Information:**
- **Warehouse** * (Required)
  - Select the warehouse from which stock will be reduced
  - Example: "Main Warehouse (WH-001)"

- **Customer** * (Required)
  - Enter the customer name
  - Example: "ABC Company"

- **Customer Reference** (Optional)
  - Enter customer's order reference number
  - Example: "PO-12345"

- **Shipping Address** (Optional)
  - Enter delivery address

- **Status** (Dropdown)
  - **Draft** - Still working on it (can edit)
  - **Waiting** - Needs approval
  - **Ready** - Ready to process (⚠️ **Use this to reduce stock**)

- **Notes** (Optional)
  - Add any additional notes

---

## 📦 **Step 4: Add Products to Deliver**

1. **Click "Add Item" button** (below the form fields)

2. **For each item, fill in:**
   - **Product** * (Required)
     - Select product from dropdown
     - Example: "Laptop 15-inch (LAP-001)"
   
   - **Quantity** * (Required)
     - Enter how many units to deliver
     - Example: 5
     - ⚠️ **This is the amount that will be REDUCED from stock**
   
   - **Unit** (Dropdown)
     - **Stock unit** - Uses the product's stock unit
     - **Purchase unit** - Converts automatically using conversion factor
   
   - **Bin** (Optional)
     - Select specific bin location if using bin-level tracking

3. **Add more items** by clicking "Add Item" again

4. **Remove items** by clicking the trash icon (🗑️) next to any item

---

## 💾 **Step 5: Save the Delivery**

1. **Click "Create Delivery" button** (bottom of form)
2. You'll see a success message: "Delivery created successfully"
3. You'll be redirected to the **Deliveries list page**

---

## ✅ **Step 6: Validate the Delivery (This Reduces Stock!)**

**⚠️ IMPORTANT:** Stock is only reduced when you **Validate** a delivery with status **"Ready"**!

1. **On the Deliveries list page**, find your delivery
2. **Check the Status column:**
   - If status is **"Draft"** or **"Waiting"**:
     - Click on the delivery to edit it
     - Change status to **"Ready"**
     - Save the changes
     - Go back to the list

3. **When status is "Ready":**
   - You'll see a **green "Validate" button** (with checkmark icon ✓)
   - **Click the "Validate" button**

4. **What happens:**
   - ✅ System checks if stock is available
   - ✅ Stock is reduced from the warehouse
   - ✅ Status changes to **"Done"**
   - ✅ Entry is created in Move History
   - ✅ You'll see success message: "Delivery validated successfully"

---

## 🔍 **Step 7: Verify Stock Reduction**

1. **Go to "Products"** in the navigation bar
2. **Find the product** you delivered
3. **Check the stock quantity** - it should be reduced!
4. **Or go to "Move History"** to see the transaction:
   - Transaction Type: "Delivery"
   - Quantity: Negative (shows reduction)
   - Document Number: Your delivery number

---

## 📊 **Example: Reducing Stock for "Laptop 15-inch"**

### **Before Delivery:**
- Product: Laptop 15-inch
- Stock: 40 units (in Main Warehouse)

### **Create Delivery:**
1. Navigate: **Deliveries** → **New Delivery**
2. Warehouse: **Main Warehouse**
3. Customer: **ABC Company**
4. Status: **Ready**
5. Add Item:
   - Product: **Laptop 15-inch**
   - Quantity: **5**
6. Click **"Create Delivery"**

### **Validate Delivery:**
1. Go to **Deliveries** list
2. Find your delivery (status: "Ready")
3. Click **"Validate"** button

### **After Delivery:**
- Product: Laptop 15-inch
- Stock: **35 units** (reduced from 40)
- ✅ Stock successfully reduced!

---

## ⚠️ **Important Notes**

### **Stock Availability Check:**
- System **automatically checks** if you have enough stock
- If stock is insufficient, validation will **fail** with error message
- Example: "Insufficient stock for Laptop 15-inch. Available: 3, Required: 5"

### **Status Flow:**
```
Draft → Waiting → Ready → Done
                ↑
         (Stock reduced here)
```

### **Stock Reduction Rules:**
1. ✅ Stock is reduced from the **selected warehouse**
2. ✅ Quantity must be **greater than 0**
3. ✅ Stock must be **available** (can't deliver more than you have)
4. ✅ System checks **available quantity** (total - reserved)
5. ✅ Reduction happens **only when you click Validate**

### **What Gets Reduced:**
- **Warehouse-level stock** (StockItem.quantity)
- **Bin-level stock** (if bin is specified)
- **Available quantity** (not reserved quantity)

---

## 🎯 **Quick Reference**

| Action | Location | Result |
|--------|----------|--------|
| Create Delivery | Deliveries → New Delivery | Creates delivery order (doesn't reduce stock yet) |
| Set Status to Ready | Edit delivery → Change status | Makes delivery ready for validation |
| **Validate Delivery** | Deliveries list → Validate button | **✅ REDUCES STOCK** |
| Check Stock | Products → View product | See updated stock quantity |
| View History | Move History | See all stock movements |

---

## 🐛 **Troubleshooting**

### **"Validate" button not showing?**
- ✅ Check delivery status is **"Ready"**
- ✅ If status is "Draft" or "Waiting", edit it and change to "Ready"

### **Validation fails with "Insufficient stock"?**
- ✅ Check current stock in Products page
- ✅ Reduce the delivery quantity
- ✅ Or create a Receipt first to add stock

### **Stock not reducing?**
- ✅ Make sure you clicked **"Validate"** (not just "Save")
- ✅ Check delivery status is **"Done"** after validation
- ✅ Verify in Move History that transaction was recorded

---

## 💡 **Pro Tips**

1. **Always check stock before creating delivery:**
   - Go to Products → Check current stock
   - Make sure you have enough before creating delivery

2. **Use "Ready" status for immediate processing:**
   - Set status to "Ready" when creating
   - This allows immediate validation

3. **Check Move History after validation:**
   - Verify the transaction was recorded
   - See exact quantity reduced

4. **Use bin locations for better tracking:**
   - Specify bin when adding items
   - Helps with warehouse organization

---

## 🎉 **Summary**

**To reduce stock using Deliveries:**

1. ✅ Navigate to **Deliveries** (navigation bar)
2. ✅ Click **"New Delivery"**
3. ✅ Fill in warehouse, customer, and items
4. ✅ Set status to **"Ready"**
5. ✅ Click **"Create Delivery"**
6. ✅ Go back to Deliveries list
7. ✅ Click **"Validate"** button (green button with checkmark)
8. ✅ **Stock is reduced!** ✅

**That's it! Your stock has been reduced successfully!** 🎊

---

**Need more help?** Check:
- `HOW_IT_WORKS_GUIDE.md` - General project guide
- `COMPREHENSIVE_FIXES_COMPLETE.md` - All fixes and improvements

