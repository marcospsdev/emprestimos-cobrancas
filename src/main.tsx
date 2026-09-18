import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Depois de um novo deploy, os arquivos das telas carregadas sob demanda (lazy)
// mudam de nome — se o usuário ficou com a aba aberta desde antes do deploy, o
// import dinâmico aponta pra um arquivo que não existe mais e quebra a tela.
// Recarrega a página uma vez pra buscar a versão atual em vez de mostrar erro.
const PRELOAD_ERROR_FLAG = 'preload-error-reloaded'
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(PRELOAD_ERROR_FLAG)) return
  sessionStorage.setItem(PRELOAD_ERROR_FLAG, '1')
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Chegou até aqui: carregou normalmente. Libera o "reload único" pra valer de
// novo caso um deploy futuro cause o mesmo problema.
sessionStorage.removeItem(PRELOAD_ERROR_FLAG)
