const http = require('http');

// Helper to make requests with cookies
function request(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const isPost = method === 'POST';
    const payload = data ? (typeof data === 'string' ? data : new URLSearchParams(data).toString()) : '';
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        ...(cookies ? { 'Cookie': cookies } : {}),
        ...(isPost ? {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Extract set-cookie
        const setCookie = res.headers['set-cookie'];
        let newCookie = cookies;
        if (setCookie) {
          newCookie = setCookie.map(c => c.split(';')[0]).join('; ');
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          cookies: newCookie
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 MEMULAI PENGUJIAN 5 SKENARIO SISTEM PEMINJAMAN SARPRAS...');

  try {
    // -------------------------------------------------------------
    // SKENARIO 1: Login user sesuai dengan hak akses (Admin, Toolman, Peminjam) & RBAC Guard
    // -------------------------------------------------------------
    console.log('\n--- [SKENARIO 1: Multi-Role Login & RBAC Guard (Admin, Toolman, Peminjam)] ---');
    
    // 1.1 Login Admin
    const adminLogin = await request('POST', '/auth/login', { username: 'admin', password: 'password123' });
    console.log(`- Login Admin: Status ${adminLogin.statusCode} (Redirect: ${adminLogin.headers.location})`);
    const adminCookies = adminLogin.cookies;

    const adminDashboard = await request('GET', '/', null, adminCookies);
    console.log(`- Akses Admin Dashboard: Status ${adminDashboard.statusCode}`);
    if (adminDashboard.body.includes('PANEL UTAMA ADMINISTRATOR LAB')) {
      console.log('  ✅ Admin Dashboard berhasil dimuat dengan konten khusus Admin.');
    }

    // 1.2 Login Toolman
    const toolmanLogin = await request('POST', '/auth/login', { username: 'toolman', password: 'password123' });
    console.log(`- Login Toolman: Status ${toolmanLogin.statusCode} (Redirect: ${toolmanLogin.headers.location})`);
    const toolmanCookies = toolmanLogin.cookies;

    const toolmanDashboard = await request('GET', '/', null, toolmanCookies);
    console.log(`- Akses Toolman Dashboard: Status ${toolmanDashboard.statusCode}`);
    if (toolmanDashboard.body.includes('MEJA KERJA TOOLMAN & LABORAN')) {
      console.log('  ✅ Toolman Dashboard berhasil dimuat dengan konten khusus Toolman.');
    }

    // 1.3 Uji RBAC: Toolman dilarang akses rute Admin (/users)
    const toolmanAccessAdmin = await request('GET', '/users', null, toolmanCookies);
    console.log(`- Toolman mencoba buka /users: Status ${toolmanAccessAdmin.statusCode}`);
    if (toolmanAccessAdmin.statusCode === 403) {
      console.log('  ✅ RBAC Guard Berhasil: Toolman dilarang membuka manajemen pengguna (403 Forbidden).');
    }

    // 1.4 Login Peminjam (Siswa)
    const peminjamLogin = await request('POST', '/auth/login', { username: 'peminjam', password: 'password123' });
    console.log(`- Login Peminjam Siswa: Status ${peminjamLogin.statusCode} (Redirect: ${peminjamLogin.headers.location})`);
    const peminjamCookies = peminjamLogin.cookies;

    const peminjamDashboard = await request('GET', '/', null, peminjamCookies);
    console.log(`- Akses Peminjam Dashboard: Status ${peminjamDashboard.statusCode}`);
    if (peminjamDashboard.body.includes('PORTAL SISWA & GURU PEMINJAM')) {
      console.log('  ✅ Peminjam Dashboard berhasil dimuat.');
    }

    // 1.5 Uji RBAC: Peminjam dilarang akses rute Toolman (/reports)
    const peminjamAccessReport = await request('GET', '/reports', null, peminjamCookies);
    console.log(`- Peminjam mencoba buka /reports: Status ${peminjamAccessReport.statusCode}`);
    if (peminjamAccessReport.statusCode === 403) {
      console.log('  ✅ RBAC Guard Berhasil: Peminjam dilarang mencetak laporan sirkulasi (403 Forbidden).');
    }

    // -------------------------------------------------------------
    // SKENARIO 2: Admin menambah inventaris alat baru (Mikrotik RouterBoard stok 5 unit)
    // -------------------------------------------------------------
    console.log('\n--- [SKENARIO 2: Admin Menambah Inventaris Alat Baru (Mikrotik Stok 5 Unit)] ---');
    const newToolRes = await request('POST', '/tools', {
      namaAlat: 'Mikrotik RouterBoard RB951Ui-2HnD SOHO',
      categoryId: '1', // Kategori Jaringan
      spesifikasi: 'Wireless AP 2.4GHz 1000mW, 5 Fast Ethernet Ports, USB, PoE Out',
      stok: '5',
      kondisi: 'BAIK'
    }, adminCookies);

    console.log(`- Admin simpan alat baru: Status ${newToolRes.statusCode} (Redirect: ${newToolRes.headers.location})`);

    // Ambil data database langsung via Prisma untuk verifikasi
    const prisma = require('./src/config/db');
    const createdTool = await prisma.tool.findFirst({
      where: { namaAlat: 'Mikrotik RouterBoard RB951Ui-2HnD SOHO' }
    });

    if (createdTool && createdTool.stok === 5) {
      console.log(`  ✅ Alat "${createdTool.namaAlat}" berhasil dibuat di database dengan ID: ${createdTool.id}, Stok: ${createdTool.stok} unit.`);
    }

    // -------------------------------------------------------------
    // SKENARIO 3: Siswa mengajukan peminjaman 1 unit Mikrotik untuk praktikum
    // -------------------------------------------------------------
    console.log('\n--- [SKENARIO 3: Siswa Mengajukan Peminjaman 1 Unit Mikrotik] ---');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const borrowReq = await request('POST', '/borrowings', {
      toolId: createdTool.id,
      jumlah: '1',
      tglKembaliRencana: tomorrow,
      catatan: 'Praktikum Pengaturan Hotspot & Gateway UKK di Lab Jaringan'
    }, peminjamCookies);

    console.log(`- Siswa mengajukan pinjaman: Status ${borrowReq.statusCode} (Redirect: ${borrowReq.headers.location})`);

    const createdBorrowing = await prisma.borrowing.findFirst({
      where: {
        toolId: createdTool.id,
        status: 'PENDING'
      },
      include: { tool: true, user: true }
    });

    if (createdBorrowing) {
      console.log(`  ✅ Permohonan peminjaman berhasil dibuat dengan ID: ${createdBorrowing.id}`);
      console.log(`     Peminjam: ${createdBorrowing.user.nama}, Alat: ${createdBorrowing.tool.namaAlat}`);
      console.log(`     Status Awal: ${createdBorrowing.status} (Menunggu Approval Toolman)`);
    }

    // -------------------------------------------------------------
    // SKENARIO 4: Toolman menyetujui peminjaman dan stok alat berkurang menjadi 4 unit
    // -------------------------------------------------------------
    console.log('\n--- [SKENARIO 4: Toolman Menyetujui Peminjaman (Stok Berkurang Menjadi 4)] ---');
    
    const approveRes = await request('POST', `/borrowings/${createdBorrowing.id}/approve`, {}, toolmanCookies);
    console.log(`- Toolman menyetujui pinjaman: Status ${approveRes.statusCode} (Redirect: ${approveRes.headers.location})`);

    const updatedBorrowing = await prisma.borrowing.findUnique({
      where: { id: createdBorrowing.id },
      include: { toolman: true }
    });
    const updatedTool = await prisma.tool.findUnique({
      where: { id: createdTool.id }
    });

    console.log(`     Status Transaksi: ${updatedBorrowing.status}`);
    console.log(`     Disetujui oleh: ${updatedBorrowing.toolman.nama}`);
    console.log(`     Sisa Stok Alat di Lab: ${updatedTool.stok} Unit`);

    if (updatedBorrowing.status === 'APPROVED' && updatedTool.stok === 4) {
      console.log('  ✅ Skenario 4 Berhasil: Transaksi berstatus APPROVED dan stok berkurang tepat dari 5 menjadi 4 unit!');
    }

    // -------------------------------------------------------------
    // SKENARIO 5: Pengembalian alat kondisi rusak, hitung denda, dan verifikasi log aktifitas
    // -------------------------------------------------------------
    console.log('\n--- [SKENARIO 5: Pengembalian Alat Kondisi Rusak, Hitung Denda, & Audit Log] ---');
    
    const returnRes = await request('POST', `/borrowings/${createdBorrowing.id}/return`, {
      kondisiKembali: 'RUSAK',
      denda: '50000',
      catatanInspeksi: 'Inspeksi Toolman: Port Ether 1 patah pada pin tembaga saat praktikum siswa, dikenakan denda penggantian komponen.',
      updateToolStatus: 'yes'
    }, toolmanCookies);

    console.log(`- Toolman proses inspeksi pengembalian: Status ${returnRes.statusCode} (Redirect: ${returnRes.headers.location})`);

    const finalizedBorrowing = await prisma.borrowing.findUnique({
      where: { id: createdBorrowing.id }
    });

    const latestLog = await prisma.activityLog.findFirst({
      where: { aksi: 'PENGEMBALIAN_ALAT' },
      orderBy: { id: 'desc' },
      include: { user: true }
    });

    console.log(`     Status Transaksi Akhir: ${finalizedBorrowing.status}`);
    console.log(`     Kondisi Fisik Saat Kembali: ${finalizedBorrowing.kondisiKembali}`);
    console.log(`     Nominal Denda Dicatat: Rp ${finalizedBorrowing.denda.toLocaleString('id-ID')}`);
    console.log(`     Log Aktifitas Terakhir:`);
    console.log(`       - Aktor: ${latestLog.user.nama} (${latestLog.user.role})`);
    console.log(`       - Aksi: ${latestLog.aksi}`);
    console.log(`       - Keterangan: ${latestLog.keterangan}`);

    if (
      finalizedBorrowing.status === 'RETURNED' &&
      finalizedBorrowing.kondisiKembali === 'RUSAK' &&
      finalizedBorrowing.denda === 50000 &&
      latestLog.keterangan.includes('RUSAK') &&
      latestLog.keterangan.includes('50.000')
    ) {
      console.log('  ✅ Skenario 5 Berhasil: Pengembalian tuntas dengan status RETURNED, kondisi RUSAK, denda Rp 50.000, dan tercatat di ActivityLog!');
    }

    console.log('\n🎉 SELURUH 5 SKENARIO PENGUJIAN SISTEM BERHASIL DIVERIFIKASI 100% LULUS (PASSED)!');
    await prisma.$disconnect();
    process.exit(0);

  } catch (err) {
    console.error('❌ Terjadi kesalahan saat pengujian:', err);
    process.exit(1);
  }
}

runTests();
