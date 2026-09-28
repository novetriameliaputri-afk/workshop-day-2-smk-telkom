const prisma = require('../config/db');

// Middleware: Memastikan user sudah login
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/auth/login?error=' + encodeURIComponent('Sesi telah berakhir atau Anda belum login. Silakan login terlebih dahulu.'));
}

// Middleware: Role-Based Access Control (RBAC)
// roles: array of string, contoh: ['ADMIN'], ['TOOLMAN', 'ADMIN'], ['PEMINJAM']
function hasRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Silakan login terlebih dahulu.'));
    }

    const userRole = req.session.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Jika user tidak memiliki role yang diizinkan -> 403 Forbidden
    res.status(403).render('errors/403', {
      title: '403 - Akses Ditolak (Forbidden)',
      user: req.session.user,
      requiredRoles: allowedRoles,
      userRole: userRole,
      currentPage: ''
    });
  };
}

// Helper: Mencatat Log Aktifitas Sistem Laboratorium
async function logActivity(userId, aksi, keterangan) {
  try {
    if (!userId) return;
    await prisma.activityLog.create({
      data: {
        userId: Number(userId),
        aksi: String(aksi).toUpperCase(),
        keterangan: String(keterangan)
      }
    });
  } catch (error) {
    console.error('⚠️ Gagal mencatat log aktifitas:', error.message);
  }
}

module.exports = {
  isAuthenticated,
  hasRole,
  logActivity
};
