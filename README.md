# ⚔️ CR Stats — Clash Royale Intelligence

> Dashboard mobile-first para análise de batalhas, decks e progresso no Clash Royale.  
> Tudo funciona **100% no seu dispositivo** — nenhum dado vai para servidores externos.

---

## 📸 Preview

```
╔══════════════════════════════╗
║   ⚔️  CRStats                ║
║   CLASH ROYALE INTELLIGENCE  ║
║                              ║
║  [Entrar]   [Cadastrar]      ║
║  ┌────────────────────────┐  ║
║  │ 👤 Nome de usuário     │  ║
║  │ 🔒 Senha           👁️  │  ║
║  └────────────────────────┘  ║
║  ████████ Entrar ████████    ║
╚══════════════════════════════╝
```

---

## 🚀 Como Começar

### 1. Pré-requisito — Criar sua API Key (gratuito)

A API Key é necessária para buscar seus dados do Clash Royale.

> ⚠️ **Passo importante!** Sem ela o app não funciona.

1. Acesse **[developer.clashroyale.com](https://developer.clashroyale.com)**
2. Faça login com sua **conta Supercell**
3. Clique em **"My Account"** → **"Create New Key"**
4. Preencha:
   - **Name:** qualquer nome (ex: `CRStats`)
   - **Description:** qualquer texto
   - **Allowed IP addresses:** descubra seu IP em [whatismyip.com](https://www.whatismyip.com) e cole aqui
5. Clique em **"Create Key"**
6. **Copie o token** — você vai precisar dele no cadastro

> 💡 **Dica:** Se seu IP mudar (conexões domésticas mudam às vezes), volte ao portal e atualize o IP da chave.

---

### 2. Descobrir seu Player Tag

Seu Player Tag é o código único do seu perfil. Exemplo: `#2PP2Y8LY`

**Como encontrar:**
- Abra o Clash Royale no celular
- Toque no seu **nome/perfil** (canto superior esquerdo)
- Seu tag aparece **abaixo do nome**, começando com `#`

---

### 3. Abrir o App

1. Abra a pasta do projeto
2. Dê **duplo clique** em `index.html`
3. O app abrirá no seu navegador padrão

> 🔥 **Recomendado:** Use o **Google Chrome** ou **Microsoft Edge** para a melhor experiência e para instalar como PWA.

---

### 4. Criar sua Conta

1. Clique na aba **"Cadastrar"**
2. Preencha:
   - **Usuário:** nome de sua escolha (usado só localmente)
   - **Senha:** mínimo 8 caracteres (use uma senha forte!)
   - **Player Tag:** seu `#TAG` do jogo
   - **API Key:** o token que você copiou no passo 1
3. Clique em **"Criar Conta"**
4. O app já faz login automático e carrega seus dados

> ✅ Pronto! Agora é só aproveitar.

---

## 📱 Instalar como App (PWA)

Você pode instalar o CR Stats como um app nativo no celular ou no PC, sem precisar de loja.

### No Chrome (Android ou PC):
1. Abra o `index.html` no Chrome
2. Toque/clique nos **3 pontinhos** (menu)
3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**

### No Safari (iPhone):
1. Abra o `index.html` no Safari
2. Toque no ícone de **compartilhar** (⬆️)
3. Selecione **"Adicionar à tela de início"**

---

## 🗺️ Funcionalidades

### 🏠 Início (Visão Geral)
- Seus **troféus atuais** e recorde pessoal
- **Win Rate** em gráfico de rosca colorido
- Total de vitórias, derrotas e batalhas
- **Insight de IA** personalizado com dicas baseadas nas suas últimas batalhas
- Preview das 5 últimas batalhas

### ⚔️ Batalhas
- Histórico completo de batalhas
- Filtros: **Todas / Vitórias / Derrotas**
- Cada batalha mostra: resultado, cartas usadas, tipo, variação de troféus e tempo

### 🃏 Decks
- **Recomendação inteligente** do melhor deck para você usar agora (baseado no seu win rate histórico)
- Custo médio de elixir e análise de sinergia
- Ranking de todos os seus decks por win rate
- Barra de progresso visual para cada deck

### 💎 Cartas
- Grid de todas as suas cartas desbloqueadas
- Filtros por raridade: **Comuns, Raras, Épicas, Lendárias**
- Nível atual e nível máximo de cada carta

### 📊 Analytics
| Gráfico | O que mostra |
|---------|-------------|
| 📈 Evolução de Troféus | Curva de troféus ao longo das últimas batalhas |
| 🃏 Win Rate por Deck | Comparativo de performance entre seus top 5 decks |
| 💎 Cartas Mais Usadas | Quais cartas aparecem mais nos seus decks |
| 🕐 Batalhas por Hora | Em que horário você mais batalha (e performa melhor) |

---

## 🔐 Segurança

| O que protegemos | Como protegemos |
|-----------------|-----------------|
| Sua **senha** | Hash com PBKDF2 + 100.000 iterações + salt aleatório |
| Sua **API Key** | Criptografada com AES-GCM 256-bit |
| Seus **dados** | 100% localStorage — nunca saem do dispositivo |
| Sua **sessão** | sessionStorage (limpa ao fechar a aba) |

> 🛡️ Usamos a **Web Crypto API** nativa do navegador — a mesma tecnologia de bancos digitais.

**Nenhum dado é enviado a nenhum servidor nosso.** O único tráfego de rede é com a API oficial do Clash Royale.

---

## 🔄 Atualizar Dados

Clique no botão **🔄** no canto superior direito para forçar atualização.

Os dados ficam em cache por **5 minutos** para não sobrecarregar a API.

---

## ⚠️ Problemas Comuns

### ❌ "API Key inválida ou IP não autorizado"
**Causa:** Seu IP mudou ou a chave foi configurada com IP errado.  
**Solução:**
1. Acesse [whatismyip.com](https://www.whatismyip.com) e anote seu IP atual
2. Vá em [developer.clashroyale.com](https://developer.clashroyale.com)
3. Edite sua chave e atualize o IP
4. Espere ~1 minuto e tente novamente

### ❌ "Jogador não encontrado"
**Causa:** Player Tag incorreto.  
**Solução:** Verifique se digitou o `#` e os caracteres corretos (atenção: `0` vs `O`).

### ❌ Dados não carregam / tela branca
**Solução:**
1. Verifique sua conexão com a internet
2. Abra o DevTools (F12) → aba Console e veja o erro
3. Tente atualizar a página (F5)

### ❌ "Usuário já existe" ao cadastrar
**Causa:** Já existe uma conta com esse nome no dispositivo.  
**Solução:** Use a aba "Entrar" com suas credenciais, ou escolha outro nome de usuário.

### ❌ Esqueci minha senha
Como os dados ficam locais e a senha é hasheada (não há como recuperar), você precisará criar uma nova conta com outro usuário.

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| HTML5 / CSS3 / JS vanilla | App completo sem frameworks |
| Web Crypto API | Criptografia nativa do navegador |
| Chart.js 4.4 | Gráficos interativos |
| Service Worker | Cache offline / PWA |
| Clash Royale API v1 | Dados oficiais do jogo |
| Google Fonts (Rajdhani + Exo 2) | Tipografia premium |

---

## 📁 Estrutura de Arquivos

```
📦 Estatisticas Clash Royale/
├── 📄 index.html          → App principal (toda a interface)
├── 📄 manifest.json       → Configuração PWA
├── 📄 sw.js               → Service Worker (offline)
├── 📁 css/
│   └── 📄 main.css        → Design system completo
├── 📁 js/
│   ├── 📄 crypto.js       → Hashing (PBKDF2) e criptografia (AES-GCM)
│   ├── 📄 auth.js         → Sistema de login e cadastro
│   ├── 📄 api.js          → Cliente da Clash Royale API + cache
│   ├── 📄 analytics.js    → Motor de estatísticas e recomendações
│   ├── 📄 ui.js           → Renderização de telas e gráficos
│   └── 📄 app.js          → Orquestrador principal
└── 📁 icons/
    └── 📄 icon-192.svg    → Ícone do app
```

---

## 📋 Limite da API Clash Royale

A API oficial tem os seguintes limites:
- **Requisições:** ~100 por minuto por chave
- **Histórico de batalhas:** últimas ~25 batalhas
- **Dados disponíveis:** perfil, batalhas, cartas, baús

> O app usa cache de 5 minutos para respeitar os limites automaticamente.

---

## 📜 Licença

MIT License © 2026 **Xandy Gomes**

Permissão concedida, gratuitamente, a qualquer pessoa que obtenha uma cópia deste software para usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias, sujeito às condições da licença MIT completa no arquivo `LICENSE`.

---

## 👤 Sobre

Feito por **Xandy Gomes** ⚔️

Desenvolvido com ❤️ e IA para ajudar jogadores de Clash Royale a evoluírem com dados reais — análises honestas, sem pay-to-win de informação.

> *"Xandy Gomes"* é marca registrada do autor.

**Não é afiliado à Supercell.** Clash Royale® é marca registrada da Supercell Oy.

---

*CR Stats — porque subir de arena não é sorte, é estratégia.* ⚔️
