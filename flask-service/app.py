from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import pandas as pd
from io import BytesIO

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'stockmaster')

try:
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    print(f"Connected to MongoDB: {DB_NAME}")
except Exception as e:
    print(f"MongoDB connection error: {e}")
    db = None


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'flask-reports'})


@app.route('/api/reports/stock-summary', methods=['GET'])
def stock_summary():
    """Generate stock summary report"""
    if not db:
        return jsonify({'error': 'Database not connected'}), 500

    try:
        # Get all products with stock
        products = list(db.products.find({'is_active': True}))
        stock_items = list(db.products_stockitem.find())

        # Calculate summary
        total_products = len(products)
        total_stock_value = 0
        low_stock_count = 0
        out_of_stock_count = 0

        for product in products:
            product_stock = sum(
                item['quantity'] for item in stock_items
                if item.get('product_id') == product.get('_id')
            )
            if product_stock == 0:
                out_of_stock_count += 1
            elif product_stock <= product.get('reorder_level', 0):
                low_stock_count += 1

        return jsonify({
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'total_stock_items': len(stock_items),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/movement-history', methods=['GET'])
def movement_history():
    """Get movement history report"""
    if not db:
        return jsonify({'error': 'Database not connected'}), 500

    try:
        warehouse_id = request.args.get('warehouse_id')
        product_id = request.args.get('product_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = {}
        if warehouse_id:
            query['warehouse_id'] = warehouse_id
        if product_id:
            query['product_id'] = product_id
        if start_date:
            query['created_at'] = {'$gte': datetime.fromisoformat(start_date)}
        if end_date:
            if 'created_at' in query:
                query['created_at']['$lte'] = datetime.fromisoformat(end_date)
            else:
                query['created_at'] = {'$lte': datetime.fromisoformat(end_date)}

        ledger = list(db.operations_stockledger.find(query).sort('created_at', -1).limit(100))

        return jsonify({
            'count': len(ledger),
            'results': ledger
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/export-excel', methods=['GET'])
def export_excel():
    """Export stock report to Excel"""
    if not db:
        return jsonify({'error': 'Database not connected'}), 500

    try:
        products = list(db.products.find({'is_active': True}))
        stock_items = list(db.products_stockitem.find())

        # Prepare data
        data = []
        for product in products:
            product_stock = sum(
                item['quantity'] for item in stock_items
                if item.get('product_id') == product.get('_id')
            )
            data.append({
                'SKU': product.get('sku', ''),
                'Name': product.get('name', ''),
                'Category': product.get('category_name', ''),
                'Stock': product_stock,
                'Unit': product.get('unit_of_measure', ''),
                'Reorder Level': product.get('reorder_level', 0),
            })

        # Create DataFrame
        df = pd.DataFrame(data)

        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Stock Report', index=False)

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'stock_report_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/low-stock-alert', methods=['GET'])
def low_stock_alert():
    """Get low stock alerts"""
    if not db:
        return jsonify({'error': 'Database not connected'}), 500

    try:
        products = list(db.products.find({'is_active': True}))
        stock_items = list(db.products_stockitem.find())

        alerts = []
        for product in products:
            product_stock = sum(
                item['quantity'] for item in stock_items
                if item.get('product_id') == product.get('_id')
            )
            reorder_level = product.get('reorder_level', 0)

            if product_stock <= reorder_level:
                alerts.append({
                    'product_id': str(product.get('_id')),
                    'product_name': product.get('name'),
                    'sku': product.get('sku'),
                    'current_stock': product_stock,
                    'reorder_level': reorder_level,
                    'reorder_quantity': product.get('reorder_quantity', 0),
                })

        return jsonify({
            'count': len(alerts),
            'alerts': alerts
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

