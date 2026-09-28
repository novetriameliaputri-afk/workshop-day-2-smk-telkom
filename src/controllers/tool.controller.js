const prisma = require('../config/db');
const { logActivity } = require('../middlewares/auth.middleware');

const toolController = {
  // 1. Tampilkan Daftar Alat Praktikum (Bisa diakses Admin, Toolman, Peminjam)
  index: async (req, res) => {
    try {
      const { q, categoryId, kondisi } = req.query;
      const whereClause = {};

      if (q) {
        whereClause.OR = [
          { namaAlat: { contains: q } },
          { spesifikasi: { contains: q } }
        ];
      }

      if (categoryId) {
        whereClause.categoryId = Number(categoryId);
      }

      if (kondisi && ['BAIK', 'RUSAK'].includes(kondisi)) {
        whereClause.kondisi = kondisi;
      }

      const [tools, categories] = await Promise.all([
        prisma.tool.findMany({
          where: whereClause,
          orderBy: { id: 'desc' },
          include: {
            category: true,
            _count: {
              select: {
                borrowings: {
                  where: { status: 'APPROVED' }
                }
              }
            }
          }
        }),
        prisma.category.findMany({ orderBy: { namaKategori: 'asc' } })
      ]);

      res.render('tools/index', {
        title: 'Inventaris Alat Lab Praktikum - Lab RPL & Elektronika',
        currentPage: 'tools',
        tools,
        categories,
        filters: {
          q: q || '',
          categoryId: categoryId || '',
          kondisi: kondisi || ''
        }
      });
    } catch (error) {
      console.error('Error saat mengambil data alat:', error);
      res.redirect('/?error=' + encodeURIComponent('Gagal memuat inventaris alat.'));
    }
  },

  // 2. Form Tambah Alat Baru (Khusus Admin)
  createForm: async (req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { namaKategori: 'asc' }
      });

      res.render('tools/form', {
        title: 'Tambah Inventaris Alat Praktikum Baru',
        currentPage: 'tools',
        tool: null,
        categories,
        isEdit: false
      });
    } catch (error) {
      console.error('Error saat membuka form alat:', error);
      res.redirect('/tools');
    }
  },

  // 3. Simpan Alat Baru (Khusus Admin)
  store: async (req, res) => {
    try {
      const { namaAlat, spesifikasi, stok, kondisi, categoryId } = req.body;

      if (!namaAlat || !stok || !categoryId) {
        return res.redirect('/tools/new?error=' + encodeURIComponent('Nama alat, stok, dan kategori wajib diisi.'));
      }

      const newTool = await prisma.tool.create({
        data: {
          namaAlat: namaAlat.trim(),
          spesifikasi: spesifikasi ? spesifikasi.trim() : null,
          stok: Math.max(0, parseInt(stok) || 0),
          kondisi: kondisi || 'BAIK',
          categoryId: Number(categoryId)
        },
        include: { category: true }
      });

      await logActivity(
        req.session.user.id,
        'TAMBAH_ALAT',
        `Admin menambahkan inventaris baru: ${newTool.namaAlat} (Stok: ${newTool.stok} unit, Kategori: ${newTool.category.namaKategori})`
      );

      res.redirect('/tools?success=' + encodeURIComponent(`Alat "${newTool.namaAlat}" berhasil ditambahkan ke inventaris.`));
    } catch (error) {
      console.error('Error saat menyimpan alat:', error);
      res.redirect('/tools/new?error=' + encodeURIComponent('Gagal menambahkan alat praktikum.'));
    }
  },

  // 4. Form Edit Alat (Khusus Admin)
  editForm: async (req, res) => {
    try {
      const toolId = Number(req.params.id);
      const [tool, categories] = await Promise.all([
        prisma.tool.findUnique({
          where: { id: toolId },
          include: { category: true }
        }),
        prisma.category.findMany({ orderBy: { namaKategori: 'asc' } })
      ]);

      if (!tool) {
        return res.redirect('/tools?error=' + encodeURIComponent('Alat tidak ditemukan.'));
      }

      res.render('tools/form', {
        title: `Edit Alat: ${tool.namaAlat}`,
        currentPage: 'tools',
        tool,
        categories,
        isEdit: true
      });
    } catch (error) {
      console.error('Error saat membuka form edit alat:', error);
      res.redirect('/tools');
    }
  },

  // 5. Update Data Alat (Khusus Admin)
  update: async (req, res) => {
    try {
      const toolId = Number(req.params.id);
      const { namaAlat, spesifikasi, stok, kondisi, categoryId } = req.body;

      const existingTool = await prisma.tool.findUnique({
        where: { id: toolId }
      });

      if (!existingTool) {
        return res.redirect('/tools?error=' + encodeURIComponent('Alat tidak ditemukan.'));
      }

      const updatedTool = await prisma.tool.update({
        where: { id: toolId },
        data: {
          namaAlat: namaAlat.trim(),
          spesifikasi: spesifikasi ? spesifikasi.trim() : null,
          stok: Math.max(0, parseInt(stok) || 0),
          kondisi: kondisi || 'BAIK',
          categoryId: Number(categoryId)
        },
        include: { category: true }
      });

      await logActivity(
        req.session.user.id,
        'UPDATE_ALAT',
        `Admin memperbarui data alat: ${updatedTool.namaAlat} (Stok: ${updatedTool.stok} unit, Kondisi: ${updatedTool.kondisi})`
      );

      res.redirect('/tools?success=' + encodeURIComponent(`Data alat "${updatedTool.namaAlat}" berhasil diperbarui.`));
    } catch (error) {
      console.error('Error saat update alat:', error);
      res.redirect(`/tools/${req.params.id}/edit?error=` + encodeURIComponent('Gagal memperbarui alat.'));
    }
  },

  // 6. Hapus Alat (Khusus Admin)
  destroy: async (req, res) => {
    try {
      const toolId = Number(req.params.id);

      // Cek apakah sedang ada pinjaman aktif
      const activeBorrowings = await prisma.borrowing.findFirst({
        where: {
          toolId: toolId,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (activeBorrowings) {
        return res.redirect('/tools?error=' + encodeURIComponent('Tidak dapat menghapus alat karena sedang dalam proses peminjaman atau sedang dipinjam siswa.'));
      }

      const tool = await prisma.tool.delete({
        where: { id: toolId }
      });

      await logActivity(
        req.session.user.id,
        'HAPUS_ALAT',
        `Admin menghapus inventaris alat: ${tool.namaAlat}`
      );

      res.redirect('/tools?success=' + encodeURIComponent(`Alat "${tool.namaAlat}" berhasil dihapus dari inventaris.`));
    } catch (error) {
      console.error('Error saat menghapus alat:', error);
      res.redirect('/tools?error=' + encodeURIComponent('Gagal menghapus alat praktikum.'));
    }
  }
};

module.exports = toolController;
