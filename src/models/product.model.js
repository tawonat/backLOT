'use strict';

const { query, transaction } = require('../config/database');

class ProductModel {
  // ── Helpers ──────────────────────────────────────────────────────────────

  static _slugify(text) {
    return text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async _uniqueSlug(base, excludeId = null) {
    let slug = this._slugify(base);
    let suffix = 0;
    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const sql = excludeId
        ? 'SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1'
        : 'SELECT id FROM products WHERE slug = ? LIMIT 1';
      const params = excludeId ? [candidate, excludeId] : [candidate];
      const { rows } = await query(sql, params);
      if (rows.length === 0) return candidate;
      suffix++;
    }
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  static async findAll({ page = 1, limit = 20, category_id, search, available, active = 1 } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['p.active = ?'];
    const params     = [active];

    if (category_id) { conditions.push('p.category_id = ?'); params.push(category_id); }
    if (available !== undefined) { conditions.push('p.is_available = ?'); params.push(available ? 1 : 0); }
    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');

    const [{ rows: [{ total }] }, { rows }] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, params),
      query(
        `SELECT p.*, c.name AS category_name
           FROM products p
           JOIN categories c ON c.id = p.category_id
          WHERE ${where}
          ORDER BY p.name ASC
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
        params
      ),
    ]);

    return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.id = ? AND p.active = 1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const { rows } = await query(
      `SELECT p.*, c.name AS category_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.slug = ? AND p.active = 1 LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  static async create(data) {
    const slug = await this._uniqueSlug(data.name);
    const { rows: result } = await query(
      `INSERT INTO products
         (category_id, name, slug, description, price, cost_price, image_url, sku, stock, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category_id,
        data.name,
        slug,
        data.description  || null,
        data.price,
        data.cost_price   || 0,
        data.image_url    || null,
        data.sku          || null,
        data.stock        ?? 0,
        data.is_available ?? 1,
      ]
    );
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const slug = data.name && data.name !== existing.name
      ? await this._uniqueSlug(data.name, id)
      : existing.slug;

    const fields = [];
    const params = [];

    const map = {
      category_id:  data.category_id,
      name:         data.name,
      slug,
      description:  data.description,
      price:        data.price,
      cost_price:   data.cost_price,
      image_url:    data.image_url,
      sku:          data.sku,
      stock:        data.stock,
      is_available: data.is_available,
    };

    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) { fields.push(`${col} = ?`); params.push(val); }
    }

    if (fields.length === 0) return existing;

    params.push(id);
    await query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  static async updateStock(id, delta, conn = null) {
    const exec = conn
      ? (sql, p) => conn.execute(sql, p)
      : (sql, p) => query(sql, p);

    await exec(
      'UPDATE products SET stock = GREATEST(0, stock + ?) WHERE id = ?',
      [delta, id]
    );
  }

  static async softDelete(id) {
    const { rows: result } = await query(
      'UPDATE products SET active = 0 WHERE id = ? AND active = 1',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = ProductModel;