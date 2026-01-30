import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './contexts/AuthContext'

import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import BottomBar from './components/BottomBar'

import ObraRecentes from './components/ObraRecentes'
import ObraNavegar from './components/ObraNavegar'
import ObraTodas from './components/ObraTodas'
import ObraDetalhe from './components/ObraDetalhe'
import Capitulo from './components/Capitulo'

import Login from './components/Login'
import Perfil from './components/Perfil'

function Biblioteca() {
  return (
    <div>
      <h1>Biblioteca</h1>
      <p>Conteúdo da Biblioteca aparecerá aqui.</p>
    </div>
  )
}

function Inicio() {
  return (
    <div className="page-inner">
      <div className="recent-wrap">
        <ObraRecentes />
        <ObraNavegar />
      </div>
    </div>
  )
}

function Historico() {
  return (
    <div>
      <h1>Histórico</h1>
      <p>Conteúdo do Histórico aparecerá aqui.</p>
    </div>
  )
}

function Todas() {
  return (
    <div className="page-inner">
      <ObraTodas />
    </div>
  )
}

function Configuracoes() {
  return (
    <div>
      <h1>Configurações</h1>
      <p>Configurações do site.</p>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              border: '2px solid #333',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}
          />
          <span>Carregando Lakshmi...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  const isReading = location.pathname.startsWith('/cap/')
  const hideNav = location.pathname === '/entrar' || isReading
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowLogoutModal(false)
  }

  return (
    <div className={`app ${isReading ? 'reading-mode' : ''}`}>
      {!hideNav && <Sidebar onLogoutClick={() => setShowLogoutModal(true)} />}
      {!hideNav && (
        <div className="mobile-topbar-wrapper">
          <TopBar onLogoutClick={() => setShowLogoutModal(true)} />
        </div>
      )}
      {!hideNav && <BottomBar />}

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/todas" element={<Todas />} />
          <Route path="/obra/:obraNome" element={<ObraDetalhe />} />
          <Route path="/cap/:capId" element={<Capitulo />} />
          <Route
            path="/perfil"
            element={user ? <Perfil /> : <Navigate to="/entrar" replace />}
          />
          <Route path="/entrar" element={<Login />} />
        </Routes>
      </main>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Poxa!</h3>
            <p className="modal-text">Tem certeza que deseja sair?</p>
            <div className="modal-buttons">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
