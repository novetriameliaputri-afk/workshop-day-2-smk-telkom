const express = require('express');
const router = express.Router();
const toolController = require('../controllers/tool.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Semua user yang login (Admin, Toolman, Peminjam) boleh melihat inventaris alat
router.use(isAuthenticated);

router.get('/', toolController.index);

// Hanya ADMIN yang boleh CRUD alat praktikum
router.get('/new', hasRole('ADMIN'), toolController.createForm);
router.post('/', hasRole('ADMIN'), toolController.store);
router.get('/:id/edit', hasRole('ADMIN'), toolController.editForm);
router.post('/:id', hasRole('ADMIN'), toolController.update);
router.post('/:id/delete', hasRole('ADMIN'), toolController.destroy);

module.exports = router;
