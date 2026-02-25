'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface ChartPorDiaProps {
  data: { dia: string; total: number; visitantes: number }[]
}

export default function ChartPorDia({ data }: ChartPorDiaProps) {
  const formatado = data.map((d) => {
    const [, m, dia] = d.dia.split('-')
    return { ...d, label: `${dia}/${m}` }
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-600 mb-4">Por Dia (últimos 7 dias)</h3>
      {formatado.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Sem dados</p>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={formatado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Denúncias" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="visitantes" name="Visitantes" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
