const prisma = require('../config/db');
const { logActivity } = require('../middlewares/auth.middleware');

const borrowingController = {
  // 1. Tampilkan Daftar Transaksi Sirkulasi
  index: async (req, res) => {
    try {
      const user = req.session.user;
      const { status, q } = req.query;

      const whereClause = {};

      // Jika role PEMINJAM, hanya bisa melihat transaksi miliknya sendiri
      if (user.role === 'PEMINJAM') {
        whereClause.userId = user.id;
      }

      if (status && ['PENDING', 'APPROVED', 'RETURNED', 'REJECTED'].includes(status)) {
        whereClause.status = status;
      }

      if (q) {
        whereClause.OR = [
          { tool: { namaAlat: { contains: q } } },
          { user: { nama: { contains: q } } },
          { user: { nisn: { contains: q } } }
        ];
      }

      const borrowings = await prisma.borrowing.findMany({
        where: whereClause,
        orderBy: { id: 'desc' },
        include: {
          user: true,
          tool: { include: { category: true } },
          toolman: true
        }
      });

      res.render('borrowings/index', {
        title: 'Sirkulasi Peminjaman Alat - Lab RPL & Elektronika',
        currentPage: 'borrowings',
        borrowings,
        filters: {
          status: status || '',
          q: q || ''
        }
      });
    } catch (error) {
      console.error('Error saat mengambil daftar sirkulasi:', error);
      res.redirect('/?error=' + encodeURIComponent('Gagal memuat sirkulasi peminjaman.'));
    }
  },

  // 2. Form Pengajuan Peminjaman Alat (Peminjam & Admin)
  createForm: async (req, res) => {
    try {
      const selectedToolId = req.query.toolId ? Number(req.query.toolId) : null;

      // Ambil alat yang stoknya tersedia (> 0)
      const tools = await prisma.tool.findMany({
        where: { stok: { gt: 0 } },
        orderBy: { namaAlat: 'asc' },
        include: { category: true }
      });

      // Jika admin, ambil juga daftar peminjam (siswa/guru)
      let usersList = [];
      if (req.session.user.role === 'ADMIN') {
        usersList = await prisma.user.findMany({
          where: { role: 'PEMINJAM' },
          orderBy: { nama: 'asc' }
        });
      }

      res.render('borrowings/create', {
        title: 'Form Pengajuan Pinjam Alat Praktikum',
        currentPage: 'borrowings',
        tools,
        usersList,
        selectedToolId
      });
    } catch (error) {
      console.error('Error saat membuka form pinjam:', error);
      res.redirect('/borrowings');
    }
  },

  // 3. Simpan Permohonan Peminjaman Alat
  store: async (req, res) => {
    try {
      const currentUser = req.session.user;
      const { toolId, jumlah, tglKembaliRencana, catatan, targetUserId } = req.body;

      if (!toolId || !jumlah || !tglKembaliRencana) {
        return res.redirect('/borrowings/new?error=' + encodeURIComponent('Alat, jumlah unit, dan tanggal kembali rencana wajib diisi.'));
      }

      const borrowerId = (currentUser.role === 'ADMIN' && targetUserId)
        ? Number(targetUserId)
        : currentUser.id;

      const qty = parseInt(jumlah, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.redirect('/borrowings/new?error=' + encodeURIComponent('Jumlah pinjam harus lebih dari 0.'));
      }

      // Cek ketersediaan alat dan stok
      const tool = await prisma.tool.findUnique({
        where: { id: Number(toolId) }
      });

      if (!tool) {
        return res.redirect('/borrowings/new?error=' + encodeURIComponent('Alat yang dipilih tidak ditemukan.'));
      }

      if (tool.stok < qty) {
        return res.redirect(`/borrowings/new?toolId=${tool.id}&error=` + encodeURIComponent(`Stok tidak mencukupi! Stok ${tool.namaAlat} yang tersedia saat ini: ${tool.stok} unit.`));
      }

      // Buat data borrowing dengan status PENDING
      const newBorrowing = await prisma.borrowing.create({
        data: {
          userId: borrowerId,
          toolId: tool.id,
          jumlah: qty,
          tglPinjam: new Date(),
          tglKembaliRencana: new Date(tglKembaliRencana),
          status: 'PENDING',
          catatan: catatan ? catatan.trim() : 'Praktikum Laboratorium'
        },
        include: {
          user: true,
          tool: true
        }
      });

      // Catat log aktifitas
      await logActivity(
        currentUser.id,
        'AJUKAN_PINJAM',
        `Peminjam ${newBorrowing.user.nama} mengajukan peminjaman ${qty} unit ${tool.namaAlat} untuk: ${newBorrowing.catatan}`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Permohonan peminjaman ${qty} unit "${tool.namaAlat}" berhasil dikirim. Menunggu persetujuan Toolman lab.`));
    } catch (error) {
      console.error('Error saat menyimpan permohonan pinjam:', error);
      res.redirect('/borrowings/new?error=' + encodeURIComponent('Gagal memproses permohonan pinjam.'));
    }
  },

  // 4. Approval Peminjaman Alat (Toolman & Admin)
  approve: async (req, res) => {
    try {
      const borrowingId = Number(req.params.id);
      const toolmanUser = req.session.user;

      const borrowing = await prisma.borrowing.findUnique({
        where: { id: borrowingId },
        include: { tool: true, user: true }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Data peminjaman tidak ditemukan.'));
      }

      if (borrowing.status !== 'PENDING') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Peminjaman ini sudah diproses sebelumnya.'));
      }

      // Pastikan stok mencukupi
      if (borrowing.tool.stok < borrowing.jumlah) {
        return res.redirect('/borrowings?error=' + encodeURIComponent(`Gagal menyetujui! Stok alat tidak mencukupi (Tersisa: ${borrowing.tool.stok}, Diminta: ${borrowing.jumlah}).`));
      }

      // Jalankan transaksi database: Kurangi stok alat & Ubah status peminjaman menjadi APPROVED
      const [updatedTool, updatedBorrowing] = await prisma.$transaction([
        prisma.tool.update({
          where: { id: borrowing.toolId },
          data: {
            stok: { decrement: borrowing.jumlah }
          }
        }),
        prisma.borrowing.update({
          where: { id: borrowingId },
          data: {
            status: 'APPROVED',
            toolmanId: toolmanUser.id
          }
        })
      ]);

      // Catat log
      await logActivity(
        toolmanUser.id,
        'APPROVAL_PINJAM',
        `Toolman ${toolmanUser.nama} menyetujui peminjaman ${borrowing.jumlah} unit ${borrowing.tool.namaAlat} oleh ${borrowing.user.nama}. Stok alat berkurang menjadi ${updatedTool.stok} unit.`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Peminjaman ${borrowing.jumlah} unit "${borrowing.tool.namaAlat}" disetujui. Sisa stok: ${updatedTool.stok} unit.`));
    } catch (error) {
      console.error('Error saat approve pinjaman:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal menyetujui peminjaman.'));
    }
  },

  // 5. Penolakan Peminjaman Alat (Toolman & Admin)
  reject: async (req, res) => {
    try {
      const borrowingId = Number(req.params.id);
      const { alasan } = req.body;
      const toolmanUser = req.session.user;

      const borrowing = await prisma.borrowing.findUnique({
        where: { id: borrowingId },
        include: { tool: true, user: true }
      });

      if (!borrowing || borrowing.status !== 'PENDING') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Permohonan tidak dapat ditolak (tidak ditemukan atau sudah diproses).'));
      }

      const updated = await prisma.borrowing.update({
        where: { id: borrowingId },
        data: {
          status: 'REJECTED',
          toolmanId: toolmanUser.id,
          catatan: (borrowing.catatan ? borrowing.catatan + ' | ' : '') + `Ditolak Toolman: ${alasan || 'Tidak memenuhi syarat'}`
        }
      });

      await logActivity(
        toolmanUser.id,
        'TOLAK_PINJAM',
        `Toolman ${toolmanUser.nama} menolak permohonan pinjam alat ${borrowing.tool.namaAlat} dari ${borrowing.user.nama}. Alasan: ${alasan || 'Tidak memenuhi syarat'}`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Permohonan peminjaman "${borrowing.tool.namaAlat}" berhasil ditolak.`));
    } catch (error) {
      console.error('Error saat menolak peminjaman:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal menolak peminjaman.'));
    }
  },

  // 6. Konfirmasi Penyerahan Pengembalian ke Meja Toolman (Peminjam)
  returnRequest: async (req, res) => {
    try {
      const borrowingId = Number(req.params.id);
      const user = req.session.user;

      const borrowing = await prisma.borrowing.findFirst({
        where: { id: borrowingId, userId: user.id, status: 'APPROVED' },
        include: { tool: true }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Peminjaman aktif tidak ditemukan.'));
      }

      await logActivity(
        user.id,
        'SERAHKAN_ALAT',
        `Siswa ${user.nama} telah mengembalikan fisik alat ${borrowing.tool.namaAlat} ke meja Toolman lab untuk diinspeksi.`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Alat ${borrowing.tool.namaAlat} telah dilaporkan dikembalikan ke meja Toolman. Silakan tunggu pemeriksaan fisik oleh Toolman.`));
    } catch (error) {
      console.error('Error konfirmasi pengembalian:', error);
      res.redirect('/borrowings');
    }
  },

  // 7. Form Inspeksi Fisik Alat & Input Denda (Toolman & Admin)
  returnForm: async (req, res) => {
    try {
      const borrowingId = Number(req.params.id);

      const borrowing = await prisma.borrowing.findUnique({
        where: { id: borrowingId },
        include: {
          user: true,
          tool: { include: { category: true } }
        }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Data peminjaman tidak ditemukan.'));
      }

      if (borrowing.status !== 'APPROVED') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Hanya peminjaman dengan status APPROVED yang dapat diproses pengembaliannya.'));
      }

      // Hitung keterlambatan (hari) jika lewat dari tglKembaliRencana
      const now = new Date();
      const planReturn = new Date(borrowing.tglKembaliRencana);
      let terlambatHari = 0;
      let perkiraanDendaTelat = 0;

      if (now > planReturn) {
        const diffTime = Math.abs(now - planReturn);
        terlambatHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        perkiraanDendaTelat = terlambatHari * 5000; // Contoh tarif denda keterlambatan: Rp 5.000 / hari
      }

      res.render('borrowings/return', {
        title: `Pemeriksaan Fisik Pengembalian: ${borrowing.tool.namaAlat}`,
        currentPage: 'borrowings',
        borrowing,
        terlambatHari,
        perkiraanDendaTelat
      });
    } catch (error) {
      console.error('Error saat membuka form pengembalian:', error);
      res.redirect('/borrowings');
    }
  },

  // 8. Proses Pemeriksaan Fisik Alat, Pengembalian Stok & Input Denda (Toolman & Admin)
  processReturn: async (req, res) => {
    try {
      const borrowingId = Number(req.params.id);
      const toolmanUser = req.session.user;
      const { kondisiKembali, denda, catatanInspeksi, updateToolStatus } = req.body;

      const borrowing = await prisma.borrowing.findUnique({
        where: { id: borrowingId },
        include: { tool: true, user: true }
      });

      if (!borrowing || borrowing.status !== 'APPROVED') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Status transaksi tidak valid untuk diproses pengembalian.'));
      }

      const fineAmount = Math.max(0, parseInt(denda, 10) || 0);
      const returnCondition = ['BAIK', 'RUSAK', 'HILANG'].includes(kondisiKembali) ? kondisiKembali : 'BAIK';

      // Transaksi update database:
      // - Kembalikan stok alat ke inventaris (kecuali jika HILANG)
      // - Jika alat rusak dan ada opsi update kondisi master alat, kita perbarui kondisi alatnya
      const dbOperations = [];

      if (returnCondition !== 'HILANG') {
        const toolUpdateData = {
          stok: { increment: borrowing.jumlah }
        };

        if (returnCondition === 'RUSAK' && updateToolStatus === 'yes') {
          toolUpdateData.kondisi = 'RUSAK';
        }

        dbOperations.push(
          prisma.tool.update({
            where: { id: borrowing.toolId },
            data: toolUpdateData
          })
        );
      }

      // Update data Borrowing
      const updatedNotes = (borrowing.catatan ? borrowing.catatan + ' | ' : '') +
        `Inspeksi Toolman: Kondisi ${returnCondition}. ` +
        (catatanInspeksi ? `Catatan: ${catatanInspeksi.trim()}` : '') +
        (fineAmount > 0 ? ` (Denda: Rp ${fineAmount.toLocaleString('id-ID')})` : '');

      dbOperations.push(
        prisma.borrowing.update({
          where: { id: borrowingId },
          data: {
            status: 'RETURNED',
            tglKembaliReal: new Date(),
            kondisiKembali: returnCondition,
            denda: fineAmount,
            toolmanId: toolmanUser.id,
            catatan: updatedNotes
          }
        })
      );

      await prisma.$transaction(dbOperations);

      // Catat log aktifitas lengkap
      const dendaText = fineAmount > 0 ? `Dikenakan Denda: Rp ${fineAmount.toLocaleString('id-ID')}.` : 'Tanpa denda.';
      await logActivity(
        toolmanUser.id,
        'PENGEMBALIAN_ALAT',
        `Pemeriksaan fisik pengembalian ${borrowing.jumlah} unit ${borrowing.tool.namaAlat} dari peminjam ${borrowing.user.nama}. Kondisi fisik: ${returnCondition}. ${dendaText} ${catatanInspeksi ? 'Ket: ' + catatanInspeksi : ''}`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Pengembalian alat "${borrowing.tool.namaAlat}" berhasil diproses. Kondisi: ${returnCondition}, Denda: Rp ${fineAmount.toLocaleString('id-ID')}.`));
    } catch (error) {
      console.error('Error saat memproses pengembalian:', error);
      res.redirect(`/borrowings/${req.params.id}/return?error=` + encodeURIComponent('Gagal memproses pengembalian alat.'));
    }
  },

  // 9. Hapus Transaksi (Khusus Admin Master Data)
  destroy: async (req, res) => {
    try {
      const borrowingId = Number(req.params.id);

      const borrowing = await prisma.borrowing.findUnique({
        where: { id: borrowingId },
        include: { tool: true, user: true }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Transaksi tidak ditemukan.'));
      }

      // Jika transaksi masih APPROVED, kembalikan stok sebelum dihapus
      if (borrowing.status === 'APPROVED') {
        await prisma.tool.update({
          where: { id: borrowing.toolId },
          data: { stok: { increment: borrowing.jumlah } }
        });
      }

      await prisma.borrowing.delete({
        where: { id: borrowingId }
      });

      await logActivity(
        req.session.user.id,
        'HAPUS_TRANSAKSI',
        `Admin menghapus riwayat transaksi #${borrowing.id} (${borrowing.tool.namaAlat} oleh ${borrowing.user.nama})`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent('Data transaksi berhasil dihapus.'));
    } catch (error) {
      console.error('Error saat menghapus transaksi:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal menghapus transaksi.'));
    }
  }
};

module.exports = borrowingController;
