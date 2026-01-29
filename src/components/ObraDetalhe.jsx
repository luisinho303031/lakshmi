import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './ObraDetalhe.css'

export default function ObraDetalhe() {
  const { obraNome } = useParams()
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [naBiblioteca, setNaBiblioteca] = useState(false)
  const [ordenAscendente, setOrdenAscendente] = useState(false)

  const CDN_ROOT = 'https://api.verdinha.wtf/cdn'
  const IMG_BASE = `${CDN_ROOT}/scans`

  useEffect(() => {
    const fetchObra = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api-verdinha/obras/${obraNome}`, {
          headers: {
            Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
            Accept: 'application/json'
          }
        })
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        setObra(data)

        // Verificar se está na biblioteca
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: bib } = await supabase
            .from('biblioteca_usuario')
            .select('id')
            .eq('usuario_id', user.id)
            .eq('obra_id', data.obr_id)
            .limit(1)

          setNaBiblioteca(bib && bib.length > 0)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchObra()
  }, [obraNome])

  const handleAddToLibrary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/entrar')
        return
      }

      const novoEstado = !naBiblioteca
      setNaBiblioteca(novoEstado)

      if (novoEstado) {
        await supabase
          .from('biblioteca_usuario')
          .insert({
            usuario_id: user.id,
            obra_id: obra.obr_id,
            obr_nome: obra.obr_nome,
            obr_imagem: obra.obr_imagem,
            data_adicionada: new Date().toISOString()
          })
      } else {
        await supabase
          .from('biblioteca_usuario')
          .delete()
          .eq('usuario_id', user.id)
          .eq('obra_id', obra.obr_id)
      }
    } catch (err) {
      console.error('Erro:', err)
      setNaBiblioteca(!naBiblioteca)
    }
  }

  if (loading) {
    return <div className="obra-detalhe-container"><p>Carregando...</p></div>
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
        {/* Seção principal: capa + titulo */}
        <div className="obra-header-section">
          {/* Capa */}
          <div className="obra-capa-container">
            <img src={imgUrl} alt={obra.obr_nome} className="obra-capa" />

            {/* Botões de ação */}
            <div className="obra-actions">
              <button className="btn-iniciar">
                <i className="fas fa-play"></i>
              </button>
              <button
                className={`btn-biblioteca ${naBiblioteca ? 'active' : ''}`}
                onClick={handleAddToLibrary}
                title={naBiblioteca ? 'Remover da biblioteca' : 'Adicionar à biblioteca'}
              >
                <i className="fas fa-bookmark"></i>
              </button>
            </div>
          </div>

          {/* Info Título e Autor */}
          <div className="obra-titulo-container">
            {/* Título */}
            <h1 className="obra-titulo">{obra.obr_nome}</h1>
          </div>
        </div>

        {/* Seção de detalhes: descrição, gêneros, etc */}
        <div className="obra-details-section">
          {/* Descrição */}
          <p className="obra-descricao">{obra.obr_descricao}</p>

          {/* Gêneros/Tags */}
          <div className="obra-generos">
            {obra.tags && obra.tags.map(tag => (
              <span key={tag.tag_id} className="genero-tag">{tag.tag_nome}</span>
            ))}
          </div>
        </div>

        {/* Seção de capítulos */}
        <div className="obra-capitulos-section">
          <div className="capitulos-header">
            <div className="capitulos-count">{obra.capitulos?.length || 0}</div>
            <button
              className="btn-inverter-ordem"
              onClick={() => setOrdenAscendente(!ordenAscendente)}
              title={ordenAscendente ? 'Ordem decrescente' : 'Ordem crescente'}
            >
              <i className={`fas fa-arrow-${ordenAscendente ? 'up' : 'down'}`}></i>
            </button>
          </div>
          <div className="obra-capitulos">
            {obra.capitulos && obra.capitulos.length > 0 ? (
              obra.capitulos.sort((a, b) => ordenAscendente ? a.cap_numero - b.cap_numero : b.cap_numero - a.cap_numero).map((cap) => (
                <div key={cap.cap_id} className="capitulo-item">
                  <div className="cap-info">
                    <span className="cap-numero">Cap. {cap.cap_numero}</span>
                    <span className="cap-data">{formatarDataRelativa(cap.cap_liberar_em || cap.cap_criado_em)}</span>
                  </div>
                  <div className="cap-source" style={{ color: 'rgba(255, 255, 255, 0.5)', gap: '6px', fontSize: '0.85rem', alignItems: 'center' }}>
                    <i className="fas fa-eye"></i>
                    <span>{cap.cap_visualizacoes_geral || 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'rgba(230, 238, 248, 0.5)' }}>Nenhum capítulo disponível</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
