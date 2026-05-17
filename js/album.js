// =============================================
// MINHA CÉLULA EM CAMPO NA COPA · RL CABO FRIO · 2026
// js/album.js
// =============================================

window.addEventListener('load', () => {
  carregarCelulasSelect();
});

async function carregarCelulasSelect() {
  const { data: celulas } = await db
    .from('celulas')
    .select('id, nome')
    .order('nome');

  const select = document.getElementById('selectCelula');
  select.innerHTML = '<option value="">-- Escolha uma célula --</option>';

  (celulas || []).forEach(c => {
    const opt       = document.createElement('option');
    opt.value       = c.id;
    opt.textContent = c.nome;
    select.appendChild(opt);
  });
}

async function carregarAlbum() {
  const celulaId  = document.getElementById('selectCelula').value;
  const container = document.getElementById('albumContainer');

  if (!celulaId) { container.style.display = 'none'; return; }
  container.style.display = 'block';

  const { data: celula } = await db
    .from('celulas')
    .select('nome, lider_nome, capitao_id')
    .eq('id', celulaId)
    .single();

  const { data: membros } = await db
    .from('membros')
    .select('id, nome, foto_url, is_capitao')
    .eq('celula_id', celulaId)
    .order('nome');

  const { data: visitantes } = await db
    .from('visitantes')
    .select('id, nome, foto_url, membros(nome)')
    .eq('celula_id', celulaId)
    .order('criado_em');

  const { data: presencas } = await db
    .from('presencas')
    .select('visitante_id');

  // Mapa de presenças por visitante
  const presMap = {};
  (presencas || []).forEach(p => {
    presMap[p.visitante_id] = (presMap[p.visitante_id] || 0) + 1;
  });

  // Visitantes com 3+ presenças ganham figurinha
  const comFigurinhas = (visitantes || []).filter(v => (presMap[v.id] || 0) >= 3);

  renderAlbumHeader(celula);
  renderProgresso(comFigurinhas.length);
  renderCapitao(membros || [], celula?.capitao_id);
  renderMembros(membros || [], celula?.capitao_id);
  renderVisitantes(comFigurinhas, presMap);
}

// ── Header do álbum
function renderAlbumHeader(celula) {
  document.getElementById('albumHeader').innerHTML = `
    <h2>📘 ${celula?.nome || 'Minha Célula'}</h2>
    <p>Técnico: ${celula?.lider_nome || '—'} · Minha Célula em Campo da Copa · RL Cabo Frio · 2026</p>
  `;
}

// ── Barra de progresso
function renderProgresso(total) {
  const pct = Math.min((total / 10) * 100, 100);
  document.getElementById('albumProgresso').innerHTML = `
    <div class="album-progresso-label">
      <span>⚽ Progresso do Álbum — +10 na Copa das Vidas</span>
      <span style="color:var(--verde)">${total}/10 figurinhas</span>
    </div>
    <div class="album-progresso-barra">
      <div class="album-progresso-fill" style="width:${pct}%"></div>
    </div>
    <p style="margin-top:0.5rem;font-size:0.8rem;color:var(--texto-sub)">
      ${total >= 10
        ? '🏆 Álbum completo! Missão cumprida! Cada alma contou!'
        : `Faltam <strong style="color:var(--amarelo)">${10 - total}</strong>
           figurinha${10 - total > 1 ? 's' : ''} para completar o álbum!`}
    </p>
  `;
}

// ── Figurinha do Capitão
function renderCapitao(membros, capitaoId) {
  const grid    = document.getElementById('gridCapitao');
  const capitao = membros.find(m => m.id === capitaoId || m.is_capitao);

  if (!capitao) {
    grid.innerHTML = `
      <div class="figurinha-vazia">
        <span class="empty-icon">🅒</span>
        <p class="empty-txt">Capitão não<br/>definido ainda</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = `
    <div class="figurinha-capitao">
      <div class="capitao-bracadeira">C</div>
      ${capitao.foto_url
        ? `<img src="${capitao.foto_url}" class="figurinha-foto"
                style="border-color:var(--ouro);border-width:3px" alt="${capitao.nome}"/>`
        : `<div class="figurinha-avatar"
                style="border-color:var(--ouro);
                       background:linear-gradient(135deg,#ffd700,#ff9900);
                       font-size:2rem">
             🅒
           </div>`}
      <p class="figurinha-nome">${capitao.nome}</p>
      <p class="figurinha-sub">Capitão do Time</p>
      <span class="badge-capitao">🅒 CAPITÃO</span>
    </div>
  `;
}

// ── Grid de membros (excluindo o capitão)
function renderMembros(membros, capitaoId) {
  const grid       = document.getElementById('gridMembros');
  const semCapitao = membros.filter(m => m.id !== capitaoId && !m.is_capitao);

  if (!semCapitao.length) {
    grid.innerHTML = `
      <p class="loading-text">
        Nenhum membro cadastrado ainda. Adicione o elenco na área do líder!
      </p>`;
    return;
  }

  grid.innerHTML = semCapitao.map(m => `
    <div class="figurinha">
      ${m.foto_url
        ? `<img src="${m.foto_url}" class="figurinha-foto" alt="${m.nome}"/>`
        : `<div class="figurinha-avatar">👤</div>`}
      <p class="figurinha-nome">${m.nome}</p>
      <p class="figurinha-sub">Membro</p>
      <span class="figurinha-badge">⚽ Jogador</span>
    </div>
  `).join('');
}

// ── Grid dos +10 visitantes (figurinhas + espaços vazios)
function renderVisitantes(visitantes, presMap) {
  const grid = document.getElementById('gridVisitantes');
  grid.innerHTML = '';

  // Figurinhas desbloqueadas
  visitantes.forEach(v => {
    const qtd = presMap[v.id] || 0;
    grid.innerHTML += `
      <div class="figurinha">
        ${v.foto_url
          ? `<img src="${v.foto_url}" class="figurinha-foto" alt="${v.nome}"/>`
          : `<div class="figurinha-avatar">🌟</div>`}
        <p class="figurinha-nome">${v.nome}</p>
        <p class="figurinha-sub">por: ${v.membros?.nome || '—'}</p>
        <span class="figurinha-badge">✅ ${qtd} eventos</span>
      </div>
    `;
  });

  // Espaços vazios até 10
  const vazios = Math.max(0, 10 - visitantes.length);
  for (let i = 0; i < vazios; i++) {
    grid.innerHTML += `
      <div class="figurinha-vazia">
        <span class="empty-icon">⚽</span>
        <p class="empty-txt">Espaço vazio<br/>Traga uma vida!</p>
      </div>
    `;
  }
}
