/**
 * chat.js — Treinador IA (Gemini) com Google Search Grounding
 *
 * Faz chamadas diretas do navegador para a API Gemini.
 * Mantém o histórico no localStorage criptografado (chave mantida na sessão decifrada).
 * Destaca nomes de cartas transformando-os em chips visuais.
 */

let _chatHistory = [];
let _isThinking = false;

/**
 * Inicialização — chamada ao abrir a aba de Chat
 */
function initChatPage() {
  const session = Auth.getSession();
  if (!session) {
    showToast('⚠️ Faça login para acessar o chat.');
    navigateTo('overview');
    return;
  }

  // Verifica se o usuário já configurou a chave do Gemini
  if (session.geminiKey) {
    showGeminiConfig(false);
    updateWelcomeMessage();
    loadChatHistory();
    renderHistory();
  } else {
    showGeminiConfig(true);
  }
}

/**
 * Alterna entre visualizações de Configuração de Chave e Chat
 */
function showGeminiConfig(show) {
  const configView = document.getElementById('chat-config-view');
  const interfaceView = document.getElementById('chat-interface-view');
  
  if (show) {
    configView.classList.remove('hidden');
    interfaceView.classList.add('hidden');
    // Limpa campos de senha e erro
    document.getElementById('chat-config-password').value = '';
    document.getElementById('chat-config-error').classList.add('hidden');
  } else {
    configView.classList.add('hidden');
    interfaceView.classList.remove('hidden');
  }
}

/**
 * Salva a chave do Gemini criptografada na conta do usuário
 */
