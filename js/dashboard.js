// =============================================
// MINHA CÉLULA E +10 · RL CABO FRIO · 2026
// js/dashboard.js
// =============================================

let periodoAtual       = 'semana';
let periodoAtualCelula = 'semana';
let dataInicioCustom   = null;
let dataFimCustom      = null;

window.addEventListener('load', () => {
  carregarDashboard();
  definirDatasPadrao();
});

function definirDatasPadrao() {
  const hoje = new Date().toISOString().split('T')[0];
  const ini  = document.getElementById('dataInicio');
  const fim  = document.getElementById('dataFim');
  if (ini) ini.value = hoje;
  if (fim) fim.value = hoje;
}

async function carregarDashboard() {
  try {
    await Promise.all([
      carregarEstatisticasGerais(),
      carregarArtilheiroGeral(),
      carregarRankingCelulas(),
      carregarArtilheirosPorCelula()
    ]);
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

// ── Calcula período
function calcularPeriodo(periodo, customInicio = null, customFim = null) {
  const hoje = new Date();
  let inicio, fim;

  fim = new Date(hoje);
  fim.setHours(23, 59, 59, 999);

  if (periodo === 'custom' && customInicio && customFim) {
    return {
      inicio: new Date(customInicio + 'T00:00:00').toISOString(),
      fim:    new Date(customFim   + 'T23:59:59').toISOString()
    };
  }

  if (periodo === 'semana') {
    const dia  = hoje.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() + diff);
    inicio.setHours(0, 0, 0, 0);

  } else if (periodo === '2semanas') {
    inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 13);
    inicio.setHours(0, 0, 0, 0);

  } else if (periodo === 'mes') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicio.setHours(0, 0, 0, 0);

  } else {
    return { inicio: null, fim: null };
  }

  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

// ── Label amigável
function labelPeriodo(periodo, customInicio = null, customFim = null) {
  if (periodo === 'custom' && customInicio && customFim) {
    return `📅 Exibindo: ${formatarData(customInicio)} até ${formatarData(customFim)}`;
  }
  const labels = {
    semana:    '📅 Exibindo: Esta Semana',
    '2semanas':'📅 Exibindo: Últimas 2 Semanas',
    mes:       '📅 Exibindo: Este Mês',
    total:     '📅 Exibindo: Total Geral'
  };
  return labels[periodo] || '';
}

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ── Filtros artilheiro geral
function filtrarPeriodo(periodo, btn) {
  periodoAtual = periodo;
  btn.closest('.filtro-periodo')
     .querySelectorAll('.filtro-btn')
     .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('periodoLabel').textContent = labelPeriodo(periodo);
  carregarArtilheiroGeral();
}

// ── Filtros artilheiro por célula
function filtrarPeriodoCelula(periodo, btn) {
  periodoAtualCelula = periodo;
  btn.closest('.filtro-periodo')
     .querySelectorAll('.filtro-btn')
     .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const customDiv = document.getElementById('filtroDataCustom');
  if (periodo === 'custom') {
    customDiv.style.display = 'flex';
  } else {
    customDiv.style.display = 'none';
    document.getElementById('periodoLabelCelula').textContent = labelPeriodo(periodo);
    carregarArtilheirosPorCelula();
  }
}

// ── Aplicar filtro de data personalizada
function aplicarFiltroData() {
  dataInicioCustom = document.getElementById('dataInicio').value;
  dataFimCustom    = document.getElementById('dataFim').value;

  if (!dataInicioCustom || !dataFimCustom) return;

  document.getElementById('periodoLabelCelula').textContent =
    labelPeriodo('custom', dataInicioCustom, dataFimCustom);

  carregarArtilheirosPorCelula();
}

// ── 1. Estatísticas gerais
async function carregarEstatisticasGerais() {
  const { data: celulas }    = await db.from('celulas').select('id');
  const { data: visitantes } = await db.from('visitantes').select('id');
  const { data: presencas }  = await db.from('presencas').select('visitante_id');

  const contagem = {};
  (presencas || []).forEach(p => {
    contagem[p.visitante_id] = (contagem[p.visitante_id] || 0) + 1;
  });
  const figurinhas = Object.values(contagem).filter(c => c >= 3).length;

  document.getElementById('totalCelulas').textContent    = celulas?.length    || 0;
  document.getElementById('totalVidas').textContent      = visitantes?.length  || 0;
  document.getElementById('totalFigurinhas').textContent = figurinhas;
}

