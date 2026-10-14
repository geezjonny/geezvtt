import OBR, { buildImageUpload, buildSceneUpload, buildCurve } from 'https://esm.sh/@owlbear-rodeo/sdk@3.1.0';

import { convert, importRecords } from './uvtt.js';

const fileInput=document.querySelector('#file'), details=document.querySelector('#details');
const status=document.querySelector('#status'), create=document.querySelector('#create');
let parsed=null, fileName='';
const say=(t)=>{status.textContent=t;};

fileInput.addEventListener('change',async()=>{
  create.disabled=true; parsed=null;
  const file=fileInput.files?.[0]; if(!file)return;
  fileName=file.name.replace(/\.(dd2vtt|df2vtt|uvtt)$/i,'');
  try {
    parsed=convert(JSON.parse(await file.text()));
    details.textContent=`${parsed.width} × ${parsed.height} px · ${parsed.dpi} px/square · ${parsed.walls.length} wall paths · ${parsed.objects.length} object paths · ${parsed.doors.length} portals · ${parsed.lights.length} lights`;
    create.disabled=!OBR.isAvailable; say(OBR.isAvailable?'Ready to import.':'Open this extension inside Owlbear Rodeo to import.');
  }catch(e){ details.textContent='Invalid map: '+e.message; say(''); }
});

create.addEventListener('click',async()=>{
  if(!parsed)return;
  create.disabled=true; say('Preparing embedded image…');
  try {
    const {image,dpi,width,height}=parsed;
    // Image data lives in the file: it is not uploaded to an external image host.
    const blob=await (await fetch(image)).blob();
    const ext=blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';
    const mapFile=new File([blob],`${fileName}.${ext}`,{type:blob.type});
    const imageUpload=buildImageUpload(mapFile).dpi(dpi).name(fileName).build();
    const selected={walls:document.querySelector('#walls').checked,objects:document.querySelector('#objects').checked,doors:document.querySelector('#doors').checked,lights:document.querySelector('#lights').checked};
    const records=importRecords(parsed,selected);
    // Metadata is attached to invisible scene items. This survives scene reopening.
    // Keep each item small enough to avoid unbounded per-item metadata.
    const items=[];
    for(let i=0;i<records.length;i+=50){
      const chunk=records.slice(i,i+50);
      const anchor=buildCurve().points([{x:0,y:0},{x:0.01,y:0.01}])
        .name('GeezVTT geometry '+(Math.floor(i/50)+1))
        .layer('DRAWING').visible(false).disableHit(true).locked(true)
        .metadata({'geezvtt.io/records':chunk,'geezvtt.io/version':1}).build();
      items.push(anchor);
    }
    say('Uploading scene and map to Owlbear…');
    const scene=buildSceneUpload().name(fileName).baseMap(imageUpload).items(items)
      .gridType('SQUARE').gridOpacity(0.18).fogFilled(true).build();
    await OBR.assets.uploadScenes([scene]);
    say(`Scene uploaded. Open “${fileName}” in Owlbear; ${records.length} geometry records included.`);
  }catch(e){ console.error(e); say('Import failed: '+(e?.message||String(e))); }
  finally{create.disabled=false;}
});

OBR.onReady(()=>{if(parsed)create.disabled=false;});
