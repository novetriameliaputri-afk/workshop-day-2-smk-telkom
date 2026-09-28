const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middlewares/auth.middleware');

const authController = {
  // 1. Tampilkan Halaman Login
  getLogin: (req, res) => {
    // Jika sudah login, langsung lempar ke dashboard
    if (req.session && req.session.user) {
      return res.redirect('/');
    }

    const error = req.query.error || null;
    const success = req.query.success || null;

    res.render('auth/login', {
      title: 'Login - Sistem Peminjaman Sarpras Lab RPL & Elektronika',
      error,
      success
    });
  },

  // 2. Proses Login Pengguna (Multi-Role)
  postLogin: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.redirect('/auth/login?error=' + encodeURIComponent('Username dan password wajib diisi.'));
      }

      // Cari user berdasarkan username
      const user = await prisma.user.findUnique({
        where: { username: username.trim() }
      });

      if (!user) {
        return res.redirect('/auth/login?error=' + encodeURIComponent('Pengguna dengan username tersebut tidak ditemukan.'));
      }

      // Verifikasi password (Bcrypt dengan fallback langsung)
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (err) {
        isMatch = false;
      }

      if (!isMatch && user.password === password) {
        isMatch = true;
      }

      if (!isMatch) {
        return res.redirect('/auth/login?error=' + encodeURIComponent('Kata sandi yang Anda masukkan salah.'));
      }

      // Set user ke session
      req.session.user = {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nisn: user.nisn,
        telepon: user.telepon
      };

      // Catat log aktifitas LOGIN
      await logActivity(
        user.id,
        'LOGIN',
        `Pengguna ${user.nama} (${user.role}) berhasil masuk ke dalam sistem laboratorium.`
      );

      // Arahkan ke dashboard
      res.redirect('/?success=' + encodeURIComponent(`Selamat datang, ${user.nama}!`));
    } catch (error) {
      console.error('Error saat login:', error);
      res.redirect('/auth/login?error=' + encodeURIComponent('Terjadi kesalahan pada sistem saat login.'));
    }
  },

  // 3. Proses Logout Pengguna
  logout: async (req, res) => {
    try {
      if (req.session && req.session.user) {
        const userId = req.session.user.id;
        const userName = req.session.user.nama;
        await logActivity(
          userId,
          'LOGOUT',
          `Pengguna ${userName} telah keluar dari sistem laboratorium.`
        );
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Error saat destroy session:', err);
        }
        res.redirect('/auth/login?success=' + encodeURIComponent('Anda telah berhasil keluar dari sistem.'));
      });
    } catch (error) {
      console.error('Error saat logout:', error);
      res.redirect('/auth/login');
    }
  }
};

module.exports = authController;
