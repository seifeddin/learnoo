(async () => {
 const source=document.querySelector('#source'), status=document.querySelector('#lab-status'), preview=document.querySelector('#preview');
 const report=(text,error=false)=>{status.textContent=text;status.className=error?'error':'';};
 try { const response=await fetch('/fixture'); if(!response.ok)throw new Error(); source.value=JSON.stringify(await response.json(),null,2); } catch {report('Impossible de charger le document. Rechargez la page.',true);}
 preview.addEventListener('click',async()=>{
  preview.disabled=true;
  try {const response=await fetch('/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:source.value});const html=await response.text();if(!response.ok){report(html,true);return;}document.querySelector('#preview-frame').srcdoc=html;report('Aperçu généré par le même renderer que la leçon.');}
  catch {report('Le serveur ne répond pas. Le dernier aperçu est conservé.',true);}
  finally {preview.disabled=false;}
 });
 document.querySelector('#save').addEventListener('click',()=>{try{JSON.parse(source.value);localStorage.setItem('learnoo-unreviewed-fixture',source.value);report('Document enregistré localement. Il n’est pas publié.');}catch{report('Sauvegarde impossible : vérifiez le JSON et le stockage du navigateur.',true);}});
 document.querySelector('#restore').addEventListener('click',()=>{try{const saved=localStorage.getItem('learnoo-unreviewed-fixture');if(saved===null){report('Aucune sauvegarde locale.');return;}source.value=saved;report('Sauvegarde rechargée. Prévisualisez pour valider le document.');}catch{report('Stockage local indisponible.',true);}});
})();
