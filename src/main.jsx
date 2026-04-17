import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StudentRecordsProvider } from './context/StudentRecordsContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StudentRecordsProvider>
        <App />
      </StudentRecordsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
