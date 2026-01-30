import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import './Capitulo.css'

export default function Capitulo() {
    const { capId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [capitulo, setCapitulo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

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

    if (loading) return <div className="cap-loading">Carregando capítulo...</div>
    if (error) return <div className="cap-error">Erro: {error}</div>
    if (!capitulo) return null

    return (
        <div className="cap-container">
            <div className="cap-header">
                <button onClick={() => navigate(-1)} className="cap-back">
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div className="cap-info">
                    <h1>{capitulo.cap_nome}</h1>
                </div>
            </div>

            <div className="cap-viewer">
                {capitulo.cap_paginas?.map((page, index) => (
                    <img
                        key={index}
                        src={`${CDN_ROOT}/${page.path}`}
                        alt={`Página ${index + 1}`}
                        className="cap-image"
                        loading="lazy"
                    />
                ))}
            </div>

            <div className="cap-footer">
                <p>Você chegou ao fim do capítulo.</p>
            </div>
        </div>
    )
}
