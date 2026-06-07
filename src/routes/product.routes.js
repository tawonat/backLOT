'use strict';

const router     = require('express').Router();
const ctrl       = require('../controllers/product.controller');
const { validateProduct, validateUpdateProduct } = require('../validators/schemas');

// ── Categories ─────────────────────────────────────────────────────────────
router.get  ('/categories',   ctrl.listCategories);
router.post ('/categories',   ctrl.createCategory);

// ── Products ───────────────────────────────────────────────────────────────
router.get   ('/',                       ctrl.list);
router.post  ('/',    validateProduct,   ctrl.create);

// Static sub-routes before :id
router.get   ('/slug/:slug',             ctrl.showBySlug);

router.get   ('/:id',                    ctrl.show);
router.put   ('/:id', validateUpdateProduct, ctrl.update);
router.delete('/:id',                    ctrl.remove);

router.patch ('/:id/availability',       ctrl.toggleAvailability);
router.patch ('/:id/stock',              ctrl.adjustStock);

module.exports = router;
