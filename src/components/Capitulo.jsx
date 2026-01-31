import React, { useEffect, useState } from 'react'
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
    const [battery, setBattery] = useState(null)
    const [progress, setProgress] = useState(0)
    const [showUI, setShowUI] = useState(true)

    const CDN_ROOT = '/cdn-tenrai'

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

    // Battery Logic
    useEffect(() => {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(batt => {
                setBattery(Math.round(batt.level * 100))
                batt.addEventListener('levelchange', () => {
                    setBattery(Math.round(batt.level * 100))
                })
            })
        }
    }, [])

    // Progress Logic
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight
            const fullHeight = document.documentElement.scrollHeight
            const scrolled = window.scrollY

            // Calculate percentage based on scroll position
            const percentage = Math.round((scrolled / (fullHeight - windowHeight)) * 100)
            setProgress(Math.max(0, Math.min(100, percentage)))
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    if (loading) return <div className="cap-loading">Carregando capítulo...</div>
    if (error) return <div className="cap-error">Erro: {error}</div>
    if (!capitulo) return null

    return (
        <div className="cap-container" onClick={() => setShowUI(!showUI)}>
            <div className="cap-nav-overlay">
                {/* Top Left: Back & Home */}
                <div className={`cap-nav-top-left ${!showUI ? 'hidden' : ''}`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (capitulo.obra?.obr_slug) {
                                navigate(`/obra/${capitulo.obra.obr_slug}`)
                            } else {
                                navigate(-1)
                            }
                        }}
                        className="nav-btn"
                        title="Voltar para a obra"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate('/')
                        }}
                        className="nav-btn"
                        title="Ir para a Home"
                    >
                        <i className="fas fa-home"></i>
                    </button>
                </div>

                {/* Top Right: Status Info - ALWAYS VISIBLE */}
                <div className="cap-nav-top-right">
                    <div className="status-indicator">
                        <div className="status-item">
                            <i className={`fas fa-battery-${battery < 20 ? 'quarter' : battery < 50 ? 'half' : battery < 80 ? 'three-quarters' : 'full'}`}></i>
                            <span>{battery !== null ? `${battery}%` : '--'}</span>
                        </div>
                        <div className="status-divider"></div>
                        <div className="status-item">
                            <i className="fas fa-percent" style={{ fontSize: '0.7rem', opacity: 0.6 }}></i>
                            <span>{progress}%</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Center: Prev & Next */}
                <div className={`cap-nav-bottom ${!showUI ? 'hidden' : ''}`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/cap/${capitulo.capitulo_anterior?.cap_id}`)
                        }}
                        disabled={!capitulo.capitulo_anterior?.cap_id}
                        className="nav-arrow"
                        title="Capítulo anterior"
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <button
                        className="chapter-selector-btn"
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowChaptersDrawer(true)
                        }}
                    >
                        <span>Cap. {capitulo.cap_numero}</span>
                        <i className="fas fa-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.7 }}></i>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/cap/${capitulo.capitulo_proximo?.cap_id}`)
                        }}
                        disabled={!capitulo.capitulo_proximo?.cap_id}
                        className="nav-arrow"
                        title="Próximo capítulo"
                    >
                        <i className="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>

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
                                                    <span style={{
                                                        fontSize: '1rem',
                                                        fontWeight: cap.cap_id === capitulo.cap_id ? '700' : '500',
                                                        color: cap.cap_id === capitulo.cap_id ? '#fff' : '#e4e4e7'
                                                    }}>
                                                        Capítulo {cap.cap_numero}
                                                    </span>
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
