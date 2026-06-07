'use strict';

const { query, transaction } = require('../config/database');

class OrderModel {
  static _orderNumber() {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PED-${ts}-${rand}`;
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  static async findAll({ page = 1, limit = 20, status, customer_id, date_from, date_to } = {}) {
    const offset     = (page - 1) * limit;
    const conditions = [];
    const params     = [];

    if (status)      { conditions.push('o.status = ?');      params.push(status); }
    if (customer_id) { conditions.push('o.customer_id = ?'); params.push(customer_id); }
    if (date_from)   { conditions.push('o.created_at >= ?'); params.push(date_from); }
    if (date_to)     { conditions.push('o.created_at <= ?'); params.push(date_to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ rows: [{ total }] }, { rows }] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params),
      query(
        `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
           FROM orders o
           LEFT JOIN customers c ON c.id = o.customer_id
          ${where}
          ORDER BY o.created_at DESC
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
      ),
    ]);

    return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  static async findById(id) {
    const { rows: [order] } = await query(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.id = ? LIMIT 1`,
      [id]
    );
    if (!order) return null;

    const { rows: items } = await query(
      `SELECT oi.*, p.name AS product_name, p.image_url
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?`,
      [id]
    );
    order.items = items;
    return order;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  static async create(data) {
    return transaction(async (conn) => {
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of data.items) {
        const [rows] = await conn.execute(
          'SELECT id, name, price, stock, is_available FROM products WHERE id = ? AND active = 1 LIMIT 1',
          [item.product_id]
        );
        const product = rows[0];

        if (!product)              throw Object.assign(new Error(`Produto ${item.product_id} não encontrado`), { status: 404 });
        if (!product.is_available) throw Object.assign(new Error(`Produto "${product.name}" indisponível`), { status: 422 });
        if (product.stock !== 999 && product.stock < item.quantity)
          throw Object.assign(new Error(`Estoque insuficiente para "${product.name}"`), { status: 422 });

        const unit_price = product.price;
        const lineTotal  = Number((unit_price * item.quantity).toFixed(2));
        subtotal += lineTotal;
        resolvedItems.push({ ...item, unit_price, subtotal: lineTotal, name: product.name, stock: product.stock });
      }

      const discount    = Number(data.discount || 0);
      const total       = Number((subtotal - discount).toFixed(2));
      const orderNumber = this._orderNumber();

      const [orderResult] = await conn.execute(
        `INSERT INTO orders
           (session_id, customer_id, order_number, table_number, notes, subtotal, discount, total, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.session_id || null, data.customer_id || null, orderNumber,
         data.table_number || null, data.notes || null,
         subtotal, discount, total, data.payment_method || null]
      );
      const orderId = orderResult.insertId;

      for (const item of resolvedItems) {
        await conn.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.unit_price, item.subtotal, item.notes || null]
        );
        if (item.stock !== 999) {
          await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }

      return orderId;
    }).then(id => this.findById(id));
  }

  // ── Update status ─────────────────────────────────────────────────────────

  static async updateStatus(id, status) {
    const VALID_TRANSITIONS = {
      pending:   ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready',     'cancelled'],
      ready:     ['delivered'],
      delivered: [],
      cancelled: [],
    };

    const order = await this.findById(id);
    if (!order) return null;

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw Object.assign(
        new Error(`Transição inválida: ${order.status} → ${status}. Permitido: [${allowed.join(', ')}]`),
        { status: 422 }
      );
    }

    await query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  static async updatePayment(id, { payment_method, payment_status }) {
    await query(
      'UPDATE orders SET payment_method = ?, payment_status = ? WHERE id = ?',
      [payment_method, payment_status, id]
    );
    return this.findById(id);
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  static async cancel(id) {
    return transaction(async (conn) => {
      const [orderRows] = await conn.execute('SELECT id, status FROM orders WHERE id = ? LIMIT 1', [id]);
      const order = orderRows[0];

      if (!order) throw Object.assign(new Error('Pedido não encontrado'), { status: 404 });
      if (['delivered', 'cancelled'].includes(order.status))
        throw Object.assign(new Error(`Pedido já está ${order.status}`), { status: 422 });

      const [items] = await conn.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);

      for (const item of items) {
        await conn.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ? AND stock != 999',
          [item.quantity, item.product_id]
        );
      }

      await conn.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id]);
    }).then(() => this.findById(id));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  static async getDailyStats(date) {
    const { rows } = await query(
      `SELECT
         COUNT(*)                         AS total_orders,
         COALESCE(SUM(total), 0)          AS revenue,
         COALESCE(AVG(total), 0)          AS avg_ticket,
         SUM(status = 'cancelled')        AS cancelled,
         SUM(status = 'delivered')        AS delivered
       FROM orders
       WHERE DATE(created_at) = ?`,
      [date]
    );
    return rows[0];
  }
}

module.exports = OrderModel;