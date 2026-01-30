import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Drawer } from 'vaul'

const recentesCache = { data: null }

export default function ObraRecentes() {
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedObra, setSelectedObra] = useState(null)
  const [bibliotecaObras, setBibliotecaObras] = useState([])
  const [toast, setToast] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 520)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const mountedRef = useRef(false)
  const controllerRef = useRef(null)
  const contextMenuRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  const CDN_ROOT = '/cdn-tenrai'
  const IMG_BASE = `${CDN_ROOT}/scans`

  // Detectar mudança de tamanho de tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 520)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setLoading(true)

    // Abort previous request if exists
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    const controller = new AbortController()
    controllerRef.current = controller

    const fetchRecent = async () => {
      try {
        // Fetch specific works manually
        const slugs = [
          'por-favor-fada-me-deixe-explicar',
          'necromante-catastrofico',
          'sentido-da-espada-absoluta',
          'o-retorno-do-demonio-louco',
          'eu-obtive-um-item-mitico',
          'o-heroi-de-nivel-maximo-ira-voltar'
        ]

        const promises = slugs.map(slug =>
          fetch(`/api-tenrai/obras/${slug}`, {
            headers: {
              Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
              Accept: 'application/json'
            },
            signal: controller.signal
          }).then(res => res.ok ? res.json() : null)
            .catch(() => null)
        )

        const items = (await Promise.all(promises)).filter(item => item !== null)

        setRecentes(items)
        recentesCache.data = items
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRecent()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }

    const handleScroll = () => {
      setContextMenu(null)
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [contextMenu])

  useEffect(() => {
    const fetchBiblioteca = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error: err } = await supabase
          .from('biblioteca_usuario')
          .select('obra_id')
          .eq('usuario_id', user.id)

        if (err) throw err
        setBibliotecaObras((data || []).map(item => item.obra_id))
      } catch (err) {
        console.error('Erro ao buscar biblioteca:', err)
      }
    }

    fetchBiblioteca()
  }, [])

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

    const newBibliotecaObras = [...bibliotecaObras, selectedObra.obr_id]
    setBibliotecaObras(newBibliotecaObras)
    setContextMenu(null)
    setShowMobileMenu(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBibliotecaObras(bibliotecaObras) // Revert
        showToast('Você precisa estar logado', 'error')
        return
      }

      const payload = {
        usuario_id: user.id,
        obra_id: selectedObra.obr_id,
        obr_nome: selectedObra.obr_nome || 'Sem título',
        obr_imagem: selectedObra.obr_imagem || '',
        data_adicionada: new Date().toISOString()
      }

      const { error } = await supabase
        .from('biblioteca_usuario')
        .upsert(payload, {
          onConflict: 'usuario_id,obra_id'
        })

      if (error) throw error
    } catch (err) {
      setBibliotecaObras(bibliotecaObras) // Revert
      console.error('Erro no Supabase:', err)
      showToast('Erro ao adicionar: ' + err.message, 'error')
    }
  }

  const handleRemoveFromLibrary = async () => {
    if (!selectedObra) return

    const newBibliotecaObras = bibliotecaObras.filter(id => id !== selectedObra.obr_id)
    setBibliotecaObras(newBibliotecaObras)
    setContextMenu(null)
    setShowMobileMenu(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBibliotecaObras(bibliotecaObras) // Revert
        showToast('Você precisa estar logado', 'error')
        return
      }

      const { error } = await supabase
        .from('biblioteca_usuario')
        .delete()
        .eq('usuario_id', user.id)
        .eq('obra_id', selectedObra.obr_id)

      if (error) throw error
    } catch (err) {
      setBibliotecaObras([...bibliotecaObras, selectedObra.obr_id]) // Revert
      showToast('Erro ao remover: ' + err.message, 'error')
    }
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

  // Skeleton loader
  if (loading) {
    return (
      <>
        <div className="recent-header">
          <div className="recent-heading">Recomendadas</div>
        </div>
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
      </>
    )
  }

  // Error state
  if (error) {
    return (
      <>
        <div className="recent-header">
          <div className="recent-heading">Recomendadas</div>
        </div>
        <p style={{ color: 'salmon' }}>Erro: {error}</p>
      </>
    )
  }

  // Success state
  return (
    <>
      <div className="recent-header">
        <div className="recent-heading">Recomendadas</div>
      </div>
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
    </>
  )
}
