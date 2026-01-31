import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Drawer } from 'vaul'
import { X, Filter, ChevronDown, Check } from 'lucide-react'

let todasCache = null

export default function ObraTodas() {
  const { user } = useAuth()
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
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [availableTags, setAvailableTags] = useState([
    { tag_id: 5, tag_nome: "Fantasia" },
    { tag_id: 7, tag_nome: "Mistério" },
    { tag_id: 8, tag_nome: "Romance" },
    { tag_id: 1, tag_nome: "Ação" },
    { tag_id: 2, tag_nome: "Aventura" },
    { tag_id: 3, tag_nome: "Comédia" },
    { tag_id: 22, tag_nome: "Artes Marciais" }
  ])
  const [selectedTags, setSelectedTags] = useState([])
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [availableStatus, setAvailableStatus] = useState([])
  const [selectedStatus, setSelectedStatus] = useState([])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSearchDrawer, setShowSearchDrawer] = useState(false)
  const [localSearch, setLocalSearch] = useState('') // New state for drawer search input
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 520)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const sentinelRef = useRef(null)
  const revalidatingRef = useRef(false)
  const mountedRef = useRef(false)
  const controllerRef = useRef(null)
  const contextMenuRef = useRef(null)
  const toastTimeoutRef = useRef(null)
  const tagsDropdownRef = useRef(null)
  const statusDropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  const CDN_ROOT = '/cdn-tenrai'
  const IMG_BASE = `${CDN_ROOT}/scans`

  // Fetch filters (tags and status)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api-tenrai/obras/filtros', {
          headers: {
            Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
            Accept: 'application/json'
          }
        })
        const json = await res.json()
        // if (json.tags) setAvailableTags(json.tags) // Using hardcoded tags
        if (json.status) setAvailableStatus(json.status)
      } catch (err) {
        console.error('Erro ao buscar filtros:', err)
      }
    }
    fetchFilters()
  }, [])

  // Detect resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 520)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(e.target)) {
        setShowTagsDropdown(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setShowStatusDropdown(false)
      }
    }
    if (showTagsDropdown || showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTagsDropdown, showStatusDropdown])

  const toggleTag = (tagId) => {
    setPage(1)
    setSelectedTags(prev => {
      if (prev.includes(tagId)) return prev.filter(id => id !== tagId)
      return [...prev, tagId]
    })
  }

  const toggleStatus = (statusId) => {
    setPage(1)
    setSelectedStatus(prev => {
      if (prev.includes(statusId)) return []
      return [statusId]
    })
  }

  const handleSearchSubmit = () => {
    setSearchTerm(localSearch)
    setPage(1) // Ensure page resets
    setShowSearchDrawer(false)
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // fetch obras for current page (infinite scroll)
  useEffect(() => {
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

        let url = `/api-tenrai/obras/search?pagina=${page}&limite=44&gen_id=1&todos_generos=0&orderBy=ultima_atualizacao&orderDirection=DESC`
        if (debouncedSearch) {
          url += `&nome=${encodeURIComponent(debouncedSearch)}`
        }
        if (selectedTags.length > 0) {
          url += `&tag_ids=${selectedTags.join(',')}`
        }
        if (selectedStatus.length > 0) {
          url += `&stt_id=${selectedStatus.join(',')}`
        }

        const res = await fetch(url, {
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
          // Only cache initial page without filters
          if (!debouncedSearch && selectedTags.length === 0 && selectedStatus.length === 0) {
            todasCache = items
          }
        } else {
          setObras((prev) => {
            // Avoid duplicates if rapid pagination
            const newItems = items.filter(i => !prev.some(p => p.obr_id === i.obr_id))
            const merged = prev.concat(newItems)
            if (!debouncedSearch && selectedTags.length === 0 && selectedStatus.length === 0) todasCache = merged
            return merged
          })
        }

        if (items.length < 24) setHasMore(false)
        else setHasMore(true) // Reset hasMore if full page returned
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message)
      } finally {
        if (page === 1) setLoading(false)
        else setLoadingMore(false)
      }
    }

    fetchPage()
    return () => controller.abort()
  }, [page, debouncedSearch, selectedTags, selectedStatus])

  // Buscar biblioteca do usuário
  useEffect(() => {
    const fetchBiblioteca = async () => {
      try {
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
  }, [user])

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
    if (isMobile) {
      setShowMobileMenu(true)
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
  }

  const handleAddToLibrary = async () => {
    if (!selectedObra) return

    console.log('Tentando adicionar obra (Todas):', selectedObra)

    const newBibliotecaObras = [...bibliotecaObras, selectedObra.obr_id]
    setBibliotecaObras(newBibliotecaObras)
    setContextMenu(null)
    setShowMobileMenu(false)

    try {
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

      console.log('Enviando para Supabase (Todas):', payload)

      const { error } = await supabase
        .from('biblioteca_usuario')
        .upsert(payload, {
          onConflict: 'usuario_id,obra_id'
        })

      if (error) throw error
    } catch (err) {
      setBibliotecaObras(bibliotecaObras)
      console.error('Erro no Supabase (Todas):', err)
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

  const handleOpenObra = () => {
    if (!selectedObra) return
    const slug = selectedObra.obr_slug || slugify(selectedObra.obr_nome)
    window.location.href = `/obra/${slug}`
    setContextMenu(null)
    setShowMobileMenu(false)
  }

  const handleOpenObraNewTab = () => {
    if (!selectedObra) return
    const slug = selectedObra.obr_slug || slugify(selectedObra.obr_nome)
    window.open(`/obra/${slug}`, '_blank')
    setContextMenu(null)
    setShowMobileMenu(false)
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

  // Main Render
  return (
    <>
      <div className="search-row">
        <div
          className={`search-container ${searchExpanded ? 'expanded' : ''}`}
          onClick={() => {
            if (isMobile) {
              setLocalSearch(searchTerm) // Sync open
              setShowSearchDrawer(true)
            } else {
              if (!searchExpanded) {
                setSearchExpanded(true)
                setTimeout(() => searchInputRef.current?.focus(), 100)
              }
            }
          }}
        >
          <i className="fas fa-search search-icon"></i>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Digite o nome da obra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => {
              // Delay checking value to allow interaction
              setTimeout(() => {
                if (!searchTerm && searchExpanded) {
                  setSearchExpanded(false)
                }
              }, 200)
            }}
            className="search-input"
            readOnly={isMobile} // Prevent keyboard on mobile trigger
          />
          {searchExpanded && searchTerm && (
            <i
              className="fas fa-times clear-search-icon"
              onClick={(e) => {
                e.stopPropagation();
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
            ></i>
          )}
        </div>

        <div className="desktop-filters">
          <div className="tags-dropdown-wrapper" ref={statusDropdownRef}>
            <button className="tags-dropdown-btn" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
              Situação
              {selectedStatus.length > 0 && (
                <span className="tags-count-badge">{selectedStatus.length}</span>
              )}
              <i className={`fas fa-chevron-${showStatusDropdown ? 'up' : 'down'}`}></i>
            </button>

            {showStatusDropdown && (
              <div className="tags-dropdown-menu">
                {availableStatus.map((st) => (
                  <div
                    key={st.stt_id}
                    className={`tag-item ${selectedStatus.includes(st.stt_id) ? 'active' : ''}`}
                    onClick={() => toggleStatus(st.stt_id)}
                  >
                    {st.stt_nome}
                    {selectedStatus.includes(st.stt_id) && <i className="fas fa-check"></i>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tags-dropdown-wrapper" ref={tagsDropdownRef}>
            <button className="tags-dropdown-btn" onClick={() => setShowTagsDropdown(!showTagsDropdown)}>
              Gêneros
              {selectedTags.length > 0 && (
                <span className="tags-count-badge">{selectedTags.length}</span>
              )}
              <i className={`fas fa-chevron-${showTagsDropdown ? 'up' : 'down'}`}></i>
            </button>

            {showTagsDropdown && (
              <div className="tags-dropdown-menu">
                {availableTags.map((tag) => (
                  <div
                    key={tag.tag_id}
                    className={`tag-item ${selectedTags.includes(tag.tag_id) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag.tag_id)}
                  >
                    {tag.tag_nome}
                    {selectedTags.includes(tag.tag_id) && <i className="fas fa-check"></i>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Drawer.Root open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <Drawer.Trigger asChild>
            <button className="mobile-filters-btn">
              <i className="fas fa-sliders-h" style={{ fontSize: '1.25rem' }}></i>
              {(selectedStatus.length > 0 || selectedTags.length > 0) && (
                <span className="tags-count-badge mobile-badge">
                  {selectedStatus.length + selectedTags.length}
                </span>
              )}
            </button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="vaul-overlay" />
            <Drawer.Content className="vaul-content">
              <div className="vaul-handle-wrapper">
                <div className="vaul-handle" />
              </div>

              <div className="vaul-inner-content">
                <div className="vaul-header">
                  <Drawer.Title className="vaul-title">Filtros</Drawer.Title>
                </div>

                <div className="vaul-body">
                  <div className="filter-section">
                    <h4>Situação</h4>
                    <div className="chips-container">
                      {availableStatus.map((st) => (
                        <div
                          key={st.stt_id}
                          className={`chip ${selectedStatus.includes(st.stt_id) ? 'active' : ''}`}
                          onClick={() => toggleStatus(st.stt_id)}
                        >
                          {st.stt_nome}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="filter-section">
                    <h4>Gêneros</h4>
                    <div className="chips-container">
                      {availableTags.map((tag) => (
                        <div
                          key={tag.tag_id}
                          className={`chip ${selectedTags.includes(tag.tag_id) ? 'active' : ''}`}
                          onClick={() => toggleTag(tag.tag_id)}
                        >
                          {tag.tag_nome}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>


              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {loading ? (
        <div className="obra-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`skeleton-load-${i}`} className="obra-card">
              <div className="obra-cover-container">
                <div className="obra-cover skeleton-cover" />
              </div>
              <div className="obra-title skeleton-title" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p style={{ color: 'salmon' }}>Erro: {error}</p>
      ) : (
        <>
          <div className="obra-grid">
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

              const slug = obr.obr_slug || slugify(obr.obr_nome)

              return (
                <Link key={obr.obr_id} to={`/obra/${slug}`} className="obra-card-link">
                  <div className="obra-card" onContextMenu={(e) => handleContextMenu(e, obr)}>
                    <div className="obra-cover-container">
                      <img
                        src={imgUrl}
                        alt={obr.obr_nome}
                        className="obra-cover"
                        onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.background = '#111' }}
                      />
                      {bibliotecaObras.includes(obr.obr_id) && (
                        <div className="obra-badge-overlay">Na Biblioteca</div>
                      )}
                    </div>
                    <div className="obra-title">{obr.obr_nome}</div>
                  </div>
                </Link>
              )
            })}
            {loadingMore && Array.from({ length: 5 }).map((_, i) => (
              <div key={`skeleton-mais-${i}`} className="obra-card">
                <div className="obra-cover-container">
                  <div className="obra-cover skeleton-cover" />
                </div>
                <div className="obra-title skeleton-title" />
              </div>
            ))}
          </div>
          {/* sentinel for infinite scroll */}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </>
      )}

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

      {/* NEW Search Drawer */}
      <Drawer.Root open={showSearchDrawer} onOpenChange={setShowSearchDrawer}>
        <Drawer.Portal>
          <Drawer.Overlay className="vaul-overlay" />
          <Drawer.Content className="vaul-content">
            <div className="vaul-handle-wrapper">
              <div className="vaul-handle" />
            </div>
            <div className="vaul-inner-content">
              <div className="vaul-header">
                <Drawer.Title className="vaul-title">Pesquisar</Drawer.Title>
              </div>
              <div className="vaul-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    type="text"
                    placeholder="Digite o nome da obra..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.3)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: '400 !important',
                      outline: 'none',
                      borderRadius: 0
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchSubmit()
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = '#fff'}
                    onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.3)'}
                    autoFocus
                  />
                  <button
                    onClick={handleSearchSubmit}
                    disabled={localSearch.trim().length < 3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#fff',
                      color: '#000',
                      border: 'none',
                      borderRadius: '999px',
                      fontSize: '0.9rem',
                      fontWeight: '400',
                      cursor: localSearch.trim().length < 3 ? 'not-allowed' : 'pointer',
                      opacity: localSearch.trim().length < 3 ? 0.5 : 1,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    Pesquisar
                  </button>
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* NEW Context Menu Drawer */}
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
