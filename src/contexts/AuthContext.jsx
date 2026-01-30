import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 🔹 Boot inicial
    const initAuth = async () => {
      setLoading(true)

      const { data } = await supabase.auth.getSession()

      if (!mounted) return

      if (data?.session) {
        setSession(data.session)
        setUser(data.session.user)
      } else {
        setSession(null)
        setUser(null)
      }

      setLoading(false)
    }

    initAuth()

    // 🔹 Listener REAL de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('🔔 Auth event:', _event)

        // ✅ logout real
        if (_event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }

        // ✅ login / refresh válido
        if (session) {
          setSession(session)
          setUser(session.user)
          setLoading(false)
        }

        // 🚫 session null sem SIGNED_OUT = IGNORA
      }
    )

    // 🔹 Quando volta pra aba, revalida
    const onFocus = async () => {
      console.log('👀 Foco recuperado → revalidando sessão')

      setLoading(true)

      const { data } = await supabase.auth.getSession()

      if (data?.session) {
        setSession(data.session)
        setUser(data.session.user)
      }

      setLoading(false)
    }

    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
