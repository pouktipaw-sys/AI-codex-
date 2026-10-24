import {useEffect,useState} from 'react';
import {ReactFlow,Background,Controls,MarkerType,Node,Edge} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {api} from './api';
import {Source} from './types';
type GraphData={nodes:{id:string;type:string;label:string;source?:Source}[];edges:{id:string;source:string;target:string;label:string}[]};
export function EvidenceGraph({id}:{id:string}){
 const [nodes,setNodes]=useState<Node[]>([]),[edges,setEdges]=useState<Edge[]>([]),[selected,setSelected]=useState<GraphData['nodes'][number]>(),[error,setError]=useState('');
 useEffect(()=>{api<GraphData>('/investigations/'+id+'/graph').then(g=>{
 setNodes(g.nodes.map((n,i)=>({id:n.id,position:{x:(i%3)*260,y:Math.floor(i/3)*140},data:{label:n.id+' · '+n.label.slice(0,65),record:n},style:{background:n.type==='hypothesis'?'#32274b':'#182333',color:'#e6eaf6',border:'1px solid #536188',width:215,borderRadius:10,fontSize:11}})));
 setEdges(g.edges.map(e=>({...e,animated:false,style:{stroke:e.label==='contradicts'?'#f29487':'#697eaa'},labelStyle:{fill:'#b9c5dd',fontSize:10},markerEnd:{type:MarkerType.ArrowClosed}})));
 }).catch(e=>setError(e.message))},[id]);
 return <><p className="muted">Select a node to inspect its source. Edges reflect service membership or cited support and contradictions.</p>{error&&<p role="alert">{error}</p>}<div style={{height:430}}><ReactFlow nodes={nodes} edges={edges} onNodeClick={(_,n)=>setSelected(n.data.record as GraphData['nodes'][number])} fitView colorMode="dark"><Background/><Controls/></ReactFlow></div>{selected&&<article><span className="eyebrow">{selected.type} · {selected.id}</span><h3>{selected.label}</h3><p>{selected.source?.body||'Derived from the investigation records.'}</p></article>}</>;
}
