import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

let obrasCache = null

export default function ObraNavegar() {
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedObra, setSelectedObra] = useState(null)
  const [bibliotecaObras, setBibliotecaObras] = useState([])
  const [toast, setToast] = useState(null)
  const sentinelRef = useRef(null)
  const revalidatingRef = useRef(false)
  const mountedRef = useRef(false)
  const controllerRef = useRef(null)
  const contextMenuRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  const CDN_ROOT = 'https://api.verdinha.wtf/cdn'
  const IMG_BASE = `${CDN_ROOT}/scans`

  // fetch obras for current page (infinite scroll)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    let isInitial = page === 1

    // show cache immediately for initial page, but mark revalidating
    if (isInitial && obrasCache) {
      setObras(obrasCache)
      revalidatingRef.current = true
    }

    // Abort previous request if exists
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    const controller = new AbortController()
    controllerRef.current = controller

    const fetchPage = async () => {
      try {
        if (page === 1) setLoading(true)
        else setLoadingMore(true)

        const res = await fetch(`https://api.verdinha.wtf/obras/atualizacoes?pagina=${page}&limite=24&gen_id=1`, {
          headers: {
            Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
            Accept: 'application/json'
          },
          signal: controller.signal
        })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const json = await res.json()
        const items = json.obras || []

        if (page === 1) {
          setObras(items)
          obrasCache = items
        } else {
          setObras((prev) => {
            const merged = prev.concat(items)
            obrasCache = merged
            return merged
          })
        }

        if (items.length < 24) setHasMore(false)
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (page === 1) setLoading(false)
        else setLoadingMore(false)
        if (isInitial) revalidatingRef.current = false
      }
    }

    fetchPage()
    return () => controller.abort()
  }, [page])

  // Buscar biblioteca do usuário
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

  // Fechar context menu ao clicar fora
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

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 2000)
  }

  const handleContextMenu = (e, obra) => {
    e.preventDefault()
    setSelectedObra(obra)
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleAddToLibrary = async () => {
    if (!selectedObra) return

    console.log('Tentando adicionar obra (Lançamentos):', selectedObra)

    const newBibliotecaObras = [...bibliotecaObras, selectedObra.obr_id]
    setBibliotecaObras(newBibliotecaObras)
    setContextMenu(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBibliotecaObras(bibliotecaObras)
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

      console.log('Enviando para Supabase (Lançamentos):', payload)

      const { error } = await supabase
        .from('biblioteca_usuario')
        .upsert(payload, {
          onConflict: 'usuario_id,obra_id'
        })

      if (error) throw error
    } catch (err) {
      setBibliotecaObras(bibliotecaObras)
      console.error('Erro no Supabase (Lançamentos):', err)
      showToast('Erro ao adicionar: ' + err.message, 'error')
    }
  }

  const handleRemoveFromLibrary = async () => {
    if (!selectedObra) return

    const newBibliotecaObras = bibliotecaObras.filter(id => id !== selectedObra.obr_id)
    setBibliotecaObras(newBibliotecaObras)
    setContextMenu(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBibliotecaObras(bibliotecaObras)
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
      setBibliotecaObras([...bibliotecaObras, selectedObra.obr_id])
      showToast('Erro ao remover: ' + err.message, 'error')
    }
  }

  const handleOpenObra = () => {
    if (!selectedObra) return
    window.location.href = `/obra/${slugify(selectedObra.obr_nome)}`
    setContextMenu(null)
  }

  const handleOpenObraNewTab = () => {
    if (!selectedObra) return
    window.open(`/obra/${slugify(selectedObra.obr_nome)}`, '_blank')
    setContextMenu(null)
  }

  const slugify = (str) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  // observe sentinel to trigger loading next page
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !loading && !loadingMore && hasMore && !revalidatingRef.current) {
          setPage((p) => p + 1)
        }
      })
    }, { root: null, rootMargin: '400px', threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading, loadingMore, hasMore])

  // Skeleton loader
  if (loading) {
    return (
      <>
        <div className="recent-header" style={{ marginTop: 70 }}>
          <div className="recent-heading">Lançamentos</div>
        </div>
        <div className="lancamentos-list">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`skeleton-nav-${i}`} className="lancamento-item">
              <div className="lancamento-cover-container">
                <div className="lancamento-cover skeleton-cover" />
              </div>
              <div className="lancamento-info">
                <div className="lancamento-title skeleton-title" style={{ width: '80%', margin: '0 0 12px 0' }} />
                <div className="lancamento-chapters" style={{ marginTop: 'auto', gap: 12 }}>
                  <div className="skeleton-title" style={{ width: '50%', height: 12, margin: 0 }} />
                  <div className="skeleton-title" style={{ width: '50%', height: 12, margin: 0 }} />
                </div>
              </div>
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
        <div className="recent-header" style={{ marginTop: 70 }}>
          <div className="recent-heading">Lançamentos</div>
        </div>
        <p style={{ color: 'salmon' }}>Erro: {error}</p>
      </>
    )
  }

  // Success state
  return (
    <>
      <div className="recent-header" style={{ marginTop: 70 }}>
        <div className="recent-heading">Lançamentos</div>
      </div>
      <div className="lancamentos-list">
        {obras.map((obr) => {
          const rawName = obr.obr_imagem ? String(obr.obr_imagem) : ''
          const imgBasename = rawName ? rawName.split('/').pop().trim() : null
          const obraId = obr.obr_id != null ? String(obr.obr_id).trim() : ''

          let imgUrl
          if (rawName && rawName.includes('/')) {
            imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
          } else if (imgBasename && obraId) {
            imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`
          }

          return (
            <div key={obr.obr_id} className="lancamento-item-wrapper">
              <div className="lancamento-item" onContextMenu={(e) => handleContextMenu(e, obr)}>
                <Link to={`/obra/${slugify(obr.obr_nome)}`} className="lancamento-cover-link">
                  <div className="lancamento-cover-container">
                    <img
                      src={imgUrl}
                      alt={obr.obr_nome}
                      className="lancamento-cover"
                      onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.background = '#111' }}
                    />
                    {bibliotecaObras.includes(obr.obr_id) && (
                      <div className="lancamento-badge-overlay">Na Biblioteca</div>
                    )}
                  </div>
                </Link>
                <div className="lancamento-info">
                  <Link to={`/obra/${slugify(obr.obr_nome)}`} className="lancamento-title-link">
                    <div className="lancamento-title">{obr.obr_nome}</div>
                  </Link>
                  {obr.capitulos && obr.capitulos.length > 0 && (
                    <div className="lancamento-chapters">
                      {obr.capitulos.slice(0, 2).map((cap) => {
                        const capDate = new Date(cap.cap_criado_em)
                        const now = new Date()
                        const diffMs = now - capDate
                        const diffMins = Math.floor(diffMs / 60000)
                        const diffHours = Math.floor(diffMs / 3600000)
                        const diffDays = Math.floor(diffMs / 86400000)

                        let timeText = ''
                        if (diffMins < 1) timeText = 'agora'
                        else if (diffMins < 60) timeText = `${diffMins}min`
                        else if (diffHours < 24) timeText = `${diffHours}h`
                        else if (diffDays < 30) timeText = `${diffDays}d`
                        else timeText = capDate.toLocaleDateString('pt-BR')

                        const capName = cap.cap_nome.replace('Capítulo', 'Cap.')

                        return (
                          <Link key={cap.cap_id} to={`/cap/${cap.cap_id}`} className="lancamento-chapter-link">
                            <div className="lancamento-chapter">
                              <div className="lancamento-chapter-name">{capName}</div>
                              <div className="lancamento-chapter-date">{timeText}</div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {loadingMore && Array.from({ length: 4 }).map((_, i) => (
          <div key={`skeleton-more-${i}`} className="lancamento-item">
            <div className="lancamento-cover-container">
              <div className="lancamento-cover skeleton-cover" />
            </div>
            <div className="lancamento-info">
              <div className="lancamento-title skeleton-title" style={{ width: '80%', margin: '0 0 12px 0' }} />
              <div className="lancamento-chapters" style={{ marginTop: 'auto', gap: 12 }}>
                <div className="skeleton-title" style={{ width: '50%', height: 12, margin: 0 }} />
                <div className="skeleton-title" style={{ width: '50%', height: 12, margin: 0 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {contextMenu && (
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

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  )
}
