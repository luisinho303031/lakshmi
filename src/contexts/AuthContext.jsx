import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState(null)

    useEffect(() => {
        let mounted = true

        const initAuth = async () => {
            console.log('🚀 Inicializando Auth (getSession)...')
            const { data: { session }, error } = await supabase.auth.getSession()

            if (!mounted) return

            if (error) {
                console.error('❌ Erro ao buscar sessão:', error)
            }

            if (session) {
                console.log('✅ Sessão encontrada (initAuth):', session.user.email)
                setSession(session)
                setUser(session.user)
            } else {
                console.log('⚠️ Nenhuma sessão encontrada (initAuth)')
                setSession(null)
                setUser(null)
            }

            setLoading(false)
        }

        initAuth()

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                console.log('🔔 Auth State Change:', _event)
                if (session) {
                    setSession(session)
                    setUser(session.user)
                } else {
                    setSession(null)
                    setUser(null)
                }
                setLoading(false)
            }
        )

        return () => {
            mounted = false
            listener.subscription.unsubscribe()
        }
    }, [])

    const value = {
        user,
        session,
        loading
    }

    console.log('🔄 AuthContext render - User:', user ? user.id : 'null', 'Loading:', loading)

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
