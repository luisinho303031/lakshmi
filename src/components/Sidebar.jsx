import React, { useEffect, useState, useRef } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './sidebar.css'
import logo from '../logo.png'

export default function Sidebar({ onLogoutClick }) {
  const { user } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const nav = useNavigate()
  const profileMenuRef = useRef(null)

  const userAvatar = user?.user_metadata?.avatar_url || null

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const items = [
    { key: 'Iniciar', to: '/inicio', icon: 'fa-solid fa-house' },
    { key: 'Todas as obras', to: '/todas', icon: 'fa-solid fa-compass' }
  ]

  // Add library link only if user is logged in
  if (user) {
    items.push({ key: 'Biblioteca', to: '/biblioteca', icon: 'fa-solid fa-book' })
    items.push({ key: 'Histórico', to: '/historico', icon: 'fa-solid fa-clock-rotate-left' })
  }

  return (
    <aside className="sidebar">
      <div className="site-name">
        <Link to="/inicio" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.05em' }}>TENRAI</span>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: '800',
            color: '#000',
            background: '#fff',
            borderRadius: '999px',
            padding: '2px 8px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>LEITOR</span>
        </Link>
      </div>

      <nav className="menu">
        {items.map((it) => (
          <NavLink
            key={it.key}
            to={it.to}
            className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
          >
            <i className={it.icon} aria-hidden="true" />
            <span className="label">{it.key}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <div className="sidebar-profile" ref={profileMenuRef}>
            <button
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="sidebar-avatar" />
              ) : (
                <div className="sidebar-avatar-placeholder">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              <div className="profile-info">
                <span className="profile-name">{user.user_metadata?.name || 'Usuário'}</span>
                <span className="profile-email">{user.email}</span>
              </div>
              <i className="fas fa-ellipsis-v"></i>
            </button>

            {showProfileMenu && (
              <div className="profile-menu-popover">
                <Link to="/perfil" className="popover-item" onClick={() => setShowProfileMenu(false)}>
                  <i className="fas fa-user"></i> Perfil
                </Link>
                <Link to="/configuracoes" className="popover-item" onClick={() => setShowProfileMenu(false)}>
                  <i className="fas fa-gear"></i> Configurações
                </Link>
                <button
                  className="popover-item logout"
                  onClick={() => {
                    setShowProfileMenu(false)
                    onLogoutClick()
                  }}
                >
                  <i className="fas fa-sign-out-alt"></i> Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/entrar" className="sidebar-login-btn">
            Entrar
          </Link>
        )}
      </div>
    </aside>
  )
}
