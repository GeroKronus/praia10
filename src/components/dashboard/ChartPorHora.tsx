'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ChartPorHoraProps {
  data: { hora: number; total: number }[]
}

export default function ChartPorHora({ data }: ChartPorHoraProps) {
  const formatado = data
    .sort((a, b) => a.hora - b.hora)
    .map((d) => ({
      ...d,
      label: `${d.hora.toString().padStart(2, '0')}h`,
    }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-600 mb-4">Por Hora (últimas 24h)</h3>
      {formatado.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Sem dados</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={formatado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value} denúncia(s)`, 'Total']} />
            <Bar dataKey="total" fill="#e74c3c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
