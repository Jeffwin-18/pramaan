'use client';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useRef, useState } from 'react';

export default function RuleChart({ data }: { data: { rule: string; count: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const rows = [...data].sort((a, b) => b.count - a.count);
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <BarChart width={w} height={Math.max(160, rows.length * 26 + 24)} data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="#E3E1DC" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#5D636B' }} axisLine={{ stroke: '#E3E1DC' }} tickLine={false} />
          <YAxis type="category" dataKey="rule" width={210} tick={{ fontSize: 10, fill: '#16191D', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#F7F6F3' }} contentStyle={{ fontSize: 12, border: '1px solid #E3E1DC', borderRadius: 4, boxShadow: 'none' }} />
          <Bar dataKey="count" fill="#1F3A5F" radius={[0, 2, 2, 0]} barSize={14} isAnimationActive={false} />
        </BarChart>)}
    </div>
  );
}
