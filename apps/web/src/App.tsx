import { Link, Route, Routes } from 'react-router-dom'
import { Button } from '@mantine/core'
import { UsersList } from './features/users/UsersList.js'
import { UserProperties } from './features/users/UserProperties.js'
import { PlansEditor } from './features/plans/PlansEditor.js'
import { AuthGate } from './features/auth/AuthGate.js'
import { useCurrentCsr } from './features/auth/useCurrentCsr.js'
import { useLogout } from './features/auth/useLogout.js'

function Portal() {
  const { data: csr } = useCurrentCsr()
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-slate-900 no-underline">
            CSR Portal
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-slate-600 no-underline hover:text-slate-900">
              Customers
            </Link>
            <Link to="/plans" className="text-slate-600 no-underline hover:text-slate-900">
              Plans
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            {logout.isError && (
              <span role="alert" className="text-red-600">
                Sign out failed
              </span>
            )}
            <span>{csr?.username}</span>
            <Button variant="default" size="xs" onClick={() => logout.mutate()} loading={logout.isPending}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Routes>
          <Route path="/" element={<UsersList />} />
          <Route path="/users/:id" element={<UserProperties />} />
          <Route path="/plans" element={<PlansEditor />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthGate>
      <Portal />
    </AuthGate>
  )
}

export default App
