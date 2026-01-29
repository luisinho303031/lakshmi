import React, { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './BottomBar.css'

export default function BottomBar() {
    const [user, setUser] = useState(null)
    const [profileData, setProfileData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUser(session.user)
                // Fetch profile for avatar
                const { data } = await supabase
                    .from('user_profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .single()

                if (data) setProfileData(data)
            }
            setLoading(false)
        }
        fetchData()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user)
                const { data } = await supabase
                    .from('user_profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .single()
                if (data) setProfileData(data)
            } else {
                setUser(null)
                setProfileData(null)
            }
        })

        return () => subscription?.unsubscribe()
    }, [])

    const items = [
        { key: 'Início', to: '/inicio', icon: 'fa-solid fa-house' },
        { key: 'Navegar', to: '/todas', icon: 'fa-solid fa-compass' },
        { key: 'Você', to: '/perfil', isProfile: true }
    ]

    if (!loading && !user) {
        items[2] = { key: 'Entrar', to: '/entrar', icon: 'fa-solid fa-user' }
    }

    return (
        <nav className="bottom-bar">
            {items.map((it) => (
                <NavLink
                    key={it.key}
                    to={it.to}
                    className={({ isActive }) => `bottom-item${isActive ? ' active' : ''}`}
                >
                    {it.isProfile && user ? (
                        <div className="bottom-avatar-wrapper">
                            {profileData?.avatar_url ? (
                                <img src={profileData.avatar_url} alt="Profile" className="bottom-avatar" />
                            ) : (
                                <div className="bottom-avatar-placeholder">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <i className={it.icon}></i>
                    )}
                    <span className="bottom-label">{it.key}</span>
                </NavLink>
            ))}
        </nav>
    )
}
