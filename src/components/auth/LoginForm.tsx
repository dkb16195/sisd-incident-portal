'use client'

import { useState } from 'react'
import { signIn } from '@/app/auth/actions'

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    const result = await signIn(formData)
    // If signIn redirects, this line won't be reached
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent
                     disabled:opacity-50"
          placeholder="you@sisd.ae"
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent
                     disabled:opacity-50"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {friendlyError(error)}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white
                   transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#1B3A6B' }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

function friendlyError(msg: string): string {
  if (msg.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return 'Please verify your email address before signing in.'
  }
  return msg
}
