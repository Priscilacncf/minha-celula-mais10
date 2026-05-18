// =============================================
// MINHA CÉLULA EM CAMPO NA COPA
// js/pwa.js — Gerencia PWA e Push Notifications
// =============================================

// ── Chave pública VAPID (gerada no passo 4)
const VAPID_PUBLIC_KEY = 'BCEJZWwaAhS-ipxnql9xgA3xwCaABQY7O9DesiaOavnHuGGdOQkrNDDIfPx5SngRXNyZ8lMpU7gpS5eJAt4Sz7Q';

// ── Registrar Service Worker
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker não suportado neste navegador.');
    return null;
  }

  try {
    const registro = await navigator.serviceWorker.register('/service-worker.js');
    console.log('✅ Service Worker registrado!', registro.scope);
    return registro;
  } catch (err) {
    console.error('❌ Erro ao registrar Service Worker:', err);
    return null;
  }
}

// ── Solicitar permissão de notificação
async function solicitarPermissaoNotificacao() {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notificações não suportadas.');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;

  const permissao = await Notification.requestPermission();
  return permissao === 'granted';
}

// ── Converter chave VAPID para Uint8Array
function converterChaveVapid(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  const output   = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// ── Inscrever para push notifications
async function inscreverPush(registro) {
  try {
    const subscription = await registro.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: converterChaveVapid(VAPID_PUBLIC_KEY)
    });

    // Salvar subscription no Supabase
    await salvarSubscription(subscription);
    console.log('✅ Push subscription salva!');
    return subscription;

  } catch (err) {
    console.error('❌ Erro ao inscrever push:', err);
    return null;
  }
}

// ── Salvar subscription no Supabase
async function salvarSubscription(subscription) {
  const sub = subscription.toJSON();

  await db.from('push_subscriptions').upsert({
    endpoint:   sub.endpoint,
    p256dh:     sub.keys?.p256dh,
    auth:       sub.keys?.auth,
    criado_em:  new Date().toISOString()
  }, { onConflict: 'endpoint' });
}

// ── Enviar notificação local (sem servidor)
async function notificarLocal(titulo, corpo, url = '/') {
  if (Notification.permission !== 'granted') return;

  const registro = await navigator.serviceWorker.ready;

  await registro.showNotification(titulo, {
    body:    corpo,
    icon:    '/img/icon-192.png',
    badge:   '/img/icon-192.png',
    vibrate: [200, 100, 200],
    tag:     'celula-na-copa',
    renotify: true,
    data: { url },
    actions: [
      { action: 'ver',    title: '👀 Ver agora' },
      { action: 'fechar', title: '✖️ Fechar'    }
    ]
  });

  // Atualizar badge
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1);
  }
}

// ── Limpar badge quando app é aberto
function limparBadge() {
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge();
  }
}

// ── Botão de instalar o PWA
let promptInstalacao = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  promptInstalacao = event;

  // Mostra botão de instalar se existir
  const btn = document.getElementById('btnInstalarApp');
  if (btn) btn.style.display = 'block';
});

async function instalarApp() {
  if (!promptInstalacao) return;
  promptInstalacao.prompt();
  const resultado = await promptInstalacao.userChoice;
  if (resultado.outcome === 'accepted') {
    console.log('✅ App instalado!');
    const btn = document.getElementById('btnInstalarApp');
    if (btn) btn.style.display = 'none';
  }
  promptInstalacao = null;
}

window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA instalado com sucesso!');
  promptInstalacao = null;
});

// ── Inicializar tudo
async function inicializarPWA() {
  const registro = await registrarServiceWorker();
  if (!registro) return;

  const temPermissao = await solicitarPermissaoNotificacao();
  if (!temPermissao) return;

  await inscreverPush(registro);
  limparBadge();
}

// Inicializar quando a página carregar
window.addEventListener('load', inicializarPWA);