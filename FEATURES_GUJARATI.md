# StockMaster - ફીચર વર્ણન અને ચલાવવાના સરળ પગલાં

## 🎯 મુખ્ય ફીચર્સનું વર્ણન (Gujarati)

### 🤖 AI (કૃત્રિમ બુદ્ધિ) ફીચર્સ

StockMaster માં **StockInfo-AI** નામનું એક શક્તિશાળી AI સહાયક છે જે તમારા વેરહાઉસની સંપૂર્ણ માહિતી સમજે છે અને તમને સ્માર્ટ સૂચનો આપે છે. આ AI સિસ્ટમ તમારા ઇન્વેન્ટરી ડેટાનું વિશ્લેષણ કરીને stockout, safety stock, અને returns જેવા મુદ્દાઓ વિશે પૂર્વાનુમાનિત સૂચનો આપે છે. તમે કુદરતી ભાષામાં પ્રશ્નો પૂછી શકો છો જેમ કે "આ અઠવાડિયે stockout કેમ વધ્યા?" અને AI તમને વિગતવાર જવાબ આપશે. આ સિસ્ટમમાં **Predictive Risk Radar** પણ છે જે આગામી 3 દિવસ, 2 અઠવાડિયા, અથવા 30 દિવસમાં થઈ શકે તેવા જોખમો વિશે તમને ચેતવણી આપે છે. વધુમાં, **Dynamic Anomaly Detection Feed** તમારા ઇન્વેન્ટરી પેટર્નમાં અસામાન્યતાઓ શોધી કાઢે છે અને તમને સૂચના આપે છે, જેમ કે returns spike, pick time anomalies, અને cycle count variances. આ બધું તમારા વેરહાઉસની કાર્યક્ષમતા વધારવા માટે છે.

### 📦 Storage Navigation Bar (સંગ્રહ નેવિગેશન બાર)

StockMaster માં **સરળ અને સહજ નેવિગેશન સિસ્ટમ** છે જે તમને એક જગ્યાએથી બધા મોડ્યુલ્સ સુધી ઝડપથી પહોંચવાની સુવિધા આપે છે. ડાબી બાજુની sidebar માં તમે Dashboard, Products, Receipts, Deliveries, Transfers, Adjustments, Cycle Counts, Returns, Pick Waves, Suppliers, Storage, Analytics, History, Audit Log, અને Settings જેવા બધા મુખ્ય વિભાગો જોઈ શકો છો. **Storage** વિભાગમાં તમે તમારા બધા products ની live inventory levels જોઈ શકો છો, search અને filter દ્વારા ઝડપથી products શોધી શકો છો, અને દરેક product ની stock status, reorder level, અને category માહિતી જોઈ શકો છો. Navigation bar collapsible છે, જેનો અર્થ છે કે તમે તેને minimize કરીને વધુ જગ્યા મેળવી શકો છો. દરેક menu item પર icon છે જે visual recognition માટે મદદ કરે છે અને active page highlight થાય છે જેથી તમે જાણી શકો કે તમે કયા પેજ પર છો.

### 📊 સરળ અને સમજાય તેવું Dashboard UX

Dashboard એ **Operations Command Center** છે જે તમને તમારા વેરહાઉસની સંપૂર્ણ તસ્વીર એક નજરમાં બતાવે છે. ટોપ પર તમને **KPI Cards** મળે છે જેમાં Total Products, Low Stock Items, Out of Stock, Pending Receipts, Pending Deliveries, અને Scheduled Transfers ની સંખ્યા દર્શાવવામાં આવે છે. આ cards clickable છે અને તમને સંબંધિત વિભાગ પર લઈ જાય છે. **Inventory Health Score** એક composite score છે જે તમારા ઇન્વેન્ટરીની સામાન્ય સ્થિતિ બતાવે છે - જે 90 થી વધુ હોવું જોઈએ. **Recent Flow Mix Chart** તમને receipts, deliveries, અને transfers ની breakdown visual રીતે બતાવે છે. **Stock Health Pie Chart** તમને healthy, low stock, અને out of stock products નું percentage બતાવે છે. **Real-Time Flow Timeline** તમને દિવસ દરમિયાનની activities ની timeline બતાવે છે. **Workforce & Equipment Utilization** section તમને pickers, forklifts, pack stations, અને dock capacity ની utilization percentage બતાવે છે. બધું color-coded છે - લીલો healthy માટે, પીળો low stock માટે, અને લાલ out of stock માટે. Dashboard responsive છે, જેનો અર્થ છે કે તે mobile, tablet, અને desktop પર સરસ દેખાય છે.

