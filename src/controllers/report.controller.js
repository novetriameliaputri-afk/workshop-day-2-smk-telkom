const prisma = require('../config/db');

const reportController = {
  // 1. Tampilkan Halaman Laporan Sirkulasi
  index: async (req, res) => {
    try {
      const { startDate, endDate, status, categoryId } = req.query;

      const whereClause = {};

      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      if (startDate || endDate) {
        whereClause.tglPinjam = {};
        if (startDate) {
          whereClause.tglPinjam.gte = new Date(startDate);
        }
        if (endDate) {
          // Set to end of day
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          whereClause.tglPinjam.lte = end;
        }
      }

      if (categoryId && categoryId !== 'ALL') {
        whereClause.tool = { categoryId: Number(categoryId) };
      }

      const [borrowings, categories, totalStats] = await Promise.all([
        prisma.borrowing.findMany({
          where: whereClause,
          orderBy: { tglPinjam: 'desc' },
          include: {
            user: true,
            tool: { include: { category: true } },
            toolman: true
          }
        }),
        prisma.category.findMany({ orderBy: { namaKategori: 'asc' } }),
        prisma.borrowing.aggregate({
          where: whereClause,
          _sum: {
            jumlah: true,
            denda: true
          },
          _count: {
            id: true
          }
        })
      ]);

      // Hitung ringkasan status
      const countApproved = borrowings.filter(b => b.status === 'APPROVED').length;
      const countReturned = borrowings.filter(b => b.status === 'RETURNED').length;
      const countDamaged = borrowings.filter(b => b.kondisiKembali === 'RUSAK').length;
      const countGood = borrowings.filter(b => b.kondisiKembali === 'BAIK').length;
      const totalFine = totalStats._sum.denda || 0;
      const totalItemsBorrowed = totalStats._sum.jumlah || 0;

      res.render('reports/index', {
        title: 'Laporan Sirkulasi Peminjaman Sarpras Lab RPL & Elektronika',
        currentPage: 'reports',
        borrowings,
        categories,
        filters: {
          startDate: startDate || '',
          endDate: endDate || '',
          status: status || 'ALL',
          categoryId: categoryId || 'ALL'
        },
        stats: {
          totalTransactions: borrowings.length,
          totalItemsBorrowed,
          countApproved,
          countReturned,
          countDamaged,
          countGood,
          totalFine
        }
      });
    } catch (error) {
      console.error('Error saat memuat laporan:', error);
      res.redirect('/?error=' + encodeURIComponent('Gagal memuat laporan sirkulasi.'));
    }
  }
};

module.exports = reportController;
