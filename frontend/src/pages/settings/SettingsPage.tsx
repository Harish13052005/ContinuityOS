import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useNavigate, useParams } from 'react-router-dom'

const [email, setEmail] = useState(user?.email || '')
  const [full_name, setFullName] = useState(user?.full_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setEmail(user?.email || '')
    setFullName(user?.full_name || '')
  }, [user])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    return (
    <div className='max-w-xl mx-auto p-6 sm:p-8 bg-white rounded-lg shadow-xl'>
      <h2 className='text-2xl font-bold text-slate-900 mb-6'>Settings</h2>

      {success && (
        <div className='bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6'>
          <p className='font-medium'>Settings updated successfully.</p>
        </div>
      )}

      <form onSubmit={handleUpdate} className='space-y-4'>
        <div>
          <label htmlFor='email' className='block text-sm font-medium text-slate-700 mb-1'>
            Email
          </label>
          <input
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly
            className='mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
          />
        </div>

        <div>
          <label htmlFor='full_name' className='block text-sm font-medium text-slate-700 mb-1'>
            Full name
          </label>
          <input
            id='full_name'
            type='text'
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            className='mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            placeholder='John Doe'
          />
        </div>

        <div>
          <label htmlFor='current_password' className='block text-sm font-medium text-slate-700 mb-1'>
            Current password
          </label>
          <input
            id='current_password'
            type='password'
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className='mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            placeholder='Current password'
          />
        </div>

        <div>
          <label htmlFor='new_password' className='block text-sm font-medium text-slate-700 mb-1'>
            New password
          </label>
          <input
            id='new_password'
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className='mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            placeholder='Leave blank to keep current'
          />
        </div>

        <div>
          <label htmlFor='confirm_password' className='block text-sm font-medium text-slate-700 mb-1'>
            Confirm new password
          </label>
          <input
            id='confirm_password'
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className='mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
            placeholder='Confirm new password'
          />
        </div>

        {error && (
          <div className='bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md'>
            <p className='font-medium'>{error}</p>
          </div>
        )}

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Updating...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}