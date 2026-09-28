const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Seluruh rute manajemen pengguna hanya dapat diakses oleh ADMIN
router.use(isAuthenticated, hasRole('ADMIN'));

router.get('/', userController.index);
router.get('/new', userController.createForm);
router.post('/', userController.store);
router.get('/:id/edit', userController.editForm);
router.post('/:id', userController.update);
router.post('/:id/delete', userController.destroy);

module.exports = router;
