import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
      <div className="w-full max-w-sm">
        {/* Logo + school name */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/sisd-logo.jpeg"
              alt="SISD"
              width={72}
              height={72}
              className="rounded-lg"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>
            SISD Incident Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Swiss International Scientific School Dubai
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in</h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Accounts are managed by your school administrator.
        </p>
      </div>
    </main>
  )
}
