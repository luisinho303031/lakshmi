# Kinshi Site

Pequeno projeto Node.js + React com sidebar à esquerda.

Estrutura:
- server: Express API e servidor estático
- client: app React com Vite

Instalação (Windows):

```bash
# instalar dependências (no root irá instalar o concurrently, server e client)
npm install
npm run install-all

# rodar em desenvolvimento (abre o server e o client simultaneamente)
npm run dev
```

Alternativa (dois terminais):

```bash
# Terminal 1
cd server
npm install
npm run dev

# Terminal 2
cd client
npm install
npm run dev
```

Build para produção:

```bash
cd client
npm run build
# então iniciar o server (que serve client/dist)
cd ../
npm start
```

Descrição rápida da UI: sidebar à esquerda com o nome do site no topo e itens: Biblioteca, Navegar, Histórico, Configurações.
