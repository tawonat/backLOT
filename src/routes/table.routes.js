'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/table.controller');

router.get ('/',              ctrl.list);
router.get ('/:id',           ctrl.show);
router.post('/:id/open',      ctrl.openSession);
router.get ('/:id/bill',      ctrl.getBill);
router.post('/:id/checkout',  ctrl.checkout);

module.exports = router;