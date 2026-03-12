import { Navigate, Route, Routes } from 'react-router-dom'
import BmiFormPage from './pages/BmiFormPage'
import CalorieEstimatorPage from './pages/CalorieEstimatorPage'
import DataTablePage from './pages/DataTablePage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/bmi" element={<BmiFormPage />} />
      <Route path="/calorie-estimator" element={<CalorieEstimatorPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/data" element={<DataTablePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
