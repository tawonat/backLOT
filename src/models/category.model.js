'use strict';

const { query } = require('../config/database');

class CategoryModel {
  static _slugify(text) {
    return text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async findAll({ active } = {}) {
    const conditions = [];
    const params     = [];
    if (active !== undefined) { conditions.push('active = ?'); params.push(active ? 1 : 0); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM categories ${where} ORDER BY name ASC`, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const slug = this._slugify(data.name);
    const { rows: result } = await query(
      'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
      [data.name, slug, data.description || null]
    );
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const fields = [];
    const params = [];
    if (data.name)        { fields.push('name = ?', 'slug = ?'); params.push(data.name, this._slugify(data.name)); }
    if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
    if (data.active !== undefined)      { fields.push('active = ?');      params.push(data.active ? 1 : 0); }
    if (!fields.length) return existing;
    params.push(id);
    await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }
}

module.exports = CategoryModel;
