const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database Laboratorium RPL & Elektronika...');

  // 1. Bersihkan Data Lama (Urutan sesuai relasi FK)
  await prisma.activityLog.deleteMany();
  await prisma.borrowing.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Database lama berhasil dibersihkan.');

  // 2. Hash Password Demo ("password123")
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 3. Buat Akun Pengguna (Admin, Toolman, Peminjam)
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: defaultPassword,
      nama: 'Bambang Sugiarto, S.Kom (Kepala Lab)',
      role: 'ADMIN',
      nisn: '198405122010011005', // NIP
      telepon: '081234567890'
    }
  });

  const toolmanUser = await prisma.user.create({
    data: {
      username: 'toolman',
      password: defaultPassword,
      nama: 'Rian Hidayat (Toolman & Laboran)',
      role: 'TOOLMAN',
      nisn: '199208152018021003', // NIP/NUPTK
      telepon: '081298765432'
    }
  });

  const peminjamUser = await prisma.user.create({
    data: {
      username: 'peminjam',
      password: defaultPassword,
      nama: 'Fajar Pratama (Siswa XII RPL 1)',
      role: 'PEMINJAM',
      nisn: '0067891234',
      telepon: '085711223344'
    }
  });

  const peminjamGuru = await prisma.user.create({
    data: {
      username: 'guru_rpl',
      password: defaultPassword,
      nama: 'Siti Nurhaliza, M.Pd (Guru Produktif RPL)',
      role: 'PEMINJAM',
      nisn: '198902142014032002',
      telepon: '081377889900'
    }
  });

  console.log('👤 Master Pengguna berhasil dibuat:');
  console.log('   - Admin   : admin / password123');
  console.log('   - Toolman : toolman / password123');
  console.log('   - Peminjam: peminjam / password123 (Fajar Pratama)');
  console.log('   - Peminjam: guru_rpl / password123 (Siti Nurhaliza)');

  // 4. Buat Master Kategori Alat
  const catJaringan = await prisma.category.create({
    data: { namaKategori: 'Jaringan' }
  });

  const catElektronika = await prisma.category.create({
    data: { namaKategori: 'Elektronika' }
  });

  const catProyektor = await prisma.category.create({
    data: { namaKategori: 'Proyektor' }
  });

  const catPerkakas = await prisma.category.create({
    data: { namaKategori: 'Perkakas Lab' }
  });

  console.log('🏷️ Master Kategori berhasil dibuat: Jaringan, Elektronika, Proyektor, Perkakas Lab.');

  // 5. Buat Master Alat Praktikum
  const toolMikrotik = await prisma.tool.create({
    data: {
      namaAlat: 'Router Mikrotik RB750Gr3 (hEX)',
      spesifikasi: 'Gigabit 5-Port 10/100/1000 Ethernet, Dual Core 880MHz, RouterOS v7 Level 4',
      stok: 8,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolLanTester = await prisma.tool.create({
    data: {
      namaAlat: 'Digital Cable Tester RJ45 & RJ11',
      spesifikasi: 'Alat uji kabel LAN UTP/STP dengan 8 LED indikator & remote probe presisi',
      stok: 10,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolCrimping = await prisma.tool.create({
    data: {
      namaAlat: 'Tang Crimping RJ45 CAT6 Pro',
      spesifikasi: 'Heavy duty crimping tool untuk konektor RJ45 Cat5e/Cat6 dan RJ11 dengan stripper',
      stok: 12,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolSolder = await prisma.tool.create({
    data: {
      namaAlat: 'Solder Station Digital 60W (ESD Safe)',
      spesifikasi: 'Pengatur suhu mikroprosesor 200°C - 480°C dengan stand solder dan busa pembersih',
      stok: 6,
      kondisi: 'BAIK',
      categoryId: catPerkakas.id
    }
  });

  const toolMultimeter = await prisma.tool.create({
    data: {
      namaAlat: 'Digital Multimeter Auto-Ranging',
      spesifikasi: 'Display LCD 6000 count, pengukuran tegangan AC/DC, resistansi, kapasitansi & buzzer',
      stok: 7,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolProyektor = await prisma.tool.create({
    data: {
      namaAlat: 'Proyektor Epson EB-X500 3LCD',
      spesifikasi: '3600 Lumens, resolusi XGA 1024x768, rasio kontras 16.000:1, input HDMI & VGA',
      stok: 3,
      kondisi: 'BAIK',
      categoryId: catProyektor.id
    }
  });

  const toolArduino = await prisma.tool.create({
    data: {
      namaAlat: 'Starter Kit Arduino Uno R3 IoT',
      spesifikasi: 'Modul mikrokontroler ATmega328P, breadboard, sensor suhu DHT11, servo, kabel jumper',
      stok: 15,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolRaspberry = await prisma.tool.create({
    data: {
      namaAlat: 'Raspberry Pi 4 Model B 4GB RAM',
      spesifikasi: 'Broadcom BCM2711 Quad-core Cortex-A72 1.5GHz, 4GB LPDDR4, dual display 4K Micro-HDMI',
      stok: 4,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  console.log('🔧 Master Inventaris Alat praktikum berhasil dibuat.');

  // 6. Buat Data Sirkulasi Transaksi Peminjaman Awal
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // Transaksi 1: Status APPROVED (Sedang dipinjam aktif)
  await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolCrimping.id,
      jumlah: 2,
      tglPinjam: today,
      tglKembaliRencana: tomorrow,
      status: 'APPROVED',
      kondisiKembali: null,
      denda: 0,
      toolmanId: toolmanUser.id,
      catatan: 'Praktikum Pengkabelan LAN & Switch di Lab Komputer 2'
    }
  });

  // Kurangi stok alat yang sedang dipinjam
  await prisma.tool.update({
    where: { id: toolCrimping.id },
    data: { stok: toolCrimping.stok - 2 }
  });

  // Transaksi 2: Status PENDING (Menunggu approval Toolman)
  await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolLanTester.id,
      jumlah: 1,
      tglPinjam: today,
      tglKembaliRencana: tomorrow,
      status: 'PENDING',
      kondisiKembali: null,
      denda: 0,
      toolmanId: null,
      catatan: 'Pengecekan kabel straight & cross praktikum UKK'
    }
  });

  // Transaksi 3: Status RETURNED (Kembali dalam kondisi BAIK, Denda 0)
  await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolMikrotik.id,
      jumlah: 1,
      tglPinjam: threeDaysAgo,
      tglKembaliRencana: twoDaysAgo,
      tglKembaliReal: twoDaysAgo,
      status: 'RETURNED',
      kondisiKembali: 'BAIK',
      denda: 0,
      toolmanId: toolmanUser.id,
      catatan: 'Konfigurasi VLAN & Routing Dinamis BGP'
    }
  });

  // Transaksi 4: Status RETURNED (Kembali dalam kondisi RUSAK, ada Denda Rp 50.000)
  await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolSolder.id,
      jumlah: 1,
      tglPinjam: threeDaysAgo,
      tglKembaliRencana: twoDaysAgo,
      tglKembaliReal: yesterday,
      status: 'RETURNED',
      kondisiKembali: 'RUSAK',
      denda: 50000,
      toolmanId: toolmanUser.id,
      catatan: 'Ujung mata solder patah dan kabel konektor terkelupas akibat panas'
    }
  });

  // Transaksi 5: Status APPROVED (Dipinjam oleh Guru RPL untuk pembelajaran)
  await prisma.borrowing.create({
    data: {
      userId: peminjamGuru.id,
      toolId: toolProyektor.id,
      jumlah: 1,
      tglPinjam: today,
      tglKembaliRencana: tomorrow,
      status: 'APPROVED',
      kondisiKembali: null,
      denda: 0,
      toolmanId: toolmanUser.id,
      catatan: 'Presentasi Proyek Akhir Aplikasi Web XII RPL'
    }
  });

  // Kurangi stok proyektor yang sedang dipinjam
  await prisma.tool.update({
    where: { id: toolProyektor.id },
    data: { stok: toolProyektor.stok - 1 }
  });

  console.log('📋 Data Transaksi Sirkulasi Peminjaman Awal berhasil dibuat.');

  // 7. Buat Log Aktifitas Awal (Audit Trail)
  await prisma.activityLog.createMany({
    data: [
      {
        userId: adminUser.id,
        aksi: 'INISIALISASI_SISTEM',
        keterangan: 'Inisialisasi master data pengguna, kategori, dan inventaris peralatan praktikum lab.',
        createdAt: threeDaysAgo
      },
      {
        userId: peminjamUser.id,
        aksi: 'AJUKAN_PINJAM',
        keterangan: 'Mengajukan permohonan pinjam 1 unit Router Mikrotik RB750Gr3 untuk praktikum VLAN.',
        createdAt: threeDaysAgo
      },
      {
        userId: toolmanUser.id,
        aksi: 'APPROVAL_PINJAM',
        keterangan: 'Menyetujui permohonan pinjam 1 unit Router Mikrotik RB750Gr3 oleh Fajar Pratama.',
        createdAt: threeDaysAgo
      },
      {
        userId: toolmanUser.id,
        aksi: 'PENGEMBALIAN_ALAT',
        keterangan: 'Pemeriksaan fisik pengembalian Router Mikrotik RB750Gr3. Kondisi: BAIK, Denda: Rp 0.',
        createdAt: twoDaysAgo
      },
      {
        userId: toolmanUser.id,
        aksi: 'PENGEMBALIAN_ALAT',
        keterangan: 'Pemeriksaan fisik Solder Station 60W. Kondisi: RUSAK (mata solder patah), Denda dicatat: Rp 50.000.',
        createdAt: yesterday
      },
      {
        userId: peminjamUser.id,
        aksi: 'AJUKAN_PINJAM',
        keterangan: 'Mengajukan pinjam 2 unit Tang Crimping RJ45 CAT6 Pro untuk praktikum perakitan kabel.',
        createdAt: today
      },
      {
        userId: toolmanUser.id,
        aksi: 'APPROVAL_PINJAM',
        keterangan: 'Menyetujui peminjaman 2 unit Tang Crimping RJ45 CAT6 Pro oleh Fajar Pratama. Stok berkurang menjadi 10.',
        createdAt: today
      },
      {
        userId: peminjamUser.id,
        aksi: 'AJUKAN_PINJAM',
        keterangan: 'Mengajukan pinjam 1 unit Digital Cable Tester RJ45. Status: Menunggu persetujuan Toolman.',
        createdAt: today
      }
    ]
  });

  console.log('📜 Riwayat Log Aktifitas Laboratorium berhasil dibuat.');
  console.log('✅ Seeding database Lab Sarpras RPL & Elektronika SELESAI!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal melakukan seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
