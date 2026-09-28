const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activity-log.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Audit log sistem hanya dapat dipantau oleh ADMIN
router.use(isAuthenticated, hasRole('ADMIN'));

router.get('/', activityLogController.index);

module.exports = router;
