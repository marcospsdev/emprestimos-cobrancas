import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

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

const root = createRoot(document.getElementById('root')!)

// Sem as variáveis do Supabase o client quebra ao carregar e a tela fica toda
// preta. Mostra o motivo em vez disso (o App só é importado se estiver configurado).
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  root.render(
    <div style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#0b0f0e', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 460, lineHeight: 1.5 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Supabase não configurado</h1>
        <p>
          Crie o arquivo <code>.env.local</code> na raiz do projeto (copie do <code>.env.example</code>) com{' '}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, e reinicie o <code>npm run dev</code>.
        </p>
      </div>
    </div>,
  )
} else {
  const { default: App } = await import('./App.tsx')
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Chegou até aqui: carregou normalmente. Libera o "reload único" pra valer de
// novo caso um deploy futuro cause o mesmo problema.
sessionStorage.removeItem(PRELOAD_ERROR_FLAG)
