import { supabase } from '../lib/supabaseClient'

// Helper para adicionar timeout em promises
function withTimeout(promise, ms = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
        )
    ])
}

export async function testSupabaseConnection() {
    console.log('🧪 Testando conexão com Supabase...')

    // Teste 0: Fetch Direto (REST API)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const restUrl = `${supabaseUrl}/rest/v1/user_profiles?select=count`

    console.log('🌐 Testando conexão HTTP direta:', restUrl)
    try {
        const response = await fetch(restUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        })
        console.log('📡 Status HTTP:', response.status, response.statusText)
        if (response.ok) {
            console.log('✅ Conexão HTTP direta OK!')
        } else {
            console.error('❌ Falha na conexão HTTP direta')
            const text = await response.text()
            console.error('❌ Resposta:', text)
        }
    } catch (fetchErr) {
        console.error('💥 Erro fatal no fetch direto:', fetchErr)
    }

    try {
        // Teste 1: Verificar se o cliente foi criado
        console.log('✅ Cliente Supabase criado:', !!supabase)

        // Teste 2: Verificar sessão atual (com timeout)
        console.log('⏱️ Buscando sessão (timeout: 5s)...')
        const sessionPromise = supabase.auth.getSession()
        const { data: sessionData, error: sessionError } = await withTimeout(sessionPromise, 5000)

        if (sessionError) {
            console.error('❌ Erro ao buscar sessão:', sessionError)
            return
        } else {
            console.log('✅ Sessão:', sessionData.session ? 'Ativa' : 'Inativa')
            if (sessionData.session) {
                console.log('👤 User ID:', sessionData.session.user.id)
            }
        }

        // Teste 3: Tentar buscar da tabela user_profiles (com timeout)
        if (sessionData.session) {
            console.log('⏱️ Testando acesso à tabela user_profiles (timeout: 10s)...')
            try {
                const profilePromise = supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', sessionData.session.user.id)
                    .maybeSingle()

                const { data, error } = await withTimeout(profilePromise, 10000)

                if (error) {
                    console.error('❌ Erro ao acessar user_profiles:', error)
                    console.error('❌ Código do erro:', error.code)
                    console.error('❌ Mensagem:', error.message)
                    console.error('❌ Detalhes:', error.details)
                    console.error('❌ Hint:', error.hint)
                } else {
                    console.log('✅ Acesso à user_profiles OK')
                    console.log('📦 Dados:', data)
                }
            } catch (timeoutErr) {
                console.error('⏰ TIMEOUT ao acessar user_profiles:', timeoutErr.message)
                console.error('💡 Isso geralmente indica problema de RLS (Row Level Security)')
            }

            // Teste 4: Tentar buscar da tabela biblioteca_usuario (com timeout)
            console.log('⏱️ Testando acesso à tabela biblioteca_usuario (timeout: 10s)...')
            try {
                const bibPromise = supabase
                    .from('biblioteca_usuario')
                    .select('*')
                    .eq('usuario_id', sessionData.session.user.id)
                    .limit(5)

                const { data: bibData, error: bibError } = await withTimeout(bibPromise, 10000)

                if (bibError) {
                    console.error('❌ Erro ao acessar biblioteca_usuario:', bibError)
                    console.error('❌ Código do erro:', bibError.code)
                    console.error('❌ Mensagem:', bibError.message)
                    console.error('❌ Detalhes:', bibError.details)
                    console.error('❌ Hint:', bibError.hint)
                } else {
                    console.log('✅ Acesso à biblioteca_usuario OK')
                    console.log('📦 Dados:', bibData)
                    console.log('📊 Total de itens:', bibData?.length || 0)
                }
            } catch (timeoutErr) {
                console.error('⏰ TIMEOUT ao acessar biblioteca_usuario:', timeoutErr.message)
                console.error('💡 Isso geralmente indica problema de RLS (Row Level Security)')
            }
        }

        console.log('🏁 Teste concluído!')

    } catch (err) {
        console.error('💥 Erro no teste:', err)
        console.error('💥 Stack:', err.stack)
    }
}
