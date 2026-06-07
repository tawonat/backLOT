'use strict';

const Joi = require('joi');

const productSchema = Joi.object({
  category_id:  Joi.number().integer().positive().required(),
  name:         Joi.string().trim().min(2).max(150).required(),
  description:  Joi.string().trim().max(1000).allow('', null),
  price:        Joi.number().precision(2).positive().required(),
  cost_price:   Joi.number().precision(2).min(0),
  image_url:    Joi.string().uri().max(500).allow('', null),
  sku:          Joi.string().trim().max(80).allow('', null),
  stock:        Joi.number().integer().min(0),
  is_available: Joi.boolean(),
});

const updateProductSchema = productSchema.fork(
  ['category_id', 'name', 'price'],
  (f) => f.optional()
);

const orderItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity:   Joi.number().integer().min(1).required(),
  notes:      Joi.string().max(300).allow('', null),
});

const orderSchema = Joi.object({
  customer_id:    Joi.number().integer().positive().allow(null),
  table_number:   Joi.number().integer().positive().allow(null),
  notes:          Joi.string().max(500).allow('', null),
  discount:       Joi.number().precision(2).min(0),
  payment_method: Joi.string().valid('cash', 'credit_card', 'debit_card', 'pix', 'other').allow(null),
  items:          Joi.array().items(orderItemSchema).min(1).required(),
});

const statusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
    .required(),
});

const paymentSchema = Joi.object({
  payment_method: Joi.string().valid('cash', 'credit_card', 'debit_card', 'pix', 'other').required(),
  payment_status: Joi.string().valid('pending', 'paid', 'refunded').required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(422).json({ success: false, errors: messages });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validateProduct:       validate(productSchema),
  validateUpdateProduct: validate(updateProductSchema),
  validateOrder:         validate(orderSchema),
  validateStatus:        validate(statusSchema),
  validatePayment:       validate(paymentSchema),
};