// ── 2. Artilheiro geral
async function carregarArtilheiroGeral() {
  const el = document.getElementById('artilheiroGeral');
  el.classList.add('loading');
  el.innerHTML = '<p>Carregando...</p>';

  const { inicio, fim } = calcularPeriodo(periodoAtual);

  let query = db.from('visitantes').select('membro_que_trouxe_id');
  if (inicio && fim) query = query.gte('criado_em', inicio).lte('criado_em', fim);

  const { data: visitantesPeriodo } = await query;

  if (!visitantesPeriodo || visitantesPeriodo.length === 0) {
    el.classList.remove('loading');
    el.innerHTML = `
      <div style="text-align:center;padding:1rem;width:100%">
        <p style="font-size:2rem">⚽</p>
        <p style="color:var(--texto-sub);margin-top:0.5rem">
          Nenhum visitante registrado neste período.<br/>
          <strong style="color:var(--verde)">Vamos a campo!</strong>
        </p>
      </div>`;
    return;
  }

  const contagem = {};
  visitantesPeriodo.forEach(v => {
    if (v.membro_que_trouxe_id)
      contagem[v.membro_que_trouxe_id] = (contagem[v.membro_que_trouxe_id] || 0) + 1;
  });

  if (!Object.keys(contagem).length) {
    el.classList.remove('loading');
    el.innerHTML = '<p style="color:var(--texto-sub)">Nenhum dado disponível.</p>';
    return;
  }

  const top3 = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const membrosIds = top3.map(([id]) => id);

  const { data: membros } = await db
    .from('membros')
    .select('id, nome, foto_url, celulas(nome)')
    .in('id', membrosIds);

  const membroMap = {};
  (membros || []).forEach(m => { membroMap[m.id] = m; });

  const posIcons   = ['🥇', '🥈', '🥉'];
  const posBorders = ['var(--ouro)', 'var(--prata)', 'var(--bronze)'];

  el.classList.remove('loading');
  el.style.flexDirection = 'column';
  el.style.gap           = '1rem';
  el.style.border        = '2px solid var(--ouro)';

  el.innerHTML = top3.map(([membroId, gols], i) => {
    const membro   = membroMap[membroId];
    const fotoHtml = membro?.foto_url
      ? `<img src="${membro.foto_url}" class="artilheiro-foto"
              style="border-color:${posBorders[i]};width:60px;height:60px" alt="${membro?.nome}"/>`
      : `<div class="artilheiro-avatar"
              style="border-color:${posBorders[i]};width:60px;height:60px;font-size:1.5rem">⚽</div>`;

    return `
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;
                  padding:0.75rem;border-radius:10px;
                  background:rgba(255,255,255,0.03);
                  border:1px solid ${posBorders[i]}">
        <span style="font-size:1.5rem;flex-shrink:0">${posIcons[i]}</span>
        ${fotoHtml}
        <div class="artilheiro-info" style="flex:1;min-width:120px">
          <h3 style="color:${posBorders[i]};font-size:1.05rem">${membro?.nome || 'Membro'}</h3>
          <p style="font-size:0.8rem">${membro?.celulas?.nome || 'Célula'}</p>
        </div>
        <div class="artilheiro-gols">
          <span class="num" style="font-size:2rem">${gols}</span>
          <span class="lab">visitante${gols > 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── 3. Ranking de células
async function carregarRankingCelulas() {
  const { data: celulas }    = await db.from('celulas').select('id, nome, lider_nome');
  const { data: visitantes } = await db.from('visitantes').select('celula_id, id');
  const { data: presencas }  = await db.from('presencas').select('visitante_id');

  const presMap = {};
  (presencas || []).forEach(p => {
    presMap[p.visitante_id] = (presMap[p.visitante_id] || 0) + 1;
  });

  const ranking = (celulas || []).map(c => {
    const vis  = (visitantes || []).filter(v => v.celula_id === c.id);
    const figs = vis.filter(v => (presMap[v.id] || 0) >= 3).length;
    return { ...c, totalVisitantes: vis.length, figurinhas: figs };
  }).sort((a, b) => b.figurinhas - a.figurinhas || b.totalVisitantes - a.totalVisitantes);

  const el = document.getElementById('rankingCelulas');
  if (!ranking.length) {
    el.innerHTML = '<p class="loading-text">Nenhuma célula cadastrada ainda.</p>';
    return;
  }

  const posEmoji = ['🥇', '🥈', '🥉'];
  el.innerHTML = `
    <table class="ranking-table">
      <thead>
        <tr>
          <th>#</th><th>Célula</th><th>Líder</th>
          <th>Visitantes</th><th>Figurinhas</th><th>Progresso</th>
        </tr>
      </thead>
      <tbody>
        ${ranking.map((c, i) => {
          const pct      = Math.min((c.figurinhas / 10) * 100, 100);
          const posClass = i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : 'pos-n';
          const label    = posEmoji[i] || (i + 1);
          return `
            <tr>
              <td><span class="pos-badge ${posClass}">${label}</span></td>
              <td><strong>${c.nome}</strong></td>
              <td>${c.lider_nome}</td>
              <td style="color:var(--amarelo);font-weight:700">${c.totalVisitantes}</td>
              <td style="color:var(--verde);font-weight:700">${c.figurinhas}/10</td>
              <td>
                <div class="progresso-barra-wrapper">
                  <div class="progresso-barra" style="min-width:80px">
                    <div class="progresso-fill" style="width:${pct}%"></div>
                  </div>
                  <span style="font-size:0.8rem;color:var(--texto-sub)">${Math.round(pct)}%</span>
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ── 4. Artilheiro por célula
async function carregarArtilheirosPorCelula() {
  const el = document.getElementById('artilheirosCelulas');
  el.innerHTML = '<p class="loading-text">Carregando...</p>';

  const { inicio, fim } = calcularPeriodo(
    periodoAtualCelula,
    dataInicioCustom,
    dataFimCustom
  );

  const { data: celulas } = await db.from('celulas').select('id, nome');

  let query = db.from('visitantes').select('membro_que_trouxe_id, celula_id');
  if (inicio && fim) query = query.gte('criado_em', inicio).lte('criado_em', fim);

  const { data: visitantesPeriodo } = await query;

  el.innerHTML = '';

  if (!celulas || celulas.length === 0) {
    el.innerHTML = '<p class="loading-text">Nenhuma célula cadastrada ainda.</p>';
    return;
  }

  for (const celula of celulas) {
    const vCelula = (visitantesPeriodo || []).filter(v => v.celula_id === celula.id);
    const card    = document.createElement('div');
    card.className = 'artilheiro-celula-card';

    if (!vCelula.length) {
      card.innerHTML = `
        <h4>⚽ ${celula.nome}</h4>
        <p class="artilheiro-celula-nome" style="color:var(--texto-sub)">Nenhum visitante neste período</p>
        <p class="artilheiro-celula-gols">Vamos a campo! 💪</p>
      `;
      el.appendChild(card);
      continue;
    }

    const contagem = {};
    vCelula.forEach(v => {
      if (v.membro_que_trouxe_id)
        contagem[v.membro_que_trouxe_id] = (contagem[v.membro_que_trouxe_id] || 0) + 1;
    });

    if (!Object.keys(contagem).length) {
      card.innerHTML = `<h4>⚽ ${celula.nome}</h4><p style="color:var(--texto-sub)">Sem dados</p>`;
      el.appendChild(card);
      continue;
    }

    const [membroId, gols] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];

    const { data: membro } = await db
      .from('membros').select('nome, foto_url')
      .eq('id', membroId).single();

    const fotoHtml = membro?.foto_url
      ? `<img src="${membro.foto_url}" class="visitante-foto"
              style="width:44px;height:44px;margin-bottom:0.5rem" alt="${membro?.nome}"/>`
      : `<div class="visitante-avatar"
              style="width:44px;height:44px;font-size:1rem;margin-bottom:0.5rem">⚽</div>`;

    card.innerHTML = `
      <h4>⚽ ${celula.nome}</h4>
      ${fotoHtml}
      <p class="artilheiro-celula-nome">🏅 ${membro?.nome || 'Membro'}</p>
      <p class="artilheiro-celula-gols">${gols} visitante${gols > 1 ? 's' : ''} no período</p>
    `;
    el.appendChild(card);
  }
}