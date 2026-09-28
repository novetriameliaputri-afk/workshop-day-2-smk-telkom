const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Laporan sirkulasi dapat dicetak oleh Toolman dan Admin
router.use(isAuthenticated, hasRole('TOOLMAN', 'ADMIN'));

router.get('/', reportController.index);

module.exports = router;