async function handleSaveGeminiKey(e) {
  e.preventDefault();
  const geminiKey = document.getElementById('chat-gemini-key').value.trim();
  const password = document.getElementById('chat-config-password').value;
  const btn = document.getElementById('save-gemini-btn');
  const errEl = document.getElementById('chat-config-error');

  if (!geminiKey.startsWith('AIzaSy')) {
    errEl.textContent = 'A chave inserida não parece ser uma chave válida do Gemini (deve começar com "AIzaSy").';
    errEl.classList.remove('hidden');
    return;
  }

  setButtonLoading(btn, true);
  errEl.classList.add('hidden');

  try {
    // Criptografa e salva
    await Auth.updateGeminiKey(password, geminiKey);
    showToast('🔑 Chave do Gemini salva com sucesso!');
    showGeminiConfig(false);
    updateWelcomeMessage();
    loadChatHistory();
    renderHistory();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Atualiza estatísticas do jogador na mensagem de boas-vindas
 */
function updateWelcomeMessage() {
  const nameEl = document.getElementById('chat-player-name-display');
  const levelEl = document.querySelector('.chat-player-level');
  const trophiesEl = document.querySelector('.chat-player-trophies');
  const cardsCountEl = document.querySelector('.chat-player-cards-count');
  const session = Auth.getSession() || {};

  if (_player) {
    if (nameEl) nameEl.textContent = _player.name || session.username || 'Jogador';
    if (levelEl) levelEl.textContent = _player.expLevel || '?';
    if (trophiesEl) trophiesEl.textContent = (_player.trophies || 0).toLocaleString('pt-BR') + ' 🏆';
    if (cardsCountEl) cardsCountEl.textContent = (_cards || []).length;
  } else {
    if (nameEl) nameEl.textContent = session.username || 'Jogador';
  }
}

/* ── PERSISTÊNCIA DO HISTÓRICO ──────────────── */

function loadChatHistory() {
  const session = Auth.getSession();
  if (!session) return;
  try {
    const key = `crstats_chat_${session.username}`;
    const stored = localStorage.getItem(key);
    _chatHistory = stored ? JSON.parse(stored) : [];
  } catch {
    _chatHistory = [];
  }
}

function saveChatHistory() {
  const session = Auth.getSession();
  if (!session) return;
  try {
    const key = `crstats_chat_${session.username}`;
    localStorage.setItem(key, JSON.stringify(_chatHistory));
  } catch(e) {}
}

function clearChatHistory() {
  if (confirm('Deseja limpar todo o histórico de conversa com o Treinador IA?')) {
    _chatHistory = [];
    saveChatHistory();
    renderHistory();
    showToast('🧹 Conversa limpa!');
  }
}

/* ── RENDERIZAÇÃO DE MENSAGENS ──────────────── */

function renderHistory() {
  const container = document.getElementById('chat-messages');
  // Mantém apenas a primeira mensagem do sistema (boas-vindas)
  const systemMsg = container.querySelector('.system-msg');
  container.innerHTML = '';
  if (systemMsg) {
    container.appendChild(systemMsg);
  }

  _chatHistory.forEach(msg => {
    appendMessageBubble(msg.role, msg.parts[0].text, false);
  });
  
  // Mostrar sugestões rápidas apenas se a conversa estiver vazia
  const suggestions = document.getElementById('chat-quick-suggestions');
  if (suggestions) {
    suggestions.classList.toggle('hidden', _chatHistory.length > 0);
  }

  scrollToBottom();
}

/**
 * Adiciona um balão de mensagem no container
 */
function appendMessageBubble(role, text, shouldScroll = true) {
  const container = document.getElementById('chat-messages');
  const isUser = role === 'user';

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user-msg' : 'ai-msg'}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = isUser ? '👤' : '🤖';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (isUser) {
    bubble.textContent = text;
  } else {
    // Processamento da resposta da IA:
    // 1. Destacar as cartas do Clash Royale substituindo-as por chips
    let processedText = formatCardNamesInText(text);
    // 2. Parsear o markdown básico
    bubble.innerHTML = parseMarkdown(processedText);
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  container.appendChild(msgDiv);

  if (shouldScroll) {
    scrollToBottom();
  }
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function showThinkingIndicator(show) {
  const container = document.getElementById('chat-messages');
  let indicator = document.getElementById('chat-thinking-indicator');

  if (show) {
    if (indicator) return;
    const isUserEmpty = _chatHistory.length === 0;

    indicator = document.createElement('div');
    indicator.id = 'chat-thinking-indicator';
    indicator.className = 'message ai-msg';
    
    indicator.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    container.appendChild(indicator);
    scrollToBottom();
  } else {
    if (indicator) indicator.remove();
  }
}

/* ── ENVIO DE MENSAGENS ─────────────────────── */

function handleChatInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage();
  }
}

function sendQuickMessage(text) {
  sendUserMessage(text);
}

async function sendUserMessage(forcedText = '') {
  if (_isThinking) return;

  const inputEl = document.getElementById('chat-input');
  const text = forcedText ? forcedText : inputEl.value.trim();
  
  if (!text) return;

  if (!forcedText) {
    inputEl.value = '';
    inputEl.style.height = 'auto'; // Reseta altura do textarea
  }

  const session = Auth.getSession();
  if (!session || !session.geminiKey) {
    showToast('❌ Chave do Gemini não configurada!');
    showGeminiConfig(true);
    return;
  }

  // Adiciona ao histórico e renderiza
  _chatHistory.push({ role: 'user', parts: [{ text }] });
  saveChatHistory();
  
  // Esconder sugestões
  const suggestions = document.getElementById('chat-quick-suggestions');
  if (suggestions) suggestions.classList.add('hidden');

  appendMessageBubble('user', text);
  showThinkingIndicator(true);
  _isThinking = true;

  try {
    // Chamada à API
    const reply = await callGemini(session.geminiKey, _chatHistory);
    
    showThinkingIndicator(false);
    _chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    saveChatHistory();

    appendMessageBubble('model', reply);
  } catch (err) {
    console.error('Gemini API Error:', err);
    showThinkingIndicator(false);
    
    // Remove a última pergunta do histórico para que o usuário possa tentar novamente
    _chatHistory.pop();
    saveChatHistory();

    let errorMsg = err.message || '';
    if (errorMsg.includes('API key not valid')) {
      errorMsg = 'Chave do Gemini inválida ou não ativa. Verifique no Google AI Studio.';
    }
    
    appendMessageBubble('model', `❌ **Erro ao processar mensagem:** ${errorMsg}\n\nTente novamente.`);
  } finally {
    _isThinking = false;
  }
}

/* ── PREPARAÇÃO DE CONTEXTO E CHAMADA DE API ── */

function prepareAiContext() {
  if (!_player) return 'Nenhum jogador Clash Royale autenticado.';

  const myCards = _cards.map(c => `${getCardName(c.name)} (Nível ${c.level})`).join(', ');

  const recentBattles = _battles.slice(0, 15).map((b, idx) => {
    const isWin = Analytics._isWin(b);
    const type = b.type || 'Ladder';
    const teamCrowns = b.team?.[0]?.crowns || 0;
    const oppCrowns = b.opponent?.[0]?.crowns || 0;
    const teamCards = (b.team?.[0]?.cards || []).map(c => getCardName(c.name)).join(', ');
    const oppCards = (b.opponent?.[0]?.cards || []).map(c => getCardName(c.name)).join(', ');
    const trophyChange = b.team?.[0]?.trophyChange || 0;
    return `Partida ${idx + 1}: ${isWin ? 'Vitória' : 'Derrota'} (${teamCrowns}x${oppCrowns}) no modo ${type}, variação troféus: ${trophyChange >= 0 ? '+' : ''}${trophyChange}. Cartas do meu Deck: [${teamCards}]. Cartas do Deck do Oponente: [${oppCards}].`;
  }).join('\n');

  const topDecks = _deckStats.slice(0, 3).map((d, idx) => {
    const cards = (d.cards || []).map(c => getCardName(c.name)).join(', ');
    return `Recomendação #${idx + 1} (${d.archetype || 'Desconhecido'}): Win Rate de ${d.winRate}%, total de ${d.total} batalhas. Cartas do deck: [${cards}].`;
  }).join('\n');

  return `
Você é o CR Stats Coach, o maior expert em Clash Royale do mundo, um treinador tático Conselheiro de alto nível e analista de dados.
Seu objetivo é ajudar o jogador a subir de arena e analisar seus dados. Você possui acesso à internet em tempo real para pesquisar o meta atual, mudanças de balanceamento e decks de torneio.

DADOS REAIS DO JOGADOR EM TEMPO REAL:
- Nome de Jogador: ${_player.name || 'Jogador'}
- Troféus Atuais: ${_player.trophies || 0}
- Recorde de Troféus (Recorde Pessoal): ${_player.bestTrophies || 0}
- Nível de Experiência: ${_player.expLevel || 1}
- Arena do Jogo: ${_player.arena?.name || 'Desconhecida'}

CARTAS QUE O JOGADOR POSSUI DESBLOQUEADAS E SEUS NÍVEIS (Foque nas cartas de nível mais alto para suas recomendações):
${myCards || 'Nenhuma carta carregada'}

HISTÓRICO RECENTE DAS ÚLTIMAS 15 BATALHAS:
${recentBattles || 'Sem histórico recente de batalhas'}

DECKS CALCULADOS DO HISTÓRICO DO JOGADOR:
${topDecks || 'Nenhum deck recomendado calculado'}

DIRETRIZES DE RESPOSTA:
1. Responda em Português do Brasil (PT-BR).
2. Seja objetivo, estratégico e direto ao ponto. Use termos comuns da comunidade (win conditions, elixir advantage, cycle, bait, beatdown, counters, etc.).
3. Você tem acesso à internet (Google Search). Se o jogador pedir pelos "decks do meta", "decks populares", "decks de campeonatos", ou "atualizações do Clash Royale", você DEVE fazer buscas para trazer informações precisas de portais como RoyaleAPI, Stats Royale e decks profissionais vigentes.
4. Quando recomendar um deck, monte um deck contendo EXATAMENTE 8 CARTAS da coleção dele (verifique se ele possui e o nível). Liste os nomes das 8 cartas de forma explícita e em português (conforme os nomes da lista acima, ex: "Gigante", "Cavaleiro", "Tora", "Bola de Fogo") para que o aplicativo possa destacar visualmente em formato de chip.
5. Explique resumidamente o plano de jogo do deck sugerido, a condição de vitória principal, como defender combos perigosos e como gerenciar o elixir.
`;
}

/**
 * Chamada de API oficial do Gemini com Grounding do Google Search
 */
async function callGemini(apiKey, history) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const systemInstructionText = prepareAiContext();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: history,
      tools: [
        {
          googleSearch: {} // Ativa o Google Search Grounding em tempo real!
        }
      ]
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Erro do Gemini (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Nenhuma resposta retornada do modelo.');
  }

  return text;
}

