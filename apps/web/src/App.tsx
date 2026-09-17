import { Route, Routes } from 'react-router-dom'
import { UsersList } from './features/users/UsersList.js'
import { UserProperties } from './features/users/UserProperties.js'

function App() {
  return (
    <Routes>
      <Route path="/" element={<UsersList />} />
      <Route path="/users/:id" element={<UserProperties />} />
    </Routes>
  )
}

export default App
