import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installImageRetry } from './utils/imageRetry'
import { installTamilHyphenation } from './utils/tamilHyphenation'

// Before the first render, so every <img> is covered from the first request
installImageRetry()
// Break points in long Tamil words, so justified text has no wide gaps on phones
installTamilHyphenation()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