/* ── PARSERS DE TEXTO E FORMATADORES ────────── */

/**
 * Parser simples de Markdown para HTML
 */
function parseMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Escapa tags HTML originais para evitar XSS, exceto as que vamos injetar
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Blocos de código ```
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Código inline `
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Cabeçalhos (###, ##, #)
  html = html.replace(/^###\s+(.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*?)$/gm, '<h1>$1</h1>');

  // Bold **
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Listas não-ordenadas - itens de lista (devem começar na linha com "- ")
  html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');

  // Envelopa blocos de <li> em <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    return `<ul>${match}</ul>`;
  });
  // Limpa tags <ul> adjacentes redundantes
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Parágrafos: divide por linhas, se não for cabeçalho ou lista, envelopa em <p>
  const lines = html.split('\n');
  html = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('</ul') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre>') || trimmed.startsWith('<code>') || trimmed.startsWith('</code>')) {
      return line;
    }
    return `<p>${line}</p>`;
  }).join('\n');

  // Restaura os caracteres menores/maiores dos chips de carta
  html = html.replace(/&lt;span class="inline-card-chip"&gt;([\s\S]*?)&lt;\/span&gt;/g, '<span class="inline-card-chip">$1</span>');
  html = html.replace(/&lt;div class="mini-card([\s\S]*?)&lt;\/div&gt;/g, '<div class="mini-card$1</div>');
  html = html.replace(/&lt;img([\s\S]*?)&gt;/g, '<img$1>');

  return html;
}

