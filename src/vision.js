import {buildWall,buildLight} from 'https://esm.sh/@owlbear-rodeo/sdk@3.1.0';
const KEY='geezvtt.io/records';
export function startVision(OBR){
  let unsubscribe=()=>{}, oldIds=[], generation=0, busy=Promise.resolve();
  const sync=(items)=>{
    const myGeneration=generation;
    busy=busy.then(async()=>{
      if(myGeneration!==generation)return;
      const dpi=await OBR.scene.grid.getDpi();
      if(myGeneration!==generation)return;
      const additions=[];
      for(const anchor of items){
        const records=anchor.metadata?.[KEY];
        if(!Array.isArray(records))continue;
        for(const record of records){
          if(record.kind==='light'){
            const pos=record.position;
            if(!pos)continue;
            additions.push(buildLight().position({x:pos.x*dpi,y:pos.y*dpi})
              .attenuationRadius(record.range*dpi).sourceRadius(Math.max(1,dpi*0.04))
              .falloff(0.25).build());
          }else if(record.kind==='wall'||record.kind==='door'){
            if(!Array.isArray(record.points)||record.points.length<2)continue;
            additions.push(buildWall().points(record.points.map(p=>({x:p.x*dpi,y:p.y*dpi})))
              .doubleSided(true).blocking(true).build());
          }
        }
      }
      if(oldIds.length)await OBR.scene.local.deleteItems(oldIds);
      oldIds=[];
      // Batch calls to avoid huge payloads on complex Dungeondraft maps.
      for(let i=0;i<additions.length;i+=100){
        const chunk=additions.slice(i,i+100);
        await OBR.scene.local.addItems(chunk);
        oldIds.push(...chunk.map(item=>item.id));
      }
    }).catch(e=>console.error('[GeezVTT] Vision sync failed',e));
  };
  const activate=async(ready)=>{
    ++generation;
    unsubscribe(); unsubscribe=()=>{};
    // Local items belong to a scene, and Owlbear clears them when scenes change.
    oldIds=[];
    if(!ready)return;
    const current=await OBR.scene.items.getItems();
    sync(current);
    unsubscribe=OBR.scene.items.onChange(sync);
  };
  OBR.scene.isReady().then(activate);
  OBR.scene.onReadyChange(activate);
}
