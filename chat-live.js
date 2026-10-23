/* Widget externo opcional para GitHub Pages: preencha o ID público obtido no painel tawk.to.
   Sem configuração, o chat próprio mostra a indisponibilidade do servidor em hospedagem estática. */
window.MU_CHAT_PROVIDER = {
  tawkPropertyId: '', // exemplo: ID público da propriedade, NUNCA senhas/chaves privadas
  tawkWidgetId: ''    // geralmente 1xxxxxxx, obtido no script oficial do tawk.to
};
(function(){
  const cfg=window.MU_CHAT_PROVIDER;
  if(!/^[A-Za-z0-9_-]{8,60}$/.test(cfg.tawkPropertyId)||!/^[A-Za-z0-9_-]{4,60}$/.test(cfg.tawkWidgetId))return;
  const script=document.createElement('script');
  script.async=true;
  script.src='https://embed.tawk.to/'+cfg.tawkPropertyId+'/'+cfg.tawkWidgetId;
  script.referrerPolicy='origin';
  document.head.appendChild(script);
  document.addEventListener('DOMContentLoaded',()=>{
    const b=document.getElementById('chat-launch');if(b)b.hidden=true;
  });
})();