import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MONTHS_BACK = 6;

const fmtDollar = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{fmtDollar(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueCharts({ loads, drivers, invoices = [] }) {
  // Build last N months revenue data
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      const label = format(date, 'MMM yy');
      const start = format(startOfMonth(date), 'yyyy-MM-dd');
      const end = format(endOfMonth(date), 'yyyy-MM-dd');
      const monthLoads = loads.filter(l => {
        const d = l.delivery_date || l.pickup_date || '';
        return d >= start && d <= end && !l.canceled;
      });
      const revenue = monthLoads.reduce((s, l) => s + (Number(l.invoice_amount) || 0), 0);
      months.push({ key, label, revenue, count: monthLoads.length });
    }
    return months;
  }, [loads]);

  // Month-over-month trend
  const current = monthlyData[monthlyData.length - 1]?.revenue || 0;
  const previous = monthlyData[monthlyData.length - 2]?.revenue || 0;
  const pctChange = previous > 0 ? ((current - previous) / previous) * 100 : null;

  // Top drivers by revenue (current month + last month combined for relevance)
  const topDriversData = useMemo(() => {
    const last2Start = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const recentLoads = loads.filter(l => {
      const d = l.delivery_date || l.pickup_date || '';
      return d >= last2Start && !l.canceled;
    });
    const driverMap = {};
    recentLoads.forEach(l => {
      if (!l.driver_1_name) return;
      if (!driverMap[l.driver_1_name]) driverMap[l.driver_1_name] = 0;
      driverMap[l.driver_1_name] += Number(l.invoice_amount) || 0;
    });
    return Object.entries(driverMap)
      .map(([name, revenue]) => ({ name: name.split(' ')[0], fullName: name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [loads]);

  // Invoice Status breakdown
  const invoiceStatusData = useMemo(() => {
    const statusCount = {
      not_invoiced: loads.filter(l => l.invoice_status === 'not_invoiced' || !l.invoice_status).length,
      priority: invoices.filter(i => i.status === 'priority').length,
      sent: invoices.filter(i => i.status === 'sent').length,
      paid: invoices.filter(i => i.status === 'paid').length,
    };
    return Object.entries(statusCount)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({ name: status.charAt(0).toUpperCase() + status.slice(1), value: count }));
  }, [loads, invoices]);

  const invoiceStatusColors = {
    'Not_invoiced': '#9CA3AF',
    'Priority': '#FF8C42',
    'Sent': '#06B6D4',
    'Paid': '#10B981',
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      {/* Monthly Revenue Bar Chart */}
      <Card className="xl:col-span-3">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Monthly Gross Revenue</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Last {MONTHS_BACK} months</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{fmtDollar(current)}</p>
            {pctChange !== null && (
              <div className={`flex items-center justify-end gap-1 text-xs font-medium ${pctChange > 0 ? 'text-green-600' : pctChange < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {pctChange > 0 ? <TrendingUp className="w-3 h-3" /> : pctChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% vs last month
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={46} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Invoice Status Pie Chart */}
      <Card className="xl:col-span-1">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">Invoice Status</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {invoiceStatusData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={invoiceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name} ${value}`}
                  labelLine={false}
                >
                  {invoiceStatusData.map((entry, index) => {
                    const colors = ['#9CA3AF', '#FF8C42', '#06B6D4', '#10B981'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip formatter={(value) => `${value}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Drivers */}
      <Card className="xl:col-span-2">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">Top Drivers</CardTitle>
          <p className="text-xs text-muted-foreground">By revenue — last 2 months</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {topDriversData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topDriversData.map((d, i) => {
                const max = topDriversData[0].revenue;
                const pct = max > 0 ? (d.revenue / max) * 100 : 0;
                const colors = ['bg-primary', 'bg-blue-400', 'bg-cyan-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-pink-500'];
                return (
                  <div key={d.fullName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-xs font-medium truncate max-w-[110px]" title={d.fullName}>{d.fullName}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{fmtDollar(d.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[i] || 'bg-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}