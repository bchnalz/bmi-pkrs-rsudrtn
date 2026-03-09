import { Navigate, Route, Routes } from 'react-router-dom'
import BmiFormPage from './pages/BmiFormPage'
import DataTablePage from './pages/DataTablePage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<BmiFormPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/data" element={<DataTablePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
