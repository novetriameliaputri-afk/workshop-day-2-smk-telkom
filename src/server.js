const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const prisma = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const toolRoutes = require('./routes/tool.routes');
const borrowingRoutes = require('./routes/borrowing.routes');
const reportRoutes = require('./routes/report.routes');
const activityLogRoutes = require('./routes/activity-log.routes');

const app = express();
let currentPort = Number(process.env.PORT) || 3000;

// 1. Konfigurasi View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 2. Middlewares Dasar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 3. Konfigurasi Session-based Authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sarpras-lab-rpl-elektronika-smk-telkom-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12, // 12 Jam
      httpOnly: true
    }
  })
);

// 4. Global Template Helpers & Variables (Tersedia di seluruh view EJS)
app.use((req, res, next) => {
  res.locals.appName = 'SARPRAS LAB RPL & ELEKTRONIKA';
  res.locals.schoolName = 'SMK Telkom';
  res.locals.currentUser = req.session.user || null;
  res.locals.userRole = req.session.user ? req.session.user.role : null;
  res.locals.successMsg = req.query.success || null;
  res.locals.errorMsg = req.query.error || null;

  // Helper format Rupiah
  res.locals.formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  // Helper format tanggal pendek
  res.locals.formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper format tanggal + jam lengkap
  res.locals.formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  next();
});

// 5. Mount Routes
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/tools', toolRoutes);
app.use('/borrowings', borrowingRoutes);
app.use('/reports', reportRoutes);
app.use('/activity-logs', activityLogRoutes);

// 6. 404 Route Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan',
    currentPage: ''
  });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).render('errors/403', {
    title: '500 - Kesalahan Server Internal',
    user: req.session ? req.session.user : null,
    requiredRoles: [],
    userRole: req.session && req.session.user ? req.session.user.role : 'GUEST',
    currentPage: ''
  });
});

// 8. Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑 Server Express & Prisma Lab Sarpras dimatikan.');
  process.exit(0);
});

// 9. Fungsi Start Server dengan Auto Port Fallback jika Port Sedang Dipakai
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('================================================================');
    console.log('🔬 SISTEM PEMINJAMAN SARPRAS LAB RPL & ELEKTRONIKA (MVC)');
    console.log('🏫 Standar UKK & Industri • SMK Telkom');
    console.log(`🌐 Server Berjalan Normal di: http://localhost:${port}`);
    console.log('👥 Akun Demo Siap: admin, toolman, peminjam (Password: password123)');
    console.log('================================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} sedang digunakan. Mencoba port alternatif ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

startServer(currentPort);
