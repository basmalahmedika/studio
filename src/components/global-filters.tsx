
'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/app-context';
import { DateRangePicker } from '@/components/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type PatientTypeFilter = 'all' | 'Rawat Jalan' | 'Rawat Inap' | 'Lain-lain';
type PaymentMethodFilter = 'all' | 'UMUM' | 'BPJS' | 'Lain-lain';

export function GlobalFilters() {
  const { filters, setFilters } = useAppContext();
  const pathname = usePathname();

  // Define which pages should show which filters
  const showPatientTypeFilter = ['/dashboard/transactions', '/dashboard/item-usage', '/dashboard/analysis'].includes(pathname);
  const showPaymentMethodFilter = ['/dashboard/transactions', '/dashboard/analysis'].includes(pathname);
  const showDateFilter = !['/dashboard/inventory', '/dashboard/reports', '/dashboard/settings'].includes(pathname);


  if (!showDateFilter) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter Global</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DateRangePicker 
            date={filters.date} 
            onDateChange={(date) => setFilters({ date })} 
            className="lg:col-span-2"
          />
          {showPatientTypeFilter && (
            <Select 
              value={filters.patientType} 
              onValueChange={(value) => setFilters({ patientType: value as PatientTypeFilter })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipe Pasien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Pasien</SelectItem>
                <SelectItem value="Rawat Jalan">Rawat Jalan</SelectItem>
                <SelectItem value="Rawat Inap">Rawat Inap</SelectItem>
                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
          )}
          {showPaymentMethodFilter && (
            <Select
              value={filters.paymentMethod}
              onValueChange={(value) => setFilters({ paymentMethod: value as PaymentMethodFilter })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Metode Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode Pembayaran</SelectItem>
                <SelectItem value="BPJS">BPJS</SelectItem>
                <SelectItem value="UMUM">UMUM</SelectItem>
                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

    