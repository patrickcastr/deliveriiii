import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function StatCard({ title, value, sub, icon }: { title: string; value: string | number; sub?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}
