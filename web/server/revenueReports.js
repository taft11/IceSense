const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const revenueSummaryQuery = `
  SELECT
    COALESCE(SUM(gross_revenue), 0) AS "grossRevenue",
    COALESCE(SUM(net_sales), 0) AS "netSales",
    COALESCE(SUM(bags_sold), 0) AS "bagsSold",
    COALESCE(SUM(tons_sold), 0) AS "tonsSold",
    COUNT(DISTINCT order_id) AS "orderCount",
    COALESCE(AVG(order_total), 0) AS "averageOrderValue"
  FROM revenue_daily
  WHERE sale_date BETWEEN $1::date AND $2::date
`;

const revenueDailyQuery = `
  SELECT
    sale_date AS date,
    COUNT(DISTINCT order_id) AS orders,
    COALESCE(SUM(gross_revenue), 0) AS "grossRevenue",
    COALESCE(SUM(net_sales), 0) AS "netSales",
    COALESCE(SUM(bags_sold), 0) AS "bagsSold",
    COALESCE(SUM(tons_sold), 0) AS "tonsSold",
    COALESCE(AVG(order_total), 0) AS "averageOrderValue"
  FROM revenue_daily
  WHERE sale_date BETWEEN $1::date AND $2::date
  GROUP BY sale_date
  ORDER BY sale_date ASC
`;

const isValidDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function createRevenueReportsHandler({ pool, verifyOwner }) {
  return async function revenueReportsHandler(request, response) {
    if (request.method !== 'GET') {
      response.status(405).json({ message: 'Method not allowed.' });
      return;
    }

    const { startDate, endDate } = request.query;
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
      response.status(400).json({ message: 'Provide valid startDate and endDate values.' });
      return;
    }

    try {
      await verifyOwner(request);
      const [summaryResult, dailyResult] = await Promise.all([
        pool.query(revenueSummaryQuery, [startDate, endDate]),
        pool.query(revenueDailyQuery, [startDate, endDate]),
      ]);
      const summary = summaryResult.rows[0] || {};

      response.json({
        startDate,
        endDate,
        summary: {
          grossRevenue: Number(summary.grossRevenue || 0),
          netSales: Number(summary.netSales || 0),
          bagsSold: Number(summary.bagsSold || 0),
          tonsSold: Number(summary.tonsSold || 0),
          orderCount: Number(summary.orderCount || 0),
          averageOrderValue: Number(summary.averageOrderValue || 0),
        },
        daily: dailyResult.rows.map((row) => ({
          date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
          orders: Number(row.orders || 0),
          grossRevenue: Number(row.grossRevenue || 0),
          netSales: Number(row.netSales || 0),
          bagsSold: Number(row.bagsSold || 0),
          tonsSold: Number(row.tonsSold || 0),
          averageOrderValue: Number(row.averageOrderValue || 0),
        })),
      });
    } catch (error) {
      if (error.code === 'OWNER_REQUIRED') {
        response.status(403).json({ message: 'Owner access is required.' });
        return;
      }
      console.error('Revenue report query failed', error);
      response.status(500).json({ message: 'Unable to load revenue report.' });
    }
  };
}

export { revenueDailyQuery, revenueSummaryQuery };