'use strict';

const { query, transaction } = require('../config/database');

class TableModel {

  // ── Mesas ─────────────────────────────────────────────────────────────────

  static async findAll() {
    const { rows } = await query(
      `SELECT t.*,
              s.id        AS session_id,
              s.opened_at AS session_opened_at,
              s.total     AS session_total
         FROM tables t
         LEFT JOIN table_sessions s ON s.table_id = t.id AND s.status = 'open'
        ORDER BY t.number ASC`
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT t.*,
              s.id        AS session_id,
              s.opened_at AS session_opened_at,
              s.total     AS session_total
         FROM tables t
         LEFT JOIN table_sessions s ON s.table_id = t.id AND s.status = 'open'
        WHERE t.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByNumber(number) {
    const { rows } = await query(
      `SELECT t.*,
              s.id        AS session_id,
              s.opened_at AS session_opened_at,
              s.total     AS session_total
         FROM tables t
         LEFT JOIN table_sessions s ON s.table_id = t.id AND s.status = 'open'
        WHERE t.number = ? LIMIT 1`,
      [number]
    );
    return rows[0] || null;
  }

  // ── Sessão (comanda) ──────────────────────────────────────────────────────

  static async openSession(tableId) {
    const table = await this.findById(tableId);
    if (!table) throw Object.assign(new Error('Mesa não encontrada'), { status: 404 });
    if (table.status !== 'free')
      throw Object.assign(new Error('Mesa já está ocupada'), { status: 422 });

    return transaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO table_sessions (table_id) VALUES (?)',
        [tableId]
      );
      await conn.execute(
        "UPDATE tables SET status = 'occupied' WHERE id = ?",
        [tableId]
      );
      return result.insertId;
    }).then(sessionId => this.findById(tableId));
  }

  // ── Comanda (bill) ────────────────────────────────────────────────────────

  static async getBill(tableId) {
    const table = await this.findById(tableId);
    if (!table) throw Object.assign(new Error('Mesa não encontrada'), { status: 404 });
    if (!table.session_id)
      throw Object.assign(new Error('Mesa não possui comanda aberta'), { status: 422 });

    const { rows: orders } = await query(
      `SELECT o.id, o.order_number, o.status, o.subtotal, o.discount, o.total,
              o.payment_method, o.payment_status, o.created_at
         FROM orders o
        WHERE o.session_id = ?
          AND o.status != 'cancelled'
        ORDER BY o.created_at ASC`,
      [table.session_id]
    );

    // Busca os itens de todos os pedidos
    for (const order of orders) {
      const { rows: items } = await query(
        `SELECT oi.quantity, oi.unit_price, oi.subtotal, oi.notes,
                p.name AS product_name
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    const grandTotal = orders.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      table_number: table.number,
      session_id:   table.session_id,
      opened_at:    table.session_opened_at,
      orders,
      grand_total:  Number(grandTotal.toFixed(2)),
    };
  }

  // ── Checkout (fecha comanda e libera mesa) ────────────────────────────────

  static async checkout(tableId, { payment_method }) {
    const bill = await this.getBill(tableId);

    return transaction(async (conn) => {
      // Marca todos os pedidos como pagos
      await conn.execute(
        `UPDATE orders SET payment_status = 'paid', payment_method = ?
          WHERE session_id = ? AND status != 'cancelled'`,
        [payment_method, bill.session_id]
      );

      // Fecha a sessão
      await conn.execute(
        `UPDATE table_sessions SET status = 'closed', closed_at = NOW(), total = ?
          WHERE id = ?`,
        [bill.grand_total, bill.session_id]
      );

      // Libera a mesa
      await conn.execute(
        "UPDATE tables SET status = 'free' WHERE id = ?",
        [tableId]
      );
    }).then(() => bill);
  }
}

module.exports = TableModel;