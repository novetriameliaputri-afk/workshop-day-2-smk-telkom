const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middlewares/auth.middleware');

const userController = {
  // 1. Tampilkan Daftar Pengguna
  index: async (req, res) => {
    try {
      const { q, role } = req.query;
      const whereClause = {};

      if (q) {
        whereClause.OR = [
          { nama: { contains: q } },
          { username: { contains: q } },
          { nisn: { contains: q } }
        ];
      }

      if (role && ['ADMIN', 'TOOLMAN', 'PEMINJAM'].includes(role)) {
        whereClause.role = role;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: { borrowings: true }
          }
        }
      });

      res.render('users/index', {
        title: 'Manajemen Pengguna - Lab RPL & Elektronika',
        currentPage: 'users',
        users,
        filters: { q: q || '', role: role || '' }
      });
    } catch (error) {
      console.error('Error saat mengambil data pengguna:', error);
      res.redirect('/?error=' + encodeURIComponent('Gagal memuat data pengguna.'));
    }
  },

  // 2. Form Tambah Pengguna
  createForm: (req, res) => {
    res.render('users/form', {
      title: 'Tambah Pengguna Baru - Lab RPL & Elektronika',
      currentPage: 'users',
      user: null,
      isEdit: false
    });
  },

  // 3. Simpan Pengguna Baru
  store: async (req, res) => {
    try {
      const { username, password, nama, role, nisn, telepon } = req.body;

      if (!username || !password || !nama || !role) {
        return res.redirect('/users/new?error=' + encodeURIComponent('Field username, password, nama, dan role wajib diisi.'));
      }

      // Cek apakah username sudah dipakai
      const existingUser = await prisma.user.findUnique({
        where: { username: username.trim() }
      });

      if (existingUser) {
        return res.redirect('/users/new?error=' + encodeURIComponent('Username tersebut sudah digunakan oleh akun lain.'));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
          nama: nama.trim(),
          role: role.toUpperCase(),
          nisn: nisn ? nisn.trim() : null,
          telepon: telepon ? telepon.trim() : null
        }
      });

      // Catat log
      await logActivity(
        req.session.user.id,
        'TAMBAH_PENGGUNA',
        `Admin menambahkan pengguna baru: ${newUser.nama} (${newUser.role})`
      );

      res.redirect('/users?success=' + encodeURIComponent(`Pengguna ${newUser.nama} berhasil ditambahkan.`));
    } catch (error) {
      console.error('Error saat menyimpan pengguna:', error);
      res.redirect('/users/new?error=' + encodeURIComponent('Gagal menambahkan pengguna.'));
    }
  },

  // 4. Form Edit Pengguna
  editForm: async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.redirect('/users?error=' + encodeURIComponent('Pengguna tidak ditemukan.'));
      }

      res.render('users/form', {
        title: `Edit Pengguna: ${user.nama}`,
        currentPage: 'users',
        user,
        isEdit: true
      });
    } catch (error) {
      console.error('Error saat membuka form edit user:', error);
      res.redirect('/users');
    }
  },

  // 5. Update Data Pengguna
  update: async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { username, password, nama, role, nisn, telepon } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.redirect('/users?error=' + encodeURIComponent('Pengguna tidak ditemukan.'));
      }

      // Cek username bentrok
      if (username && username.trim() !== user.username) {
        const conflict = await prisma.user.findUnique({
          where: { username: username.trim() }
        });
        if (conflict) {
          return res.redirect(`/users/${userId}/edit?error=` + encodeURIComponent('Username sudah digunakan pengguna lain.'));
        }
      }

      const updateData = {
        username: username ? username.trim() : user.username,
        nama: nama ? nama.trim() : user.nama,
        role: role ? role.toUpperCase() : user.role,
        nisn: nisn !== undefined ? nisn.trim() : user.nisn,
        telepon: telepon !== undefined ? telepon.trim() : user.telepon
      };

      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      await logActivity(
        req.session.user.id,
        'UPDATE_PENGGUNA',
        `Admin memperbarui data pengguna: ${updatedUser.nama} (${updatedUser.role})`
      );

      res.redirect('/users?success=' + encodeURIComponent(`Data pengguna ${updatedUser.nama} berhasil diperbarui.`));
    } catch (error) {
      console.error('Error saat update pengguna:', error);
      res.redirect(`/users/${req.params.id}/edit?error=` + encodeURIComponent('Gagal memperbarui data pengguna.'));
    }
  },

  // 6. Hapus Pengguna
  destroy: async (req, res) => {
    try {
      const userId = Number(req.params.id);

      // Cegah admin menghapus dirinya sendiri
      if (userId === req.session.user.id) {
        return res.redirect('/users?error=' + encodeURIComponent('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.'));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.redirect('/users?error=' + encodeURIComponent('Pengguna tidak ditemukan.'));
      }

      await prisma.user.delete({
        where: { id: userId }
      });

      await logActivity(
        req.session.user.id,
        'HAPUS_PENGGUNA',
        `Admin menghapus akun pengguna: ${user.nama} (${user.username})`
      );

      res.redirect('/users?success=' + encodeURIComponent(`Akun ${user.nama} berhasil dihapus.`));
    } catch (error) {
      console.error('Error saat menghapus pengguna:', error);
      res.redirect('/users?error=' + encodeURIComponent('Gagal menghapus pengguna (kemungkinan ada riwayat data relasi).'));
    }
  }
};

module.exports = userController;
