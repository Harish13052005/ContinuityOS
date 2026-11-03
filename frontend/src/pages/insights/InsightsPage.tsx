import { useEffect, useState } from 'react'
import { api, type ExtractedItem } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useNavigate, useParams } from 'react-router-dom'

export const InsightsPage = () => {
  const { user } = useAuth()
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadExtractedItems = async () => {
      try {
        const response = await api.extractedItems.list(projectId!)
        setExtractedItems(response.data)
      } catch (err: any) {
        setError(err.message || 'Failed to load insights')
      } finally {
        setLoading(false)
      }
    }

    if (user && projectId) {
      loadExtractedItems()
    }
  }, [user, projectId])

  if (loading) {
    return <p className='text-slate-600'>Loading insights...</p>
  }

  if (error) {
    return <p className='text-red-600'>{error}</p>
  }

  const itemTypeCounts = extractedItems.reduce((acc, item) => {
    acc[item.item_type] = (acc[item.item_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-bold text-slate-900'>Knowledge Insights</h2>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.decision > 0 ? 'indigo-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-indigo-600'>{itemTypeCounts.decision || 0}</div>
          <div className='text-slate-500 mt-1'>Decisions</div>
        </div>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.task > 0 ? 'green-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-green-600'>{itemTypeCounts.task || 0}</div>
          <div className='text-slate-500 mt-1'>Tasks</div>
        </div>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.risk > 0 ? 'red-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-red-600'>{itemTypeCounts.risk || 0}</div>
          <div className='text-slate-500 mt-1'>Risks</div>
        </div>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.dependency > 0 ? 'orange-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-orange-600'>{itemTypeCounts.dependency || 0}</div>
          <div className='text-slate-500 mt-1'>Dependencies</div>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.blocker > 0 ? 'rose-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-rose-600'>{itemTypeCounts.blocker || 0}</div>
          <div className='text-slate-500 mt-1'>Blockers</div>
        </div>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.question > 0 ? 'violet-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-violet-600'>{itemTypeCounts.question || 0}</div>
          <div className='text-slate-500 mt-1'>Questions</div>
        </div>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.responsibility > 0 ? 'amber-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-amber-600'>{itemTypeCounts.responsibility || 0}</div>
          <div className='text-slate-500 mt-1'>Responsibilities</div>
        </div>
        <div className='bg-white rounded-lg p-4 border border-slate-200' style={{ borderColor: itemTypeCounts.milestone > 0 ? 'lime-200' : 'slate-200' }}>
          <div className='text-3xl font-bold text-lime-600'>{itemTypeCounts.milestone || 0}</div>
          <div className='text-slate-500 mt-1'>Milestones</div>
        </div>
      </div>

      {extractedItems.length > 0 && (
        <div className='mt-6'>
          <h3 className='text-sm font-medium text-slate-600 mb-3'>Recent Extracted Items</h3>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-slate-200'>
              <thead className='bg-slate-50'>
                <tr>
                  <th className='text-left text-sm font-medium text-slate-500 px-6 py-3'>Title</th>
                  <th className='text-left text-sm font-medium text-slate-500 px-6 py-3'>Type</th>
                  <th className='text-left text-sm font-medium text-slate-500 px-6 py-3'>Confidence</th>
                  <th className='text-left text-sm font-medium text-slate-500 px-6 py-3'>Status</th>
                </tr>
              </thead>
              <tbody>
                {extractedItems
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 10)
                  .map((item) => (
                    <tr key={item.id} className='hover:bg-slate-50'>
                      <td className='px-6 py-4 font-medium text-slate-900 truncate'>{item.title}</td>
                      <td className='px-6 py-4 text-slate-500 capitalize'>{item.item_type}</td>
                      <td className='px-6 py-4 text-slate-500'>{Math.round(item.confidence || 0)}%</td>
                      <td className='px-6 py-4 text-slate-500 capitalize'>{item.verification_status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
