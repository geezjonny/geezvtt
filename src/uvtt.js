// Universal VTT coordinates are in grid cells. Map origin is the grid offset.
const pt=(p)=>p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y)?{x:+p.x,y:+p.y}:null;
const list=(a)=>Array.isArray(a)?a:[];
const paths=(a)=>list(a).map(path=>list(path).map(pt).filter(Boolean)).filter(path=>path.length>=2);
function imageDataUrl(raw){
  if(typeof raw!=='string'||!raw.trim())throw Error('Missing embedded base64 image');
  const s=raw.replace(/\s/g,'');
  if(s.startsWith('data:image/'))return s;
  const mime=s.startsWith('/9j/')?'image/jpeg':s.startsWith('UklGR')?'image/webp':'image/png';
  return `data:${mime};base64,${s}`;
}
export function convert(data){
  const res=data.resolution||{}; const dpi=+res.pixels_per_grid;
  const size=pt(res.map_size), origin=pt(res.map_origin)||{x:0,y:0};
  if(!Number.isFinite(dpi)||dpi<=0||!size||size.x<=0||size.y<=0)throw Error('Missing valid resolution/map_size/pixels_per_grid');
  const doors=list(data.portals).map(p=>({points:list(p.bounds).map(pt).filter(Boolean),closed:p.closed!==false})).filter(p=>p.points.length>=2);
  const lights=list(data.lights).map(l=>({position:pt(l.position),range:+l.range, intensity:+l.intensity,color:l.color})).filter(l=>l.position&&Number.isFinite(l.range)&&l.range>0);
  return {image:imageDataUrl(data.image),width:Math.round(size.x*dpi),height:Math.round(size.y*dpi),dpi,origin,
    walls:paths(data.line_of_sight),objects:paths(data.objects_line_of_sight),doors,lights};
}
export function importRecords(map, selected){
  const records=[];
  const local=(p)=>({x:p.x-map.origin.x,y:p.y-map.origin.y});
  function addWalls(paths,kind){for(const path of paths){records.push({kind,points:path.map(local)});}}
  if(selected.walls)addWalls(map.walls,'wall');
  if(selected.objects)addWalls(map.objects,'wall');
  if(selected.doors)addWalls(map.doors.filter(d=>d.closed).map(d=>d.points),'door');
  if(selected.lights)for(const l of map.lights)records.push({kind:'light',position:local(l.position),range:l.range,intensity:Number.isFinite(l.intensity)?l.intensity:1});
  return records;
}
