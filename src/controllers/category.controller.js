const prisma = require('../config/db');
const { logActivity } = require('../middlewares/auth.middleware');

const categoryController = {
  // 1. Tampilkan Daftar Kategori Alat
  index: async (req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: { tools: true }
          },
          tools: {
            select: {
              id: true,
              namaAlat: true,
              stok: true,
              kondisi: true
            }
          }
        }
      });

      res.render('categories/index', {
        title: 'Kategori Alat Lab - Lab RPL & Elektronika',
        currentPage: 'categories',
        categories
      });
    } catch (error) {
      console.error('Error saat mengambil kategori alat:', error);
      res.redirect('/?error=' + encodeURIComponent('Gagal memuat kategori alat.'));
    }
  },

  // 2. Simpan Kategori Baru
  store: async (req, res) => {
    try {
      const { namaKategori } = req.body;

      if (!namaKategori || !namaKategori.trim()) {
        return res.redirect('/categories?error=' + encodeURIComponent('Nama kategori tidak boleh kosong.'));
      }

      // Cek duplikasi
      const existing = await prisma.category.findFirst({
        where: { namaKategori: namaKategori.trim() }
      });

      if (existing) {
        return res.redirect('/categories?error=' + encodeURIComponent('Kategori dengan nama tersebut sudah ada.'));
      }

      const category = await prisma.category.create({
        data: {
          namaKategori: namaKategori.trim()
        }
      });

      await logActivity(
        req.session.user.id,
        'TAMBAH_KATEGORI',
        `Admin menambahkan kategori alat baru: ${category.namaKategori}`
      );

      res.redirect('/categories?success=' + encodeURIComponent(`Kategori "${category.namaKategori}" berhasil ditambahkan.`));
    } catch (error) {
      console.error('Error saat menambah kategori:', error);
      res.redirect('/categories?error=' + encodeURIComponent('Gagal menambahkan kategori baru.'));
    }
  },

  // 3. Update Kategori
  update: async (req, res) => {
    try {
      const catId = Number(req.params.id);
      const { namaKategori } = req.body;

      if (!namaKategori || !namaKategori.trim()) {
        return res.redirect('/categories?error=' + encodeURIComponent('Nama kategori tidak boleh kosong.'));
      }

      const updated = await prisma.category.update({
        where: { id: catId },
        data: {
          namaKategori: namaKategori.trim()
        }
      });

      await logActivity(
        req.session.user.id,
        'UPDATE_KATEGORI',
        `Admin memperbarui nama kategori menjadi: ${updated.namaKategori}`
      );

      res.redirect('/categories?success=' + encodeURIComponent('Kategori berhasil diperbarui.'));
    } catch (error) {
      console.error('Error saat update kategori:', error);
      res.redirect('/categories?error=' + encodeURIComponent('Gagal memperbarui kategori.'));
    }
  },

  // 4. Hapus Kategori
  destroy: async (req, res) => {
    try {
      const catId = Number(req.params.id);

      const category = await prisma.category.findUnique({
        where: { id: catId },
        include: { _count: { select: { tools: true } } }
      });

      if (!category) {
        return res.redirect('/categories?error=' + encodeURIComponent('Kategori tidak ditemukan.'));
      }

      if (category._count.tools > 0) {
        return res.redirect('/categories?error=' + encodeURIComponent(`Tidak dapat menghapus kategori "${category.namaKategori}" karena masih terdapat ${category._count.tools} alat yang terdaftar di dalamnya.`));
      }

      await prisma.category.delete({
        where: { id: catId }
      });

      await logActivity(
        req.session.user.id,
        'HAPUS_KATEGORI',
        `Admin menghapus kategori alat: ${category.namaKategori}`
      );

      res.redirect('/categories?success=' + encodeURIComponent(`Kategori "${category.namaKategori}" berhasil dihapus.`));
    } catch (error) {
      console.error('Error saat menghapus kategori:', error);
      res.redirect('/categories?error=' + encodeURIComponent('Gagal menghapus kategori.'));
    }
  }
};

module.exports = categoryController;