---

## 🚀 પ્રોજેક્ટ ચલાવવાના સરળ પગલાં

### પગલું 1: Prerequisites તપાસો

1. **Python 3.10+** installed છે કે નહીં તપાસો:
   ```bash
   python --version
   ```

2. **Node.js 18+** installed છે કે નહીં તપાસો:
   ```bash
   node --version
   npm --version
   ```

3. **MongoDB** running છે કે નહીં તપાસો (default port: 27017)

### પગલું 2: Backend (Django) Setup

1. **Terminal ખોલો** અને backend folder માં જાઓ:
   ```bash
   cd backend
   ```

2. **Virtual environment activate કરો** (જો પહેલેથી બનાવેલું હોય):
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Dependencies install કરો** (જો પહેલેથી ન હોય):
   ```bash
   pip install -r requirements.txt
   ```

4. **.env file બનાવો** backend folder માં (જો ન હોય):
   - File નું નામ: `.env`
   - Content:
     ```
     SECRET_KEY=django-insecure-change-this-in-production-12345
     DEBUG=True
     DB_NAME=stockmaster
     MONGODB_URI=mongodb://localhost:27017/
     JWT_SECRET_KEY=your-jwt-secret-key-here-12345
     ```

5. **Migrations run કરો**:
   ```bash
   python manage.py migrate
   ```

6. **Superuser બનાવો** (જો પહેલેથી ન હોય):
   ```bash
   python manage.py createsuperuser
   ```

7. **Django server ચલાવો**:
   ```bash
   python manage.py runserver
   ```
   
   ✅ Backend running on: **http://localhost:8000**

### પગલું 3: Frontend (Next.js) Setup

1. **નવું Terminal window ખોલો** (backend server running રાખો)

2. **Frontend folder માં જાઓ**:
   ```bash
   cd frontend
   ```

3. **Dependencies install કરો** (જો પહેલેથી ન હોય):
   ```bash
   npm install
   ```

4. **.env.local file બનાવો** frontend folder માં (જો ન હોય):
   - File નું નામ: `.env.local`
   - Content:
     ```
     NEXT_PUBLIC_API_URL=http://localhost:8000/api
     ```

5. **Next.js server ચલાવો**:
   ```bash
   npm run dev
   ```
   
   ✅ Frontend running on: **http://localhost:3000**

### પગલું 4: Application Access કરો

1. **Browser ખોલો** અને જાઓ: **http://localhost:3000**

2. **Login કરો**:
   - તમે બનાવેલ superuser credentials વાપરો
   - અથવા "Create your account" ક્લિક કરીને નવું account બનાવો

3. **Dashboard જુઓ** - તમે તમારા Operations Command Center જોઈ શકો છો!

### પગલું 5: (Optional) Flask Service

જો તમે reporting features ચાહો છો:

1. **નવું Terminal window ખોલો**

2. **Flask service folder માં જાઓ**:
   ```bash
   cd flask-service
   ```

3. **Virtual environment activate કરો**:
   ```bash
   venv\Scripts\activate  # Windows
   # OR
   source venv/bin/activate  # macOS/Linux
   ```

4. **Dependencies install કરો**:
   ```bash
   pip install -r requirements.txt
   ```

5. **.env file બનાવો**:
   ```
   MONGODB_URI=mongodb://localhost:27017/
   DB_NAME=stockmaster
   FLASK_ENV=development
   FLASK_PORT=5000
   ```

6. **Flask server ચલાવો**:
   ```bash
   python app.py
   ```
   
   ✅ Flask service running on: **http://localhost:5000**

---

## 📝 Quick Reference

### Backend ચલાવવા માટે:
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

### Frontend ચલાવવા માટે:
```bash
cd frontend
npm run dev
```

### બંને servers બંધ કરવા માટે:
- Terminal માં `Ctrl+C` press કરો

---

## ✅ Checklist

- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed  
- [ ] MongoDB running
- [ ] Backend .env file created
- [ ] Frontend .env.local file created
- [ ] Django migrations run
- [ ] Superuser created
- [ ] Backend server running (port 8000)
- [ ] Frontend server running (port 3000)

---

## 🎉 તમે તૈયાર છો!

**http://localhost:3000** પર જાઓ અને તમારા inventory management ની શરૂઆત કરો!

---

**નોંધ**: જો કોઈ error આવે, તો terminal માં error message જુઓ અને troubleshooting section check કરો.

