import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './UserModal.css'

export default function UserModal({ user, avatarUrl, onClose, onLogout }) {
    const [activeTab, setActiveTab] = useState('minha-conta')
    const [libObras, setLibObras] = useState([])
    const [libLoading, setLibLoading] = useState(false)
    const [histItems, setHistItems] = useState([])
    const [histLoading, setHistLoading] = useState(false)
    const [profileData, setProfileData] = useState({ avatar_url: null, banner_url: null })

    React.useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (data) {
                    setProfileData({
                        avatar_url: data.avatar_url,
                        banner_url: data.banner_url
                    })
                }
            } catch (err) {
                console.error('Erro ao buscar perfil no modal:', err)
            }
        }
        fetchProfile()
    }, [user])

    const CDN_ROOT = 'https://cdn.verdinha.wtf'
    const IMG_BASE = `${CDN_ROOT}/scans`

    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'

    const sidebarItems = [
        { id: 'minha-conta', label: 'Minha conta', icon: 'fas fa-user-shield' },
        { id: 'biblioteca', label: 'Biblioteca', icon: 'fas fa-bookmark' },
        { id: 'historico', label: 'Histórico', icon: 'fas fa-history' },
    ]

    const fetchLibrary = async () => {
        setLibLoading(true)
        try {
            const { data, error } = await supabase
                .from('biblioteca_usuario')
                .select('*')
                .eq('usuario_id', user.id)
                .order('data_adicionada', { ascending: false })

            if (error) throw error
            setLibObras(data || [])
        } catch (err) {
            console.error('Erro ao buscar biblioteca:', err)
        } finally {
            setLibLoading(false)
        }
    }

    const fetchHistory = async () => {
        setHistLoading(true)
        try {
            const { data, error } = await supabase
                .from('historico_leitura')
                .select('*')
                .eq('usuario_id', user.id)
                .order('data_leitura', { ascending: false })

            if (error) throw error
            setHistItems(data || [])
        } catch (err) {
            console.error('Erro ao buscar histórico:', err)
        } finally {
            setHistLoading(false)
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
            .replace(/-+/g, '-');
    }

    const handleTabChange = (tabId) => {
        setActiveTab(tabId)
        if (tabId === 'biblioteca') {
            fetchLibrary()
        } else if (tabId === 'historico') {
            fetchHistory()
        }
    }

    return (
        <div className="user-modal-overlay" onClick={onClose}>
            <div className="user-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Sidebar */}
                <aside className="user-modal-sidebar">
                    <div className="sidebar-profile-header">
                        <div className="sidebar-avatar">
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <div className="avatar-placeholder">{user.email?.[0].toUpperCase()}</div>}
                        </div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-username">{userName}</span>
                        </div>
                    </div>



                    <div className="sidebar-nav">
                        <div className="nav-group">

                            {sidebarItems.map(item => (
                                item.type === 'link' ? (
                                    <Link key={item.id} to={item.to} className="nav-item" onClick={onClose}>
                                        <span>{item.label}</span>
                                    </Link>
                                ) : (
                                    <button
                                        key={item.id}
                                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                        onClick={() => handleTabChange(item.id)}
                                    >
                                        <span>{item.label}</span>
                                    </button>
                                )
                            ))}
                        </div>

                        <div className="nav-divider"></div>

                        <div className="nav-group">
                            <button className="nav-item logout" onClick={() => { onLogout(); onClose(); }}>
                                <span>Sair da conta</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="user-modal-content">
                    <header className="content-header">
                        <span className="header-title">Minha conta</span>
                        <button className="close-button" onClick={onClose}>
                            <i className="fas fa-times"></i>
                        </button>
                    </header>

                    <div className="content-body">
                        {activeTab === 'minha-conta' ? (
                            <>
                                <div className="profile-card">
                                    <div className="profile-banner">
                                        {profileData.banner_url ? (
                                            <img src={profileData.banner_url} alt="Banner" />
                                        ) : (
                                            <div className="default-banner"></div>
                                        )}
                                    </div>
                                    <div className="profile-card-header">
                                        <div className="profile-card-avatar-wrapper">
                                            <div className="profile-card-avatar">
                                                {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <div className="avatar-placeholder-large">{user.email?.[0].toUpperCase()}</div>}
                                            </div>
                                            <div className="status-indicator"></div>
                                        </div>
                                        <div className="profile-card-user">
                                            <div className="user-name-wrapper">
                                                <span className="card-username">{userName}</span>
                                                <div className="user-badges">
                                                    <i className="fab fa-discord" title="HypeSquad"></i>
                                                    <i className="fas fa-crown" title="Subscriber"></i>
                                                    <i className="fas fa-certificate" title="Verified"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <Link to="/perfil" className="edit-profile-btn" onClick={onClose}>Editar perfil de usuário</Link>
                                    </div>

                                    <div className="profile-info-box">
                                        <div className="info-row">
                                            <div className="info-label-wrap">
                                                <span className="info-label">Nome exibido</span>
                                                <span className="info-value">{userName}</span>
                                            </div>
                                            <button className="info-edit-btn">Editar</button>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-label-wrap">
                                                <span className="info-label">Nome de usuário</span>
                                                <span className="info-value">@{user.email?.split('@')[0]}</span>
                                            </div>
                                            <button className="info-edit-btn">Editar</button>
                                        </div>
                                        <div className="info-row">
                                            <div className="info-label-wrap">
                                                <span className="info-label">E-mail</span>
                                                <span className="info-value">
                                                    {user.email?.replace(/(.{2}).+(.{2}@.+)/, '$1********$2')}
                                                    <button className="show-more-link">Mostrar</button>
                                                </span>
                                            </div>
                                            <button className="info-edit-btn">Editar</button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : activeTab === 'biblioteca' ? (
                            <div className="library-content">
                                {libLoading ? (
                                    <div className="lib-loading">Carregando sua biblioteca...</div>
                                ) : libObras.length > 0 ? (
                                    <div className="lib-grid">
                                        {libObras.map(obra => {
                                            const rawName = obra.obr_imagem ? String(obra.obr_imagem) : ''
                                            const imgBasename = rawName ? rawName.split('/').pop().trim() : null
                                            const obraId = obra.obra_id != null ? String(obra.obra_id).trim() : ''
                                            let imgUrl
                                            if (rawName && rawName.includes('/')) {
                                                imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
                                            } else if (imgBasename && obraId) {
                                                imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`
                                            }
                                            return (
                                                <Link key={obra.obra_id} to={`/obra/${slugify(obra.obr_nome)}`} className="lib-item" onClick={onClose}>
                                                    <div className="lib-cover-wrap">
                                                        <img src={imgUrl} alt={obra.obr_nome} />
                                                    </div>
                                                    <span className="lib-title">{obra.obr_nome}</span>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="lib-empty">
                                        <i className="fas fa-bookmark"></i>
                                        <p>Sua biblioteca está vazia.</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'historico' ? (
                            <div className="library-content">
                                {histLoading ? (
                                    <div className="lib-loading">Carregando seu histórico...</div>
                                ) : histItems.length > 0 ? (
                                    <div className="hist-list">
                                        {histItems.map(item => {
                                            const rawName = item.obr_imagem ? String(item.obr_imagem) : ''
                                            const imgBasename = rawName ? rawName.split('/').pop().trim() : null
                                            const obraId = item.obra_id != null ? String(item.obra_id).trim() : ''
                                            let imgUrl
                                            if (rawName && rawName.includes('/')) {
                                                imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`
                                            } else if (imgBasename && obraId) {
                                                imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`
                                            }
                                            return (
                                                <Link key={item.id} to={`/obra/${slugify(item.obr_nome)}`} className="hist-item" onClick={onClose}>
                                                    <div className="hist-cover-wrap">
                                                        <img src={imgUrl} alt={item.obr_nome} />
                                                    </div>
                                                    <div className="hist-info">
                                                        <span className="hist-name">{item.obr_nome}</span>
                                                        <span className="hist-chapter">Capítulo {item.cap_numero}</span>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="lib-empty">
                                        <i className="fas fa-history"></i>
                                        <p>Seu histórico está vazio.</p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </main>
            </div>
        </div>
    )
}
