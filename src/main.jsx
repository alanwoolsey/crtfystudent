import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { StudentRecordsProvider } from './context/StudentRecordsContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudentRecordsProvider>
          <App />
        </StudentRecordsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