/**
 * Busca por nomes de cartas Clash Royale e substitui por chips visuais com imagens reais
 */
function formatCardNamesInText(text) {
  if (!text) return '';

  let formatted = text;

  // Cria lista de mapeamento com nomes originais e traduzidos
  const cardsList = [];
  for (const [eng, pt] of Object.entries(CARD_NAMES_PTBR)) {
    cardsList.push({ eng, pt });
  }

  // Ordena por tamanho do nome em português de forma decrescente 
  // para evitar substituições parciais (ex: substituir "Gigante" dentro de "Gigante Esqueleto")
  cardsList.sort((a, b) => b.pt.length - a.pt.length);

  for (const card of cardsList) {
    // Regex case-insensitive e respeitando bordas de palavras
    const ptRegex = new RegExp(`\\b${card.pt}\\b`, 'gi');
    
    formatted = formatted.replace(ptRegex, (match) => {
      // Procura a carta na coleção do jogador para buscar imagem real (e nível)
      const foundCard = _cards.find(c => c.name === card.eng);
      
      let imgHTML = '';
      if (foundCard) {
        // Usa a imagem real do card
        imgHTML = miniCardImgHTML(foundCard, 'ai-mini');
      } else {
        // Fallback: busca apenas a URL padrão se mapeada, senão emoji
        const tempCard = { name: card.eng };
        imgHTML = miniCardImgHTML(tempCard, 'ai-mini');
      }

      // Retorna a marcação especial que será restaurada no parseMarkdown
      return `<span class="inline-card-chip">${imgHTML}<span class="inline-card-name">${match}</span></span>`;
    });
  }

  return formatted;
}
