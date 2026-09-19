import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No se encontró el elemento #root')

createRoot(raiz).render(
  <StrictMode>
    <main className="grid min-h-svh place-items-center font-sans">SIGEDA</main>
  </StrictMode>,
)
