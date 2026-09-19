import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { sesion } from './lib/auth/sesion'
import { crearQueryClient } from './lib/query'
import { crearRouter } from './router'
import './theme.css'

async function iniciar() {
  await sesion.restaurar()
  const queryClient = crearQueryClient()
  const router = crearRouter(queryClient)
  const raiz = document.getElementById('root')
  if (!raiz) throw new Error('No se encontró el elemento #root')
  createRoot(raiz).render(
    <StrictMode>
      <App router={router} queryClient={queryClient} />
    </StrictMode>,
  )
}

void iniciar()
