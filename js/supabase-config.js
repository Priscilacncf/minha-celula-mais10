// =============================================
// EU, MINHA CÉLULA E +10 NA COPA DAS VIDAS
// Radicais Livres Rio de Janeiro · 2026
// js/supabase-config.js
// =============================================

// ⚠️ Substitua pelas suas chaves do Supabase
// Acesse: supabase.com → Project Settings → API
const SUPABASE_URL      = "https://jilhpgkkjevyeduzdcox.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZdYsO6XByV1TglD4svFzEw_EIcNNFRr";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Teste de conexão
db.from('celulas').select('count').then(({ error }) => {
  if (error) console.error('❌ Erro de conexão Supabase:', error.message);
  else       console.log('✅ Supabase conectado — Eu, Minha Célula e +10 na Copa das Vidas!');
});