'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/order.controller');
const { validateOrder, validateStatus, validatePayment } = require('../validators/schemas');

router.get   ('/stats/daily',             ctrl.dailyStats);
router.get   ('/',                        ctrl.list);
router.post  ('/',   validateOrder,       ctrl.create);
router.get   ('/:id',                     ctrl.show);
router.patch ('/:id/status', validateStatus,  ctrl.updateStatus);
router.patch ('/:id/payment', validatePayment, ctrl.updatePayment);
router.delete('/:id',                     ctrl.cancel);

module.exports = router;
