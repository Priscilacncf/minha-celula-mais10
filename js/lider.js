// =============================================
// MINHA CÉLULA E +10 · RL CABO FRIO · 2026
// js/lider.js
// =============================================

let celulaLogada = null;

window.addEventListener('load', () => {
  carregarCelulasLogin();
  definirDataHoje();
});

function definirDataHoje() {
  const hoje = new Date().toISOString().split('T')[0];
  ['visitanteData', 'presencaData'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hoje;
  });
}

// ── Carrega células no select do login
async function carregarCelulasLogin() {
  const select = document.getElementById('loginCelula');
  select.innerHTML = '<option value="">-- Carregando... --</option>';

  try {
    const { data: celulas, error } = await db
      .from('celulas')
      .select('id, nome')
      .order('nome');

    if (error) throw error;

    if (!celulas || celulas.length === 0) {
      select.innerHTML = '<option value="">-- Nenhuma célula cadastrada --</option>';
      return;
    }

    select.innerHTML = '<option value="">-- Selecione sua célula --</option>';
    celulas.forEach(c => {
      const opt       = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = c.nome;
      select.appendChild(opt);
    });

    console.log(`✅ ${celulas.length} célula(s) carregada(s)!`);

  } catch (err) {
    console.error('❌ Erro ao carregar células:', err.message);
    select.innerHTML = '<option value="">-- Erro ao carregar --</option>';
  }
}

// ══════════════════════════════════════════════
// LOGIN / LOGOUT
// ══════════════════════════════════════════════

async function fazerLogin() {
  const celulaId = document.getElementById('loginCelula').value;
  const senha    = document.getElementById('loginSenha').value.trim();
  const erroEl   = document.getElementById('loginErro');

  erroEl.style.display = 'none';

  if (!celulaId || !senha) {
    erroEl.textContent   = '❌ Selecione a célula e digite a senha.';
    erroEl.style.display = 'block';
    return;
  }

  try {
    const { data: celula, error } = await db
      .from('celulas')
      .select('id, nome, lider_nome, senha_lider')
      .eq('id', celulaId)
      .single();

    if (error) throw error;

    if (!celula || celula.senha_lider !== senha) {
      erroEl.textContent   = '❌ Célula ou senha incorretos. Tente novamente.';
      erroEl.style.display = 'block';
      return;
    }

    celulaLogada = celula;

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('painelLider').style.display  = 'block';
    document.getElementById('btnLogout').style.display    = 'inline-block';

    document.getElementById('painelHeader').innerHTML = `
      <div>
        <h2>⚽ ${celula.nome}</h2>
        <p>Bem-vindo, técnico <strong>${celula.lider_nome}</strong>!
           · Minha Célula e +10 · RL Cabo Frio</p>
      </div>
      <span style="color:var(--amarelo);font-size:0.85rem">🏆 Vamos a campo!</span>
    `;

    await Promise.all([
      carregarMembrosSelect(),
      carregarVisitantesLista(),
      carregarVisitantesSelect(),
      carregarHistoricoPresencas(),
      carregarListaMembros(),
      carregarCapitaoAtual()
    ]);

  } catch (err) {
    console.error('❌ Erro no login:', err.message);
    erroEl.textContent   = '❌ Erro ao fazer login. Tente novamente.';
    erroEl.style.display = 'block';
  }
}

function logout() {
  celulaLogada = null;
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('painelLider').style.display  = 'none';
  document.getElementById('btnLogout').style.display    = 'none';
  document.getElementById('loginSenha').value           = '';
}

// ══════════════════════════════════════════════
// NAVEGAÇÃO — ABAS
// ══════════════════════════════════════════════

