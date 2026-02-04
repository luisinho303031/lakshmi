import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Drawer } from 'vaul'

const recentesCache = { data: null }

export default function ObraRecentes({ onLoading }) {
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    onLoading?.(loading)
  }, [loading, onLoading])
  const [error, setError] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedObra, setSelectedObra] = useState(null)
  const [bibliotecaObras, setBibliotecaObras] = useState([])
  const [toast, setToast] = useState(null)

  const contextMenuRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 520)

  const CDN_ROOT = 'https://cdn.verdinha.wtf'
  const IMG_BASE = `${CDN_ROOT}/scans`

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 520)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchRecentes = async () => {
      try {
        if (recentesCache.data) {
          setRecentes(recentesCache.data)
          setLoading(false)
        }

        const res = await fetch('/api-tenrai/obras/recentes?pagina=1&limite=6&gen_id=1', {
          headers: {
            Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
            Accept: 'application/json'
          }
        })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const json = await res.json()
        const items = json.obras || []
        setRecentes(items)
        recentesCache.data = items
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchRecentes()
  }, [])

  useEffect(() => {
    const fetchLibrary = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('biblioteca_usuario')
        .select('obra_id')
        .eq('usuario_id', user.id)
      if (!error && data) {
        setBibliotecaObras(data.map(item => item.obra_id))
      }
    }
    fetchLibrary()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 2000)
  }

  const slugify = (str) => {
    if (!str) return 'obra'
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleContextMenu = (e, obra) => {
    e.preventDefault()
    setSelectedObra(obra)
    if (isMobile) {
      setShowMobileMenu(true)
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
  }

  const handleAddToLibrary = async () => {
    if (!selectedObra) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showToast('Você precisa estar logado', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('biblioteca_usuario')
        .upsert({
          usuario_id: user.id,
          obra_id: selectedObra.obr_id,
          obr_nome: selectedObra.obr_nome,
          obr_imagem: selectedObra.obr_imagem,
          data_adicionada: new Date().toISOString()
        })
      if (error) throw error
      setBibliotecaObras([...bibliotecaObras, selectedObra.obr_id])
      showToast('Adicionado à biblioteca')
    } catch (err) {
      showToast('Erro ao adicionar', 'error')
    }
    setContextMenu(null)
    setShowMobileMenu(false)
  }

  const handleRemoveFromLibrary = async () => {
    if (!selectedObra) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase
        .from('biblioteca_usuario')
        .delete()
        .eq('usuario_id', user.id)
        .eq('obra_id', selectedObra.obr_id)
      if (error) throw error
      setBibliotecaObras(bibliotecaObras.filter(id => id !== selectedObra.obr_id))
      showToast('Removido da biblioteca')
    } catch (err) {
      showToast('Erro ao remover', 'error')
    }
    setContextMenu(null)
    setShowMobileMenu(false)
  }

  const handleOpenObra = () => {
    if (!selectedObra) return
    window.location.href = `/obra/${slugify(selectedObra.obr_nome)}`
    setContextMenu(null)
    setShowMobileMenu(false)
  }

  const handleOpenObraNewTab = () => {
    if (!selectedObra) return
    window.open(`/obra/${slugify(selectedObra.obr_nome)}`, '_blank')
    setContextMenu(null)
    setShowMobileMenu(false)
  }

  if (loading) {
    return (
      <div className="section-box">
        <div className="recent-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="recent-heading">Recomendadas</div>
            <span className="ranking-subtitle">Obras sugeridas para você!</span>
          </div>
        </div>
        <div className="section-body">
          <div className="obra-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-recent-${i}`} className="obra-card">
                <div className="obra-cover-container">
                  <div className="obra-cover skeleton-cover" />
                </div>
                <div className="obra-title skeleton-title" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section-box">
      <div className="recent-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="recent-heading">Recomendadas</div>
          <span className="ranking-subtitle">Obras sugeridas para você!</span>
        </div>
      </div>
      <div className="section-body">
        <div className="obra-grid">
          {recentes.map((r) => {
            const rawName = r.obr_imagem ? String(r.obr_imagem) : ''
            const imgBasename = rawName ? rawName.split('/').pop().trim() : null
            const obraId = r.obr_id != null ? String(r.obr_id).trim() : ''
            let imgUrl
            if (rawName && rawName.includes('/')) {
              imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
            } else if (imgBasename && obraId) {
              imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`
            }
            return (
              <Link key={r.obr_id} to={`/obra/${slugify(r.obr_nome)}`} className="obra-card-link">
                <div className="obra-card" onContextMenu={(e) => handleContextMenu(e, r)}>
                  <div className="obra-cover-container">
                    <img src={imgUrl} alt={r.obr_nome} className="obra-cover" />
                    {bibliotecaObras.includes(r.obr_id) && (
                      <div className="obra-badge-overlay">Na Biblioteca</div>
                    )}
                  </div>
                  <div className="obra-title">{r.obr_nome}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {contextMenu && !isMobile && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {bibliotecaObras.includes(selectedObra.obr_id) ? (
            <button className="context-menu-item" onClick={handleRemoveFromLibrary}>
              <i className="fas fa-trash"></i> Remover da biblioteca
            </button>
          ) : (
            <button className="context-menu-item" onClick={handleAddToLibrary}>
              <i className="fas fa-plus"></i> Adicionar à biblioteca
            </button>
          )}
          <button className="context-menu-item" onClick={handleOpenObra}>
            <i className="fas fa-arrow-right"></i> Abrir obra
          </button>
          <button className="context-menu-item" onClick={handleOpenObraNewTab}>
            <i className="fas fa-external-link"></i> Abrir em outra aba
          </button>
        </div>
      )}

      <Drawer.Root open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <Drawer.Portal>
          <Drawer.Overlay className="vaul-overlay" />
          <Drawer.Content className="vaul-content">
            <div className="vaul-handle-wrapper">
              <div className="vaul-handle" />
            </div>
            <div className="vaul-inner-content">
              <div className="vaul-header">
                <Drawer.Title className="vaul-title">{selectedObra?.obr_nome}</Drawer.Title>
              </div>
              <div className="vaul-body">
                {selectedObra && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {bibliotecaObras.includes(selectedObra.obr_id) ? (
                      <button className="context-menu-item" onClick={handleRemoveFromLibrary} style={{ padding: '12px 0', fontSize: '1rem', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
                        <i className="fas fa-trash"></i> Remover da biblioteca
                      </button>
                    ) : (
                      <button className="context-menu-item" onClick={handleAddToLibrary} style={{ padding: '12px 0', fontSize: '1rem', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
                        <i className="fas fa-plus"></i> Adicionar à biblioteca
                      </button>
                    )}
                    <button className="context-menu-item" onClick={handleOpenObra} style={{ padding: '12px 0', fontSize: '1rem', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
                      <i className="fas fa-arrow-right"></i> Abrir obra
                    </button>
                    <button className="context-menu-item" onClick={handleOpenObraNewTab} style={{ padding: '12px 0', fontSize: '1rem', background: 'transparent', borderBottom: 'none', borderRadius: 0 }}>
                      <i className="fas fa-external-link"></i> Abrir em outra aba
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
