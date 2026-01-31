import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backgroundObras, setBackgroundObras] = useState([])
  const navigate = useNavigate()

  const CDN_ROOT = '/cdn-tenrai'
  const IMG_BASE = `${CDN_ROOT}/scans`

  useEffect(() => {
    const fetchBackgroundObras = async () => {
      try {
        const res = await fetch('/api-tenrai/obras/atualizacoes?pagina=1&limite=20&gen_id=1', {
          headers: {
            Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
            Accept: 'application/json'
          }
        })
        if (res.ok) {
          const json = await res.json()
          if (json.obras) {
            const items = json.obras.map(obr => {
              const rawName = obr.obr_imagem ? String(obr.obr_imagem) : ''
              const imgBasename = rawName ? rawName.split('/').pop().trim() : null
              const obraId = obr.obr_id != null ? String(obr.obr_id).trim() : ''
              let imgUrl
              if (rawName && rawName.includes('/')) {
                imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
              } else if (imgBasename && obraId) {
                imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`
              }
              return { id: obr.obr_id, url: imgUrl }
            }).filter(o => o.url)
            setBackgroundObras(items)
          }
        }
      } catch (e) {
        console.error("Failed to fetch login background", e)
      }
    }
    fetchBackgroundObras()
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/inicio'
        }
      })

      if (loginError) {
        throw new Error(loginError.message)
      }
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
      setLoading(false)
    }
  }

  // Split items into 3 columns for the marquee effect
  const col1 = backgroundObras.slice(0, Math.ceil(backgroundObras.length / 3))
  const col2 = backgroundObras.slice(Math.ceil(backgroundObras.length / 3), Math.ceil(backgroundObras.length * 2 / 3))
  const col3 = backgroundObras.slice(Math.ceil(backgroundObras.length * 2 / 3))

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="marquee-column">
          <div className="marquee-content">
            {[...col1, ...col1].map((item, i) => <img key={i} src={item.url} alt="" className="marquee-img" />)}
          </div>
        </div>
        <div className="marquee-column reverse">
          <div className="marquee-content">
            {[...col2, ...col2].map((item, i) => <img key={i} src={item.url} alt="" className="marquee-img" />)}
          </div>
        </div>
        <div className="marquee-column">
          <div className="marquee-content">
            {[...col3, ...col3].map((item, i) => <img key={i} src={item.url} alt="" className="marquee-img" />)}
          </div>
        </div>
        <div className="login-overlay-gradient"></div>
      </div>

      <div className="login-card">
        <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.05em' }}>TENRAI</span>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '400',
            color: '#000',
            background: '#fff',
            borderRadius: '999px',
            padding: '2px 8px',
            height: 'fit-content',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>LEITOR</span>
        </div>

        <h2 className="login-title">Bem-vindo!</h2>
        <p className="login-subtitle">Escolha um dos provedores abaixo para entrar!</p>

        {error && <div className="login-error">{error}</div>}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="form-button google-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Conectando...' : 'Entrar com Google'}
        </button>
      </div>
    </div>
  )
}
