import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Drawer } from 'vaul'
import './Capitulo.css'

export default function Capitulo() {
    const { capId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [capitulo, setCapitulo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [timestamp] = useState(Date.now())
    const [showChaptersDrawer, setShowChaptersDrawer] = useState(false)
    const [showUI, setShowUI] = useState(true)
    const [historicoLido, setHistoricoLido] = useState([])
    const [showTutorial, setShowTutorial] = useState(false)
    const [showDesktopDropdown, setShowDesktopDropdown] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768
            setIsMobile(mobile)
            if (!mobile) setShowUI(true) // Force UI visible on desktop
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const tutorialSeen = localStorage.getItem('tutorial_leitor_v1')
        if (!tutorialSeen && window.innerWidth <= 768) {
            setShowTutorial(true)
        }
    }, [])

    const handleFecharTutorial = (e) => {
        e.stopPropagation()
        setShowTutorial(false)
        localStorage.setItem('tutorial_leitor_v1', 'true')
    }

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDesktopDropdown(false)
            }
        }
        if (showDesktopDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showDesktopDropdown])

    const CDN_ROOT = 'https://cdn.verdinha.wtf'

    // Registrar leitura no histórico
    const registrarLeitura = async (capituloData) => {
        if (!user || !capituloData) return

        try {
            // A API retorna os dados da obra dentro de capituloData.obra
            const obra = capituloData.obra || {}

            console.log('📖 Registrando leitura:', {
                usuario_id: user.id,
                capitulo_id: capituloData.cap_id,
                obra_id: obra.obr_id,
                obra_nome: obra.obr_nome
            })

            const payload = {
                usuario_id: user.id,
                obra_id: obra.obr_id,
                capitulo_id: capituloData.cap_id,
                obr_nome: obra.obr_nome || 'Sem título',
                cap_nome: capituloData.cap_nome || 'Sem nome',
                cap_numero: capituloData.cap_numero || 0,
                obr_imagem: obra.obr_imagem || '',
                data_leitura: new Date().toISOString()
            }

            const { error: histError } = await supabase
                .from('historico_leitura')
                .upsert(payload, {
                    onConflict: 'usuario_id,capitulo_id'
                })

            if (histError) {
                console.error('❌ Erro ao registrar histórico:', histError)
            } else {
                console.log('✅ Leitura registrada no histórico')
            }
        } catch (err) {
            console.error('💥 Erro ao registrar leitura:', err)
        }
    }

    useEffect(() => {
        const fetchCapitulo = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api-tenrai/capitulos/${capId}`, {
                    headers: {
                        'Authorization': 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
                        'Accept': 'application/json'
                    }
                })
                if (!res.ok) throw new Error('Erro ao carregar capítulo')
                const data = await res.json()
                setCapitulo(data)

                // Registrar leitura após carregar o capítulo
                registrarLeitura(data)
            } catch (err) {
                console.error(err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchCapitulo()
        window.scrollTo(0, 0)
    }, [capId, user])

    // Buscar histórico de capítulos lidos
    useEffect(() => {
        const fetchHistorico = async () => {
            if (!user) return
            try {
                const { data, error: hError } = await supabase
                    .from('historico_leitura')
                    .select('capitulo_id')
                    .eq('usuario_id', user.id)

                if (hError) throw hError
                if (data) {
                    setHistoricoLido(data.map(item => item.capitulo_id))
                }
            } catch (err) {
                console.error('❌ Erro ao buscar histórico:', err)
            }
        }

        fetchHistorico()
    }, [user, capId]) // capId aqui garante atualizar quando um novo cap é marcado como lido

    // Progress Logic
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight
            const fullHeight = document.documentElement.scrollHeight
            const scrolled = window.scrollY

            // Calculate percentage based on scroll position
            const percentage = Math.round((scrolled / (fullHeight - windowHeight)) * 100)
            // setProgress(Math.max(0, Math.min(100, percentage))) // Progress state removed
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])



    if (loading) return <div className="cap-loading">Carregando capítulo...</div>
    if (error) return <div className="cap-error">Erro: {error}</div>
    if (!capitulo) return null

    return (
        <div className="cap-container" onClick={() => isMobile && setShowUI(!showUI)}>
            {showTutorial && (
                <div className="cap-tutorial-overlay" onClick={(e) => e.stopPropagation()}>
                    <div className="cap-tutorial-card">
                        <div className="cap-tutorial-icon">
                            <i className="fas fa-hand-pointer"></i>
                        </div>
                        <h3>Dica de Leitura</h3>
                        <p>Toque no meio da tela para ocultar ou mostrar os menus de navegação.</p>
                        <button className="cap-tutorial-btn" onClick={handleFecharTutorial}>
                            Entendi
                        </button>
                    </div>
                </div>
            )}
            <div className="cap-nav-overlay">
                {/* Top Left: Back & Home */}
            </div>
            {/* New Top Bar */}
            <header className={`cap-top-bar ${(isMobile && !showUI) ? 'hidden' : ''}`}>
                <div className="cap-top-left">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (capitulo.obra?.obr_slug) {
                                navigate(`/obra/${capitulo.obra.obr_slug}`)
                            } else {
                                navigate(-1)
                            }
                        }}
                        className="cap-top-back"
                        title="Voltar para a obra"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div className="cap-top-info">
                        <span className="cap-top-work-title">{capitulo.obra?.obr_nome || 'Obra'}</span>
                    </div>
                </div>

                {!isMobile && (
                    <div className="cap-top-right">
                        <div className="cap-desktop-nav">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (capitulo.capitulo_anterior?.cap_id) {
                                        navigate(`/cap/${capitulo.capitulo_anterior.cap_id}`)
                                    }
                                }}
                                disabled={!capitulo.capitulo_anterior?.cap_id}
                                className="cap-nav-btn"
                                title="Capítulo anterior"
                            >
                                <i className="fas fa-arrow-left"></i>
                            </button>

                            <div className="cap-desktop-selector"
                                ref={dropdownRef}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowDesktopDropdown(!showDesktopDropdown)
                                }}
                            >
                                <span>Capítulo {capitulo.cap_numero}</span>
                                <i className="fas fa-chevron-down"></i>

                                {showDesktopDropdown && (
                                    <div className="cap-desktop-dropdown">
                                        {[...(capitulo.obra?.capitulos || [])]
                                            .sort((a, b) => b.cap_numero - a.cap_numero)
                                            .map((cap) => (
                                                <div
                                                    key={cap.cap_id}
                                                    className={`dropdown-item ${cap.cap_id === capitulo.cap_id ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/cap/${cap.cap_id}`)
                                                        setShowDesktopDropdown(false)
                                                    }}
                                                >
                                                    <span>Capítulo {cap.cap_numero}</span>
                                                    {historicoLido.includes(cap.cap_id) && <i className="fas fa-check" style={{ color: '#f0f0f0' }}></i>}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (capitulo.capitulo_proximo?.cap_id) {
                                        navigate(`/cap/${capitulo.capitulo_proximo.cap_id}`)
                                    }
                                }}
                                disabled={!capitulo.capitulo_proximo?.cap_id}
                                className="cap-nav-btn"
                                title="Próximo capítulo"
                            >
                                <i className="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* New Bottom Bar */}
            <nav className={`cap-bottom-bar ${(isMobile && !showUI) ? 'hidden' : ''}`}>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        if (capitulo.capitulo_anterior?.cap_id) {
                            navigate(`/cap/${capitulo.capitulo_anterior.cap_id}`)
                        }
                    }}
                    disabled={!capitulo.capitulo_anterior?.cap_id}
                    className="cap-bottom-item"
                    title="Capítulo anterior"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>

                <div
                    className="cap-bottom-info"
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowChaptersDrawer(true)
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <span className="cap-bottom-title">Capítulo {capitulo.cap_numero}</span>
                        <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', color: '#71717a' }}></i>
                    </div>
                    {capitulo.cap_nome && capitulo.cap_nome !== `Capítulo ${capitulo.cap_numero}` && (
                        <span className="cap-bottom-subtitle">{capitulo.cap_nome}</span>
                    )}
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        if (capitulo.capitulo_proximo?.cap_id) {
                            navigate(`/cap/${capitulo.capitulo_proximo.cap_id}`)
                        }
                    }}
                    disabled={!capitulo.capitulo_proximo?.cap_id}
                    className="cap-bottom-item"
                    title="Próximo capítulo"
                >
                    <i className="fas fa-arrow-right"></i>
                </button>
            </nav>

            {/* Chapters Drawer */}
            <Drawer.Root open={showChaptersDrawer} onOpenChange={setShowChaptersDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="vaul-overlay" />
                    <Drawer.Content className="vaul-content">
                        <div className="vaul-handle-wrapper">
                            <div className="vaul-handle" />
                        </div>
                        <div className="vaul-inner-content">
                            <div className="vaul-header" style={{ marginBottom: '20px' }}>
                                <Drawer.Title className="vaul-title">Capítulos</Drawer.Title>
                            </div>
                            <div className="vaul-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: '40px' }}>
                                <div className="drawer-chapters-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {[...(capitulo.obra?.capitulos || [])]
                                        .sort((a, b) => b.cap_numero - a.cap_numero)
                                        .map((cap) => (
                                            <button
                                                key={cap.cap_id}
                                                className={`drawer-chapter-item ${cap.cap_id === capitulo.cap_id ? 'active' : ''}`}
                                                onClick={() => {
                                                    navigate(`/cap/${cap.cap_id}`)
                                                    setShowChaptersDrawer(false)
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '16px 20px',
                                                    background: cap.cap_id === capitulo.cap_id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                    color: cap.cap_id === capitulo.cap_id ? '#fff' : '#a1a1aa',
                                                    borderRadius: '0',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    width: '100%'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: '400',
                                                            color: cap.cap_id === capitulo.cap_id ? '#fff' : '#e4e4e7'
                                                        }}>
                                                            Capítulo {cap.cap_numero}
                                                        </span>
                                                        {historicoLido.includes(cap.cap_id) && (
                                                            <i className="fas fa-check" style={{ fontSize: '0.75rem', color: '#71717a' }}></i>
                                                        )}
                                                    </div>
                                                    {cap.cap_nome && cap.cap_nome !== `Capítulo ${cap.cap_numero}` && (
                                                        <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: '400' }}>
                                                            {cap.cap_nome}
                                                        </span>
                                                    )}
                                                </div>
                                                {cap.cap_id === capitulo.cap_id && (
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        background: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <i className="fas fa-check" style={{ fontSize: '0.7rem', color: '#000' }}></i>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <div className="cap-viewer">
                {capitulo.cap_paginas?.map((page, index) => (
                    <img
                        key={index}
                        src={`${CDN_ROOT}/${page.path}?_t=${timestamp}`}
                        alt={`Página ${index + 1}`}
                        className="cap-image"
                        loading="lazy"
                    />
                ))}
            </div>

            <div className="cap-footer">
                <p>Você chegou ao fim do capítulo.</p>
                {capitulo.capitulo_proximo?.cap_id && (
                    <button
                        onClick={() => navigate(`/cap/${capitulo.capitulo_proximo.cap_id}`)}
                        style={{
                            marginTop: '20px',
                            padding: '12px 30px',
                            background: '#fff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Próximo Capítulo
                    </button>
                )}
            </div>
        </div>
    )
}
