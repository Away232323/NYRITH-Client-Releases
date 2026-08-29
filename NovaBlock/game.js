(()=>{'use strict';
const css=document.createElement('link');css.rel='stylesheet';css.href='./feel-v6.css?v=6';document.head.appendChild(css);
const files=['./v6-core.js?v=6','./v6-game.js?v=6','./v6-ui.js?v=6'];
function load(i){if(i>=files.length){window.NB?.init?.();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});return}const s=document.createElement('script');s.src=files[i];s.onload=()=>load(i+1);s.onerror=()=>{const t=document.getElementById('toast');if(t){t.textContent='Update konnte nicht geladen werden';t.classList.add('show')}};document.body.appendChild(s)}
load(0);
})();