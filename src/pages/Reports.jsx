import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '../components/shared/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { subDays, format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { printDriverPerformanceReport } from '../components/print/printDriverPerformance';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [period, setPeriod] = useState('30');

  const { data: loads = [] } = useQuery({ queryKey: ['loads-report'], queryFn: () => base44.entities.Load.list('-created_date', 1000) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices-report'], queryFn: () => base44.entities.Invoice.list('-created_date', 1000) });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers-report'], queryFn: () => base44.entities.Driver.list() });
  const { data: fuel = [] } = useQuery({ queryKey: ['fuel-report'], queryFn: () => base44.entities.FuelTransaction.list('-created_date', 1000) });

  const cutoff = subDays(new Date(), parseInt(period));
  const recentLoads = loads.filter(l => l.created_date && new Date(l.created_date) >= cutoff);
  const recentInvoices = invoices.filter(i => i.created_date && new Date(i.created_date) >= cutoff);

  const totalRevenue = recentInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const paidRevenue = recentInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const avgLoadValue = recentLoads.length ? (totalRevenue / recentLoads.length) : 0;

  // Revenue by customer
  const byCustomer = {};
  recentInvoices.forEach(i => {
    const name = i.customer_name || 'Unknown';
    byCustomer[name] = (byCustomer[name] || 0) + (i.total || 0);
  });
  const customerData = Object.entries(byCustomer)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Invoice status breakdown
  const statusCount = {};
  invoices.forEach(i => { statusCount[i.status] = (statusCount[i.status] || 0) + 1; });
  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  // Driver performance
  const driverLoads = {};
  recentLoads.forEach(l => {
    if (l.driver_1_name) {
      if (!driverLoads[l.driver_1_name]) driverLoads[l.driver_1_name] = { name: l.driver_1_name, loads: 0, revenue: 0 };
      driverLoads[l.driver_1_name].loads++;
      driverLoads[l.driver_1_name].revenue += (l.invoice_amount || 0);
    }
  });
  const driverData = Object.values(driverLoads).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const StatBox = ({ label, value, sub }) => (
    <Card className="p-3 md:p-4">
      <p className="text-[10px] md:text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
      <p className="text-lg md:text-2xl font-bold mt-0.5 md:mt-1">{value}</p>
      {sub && <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );

  return (
    <div className="p-3 md:p-4 space-y-3 md:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm md:text-base font-bold">Reports</h1>
          <p className="text-[11px] md:text-xs text-muted-foreground">Revenue, load & driver analytics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-8 text-xs w-32 md:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <StatBox label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} sub={`${recentInvoices.length} invoices`} />
        <StatBox label="Collected" value={`$${paidRevenue.toLocaleString()}`} sub={`${Math.round(totalRevenue ? paidRevenue / totalRevenue * 100 : 0)}% of total`} />
        <StatBox label="Loads" value={recentLoads.length} sub={`Avg $${Math.round(avgLoadValue).toLocaleString()}/load`} />
        <StatBox label="Active Drivers" value={drivers.filter(d => d.status === 'active').length} sub={`${driverData.length} with loads`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="py-2.5 px-3 md:py-3 md:px-4">
            <CardTitle className="text-xs md:text-sm">Revenue by Customer</CardTitle>
          </CardHeader>
          <CardContent className="px-2 md:pr-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={customerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2.5 px-3 md:py-3 md:px-4">
            <CardTitle className="text-xs md:text-sm">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="py-2.5 px-3 md:py-3 md:px-4">
            <CardTitle className="text-xs md:text-sm">Driver Performance</CardTitle>
          </CardHeader>
          <CardContent className="px-1 md:pr-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={driverData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, name) => [name === 'revenue' ? `$${v.toLocaleString()}` : v, name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="right" dataKey="loads" fill="hsl(var(--chart-2))" name="Loads" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}