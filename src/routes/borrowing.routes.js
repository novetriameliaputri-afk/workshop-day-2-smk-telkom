const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowing.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

router.use(isAuthenticated);

// 1. Tampilkan sirkulasi peminjaman (Admin: Semua, Toolman: Semua, Peminjam: Milik Sendiri)
router.get('/', borrowingController.index);

// 2. Mengajukan pinjaman alat (Peminjam & Admin)
router.get('/new', hasRole('PEMINJAM', 'ADMIN'), borrowingController.createForm);
router.post('/', hasRole('PEMINJAM', 'ADMIN'), borrowingController.store);

// 3. Menyetujui (Approval) peminjaman alat (Toolman & Admin)
router.post('/:id/approve', hasRole('TOOLMAN', 'ADMIN'), borrowingController.approve);

// 4. Menolak permohonan peminjaman alat (Toolman & Admin)
router.post('/:id/reject', hasRole('TOOLMAN', 'ADMIN'), borrowingController.reject);

// 5. Konfirmasi serah alat ke meja toolman oleh peminjam (Peminjam)
router.post('/:id/return-request', hasRole('PEMINJAM'), borrowingController.returnRequest);

// 6. Form pemeriksaan fisik alat & denda (Toolman & Admin)
router.get('/:id/return', hasRole('TOOLMAN', 'ADMIN'), borrowingController.returnForm);

// 7. Proses pemeriksaan fisik, pengembalian stok & denda (Toolman & Admin)
router.post('/:id/return', hasRole('TOOLMAN', 'ADMIN'), borrowingController.processReturn);

// 8. Hapus riwayat transaksi (Khusus Admin)
router.post('/:id/delete', hasRole('ADMIN'), borrowingController.destroy);

module.exports = router;
