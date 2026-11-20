import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicPage from './PublicPage.jsx'

const publicMatch = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {publicMatch ? <PublicPage slug={decodeURIComponent(publicMatch[1])} /> : <App />}
  </StrictMode>,
)
