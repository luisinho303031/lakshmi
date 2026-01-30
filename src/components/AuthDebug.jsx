import { useAuth } from '../contexts/AuthContext'
import { testSupabaseConnection } from '../utils/testSupabase'
import './AuthDebug.css'

export default function AuthDebug() {
    const { user, session, loading } = useAuth()

    return (
        <div className="auth-debug">
            <h3>🔍 Auth Debug</h3>
            <div className="debug-item">
                <strong>Loading:</strong> {loading ? '⏳ Sim' : '✅ Não'}
            </div>
            <div className="debug-item">
                <strong>User:</strong> {user ? `✅ ${user.id}` : '❌ null'}
            </div>
            <div className="debug-item">
                <strong>Email:</strong> {user?.email || '❌ null'}
            </div>
            <div className="debug-item">
                <strong>Session:</strong> {session ? '✅ Ativa' : '❌ null'}
            </div>
            {session && (
                <div className="debug-item">
                    <strong>Expires:</strong> {new Date(session.expires_at * 1000).toLocaleString()}
                </div>
            )}
            <button
                className="debug-test-btn"
                onClick={() => testSupabaseConnection()}
            >
                🧪 Testar Conexão
            </button>
        </div>
    )
}