function abrirAba(aba) {
  document.querySelectorAll('.aba-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

  const mapaAbas = {
    visitantes: 'abaVisitantes',
    presencas:  'abaPresencas',
    membros:    'abaMembros',
    capitao:    'abaCapitao'
  };
  const idx = { visitantes: 0, presencas: 1, membros: 2, capitao: 3 };

  document.getElementById(mapaAbas[aba]).style.display = 'block';
  document.querySelectorAll('.tab')[idx[aba]]?.classList.add('active');
}

// ══════════════════════════════════════════════
// FOTOS — PREVIEW E UPLOAD
// ══════════════════════════════════════════════

function previewFoto(event) {
  const file    = event.target.files[0];
  const preview = document.getElementById('fotoPreview');
  if (!file) return;
  preview.src           = URL.createObjectURL(file);
  preview.style.display = 'block';
}

function previewFotoMembro(event) {
  const file    = event.target.files[0];
  const preview = document.getElementById('fotoMembroPreview');
  if (!file) return;
  preview.src           = URL.createObjectURL(file);
  preview.style.display = 'block';
}

function previewFotoCapitao(event) {
  const file    = event.target.files[0];
  const preview = document.getElementById('fotoCapitaoPreview');
  if (!file) return;
  preview.src           = URL.createObjectURL(file);
  preview.style.display = 'block';
}

async function uploadFoto(file, pasta) {
  if (!file) return null;
  const ext      = file.name.split('.').pop();
  const fileName = `${pasta}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from('fotos').upload(fileName, file);
  if (error) { console.error('❌ Erro upload:', error.message); return null; }
  const { data } = db.storage.from('fotos').getPublicUrl(fileName);
  return data.publicUrl;
}

// ══════════════════════════════════════════════
// SELECTS — MEMBROS E VISITANTES
// ══════════════════════════════════════════════

async function carregarMembrosSelect() {
  if (!celulaLogada) return;
  const { data: membros } = await db
    .from('membros')
    .select('id, nome')
    .eq('celula_id', celulaLogada.id)
    .order('nome');

  const select = document.getElementById('visitanteMembro');
  select.innerHTML = '<option value="">-- Selecione o membro --</option>';
  (membros || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.nome;
    select.appendChild(opt);
  });

  // Também atualiza o select do capitão
  const selectCap = document.getElementById('capitaoSelect');
  if (selectCap) {
    selectCap.innerHTML = '<option value="">-- Selecione o membro --</option>';
    (membros || []).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id; opt.textContent = m.nome;
      selectCap.appendChild(opt);
    });
  }
}

async function carregarVisitantesSelect() {
  if (!celulaLogada) return;
  const { data: visitantes } = await db
    .from('visitantes')
    .select('id, nome')
    .eq('celula_id', celulaLogada.id)
    .order('nome');

  const select = document.getElementById('presencaVisitante');
  select.innerHTML = '<option value="">-- Selecione o visitante --</option>';
  (visitantes || []).forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; opt.textContent = v.nome;
    select.appendChild(opt);
  });
}

// ══════════════════════════════════════════════
// VISITANTES
// ══════════════════════════════════════════════

async function registrarVisitante() {
  const nome     = document.getElementById('visitanteNome').value.trim();
  const membroId = document.getElementById('visitanteMembro').value;
  const data     = document.getElementById('visitanteData').value;
  const evento   = document.getElementById('visitanteEvento').value.trim() || 'Evento RL';
  const file     = document.getElementById('fotoInput').files[0];
  const msgEl    = document.getElementById('visitanteMensagem');

  msgEl.style.display = 'none';

  if (!nome || !membroId) {
    msgEl.textContent   = '❌ Preencha o nome e quem trouxe o visitante.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  const fotoUrl = await uploadFoto(file, 'visitantes');

  const { data: novoVisitante, error } = await db
    .from('visitantes')
    .insert({
      nome,
      foto_url:             fotoUrl,
      celula_id:            celulaLogada.id,
      membro_que_trouxe_id: membroId
    })
    .select()
    .single();

  if (error) {
    msgEl.textContent   = '❌ Erro ao registrar visitante. Tente novamente.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  // Registrar primeira presença automaticamente
  if (data && novoVisitante) {
    await db.from('presencas').insert({
      visitante_id:   novoVisitante.id,
      data_evento:    data,
      evento_nome:    evento,
      registrado_por: celulaLogada.id
    });
  }

  // Limpar formulário
  document.getElementById('visitanteNome').value       = '';
  document.getElementById('visitanteMembro').value     = '';
  document.getElementById('visitanteEvento').value     = '';
  document.getElementById('fotoInput').value           = '';
  document.getElementById('fotoPreview').style.display = 'none';

  msgEl.textContent   = `✅ ${nome} registrado! +1 vida na Copa das Vidas! ⚽`;
  msgEl.style.color   = '#4ade80';
  msgEl.style.display = 'block';
  setTimeout(() => { msgEl.style.display = 'none'; }, 3500);

  await Promise.all([carregarVisitantesLista(), carregarVisitantesSelect()]);
}

async function carregarVisitantesLista() {
  if (!celulaLogada) return;

  const { data: visitantes } = await db
    .from('visitantes')
    .select('id, nome, foto_url, membros(nome)')
    .eq('celula_id', celulaLogada.id)
    .order('criado_em', { ascending: false });

  const { data: presencas } = await db
    .from('presencas')
    .select('visitante_id');

  const presMap = {};
  (presencas || []).forEach(p => {
    presMap[p.visitante_id] = (presMap[p.visitante_id] || 0) + 1;
  });

  const lista = document.getElementById('listaVisitantes');

  if (!visitantes || visitantes.length === 0) {
    lista.innerHTML = `
      <p class="loading-text">
        Nenhum visitante registrado ainda. Traga vidas! ⚽
      </p>`;
    return;
  }

  lista.innerHTML = visitantes.map(v => {
    const qtd      = presMap[v.id] || 0;
    const noAlbum  = qtd >= 3;
    const fotoHtml = v.foto_url
      ? `<img src="${v.foto_url}" class="visitante-foto" alt="${v.nome}"/>`
      : `<div class="visitante-avatar">🌟</div>`;

    return `
      <div class="visitante-item">
        ${fotoHtml}
        <div class="visitante-info">
          <h4>${v.nome}</h4>
          <p>Trouxe: <strong>${v.membros?.nome || '—'}</strong></p>
          ${noAlbum ? '<span class="badge-album">📘 No Álbum!</span>' : ''}
        </div>
        <div class="visitante-presencas">
          <span class="presenca-count">${qtd}</span>
          <span class="presenca-label">evento${qtd !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════
// PRESENÇAS
// ══════════════════════════════════════════════

async function registrarPresenca() {
  const visitanteId = document.getElementById('presencaVisitante').value;
  const evento      = document.getElementById('presencaEvento').value.trim();
  const data        = document.getElementById('presencaData').value;
  const msgEl       = document.getElementById('presencaMensagem');

  msgEl.style.display = 'none';

  if (!visitanteId || !evento || !data) {
    msgEl.textContent   = '❌ Preencha todos os campos obrigatórios.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  const { error } = await db.from('presencas').insert({
    visitante_id:   visitanteId,
    data_evento:    data,
    evento_nome:    evento,
    registrado_por: celulaLogada.id
  });

  if (error) {
    msgEl.textContent   = '❌ Erro ao registrar presença. Tente novamente.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  const { data: todas } = await db
    .from('presencas')
    .select('id')
    .eq('visitante_id', visitanteId);

  const total = todas?.length || 0;
  let extra   = '';
  if (total === 3) extra = ' 🎉 Figurinha desbloqueada no álbum!';
  if (total > 3)  extra = ` 📘 ${total} presenças no total!`;

  document.getElementById('presencaEvento').value = '';

  msgEl.textContent   = `✅ Presença registrada!${extra}`;
  msgEl.style.color   = '#4ade80';
  msgEl.style.display = 'block';
  setTimeout(() => { msgEl.style.display = 'none'; }, 4000);

  await Promise.all([carregarHistoricoPresencas(), carregarVisitantesLista()]);
}

async function carregarHistoricoPresencas() {
  if (!celulaLogada) return;

  const { data: visitantes } = await db
    .from('visitantes')
    .select('id, nome')
    .eq('celula_id', celulaLogada.id);

  const ids   = (visitantes || []).map(v => v.id);
  const lista = document.getElementById('historicoPresencas');

  if (!ids.length) {
    lista.innerHTML = '<p class="loading-text">Nenhuma presença registrada ainda.</p>';
    return;
  }

  const { data: presencas } = await db
    .from('presencas')
    .select('visitante_id, evento_nome, data_evento')
    .in('visitante_id', ids)
    .order('criado_em', { ascending: false })
    .limit(30);

  const nomeMap = {};
  (visitantes || []).forEach(v => { nomeMap[v.id] = v.nome; });

  if (!presencas || presencas.length === 0) {
    lista.innerHTML = '<p class="loading-text">Nenhuma presença registrada ainda.</p>';
    return;
  }

  lista.innerHTML = presencas.map(p => `
    <div class="visitante-item">
      <div class="visitante-avatar">📅</div>
      <div class="visitante-info">
        <h4>${nomeMap[p.visitante_id] || 'Visitante'}</h4>
        <p>${p.evento_nome} · ${formatarData(p.data_evento)}</p>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════
// MEMBROS
// ══════════════════════════════════════════════

async function adicionarMembro() {
  const nome  = document.getElementById('membroNome').value.trim();
  const file  = document.getElementById('fotoMembroInput').files[0];
  const msgEl = document.getElementById('membroMensagem');

  msgEl.style.display = 'none';

  if (!nome) {
    msgEl.textContent   = '❌ Informe o nome do membro.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  const fotoUrl = await uploadFoto(file, 'membros');

  const { error } = await db.from('membros').insert({
    nome,
    foto_url:  fotoUrl,
    celula_id: celulaLogada.id
  });

  if (error) {
    msgEl.textContent   = '❌ Erro ao adicionar membro. Tente novamente.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  document.getElementById('membroNome').value                = '';
  document.getElementById('fotoMembroInput').value           = '';
  document.getElementById('fotoMembroPreview').style.display = 'none';

  msgEl.textContent   = `✅ ${nome} adicionado ao elenco! ⚽`;
  msgEl.style.color   = '#4ade80';
  msgEl.style.display = 'block';
  setTimeout(() => { msgEl.style.display = 'none'; }, 3000);

  await Promise.all([carregarListaMembros(), carregarMembrosSelect()]);
}

async function carregarListaMembros() {
  if (!celulaLogada) return;

  const { data: membros } = await db
    .from('membros')
    .select('id, nome, foto_url, is_capitao')
    .eq('celula_id', celulaLogada.id)
    .order('nome');

  const lista = document.getElementById('listaMembros');

  if (!membros || membros.length === 0) {
    lista.innerHTML = '<p class="loading-text">Nenhum membro cadastrado ainda. ⚽</p>';
    return;
  }

  lista.innerHTML = membros.map(m => {
    const fotoHtml = m.foto_url
      ? `<img src="${m.foto_url}" class="visitante-foto" alt="${m.nome}"/>`
      : `<div class="visitante-avatar">👤</div>`;

    return `
      <div class="visitante-item"
           style="${m.is_capitao ? 'border-color:var(--ouro)' : ''}">
        ${fotoHtml}
        <div class="visitante-info">
          <h4>
            ${m.nome}
            ${m.is_capitao ? '<span class="badge-capitao" style="margin-left:0.5rem">🅒 CAPITÃO</span>' : ''}
          </h4>
          <p>⚽ Jogador · Minha Célula e +10 · RL Cabo Frio</p>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════
// CAPITÃO DO TIME
// ══════════════════════════════════════════════

async function carregarCapitaoAtual() {
  if (!celulaLogada) return;

  const { data: celula } = await db
    .from('celulas')
    .select('capitao_id')
    .eq('id', celulaLogada.id)
    .single();

  if (!celula?.capitao_id) return;

  const { data: capitao } = await db
    .from('membros')
    .select('id, nome, foto_url')
    .eq('id', celula.capitao_id)
    .single();

  if (!capitao) return;

  const div  = document.getElementById('capitaoAtual');
  const card = document.getElementById('capitaoAtualCard');

  div.style.display = 'block';

  const fotoHtml = capitao.foto_url
    ? `<img src="${capitao.foto_url}" class="visitante-foto"
            style="border-color:var(--ouro)" alt="${capitao.nome}"/>`
    : `<div class="visitante-avatar"
            style="background:linear-gradient(135deg,#ffd700,#ff9900)">🅒</div>`;

  card.innerHTML = `
    <div class="visitante-item" style="border-color:var(--ouro)">
      ${fotoHtml}
      <div class="visitante-info">
        <h4>${capitao.nome} <span class="badge-capitao">🅒 CAPITÃO</span></h4>
        <p>Capitão do time · Minha Célula e +10</p>
      </div>
    </div>
  `;

  // Selecionar o capitão atual no select
  const selectCap = document.getElementById('capitaoSelect');
  if (selectCap) selectCap.value = capitao.id;
}

async function definirCapitao() {
  const membroId = document.getElementById('capitaoSelect').value;
  const file     = document.getElementById('fotoCapitaoInput').files[0];
  const msgEl    = document.getElementById('capitaoMensagem');

  msgEl.style.display = 'none';

  if (!membroId) {
    msgEl.textContent   = '❌ Selecione o membro que será o capitão.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
    return;
  }

  try {
    // Upload da foto especial do capitão (se houver)
    let fotoUrl = null;
    if (file) {
      fotoUrl = await uploadFoto(file, 'capitaes');
    }

    // Remover capitão anterior
    await db
      .from('membros')
      .update({ is_capitao: false })
      .eq('celula_id', celulaLogada.id);

    // Definir novo capitão
    const updateData = { is_capitao: true };
    if (fotoUrl) updateData.foto_url = fotoUrl;

    await db
      .from('membros')
      .update(updateData)
      .eq('id', membroId);

    // Atualizar referência na célula
    await db
      .from('celulas')
      .update({ capitao_id: membroId })
      .eq('id', celulaLogada.id);

    // Limpar preview
    document.getElementById('fotoCapitaoInput').value           = '';
    document.getElementById('fotoCapitaoPreview').style.display = 'none';

    msgEl.textContent   = '✅ Capitão definido com sucesso! 🅒 Figurinha especial gerada no álbum!';
    msgEl.style.color   = '#4ade80';
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 4000);

    // Recarregar dados
    await Promise.all([
      carregarCapitaoAtual(),
      carregarListaMembros()
    ]);

  } catch (err) {
    console.error('❌ Erro ao definir capitão:', err.message);
    msgEl.textContent   = '❌ Erro ao definir capitão. Tente novamente.';
    msgEl.style.color   = '#f87171';
    msgEl.style.display = 'block';
  }
}

// ══════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}