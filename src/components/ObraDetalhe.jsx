import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Drawer } from 'vaul'
import './ObraDetalhe.css'

export default function ObraDetalhe() {
  const { obraNome } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [naBiblioteca, setNaBiblioteca] = useState(false)
  const [ordenAscendente, setOrdenAscendente] = useState(false)
  const [filtroCapitulos, setFiltroCapitulos] = useState('todos')
  const [capitulosLidos, setCapitulosLidos] = useState(new Set())
  const [ultimoCapitulo, setUltimoCapitulo] = useState(null)
  const [activeTab, setActiveTab] = useState('info') // 'info' or 'capitulos'
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const CDN_ROOT = 'https://cdn.verdinha.wtf'
  const IMG_BASE = `${CDN_ROOT}/scans`

  useEffect(() => {
    const fetchObra = async () => {
      try {
        setLoading(true)
        console.log('🔍 Buscando obra:', obraNome, 'User:', user ? user.id : 'null', 'AuthLoading:', authLoading)
        const res = await fetch(`/api-tenrai/obras/${obraNome}`, {
          headers: {
            Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
            Accept: 'application/json'
          }
        })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        setObra(data)

        if (!authLoading && user) {
          // Library
          const { data: bib } = await supabase
            .from('biblioteca_usuario')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('obra_id', data.obr_id)
            .limit(1)
          setNaBiblioteca(bib && bib.length > 0)

          // History
          const { data: hist } = await supabase
            .from('historico_leitura')
            .select('capitulo_id, data_leitura')
            .eq('usuario_id', user.id)
            .eq('obra_id', data.obr_id)
            .order('data_leitura', { ascending: false })

          if (hist && hist.length > 0) {
            setCapitulosLidos(new Set(hist.map(h => h.capitulo_id)))
            setUltimoCapitulo(hist[0].capitulo_id)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchObra()
  }, [obraNome, user, authLoading])

  const getProcessedChapters = () => {
    if (!obra?.capitulos) return []

    let filtered = obra.capitulos
    if (filtroCapitulos === 'lidos') {
      filtered = filtered.filter(cap => capitulosLidos.has(cap.cap_id))
    } else if (filtroCapitulos === 'nao_lidos') {
      filtered = filtered.filter(cap => !capitulosLidos.has(cap.cap_id))
    }

    return filtered.sort((a, b) => ordenAscendente ? a.cap_numero - b.cap_numero : b.cap_numero - a.cap_numero)
  }

  const processedChapters = getProcessedChapters()

  const handleAddToLibrary = async () => {
    try {
      console.log('📖 handleAddToLibrary - User:', user ? user.id : 'null')
      if (!user) {
        console.log('❌ Usuário não logado, redirecionando para login')
        navigate('/entrar')
        return
      }

      const novoEstado = !naBiblioteca
      console.log('🔄 Mudando estado da biblioteca:', naBiblioteca ? 'Remover' : 'Adicionar')
      setNaBiblioteca(novoEstado)

      if (novoEstado) {
        console.log('➕ Adicionando à biblioteca:', {
          usuario_id: user.id,
          obra_id: obra.obr_id,
          obr_nome: obra.obr_nome
        })
        const { data, error } = await supabase
          .from('biblioteca_usuario')
          .insert({
            usuario_id: user.id,
            obra_id: obra.obr_id,
            obr_nome: obra.obr_nome,
            obr_imagem: obra.obr_imagem,
            data_adicionada: new Date().toISOString()
          })

        if (error) {
          console.error('❌ Erro ao adicionar à biblioteca:', error)
          throw error
        }
        console.log('✅ Adicionado à biblioteca com sucesso!', data)
      } else {
        console.log('➖ Removendo da biblioteca:', {
          usuario_id: user.id,
          obra_id: obra.obr_id
        })
        const { error } = await supabase
          .from('biblioteca_usuario')
          .delete()
          .eq('usuario_id', user.id)
          .eq('obra_id', obra.obr_id)

        if (error) {
          console.error('❌ Erro ao remover da biblioteca:', error)
          throw error
        }
        console.log('✅ Removido da biblioteca com sucesso!')
      }
    } catch (err) {
      console.error('❌ Erro geral:', err)
      setNaBiblioteca(!naBiblioteca)
    }
  }

  if (loading) {
    return (
      <div className="obra-detalhe-container">
        <div className="obra-content-wrapper">
          {/* Mobile Skeleton Header */}
          <div className="obra-mobile-header skeleton">
            <div className="skeleton-box skeleton-mobile-capa"></div>
            <div className="skeleton-mobile-info">
              <div className="skeleton-box skeleton-mobile-title"></div>
              <div className="skeleton-box skeleton-mobile-btn"></div>
              <div className="skeleton-box skeleton-mobile-btn"></div>
            </div>
          </div>

          {/* Mobile Tabs Skeleton */}
          <div className="obra-mobile-tabs" style={{ display: isMobile ? 'flex' : 'none' }}>
            <div className="mobile-tab active" style={{ borderBottomColor: 'rgba(255,255,255,0.1)' }}>
              <div className="skeleton-box" style={{ height: '14px', width: '60px', margin: '0 auto' }}></div>
            </div>
            <div className="mobile-tab">
              <div className="skeleton-box" style={{ height: '14px', width: '60px', margin: '0 auto' }}></div>
            </div>
          </div>

          <div className="mobile-tab-content" style={{ display: isMobile ? 'block' : 'none', padding: '0 20px' }}>
            <div className="skeleton-box skeleton-tags" style={{ width: '150px' }}></div>
            <div className="skeleton-box skeleton-desc"></div>
            <div className="skeleton-box skeleton-desc"></div>
            <div className="skeleton-box skeleton-desc short"></div>
          </div>

          {/* Desktop Skeleton Title */}
          {!isMobile && <div className="skeleton-box skeleton-title-main"></div>}

          <div className="obra-main-grid" style={{ display: isMobile ? 'none' : 'grid' }}>
            {/* Left Column Skeleton */}
            <div className="obra-left-column">
              <div className="skeleton-box skeleton-capa"></div>
              <div className="skeleton-box skeleton-btn"></div>
              <div className="skeleton-box skeleton-btn"></div>
              <div className="skeleton-box skeleton-meta"></div>
              <div className="skeleton-box skeleton-meta"></div>
            </div>

            {/* Right Column Skeleton */}
            <div className="obra-right-column">
              <div className="skeleton-box skeleton-tags"></div>
              <div className="skeleton-box skeleton-desc"></div>
              <div className="skeleton-box skeleton-desc"></div>
              <div className="skeleton-box skeleton-desc short"></div>
              <div style={{ marginTop: '30px' }}>
                <div className="skeleton-box skeleton-chapter"></div>
                <div className="skeleton-box skeleton-chapter"></div>
                <div className="skeleton-box skeleton-chapter"></div>
                <div className="skeleton-box skeleton-chapter"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="obra-detalhe-container"><p style={{ color: 'salmon' }}>Erro: {error}</p></div>
  }

  if (!obra) {
    return <div className="obra-detalhe-container"><p>Obra não encontrada</p></div>
  }

  const formatarDataRelativa = (data) => {
    const now = new Date()
    const date = new Date(data)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    if (diffWeeks < 4) return `${diffWeeks}sem`
    if (diffMonths < 12) return `${diffMonths}mês`

    return date.toLocaleDateString('pt-BR')
  }

  const handleIniciar = () => {
    if (ultimoCapitulo) {
      navigate(`/cap/${ultimoCapitulo}`)
      return
    }

    // Find first chapter
    if (obra && obra.capitulos && obra.capitulos.length > 0) {
      const sorted = [...obra.capitulos].sort((a, b) => a.cap_numero - b.cap_numero)
      const first = sorted[0]
      navigate(`/cap/${first.cap_id}`)
    }
  }

  const rawName = obra.obr_imagem ? String(obra.obr_imagem) : ''
  const imgBasename = rawName ? rawName.split('/').pop().trim() : null
  const obraId = obra.obr_id != null ? String(obra.obr_id).trim() : ''
  let imgUrl

  if (rawName && rawName.includes('/')) {
    imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
  } else if (imgBasename && obraId) {
    imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`
  }

  return (
    <div className="obra-detalhe-container">
      <div className="obra-content-wrapper">
        {/* Mobile Header: Capa + Título */}
        <div className="obra-mobile-header">
          <div className="obra-capa-container-mobile">
            <img src={imgUrl} alt={obra.obr_nome} className="obra-capa" />
          </div>
          <div className="obra-title-mobile">
            <h1 className="obra-titulo-mobile">{obra.obr_nome}</h1>

            {/* Mobile Action Buttons */}
            <div className="obra-actions-mobile">
              <button className="btn-iniciar-mobile" onClick={handleIniciar}>
                <i className="fas fa-play"></i>
                <span>{ultimoCapitulo ? 'Continuar' : 'Iniciar'}</span>
              </button>
              <button
                className={`btn-biblioteca-mobile ${naBiblioteca ? 'active' : ''}`}
                onClick={handleAddToLibrary}
                title={naBiblioteca ? 'Remover da biblioteca' : 'Adicionar à biblioteca'}
              >
                <i className="fas fa-bookmark"></i>
                <span>{naBiblioteca ? 'Na Biblioteca' : 'Adicionar à Biblioteca'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="obra-mobile-tabs">
          <button
            className={`mobile-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Informações
          </button>
          <button
            className={`mobile-tab ${activeTab === 'capitulos' ? 'active' : ''}`}
            onClick={() => setActiveTab('capitulos')}
          >
            Capítulos
          </button>
        </div>

        {/* Desktop: Título no topo */}
        <h1 className="obra-titulo">{obra.obr_nome}</h1>

        {/* Mobile: Conteúdo condicional baseado na tab */}
        <div className="mobile-tab-content">
          {activeTab === 'info' && (
            <div className="info-content">
              {/* Gêneros/Tags */}
              {obra.tags && obra.tags.length > 0 && (
                <div className="obra-generos">
                  <i className="fas fa-tags generos-icon"></i>
                  {obra.tags.slice(0, 5).map((tag, index, arr) => (
                    <React.Fragment key={tag.tag_id}>
                      <span className="genero-tag">{tag.tag_nome}</span>
                      {index < arr.length - 1 && <span className="genero-separator">•</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Descrição */}
              <p className="obra-descricao">{obra.obr_descricao}</p>
            </div>
          )}

          {activeTab === 'capitulos' && (
            <div className="capitulos-content-mobile">
              <div className="obra-capitulos-section">
                <div className="capitulos-header-mobile">
                  <button
                    className="btn-filter-mobile"
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    <i className="fas fa-sliders-h" style={{ fontSize: '1rem' }}></i>
                  </button>
                  <div className="ordem-buttons">
                    <button
                      className={`btn-ordem ${!ordenAscendente ? 'active' : ''}`}
                      onClick={() => setOrdenAscendente(false)}
                      title="Ordem decrescente"
                    >
                      <i className="fas fa-arrow-down"></i>
                    </button>
                    <button
                      className={`btn-ordem ${ordenAscendente ? 'active' : ''}`}
                      onClick={() => setOrdenAscendente(true)}
                      title="Ordem crescente"
                    >
                      <i className="fas fa-arrow-up"></i>
                    </button>
                  </div>
                </div>

                {/* Filter Drawer */}
                <Drawer.Root open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
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
                            <h4>Status de Leitura</h4>
                            <div className="chips-container">
                              <div
                                className={`chip ${filtroCapitulos === 'todos' ? 'active' : ''}`}
                                onClick={() => {
                                  setFiltroCapitulos('todos')
                                  setFilterDrawerOpen(false)
                                }}
                              >
                                Todos
                              </div>
                              <div
                                className={`chip ${filtroCapitulos === 'lidos' ? 'active' : ''}`}
                                onClick={() => {
                                  setFiltroCapitulos('lidos')
                                  setFilterDrawerOpen(false)
                                }}
                              >
                                Lidos
                              </div>
                              <div
                                className={`chip ${filtroCapitulos === 'nao_lidos' ? 'active' : ''}`}
                                onClick={() => {
                                  setFiltroCapitulos('nao_lidos')
                                  setFilterDrawerOpen(false)
                                }}
                              >
                                Não Lidos
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Drawer.Content>
                  </Drawer.Portal>
                </Drawer.Root>
                <div className="obra-capitulos">
                  {processedChapters.length > 0 ? (
                    processedChapters.map((cap) => {
                      const lido = capitulosLidos.has(cap.cap_id)
                      return (
                        <Link key={cap.cap_id} to={`/cap/${cap.cap_id}`} className="capitulo-item" style={{ textDecoration: 'none' }}>
                          <div className="cap-info">
                            <span className="cap-numero" style={{ color: lido ? '#a1a1aa' : '#ffffff' }}>Cap. {cap.cap_numero}</span>
                            <span className="cap-data">{formatarDataRelativa(cap.cap_liberar_em || cap.cap_criado_em)}</span>
                          </div>
                          <div className="cap-source" style={{ color: lido ? '#f0f0f0' : 'transparent', display: 'flex', gap: '6px', fontSize: '0.9rem', alignItems: 'center', minWidth: '20px', }}>
                            {lido && <i className="fas fa-check"></i>}
                          </div>
                        </Link>
                      )
                    })
                  ) : (
                    <p style={{ color: 'rgba(230, 238, 248, 0.5)' }}>
                      {filtroCapitulos === 'todos' ? 'Nenhum capítulo disponível' :
                        filtroCapitulos === 'lidos' ? 'Nenhum capítulo lido' : 'Todos os capítulos lidos'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grid: Capa + Info */}
        <div className="obra-main-grid">
          {/* Coluna Esquerda: Capa + Botões */}
          <div className="obra-left-column">
            <div className="obra-capa-container">
              <img src={imgUrl} alt={obra.obr_nome} className="obra-capa" />
            </div>

            {/* Botões empilhados */}
            <div className="obra-actions">
              <button className="btn-iniciar" onClick={handleIniciar}>
                <i className="fas fa-play"></i>
                <span>{ultimoCapitulo ? 'Continuar' : 'Iniciar'}</span>
              </button>
              <button
                className={`btn-biblioteca ${naBiblioteca ? 'active' : ''}`}
                onClick={handleAddToLibrary}
                title={naBiblioteca ? 'Remover da biblioteca' : 'Adicionar à biblioteca'}
              >
                <i className="fas fa-bookmark"></i>
                <span>{naBiblioteca ? 'Na Biblioteca' : 'Adc. à Biblioteca'}</span>
              </button>
            </div>

            {/* Metadata Info (Format / Status) */}
            <div className="obra-metadata-list">
              {obra.formato && (
                <div className="meta-item">
                  <div className="meta-label">
                    <span>Formato</span>
                    <div className="meta-line"></div>
                  </div>
                  <div className="meta-value">{obra.formato.formt_nome}</div>
                </div>
              )}
              {obra.status && (
                <div className="meta-item">
                  <div className="meta-label">
                    <span>Situação</span>
                    <div className="meta-line"></div>
                  </div>
                  <div className="meta-value">{obra.status.stt_nome}</div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Gêneros + Descrição + Capítulos */}
          <div className="obra-right-column">
            {/* Desktop: Sempre mostra tudo */}
            <div className="desktop-content">
              {/* Gêneros/Tags */}
              {obra.tags && obra.tags.length > 0 && (
                <div className="obra-generos">
                  <i className="fas fa-tags generos-icon"></i>
                  {obra.tags.slice(0, 5).map((tag, index, arr) => (
                    <React.Fragment key={tag.tag_id}>
                      <span className="genero-tag">{tag.tag_nome}</span>
                      {index < arr.length - 1 && <span className="genero-separator">•</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Descrição */}
              <p className="obra-descricao">{obra.obr_descricao}</p>

              {/* Linha divisória */}
              <div className="obra-divider"></div>

              {/* Seção de capítulos */}
              <div className="obra-capitulos-section">
                <div className="capitulos-header">
                  <div className="capitulos-tabs">
                    <button
                      className={`tab-item ${filtroCapitulos === 'todos' ? 'active' : ''}`}
                      onClick={() => setFiltroCapitulos('todos')}
                    >
                      Todos
                    </button>
                    <button
                      className={`tab-item ${filtroCapitulos === 'lidos' ? 'active' : ''}`}
                      onClick={() => setFiltroCapitulos('lidos')}
                    >
                      Lidos
                    </button>
                    <button
                      className={`tab-item ${filtroCapitulos === 'nao_lidos' ? 'active' : ''}`}
                      onClick={() => setFiltroCapitulos('nao_lidos')}
                    >
                      Não lidos
                    </button>
                  </div>
                  <div className="ordem-buttons">
                    <button
                      className={`btn-ordem ${!ordenAscendente ? 'active' : ''}`}
                      onClick={() => setOrdenAscendente(false)}
                      title="Ordem decrescente"
                    >
                      <i className="fas fa-arrow-down"></i>
                    </button>
                    <button
                      className={`btn-ordem ${ordenAscendente ? 'active' : ''}`}
                      onClick={() => setOrdenAscendente(true)}
                      title="Ordem crescente"
                    >
                      <i className="fas fa-arrow-up"></i>
                    </button>
                  </div>
                </div>
                <div className="obra-capitulos">
                  {processedChapters.length > 0 ? (
                    processedChapters.map((cap) => {
                      const lido = capitulosLidos.has(cap.cap_id)
                      return (
                        <Link key={cap.cap_id} to={`/cap/${cap.cap_id}`} className="capitulo-item" style={{ textDecoration: 'none' }}>
                          <div className="cap-info">
                            <span className="cap-numero" style={{ color: lido ? '#a1a1aa' : '#ffffff' }}>Cap. {cap.cap_numero}</span>
                            <span className="cap-data">{formatarDataRelativa(cap.cap_liberar_em || cap.cap_criado_em)}</span>
                          </div>
                          <div className="cap-source" style={{ color: lido ? '#f0f0f0' : 'transparent', display: 'flex', gap: '6px', fontSize: '0.9rem', alignItems: 'center', minWidth: '20px', }}>
                            {lido && <i className="fas fa-check"></i>}
                          </div>
                        </Link>
                      )
                    })
                  ) : (
                    <p style={{ color: 'rgba(230, 238, 248, 0.5)' }}>
                      {filtroCapitulos === 'todos' ? 'Nenhum capítulo disponível' :
                        filtroCapitulos === 'lidos' ? 'Nenhum capítulo lido' : 'Todos os capítulos lidos'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
