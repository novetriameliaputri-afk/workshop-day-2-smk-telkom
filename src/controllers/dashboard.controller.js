const prisma = require('../config/db');

const dashboardController = {
  getDashboard: async (req, res) => {
    try {
      const user = req.session.user;
      const role = user.role;

      if (role === 'ADMIN') {
        // Data khusus Dashboard ADMIN
        const [
          totalUsers,
          totalTools,
          totalCategories,
          totalBorrowings,
          pendingCount,
          activeBorrowCount,
          returnedCount,
          totalDendaResult,
          recentLogs,
          recentBorrowings,
          lowStockTools
        ] = await Promise.all([
          prisma.user.count(),
          prisma.tool.count(),
          prisma.category.count(),
          prisma.borrowing.count(),
          prisma.borrowing.count({ where: { status: 'PENDING' } }),
          prisma.borrowing.count({ where: { status: 'APPROVED' } }),
          prisma.borrowing.count({ where: { status: 'RETURNED' } }),
          prisma.borrowing.aggregate({
            _sum: { denda: true }
          }),
          prisma.activityLog.findMany({
            take: 8,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
          }),
          prisma.borrowing.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
              user: true,
              tool: { include: { category: true } },
              toolman: true
            }
          }),
          prisma.tool.findMany({
            where: { stok: { lte: 3 } },
            include: { category: true }
          })
        ]);

        return res.render('dashboard/admin', {
          title: 'Dashboard Administrator Lab RPL & Elektronika',
          currentPage: 'dashboard',
          stats: {
            totalUsers,
            totalTools,
            totalCategories,
            totalBorrowings,
            pendingCount,
            activeBorrowCount,
            returnedCount,
            totalDenda: totalDendaResult._sum.denda || 0
          },
          recentLogs,
          recentBorrowings,
          lowStockTools
        });
      } else if (role === 'TOOLMAN') {
        // Data khusus Dashboard TOOLMAN
        const [
          pendingApprovals,
          activeBorrowings,
          recentReturns,
          damagedToolsCount,
          totalToolsCount,
          totalDendaResult
        ] = await Promise.all([
          prisma.borrowing.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { user: true, tool: { include: { category: true } } }
          }),
          prisma.borrowing.findMany({
            where: { status: 'APPROVED' },
            orderBy: { tglKembaliRencana: 'asc' },
            include: { user: true, tool: { include: { category: true } } }
          }),
          prisma.borrowing.findMany({
            where: { status: 'RETURNED' },
            take: 5,
            orderBy: { tglKembaliReal: 'desc' },
            include: { user: true, tool: true, toolman: true }
          }),
          prisma.borrowing.count({
            where: { kondisiKembali: 'RUSAK' }
          }),
          prisma.tool.count(),
          prisma.borrowing.aggregate({
            _sum: { denda: true }
          })
        ]);

        return res.render('dashboard/toolman', {
          title: 'Dashboard Toolman & Laboran',
          currentPage: 'dashboard',
          pendingApprovals,
          activeBorrowings,
          recentReturns,
          stats: {
            pendingCount: pendingApprovals.length,
            activeCount: activeBorrowings.length,
            damagedCount: damagedToolsCount,
            totalToolsCount,
            totalDenda: totalDendaResult._sum.denda || 0
          }
        });
      } else {
        // Data khusus Dashboard PEMINJAM (Siswa / Guru)
        const [myActiveBorrowings, myPendingBorrowings, myHistoryBorrowings, availableTools] = await Promise.all([
          prisma.borrowing.findMany({
            where: { userId: user.id, status: 'APPROVED' },
            orderBy: { tglKembaliRencana: 'asc' },
            include: { tool: { include: { category: true } } }
          }),
          prisma.borrowing.findMany({
            where: { userId: user.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { tool: { include: { category: true } } }
          }),
          prisma.borrowing.findMany({
            where: { userId: user.id, status: { in: ['RETURNED', 'REJECTED'] } },
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: { tool: true }
          }),
          prisma.tool.findMany({
            where: { stok: { gt: 0 } },
            take: 6,
            include: { category: true }
          })
        ]);

        return res.render('dashboard/peminjam', {
          title: 'Portal Peminjaman Siswa / Guru - Lab RPL',
          currentPage: 'dashboard',
          myActiveBorrowings,
          myPendingBorrowings,
          myHistoryBorrowings,
          availableTools
        });
      }
    } catch (error) {
      console.error('Error saat memuat dashboard:', error);
      res.status(500).render('partials/header', {
        title: 'Error 500',
        currentPage: ''
      });
    }
  }
};

module.exports = dashboardController;
