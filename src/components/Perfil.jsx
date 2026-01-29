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

    // Profile State
    const [profileData, setProfileData] = useState({ avatar_url: null, banner_url: null })
    const [uploading, setUploading] = useState(false)
    const menuRef = useRef(null)

    const CDN_ROOT = 'https://api.verdinha.wtf/cdn'
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
            if (!user) return

            try {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (mounted && profile) {
                    setProfileData({
                        avatar_url: profile.avatar_url,
                        banner_url: profile.banner_url
                    })
                }
            } catch (err) {
                console.error('Error fetching profile:', err)
            }
        }

        fetchProfile()

        return () => {
            mounted = false
        }
    }, [user])

    // Fetch Library when tab is active
    useEffect(() => {
        if (activeTab === 'biblioteca' && user) {
            const fetchLibrary = async () => {
                setLibraryLoading(true)
                try {
                    const { data: libraryData, error } = await supabase
                        .from('biblioteca_usuario')
                        .select('*')
                        .eq('usuario_id', user.id)
                        .order('data_adicionada', { ascending: false })

                    if (error) throw error

                    setLibraryItems(libraryData || [])
                } catch (err) {
                    console.error('Erro ao buscar biblioteca:', err)
                    setLibraryItems([])
                } finally {
                    setLibraryLoading(false)
                }
            }
            fetchLibrary()
        }
    }, [activeTab, user])

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
                    <div className="perfil-section perfil-empty-state">
                        <i className="fas fa-history"></i>
                        <p>Nada ainda!</p>
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
