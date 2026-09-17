import { Link, Route, Routes } from 'react-router-dom'
import { UsersList } from './features/users/UsersList.js'
import { UserProperties } from './features/users/UserProperties.js'

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-slate-900 no-underline">
            CSR Portal
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Routes>
          <Route path="/" element={<UsersList />} />
          <Route path="/users/:id" element={<UserProperties />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
