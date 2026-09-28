const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Seluruh rute master kategori hanya dapat diakses oleh ADMIN
router.use(isAuthenticated, hasRole('ADMIN'));

router.get('/', categoryController.index);
router.post('/', categoryController.store);
router.post('/:id', categoryController.update);
router.post('/:id/delete', categoryController.destroy);

module.exports = router;
