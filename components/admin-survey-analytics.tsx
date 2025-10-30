"use client"
import React, { useEffect, useState, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

type Distribution = { question_id: string; question_text: string; counts: Record<string, number>; options?: {value:any,label:string}[] }

export default function AdminSurveyAnalyticsClient({ formId }: { formId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number>(0)
  const [timeseries, setTimeseries] = useState<Record<string, number>>({})
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const [range, setRange] = useState<string>('30')
  const chartRef = useRef<any>(null)

  const fetchData = (r = range) => {
    if (!formId) return
    setLoading(true)
    fetch(`/api/admin/surveys/analytics?form_id=${formId}&range=${r}`)
      .then((res) => res.json())
      .then((j) => {
        if (j.error) setError(j.error)
        else {
          setError(null)
          setTotal(j.total || 0)
          setTimeseries(j.timeseries || {})
          setDistributions(j.distributions || [])
          setExportUrl(j.exportUrl || null)
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [formId])

  useEffect(() => { fetchData(range) }, [range])

  if (!formId) return <div className="p-4">No form selected.</div>
  if (loading) return <div className="p-4">Loading analytics...</div>
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>

  // timeseries
  const sortedDates = Object.keys(timeseries).sort()
  const seriesData = sortedDates.map((d) => timeseries[d] || 0)
  const lineData = { labels: sortedDates, datasets: [{ label: 'Responses', data: seriesData, borderColor: 'rgba(99,102,241,0.9)', backgroundColor: 'rgba(99,102,241,0.2)', tension: 0.2 }] }

  // stacked bar: each question -> options as stacked bars (we'll pick top N questions)
  const stackedQuestions = distributions.slice(0, 5)
  const stackedLabels = stackedQuestions.map((q) => q.question_text)
  // collect unique option keys across those questions
  const optionKeys = Array.from(new Set(stackedQuestions.flatMap(q => Object.keys(q.counts))))
  const stackedDatasets = optionKeys.map((key, idx) => ({
    label: key,
    data: stackedQuestions.map(q => q.counts[key] || 0),
    backgroundColor: [`#7C3AED`,'#06B6D4','#F59E0B','#10B981','#EF4444'][idx%5]
  }))

  const stackedData = { labels: stackedLabels, datasets: stackedDatasets }

  const downloadChart = async () => {
    const chart = chartRef.current
    // react-chartjs-2 exposes the Chart instance ref directly
    const toBase64 = chart?.toBase64Image?.bind(chart)
    if (!toBase64) return
    const url = toBase64()
    const a = document.createElement('a')
    a.href = url
    a.download = `survey_${formId}_chart.png`
    a.click()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Survey Analytics</h2>
          <p className="text-muted-foreground">Form ID: {formId} — Total responses: {total}</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={range} onChange={(e)=>setRange(e.target.value)} className="border rounded-md p-2">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          {exportUrl && <a href={exportUrl} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-orange-500" target="_blank" rel="noreferrer">Export CSV</a>}
          <button onClick={downloadChart} className="px-3 py-2 bg-orange-500 hover:bg-orange-300 rounded-md dark:bg-blue-700 dark:text-gray-100 dark:hover:bg-gray-300 dark:hover:text-blue-800">Download PNG</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-card p-4 rounded-md shadow-sm">
          <h3 className="font-medium mb-2">Responses Over Time</h3>
          <Line ref={chartRef} data={lineData} />
        </div>

        <div className="bg-card p-4 rounded-md shadow-sm">
          <h3 className="font-medium mb-2">Stacked: Top questions</h3>
          <Bar data={stackedData} options={{ plugins: { title: { display: false } }, responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }} />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {distributions.map((d) => {
          const labels = (d.options && d.options.map(o=>o.label)) || Object.keys(d.counts)
          const counts = labels.map((l:any, idx:number) => {
            // find key by label
            const opt = d.options && d.options[idx]
            const key = opt ? (opt.value===null? '__undefined__': String(opt.value)) : Object.keys(d.counts)[idx]
            return d.counts[key] || 0
          })
          const donutData = { labels, datasets: [{ data: counts, backgroundColor: labels.map((_,i)=>[`#7C3AED`,'#06B6D4','#F59E0B','#10B981','#EF4444'][i%5]) }] }
          return (
            <div key={d.question_id} className="bg-card p-4 rounded-md shadow-sm">
              <h4 className="font-medium mb-2">{d.question_text}</h4>
              <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1"><Pie data={donutData} /></div>
                <div className="flex-1">
                  <ul className="space-y-1 text-sm">
                    {labels.map((l:any, i:number)=> (
                      <li key={l} className="flex justify-between">
                        <span>{l}</span>
                        <span className="font-medium">{counts[i] || 0}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
