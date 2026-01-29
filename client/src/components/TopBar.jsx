import React, { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './TopBar.css'
import logo from '../logo.png'

export default function TopBar({ onLogoutClick }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState(null)
  const [userAvatar, setUserAvatar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        if (session.user.user_metadata?.avatar_url) {
          setUserAvatar(session.user.user_metadata.avatar_url)
        }
      }
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        if (session.user.user_metadata?.avatar_url) {
          setUserAvatar(session.user.user_metadata.avatar_url)
        }
      } else {
        setUser(null)
        setUserAvatar(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const items = [
    { key: 'Início', to: '/inicio', icon: 'fa-solid fa-house' },
    { key: 'Todas as obras', to: '/todas', icon: 'fa-solid fa-compass' }
  ]

  return (
    <header className={`topbar${isScrolled ? ' scrolled' : ''}`}>
      <div className="topbar-logo">
        <Link to="/inicio">
          <img src={logo} alt="Lakshmi" className="logo-img" />
        </Link>
      </div>
      <nav className="topbar-menu">
        {!loading && items.map((it) => (
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
              <Link to="/perfil" className="topbar-user-button">
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
                <i className="fas fa-ellipsis-vertical"></i>
              </Link>
            </div>
          ) : (
            <Link to="/entrar" className="topbar-entrar">
              Entrar
            </Link>
          )
        )}
      </div>
      <button className="topbar-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
      </button>
    </header>
  )
}
