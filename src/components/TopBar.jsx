import React, { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import LoginModal from './LoginModal'
import UserModal from './UserModal'
import './TopBar.css'
import logo from '../logo.png'

export default function TopBar({ onLogoutClick }) {
  const { user, loading } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    if (user) {
      // Tentar pegar do metadata primeiro (fallback)
      setAvatarUrl(user.user_metadata?.avatar_url || null)

      // Buscar do banco (user_profiles) para ter a versão mais atual
      const fetchProfileResult = async () => {
        const { data } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url)
        }
      }
      fetchProfileResult()
    }
  }, [user])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const items = [
    { key: 'Início', to: '/inicio', icon: 'fa-solid fa-house' },
    { key: 'Todas as obras', to: '/todas', icon: 'fa-solid fa-compass' }
  ]

  return (
    <>
      <header className={`topbar${isScrolled ? ' scrolled' : ''}`}>
        <div className="topbar-logo">
          <Link to="/inicio" className="logo-link">
            <span className="logo-text">TENRAI</span>
            <span className="logo-badge">LEITOR</span>
          </Link>
        </div>
        <nav className="topbar-menu">
          {items.map((it) => (
            <NavLink
              key={it.key}
              to={it.to}
              className={({ isActive }) => `topbar-item${isActive ? ' active' : ''}`}
            >
              <span className="item-label">{it.key}</span>
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          {!loading && (
            user ? (
              <div className="topbar-user-wrapper">
                <div
                  className="topbar-user-button"
                  onClick={() => setShowUserModal(true)}
                  style={{ cursor: 'pointer' }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="user-avatar" />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  )}
                  <i className="fas fa-ellipsis-vertical"></i>
                </div>
              </div>
            ) : (
              <button
                className="topbar-entrar"
                onClick={() => setShowLoginModal(true)}
              >
                Entrar
              </button>
            )
          )}
        </div>
        <button className="topbar-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
        </button>
      </header>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}

      {showUserModal && (
        <UserModal
          user={user}
          avatarUrl={avatarUrl}
          onClose={() => setShowUserModal(false)}
          onLogout={onLogoutClick}
        />
      )}
    </>
  )
}
