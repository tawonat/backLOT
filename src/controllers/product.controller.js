'use strict';

const ProductModel  = require('../models/product.model');
const CategoryModel = require('../models/category.model');
const createError   = require('http-errors');

// ── GET /products ──────────────────────────────────────────────────────────
exports.list = async (req, res) => {
  const { page = 1, limit = 20, category_id, search, available } = req.query;
  const result = await ProductModel.findAll({
    page:        Number(page),
    limit:       Math.min(Number(limit), 100),
    category_id: category_id ? Number(category_id) : undefined,
    search,
    available:   available !== undefined ? available === 'true' : undefined,
  });
  res.json({ success: true, ...result });
};

// ── GET /products/:id ──────────────────────────────────────────────────────
exports.show = async (req, res) => {
  const product = await ProductModel.findById(Number(req.params.id));
  if (!product) throw createError(404, 'Produto não encontrado');
  res.json({ success: true, data: product });
};

// ── GET /products/slug/:slug ───────────────────────────────────────────────
exports.showBySlug = async (req, res) => {
  const product = await ProductModel.findBySlug(req.params.slug);
  if (!product) throw createError(404, 'Produto não encontrado');
  res.json({ success: true, data: product });
};

// ── POST /products ─────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const category = await CategoryModel.findById(req.body.category_id);
  if (!category) throw createError(422, 'Categoria não encontrada');

  const product = await ProductModel.create(req.body);
  res.status(201).json({ success: true, data: product });
};

// ── PUT /products/:id ──────────────────────────────────────────────────────
exports.update = async (req, res) => {
  if (req.body.category_id) {
    const category = await CategoryModel.findById(req.body.category_id);
    if (!category) throw createError(422, 'Categoria não encontrada');
  }

  const product = await ProductModel.update(Number(req.params.id), req.body);
  if (!product) throw createError(404, 'Produto não encontrado');
  res.json({ success: true, data: product });
};

// ── PATCH /products/:id/availability ──────────────────────────────────────
exports.toggleAvailability = async (req, res) => {
  const product = await ProductModel.findById(Number(req.params.id));
  if (!product) throw createError(404, 'Produto não encontrado');

  const updated = await ProductModel.update(product.id, { is_available: !product.is_available });
  res.json({ success: true, data: updated });
};

// ── PATCH /products/:id/stock ──────────────────────────────────────────────
exports.adjustStock = async (req, res) => {
  const { delta } = req.body;
  if (delta === undefined || isNaN(Number(delta)))
    throw createError(422, 'Campo "delta" obrigatório (positivo para entrada, negativo para saída)');

  const product = await ProductModel.findById(Number(req.params.id));
  if (!product) throw createError(404, 'Produto não encontrado');

  await ProductModel.updateStock(product.id, Number(delta));
  const updated = await ProductModel.findById(product.id);
  res.json({ success: true, data: updated });
};

// ── DELETE /products/:id ───────────────────────────────────────────────────
exports.remove = async (req, res) => {
  const deleted = await ProductModel.softDelete(Number(req.params.id));
  if (!deleted) throw createError(404, 'Produto não encontrado');
  res.json({ success: true, message: 'Produto removido com sucesso' });
};

// ── GET /categories ────────────────────────────────────────────────────────
exports.listCategories = async (req, res) => {
  const categories = await CategoryModel.findAll({ active: 1 });
  res.json({ success: true, data: categories });
};

// ── POST /categories ───────────────────────────────────────────────────────
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw createError(422, 'Campo "name" obrigatório');
  const category = await CategoryModel.create({ name, description });
  res.status(201).json({ success: true, data: category });
};
