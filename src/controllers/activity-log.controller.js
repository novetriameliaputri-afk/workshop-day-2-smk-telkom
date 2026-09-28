const prisma = require('../config/db');

const activityLogController = {
  // 1. Tampilkan Log Audit Aktifitas Sistem (Khusus Admin)
  index: async (req, res) => {
    try {
      const { q, aksi } = req.query;
      const whereClause = {};

      if (q) {
        whereClause.OR = [
          { keterangan: { contains: q } },
          { user: { nama: { contains: q } } },
          { user: { username: { contains: q } } }
        ];
      }

      if (aksi && aksi !== 'ALL') {
        whereClause.aksi = aksi;
      }

      const logs = await prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: true
        }
      });

      // Ambil daftar jenis aksi unik untuk dropdown filter
      const actionsList = [
        'LOGIN',
        'LOGOUT',
        'INISIALISASI_SISTEM',
        'TAMBAH_PENGGUNA',
        'UPDATE_PENGGUNA',
        'HAPUS_PENGGUNA',
        'TAMBAH_KATEGORI',
        'UPDATE_KATEGORI',
        'HAPUS_KATEGORI',
        'TAMBAH_ALAT',
        'UPDATE_ALAT',
        'HAPUS_ALAT',
        'AJUKAN_PINJAM',
        'APPROVAL_PINJAM',
        'TOLAK_PINJAM',
        'SERAHKAN_ALAT',
        'PENGEMBALIAN_ALAT',
        'HAPUS_TRANSAKSI'
      ];

      res.render('activity-logs/index', {
        title: 'Audit Log Aktifitas Laboratorium - Lab RPL & Elektronika',
        currentPage: 'activity-logs',
        logs,
        actionsList,
        filters: {
          q: q || '',
          aksi: aksi || 'ALL'
        }
      });
    } catch (error) {
      console.error('Error saat mengambil log aktifitas:', error);
      res.redirect('/?error=' + encodeURIComponent('Gagal memuat log aktifitas laboratorium.'));
    }
  }
};

module.exports = activityLogController;
