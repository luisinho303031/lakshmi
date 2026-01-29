import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './Capitulo.css'

export default function Capitulo() {
    const { capId } = useParams()
    const navigate = useNavigate()
    const [capitulo, setCapitulo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const CDN_ROOT = 'https://api.verdinha.wtf/cdn'

    useEffect(() => {
        const fetchCapitulo = async () => {
            try {
                setLoading(true)
                const res = await fetch(`https://api.verdinha.wtf/capitulos/${capId}`, {
                    headers: {
                        'Authorization': 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
                        'Accept': 'application/json'
                    }
                })
                if (!res.ok) throw new Error('Erro ao carregar capítulo')
                const data = await res.json()
                setCapitulo(data)
            } catch (err) {
                console.error(err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchCapitulo()
        window.scrollTo(0, 0)
    }, [capId])

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
