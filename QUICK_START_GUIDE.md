# ⚡ StockMaster - Quick Start Guide

## 🎯 5-Minute Quick Start

### Step 1: Setup Demo Data
```bash
cd backend
python manage.py seed_demo_data
```

### Step 2: Login
- URL: http://localhost:3000
- Email: `demo@stockmaster.com`
- Password: `Demo1234!`

### Step 3: Follow This Simple Example

**Scenario**: Track a laptop from supplier to customer

1. **View Products** → See "Laptop 15-inch" (40 units in stock)
2. **Receipts** → Click "Validate" on a ready receipt → Stock increases
3. **Deliveries** → Click "Validate" on a ready delivery → Stock decreases
4. **Move History** → See all transactions listed
5. **Products** → Verify stock changed correctly

**That's it! You understand the basics!** ✅

---

## 📚 Complete Guides Available

1. **PROJECT_UNDERSTANDING_GUIDE.md** - Complete step-by-step guide
2. **DEMO_DATA_EXAMPLE.md** - Detailed walkthrough with demo data
3. **QUICK_START_GUIDE.md** - This file (quick reference)

---

## 🎬 Best Example to Understand: "Laptop Journey"

### The Complete Flow:

```
1. RECEIPT (Stock IN)
   Supplier → Warehouse
   Stock: 40 → 45 laptops ✅

2. DELIVERY (Stock OUT)
   Warehouse → Customer
   Stock: 45 → 43 laptops ✅

3. TRANSFER (Stock MOVE)
   Main Warehouse → Secondary Warehouse
   Main: 43 → 40, Secondary: 0 → 3 ✅

4. ADJUSTMENT (Stock CORRECT)
   Found damaged item
   Stock: 40 → 39 laptops ✅

5. RETURN (Stock BACK)
   Customer returns good product
   Stock: 39 → 40 laptops ✅

6. CYCLE COUNT (Stock VERIFY)
   Physical count found 42
   Stock: 40 → 42 laptops ✅
```

**Check Move History** → See all 6 transactions! 📜

---

## 🔑 Key Concepts (One-Liners)

- **Receipt** = Stock coming IN from supplier
- **Delivery** = Stock going OUT to customer
- **Transfer** = Stock moving BETWEEN warehouses
- **Adjustment** = Correcting stock (found/lost items)
- **Return** = Customer returning products
- **Cycle Count** = Physical inventory check
- **Pick Wave** = Group orders for batch picking
- **Move History** = Complete audit trail
- **Audit Log** = Who did what, when

---

## 🎓 Learning Path

### Beginner (30 minutes)
1. ✅ Run demo data
2. ✅ Login and explore dashboard
3. ✅ View Products and Warehouses
4. ✅ Validate one receipt
5. ✅ Validate one delivery
6. ✅ Check Move History

### Intermediate (1 hour)
1. ✅ Create your own receipt
2. ✅ Create your own delivery
3. ✅ Create a transfer
4. ✅ Create an adjustment
5. ✅ Check all in Move History

### Advanced (2 hours)
1. ✅ Complete a cycle count
2. ✅ Process a return
3. ✅ Create a pick wave
4. ✅ Use saved views
5. ✅ Check audit logs

---

## 💡 Pro Tips

1. **Always validate in order**: Receipts before Deliveries
2. **Check stock before delivery**: Make sure you have enough
3. **Use Move History**: Verify everything was recorded
4. **Check Audit Log**: See who did what
5. **Use filters**: Save time with saved views

---

## 🐛 Quick Troubleshooting

**Can't validate?**
- Check status is "ready" (not draft)
- Check stock is available
- Check products exist

**Stock wrong?**
- Check Move History for all transactions
- Create adjustment to correct
- Verify in Products page

**Where's my data?**
- Check Move History (all transactions)
- Check Audit Log (all actions)
- Use filters to find specific items

---

## 📖 Full Documentation

For complete understanding, read:
- **PROJECT_UNDERSTANDING_GUIDE.md** - Complete guide
- **DEMO_DATA_EXAMPLE.md** - Step-by-step example

---

**Ready to start? Run the demo data and follow the "Laptop Journey" example above!** 🚀
