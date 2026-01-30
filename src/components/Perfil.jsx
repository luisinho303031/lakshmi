import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import './Perfil.css'

export default function Perfil() {
    const { user, loading: authLoading } = useAuth()
    const [activeTab, setActiveTab] = useState('biblioteca')

    // Library State
    const [libraryItems, setLibraryItems] = useState([])
    const [libraryLoading, setLibraryLoading] = useState(false)

    // History State
    const [historyItems, setHistoryItems] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)

    // Profile State
    const [profileData, setProfileData] = useState({ avatar_url: null, banner_url: null })
    const [uploading, setUploading] = useState(false)
    const menuRef = useRef(null)

    const CDN_ROOT = '/cdn-tenrai'
    const IMG_BASE = `${CDN_ROOT}/scans`

    const slugify = (str) => {
        if (!str) return ''
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
    }

    // Fetch Profile Data whenever User changes
    useEffect(() => {
        let mounted = true

        const fetchProfile = async () => {
            console.log('👤 Perfil - User:', user ? user.id : 'null', 'Loading:', authLoading)

            // ⚠️ NÃO buscar dados enquanto ainda está carregando a autenticação
            if (authLoading) {
                console.log('⏳ Perfil - Aguardando autenticação...')
                return
            }

            if (!user) {
                console.log('❌ Perfil - User não disponível')
                return
            }

            try {
                console.log('✅ Perfil - Buscando dados do perfil para user:', user.id)
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (error) {
                    console.error('❌ Perfil - Erro ao buscar perfil:', error)
                    return
                }

                console.log('📸 Perfil - Dados recebidos:', profile)

                if (mounted && profile) {
                    console.log('💾 Perfil - Salvando dados:', profile)
                    setProfileData({
                        avatar_url: profile.avatar_url,
                        banner_url: profile.banner_url
                    })
                } else if (mounted && !profile) {
                    console.log('⚠️ Perfil - Nenhum dado encontrado, usando valores padrão')
                }
            } catch (err) {
                console.error('💥 Perfil - Exceção ao buscar perfil:', err)
            }
        }

        fetchProfile()

        return () => {
            mounted = false
        }
    }, [user, authLoading])

    // Fetch Library when tab is active
    useEffect(() => {
        if (activeTab === 'biblioteca' && user && !authLoading) {
            const fetchLibrary = async () => {
                setLibraryLoading(true)
                console.log('📚 Buscando biblioteca para user:', user.id)
                try {
                    const { data: libraryData, error } = await supabase
                        .from('biblioteca_usuario')
                        .select('*')
                        .eq('usuario_id', user.id)
                        .order('data_adicionada', { ascending: false })

                    if (error) {
                        console.error('❌ Erro ao buscar biblioteca:', error)
                        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2))
                        throw error
                    }

                    console.log('✅ Biblioteca carregada:', libraryData?.length || 0, 'itens')
                    console.log('📦 Dados da biblioteca:', libraryData)
                    setLibraryItems(libraryData || [])
                } catch (err) {
                    console.error('❌ Erro ao buscar biblioteca:', err)
                    console.error('💥 Stack trace:', err.stack)
                    setLibraryItems([])
                } finally {
                    console.log('🏁 Biblioteca - Finalizando loading')
                    setLibraryLoading(false)
                }
            }
            fetchLibrary()
        } else {
            console.log('⏭️ Biblioteca - Pulando busca. Tab:', activeTab, 'User:', !!user, 'AuthLoading:', authLoading)
        }
    }, [activeTab, user, authLoading])

    // Fetch History when tab is active
    useEffect(() => {
        if (activeTab === 'historico' && user && !authLoading) {
            const fetchHistory = async () => {
                setHistoryLoading(true)
                console.log('📖 Buscando histórico para user:', user.id)
                try {
                    const { data: historyData, error } = await supabase
                        .from('historico_leitura')
                        .select('*')
                        .eq('usuario_id', user.id)
                        .order('data_leitura', { ascending: false })

                    if (error) {
                        console.error('❌ Erro ao buscar histórico:', error)
                        throw error
                    }

                    console.log('✅ Histórico carregado:', historyData?.length || 0, 'itens')
                    setHistoryItems(historyData || [])
                } catch (err) {
                    console.error('❌ Erro ao buscar histórico:', err)
                    setHistoryItems([])
                } finally {
                    setHistoryLoading(false)
                }
            }
            fetchHistory()
        }
    }, [activeTab, user, authLoading])

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null)
    const [selectedObra, setSelectedObra] = useState(null)
    const [toast, setToast] = useState(null)

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (contextMenu && menuRef.current && !menuRef.current.contains(e.target)) {
                setContextMenu(null)
            }
        }
        const handleScroll = () => {
            if (contextMenu) setContextMenu(null)
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
        setToast({ message, type })
        setTimeout(() => setToast(null), 2000)
    }

    const handleContextMenu = (e, obra) => {
        e.preventDefault()
        setSelectedObra(obra)
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const handleRemoveFromLibrary = async () => {
        if (!selectedObra) return
        setContextMenu(null)

        const previousItems = [...libraryItems]
        const deletedId = selectedObra.id

        setLibraryItems(prev => prev.filter(item => item.id !== deletedId))

        try {
            const { error } = await supabase
                .from('biblioteca_usuario')
                .delete()
                .eq('id', deletedId)

            if (error) throw error
        } catch (err) {
            console.error('Erro ao remover do banco:', err)
            setLibraryItems(previousItems)
            showToast('Erro ao sincronizar remoção', 'error')
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

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/avatar.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const { error: dbError } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (dbError) throw dbError

            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }))
        } catch (err) {
            console.error('Erro ao fazer upload do avatar:', err)
            alert('Erro ao fazer upload da imagem')
        } finally {
            setUploading(false)
        }
    }

    const handleBannerUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/banner.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(fileName)

            const { error: dbError } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: user.id,
                    banner_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (dbError) throw dbError

            setProfileData(prev => ({ ...prev, banner_url: publicUrl }))
        } catch (err) {
            console.error('Erro ao fazer upload do banner:', err)
            alert('Erro ao fazer upload da imagem')
        } finally {
            setUploading(false)
        }
    }

    if (authLoading) return <div className="page-inner">Carregando...</div>
    if (!user) return <div className="page-inner">Você precisa estar logado.</div>

    const userAvatar = profileData.avatar_url || user.user_metadata?.avatar_url
    const userName = user.user_metadata?.full_name || 'Usuário'

    return (
        <div className="perfil-container">
            {/* Banner */}
            <div
                className={`perfil-banner ${uploading ? 'loading' : ''}`}
                style={{
                    backgroundImage: profileData.banner_url ? `url(${profileData.banner_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <label className="perfil-edit-banner-btn">
                    <i className="fas fa-camera"></i>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {/* Header Info */}
            <div className="perfil-header">
                <div className={`perfil-avatar-wrapper ${uploading ? 'loading' : ''}`}>
                    {userAvatar ? (
                        <img src={userAvatar} alt="Avatar" className="perfil-avatar" />
                    ) : (
                        <div className="perfil-avatar-placeholder">
                            {user.email?.[0].toUpperCase()}
                        </div>
                    )}
                    <label className="perfil-edit-avatar-btn">
                        <i className="fas fa-camera"></i>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
                <div className="perfil-info">
                    <h1 className="perfil-name">{userName}</h1>
                    <p className="perfil-email">{user.email}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="perfil-tabs">
                <button
                    className={`perfil-tab ${activeTab === 'biblioteca' ? 'active' : ''}`}
                    onClick={() => setActiveTab('biblioteca')}
                >
                    Biblioteca {libraryItems.length > 0 && <span className="perfil-tab-count">{libraryItems.length}</span>}
                </button>
                <button
                    className={`perfil-tab ${activeTab === 'historico' ? 'active' : ''}`}
                    onClick={() => setActiveTab('historico')}
                >
                    Histórico
                </button>
            </div>

            {/* Content */}
            <div className="perfil-content page-inner">
                {activeTab === 'biblioteca' && (
                    <div className="perfil-section">
                        {libraryLoading ? (
                            <p>Carregando biblioteca...</p>
                        ) : libraryItems.length === 0 ? (
                            <p>Sua biblioteca está vazia.</p>
                        ) : (
                            <div className="obra-grid">
                                {libraryItems.map((obr) => {
                                    const rawName = obr.obr_imagem ? String(obr.obr_imagem) : ''

                                    let imgUrl
                                    if (rawName && rawName.includes('/')) {
                                        imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
                                    } else if (rawName) {
                                        const obraId = obr.obra_id != null ? String(obr.obra_id).trim() : ''
                                        imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(rawName)}`
                                    }

                                    return (
                                        <Link
                                            key={obr.id}
                                            to={`/obra/${slugify(obr.obr_nome)}`}
                                            className="obra-card-link"
                                        >
                                            <div className="obra-card" onContextMenu={(e) => handleContextMenu(e, obr)}>
                                                <div className="obra-cover-container">
                                                    <img
                                                        src={imgUrl}
                                                        alt={obr.obr_nome}
                                                        className="obra-cover"
                                                        onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.background = '#111' }}
                                                    />
                                                </div>
                                                <div className="obra-title">{obr.obr_nome}</div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'historico' && (
                    <div className="perfil-section">
                        {historyLoading ? (
                            <p>Carregando histórico...</p>
                        ) : historyItems.length === 0 ? (
                            <div className="perfil-empty-state">
                                <i className="fas fa-history"></i>
                                <p>Nada ainda!</p>
                            </div>
                        ) : (
                            <div className="historico-list">
                                {(() => {
                                    // Agrupar por data
                                    const groupedByDate = historyItems.reduce((acc, item) => {
                                        const dataLeitura = new Date(item.data_leitura)
                                        const hoje = new Date()
                                        hoje.setHours(0, 0, 0, 0)

                                        const ontem = new Date(hoje)
                                        ontem.setDate(ontem.getDate() - 1)

                                        const dataItem = new Date(dataLeitura)
                                        dataItem.setHours(0, 0, 0, 0)

                                        let label
                                        if (dataItem.getTime() === hoje.getTime()) {
                                            label = 'Hoje'
                                        } else if (dataItem.getTime() === ontem.getTime()) {
                                            label = 'Ontem'
                                        } else {
                                            // Dias da semana
                                            const diffDays = Math.floor((hoje - dataItem) / (1000 * 60 * 60 * 24))
                                            if (diffDays < 7) {
                                                const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
                                                label = diasSemana[dataItem.getDay()]
                                            } else {
                                                label = dataItem.toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'short'
                                                })
                                            }
                                        }

                                        if (!acc[label]) acc[label] = []
                                        acc[label].push(item)
                                        return acc
                                    }, {})

                                    return Object.entries(groupedByDate).map(([dateLabel, items]) => (
                                        <div key={dateLabel} className="historico-group">
                                            <h3 className="historico-date-label">{dateLabel}</h3>
                                            <div className="historico-items">
                                                {items.map((item) => {
                                                    const rawName = item.obr_imagem ? String(item.obr_imagem) : ''

                                                    let imgUrl
                                                    if (rawName && rawName.includes('/')) {
                                                        imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
                                                    } else if (rawName) {
                                                        const obraId = item.obra_id != null ? String(item.obra_id).trim() : ''
                                                        imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(rawName)}`
                                                    }

                                                    const horaLeitura = new Date(item.data_leitura).toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })

                                                    return (
                                                        <Link
                                                            key={item.id}
                                                            to={`/obra/${slugify(item.obr_nome)}`}
                                                            className="historico-item-link"
                                                        >
                                                            <div className="historico-item">
                                                                <div className="historico-cover-container">
                                                                    <img
                                                                        src={imgUrl}
                                                                        alt={item.obr_nome}
                                                                        className="historico-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = ''
                                                                            e.currentTarget.style.background = '#111'
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="historico-info">
                                                                    <div className="historico-title">{item.obr_nome}</div>
                                                                    <div className="historico-chapter">
                                                                        Capítulo {item.cap_numero}
                                                                    </div>
                                                                    <div className="historico-time">{horaLeitura}</div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))
                                })()}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={menuRef}
                    className="context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="context-menu-item"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleRemoveFromLibrary()
                        }}
                    >
                        <i className="fas fa-trash"></i> Remover da biblioteca
                    </button>
                    <button
                        className="context-menu-item"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleOpenObra()
                        }}
                    >
                        <i className="fas fa-arrow-right"></i> Abrir obra
                    </button>
                    <button
                        className="context-menu-item"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleOpenObraNewTab()
                        }}
                    >
                        <i className="fas fa-external-link"></i> Abrir em outra aba
                    </button>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
