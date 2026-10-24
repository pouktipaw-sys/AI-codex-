import {useEffect, useState} from 'react';
import {ReactFlow, Controls, MarkerType, Node, Edge} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {api} from './api';
import {Source} from './types';

type GraphRecord = {id: string; type: string; label: string; source?: Source};
type GraphData = {
  nodes: GraphRecord[];
  edges: {id: string; source: string; target: string; label: string}[];
};

const ink = '#29332c';
const forest = '#4a6250';
const rust = '#984831';

export function EvidenceGraph({id}: {id: string}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<GraphRecord>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setSelected(undefined);
    setError('');
    setNodes([]);
    setEdges([]);
    api<GraphData>('/investigations/'+id+'/graph').then(graph => {
      if (!active) return;
      const sourceCount = graph.nodes.filter(node => node.source).length;
      let sourceRow = 0;
      let hypothesisRow = 0;
      let serviceRow = 0;
      setNodes(graph.nodes.map(record => {
        const isHypothesis = record.type === 'hypothesis';
        const isService = record.type === 'service';
        const position = isHypothesis
          ? {x: 620, y: hypothesisRow++ * 180}
          : isService
            ? {x: 310, y: Math.max(0, (sourceCount-1)*56) + serviceRow++ * 120}
            : {x: 0, y: sourceRow++ * 112};
        return {
          id: record.id,
          position,
          data: {label: <><span className="graph-node-id">{record.id} / {record.type}</span><span className="graph-node-title">{record.label}</span></>, record},
          style: {
            background: isHypothesis ? '#ede8db' : isService ? '#e0e7de' : '#faf9f3',
            color: ink,
            border: '1px solid '+(isHypothesis ? '#87734f' : '#9aab9c'),
            width: 230,
            borderRadius: 2,
            fontSize: 11,
            textAlign: 'left',
            boxShadow: 'none',
            padding: 12,
          },
        };
      }));
      setEdges(graph.edges.map(edge => ({
        ...edge,
        animated: false,
        style: {stroke: edge.label === 'contradicts' ? rust : forest, strokeDasharray: edge.label === 'contradicts' ? '5 4' : undefined},
        labelStyle: {fill: edge.label === 'contradicts' ? rust : ink, fontSize: 10},
        labelBgStyle: {fill: '#f2f1ea'},
        labelBgBorderRadius: 0,
        markerEnd: {type: MarkerType.ArrowClosed, color: edge.label === 'contradicts' ? rust : forest},
      })));
    }).catch(error => {if (active) setError(error.message)});
    return () => {active = false};
  }, [id]);

  return <section className="evidence-map" aria-label="Evidence relationships">
    <div className="graph-intro"><p>Select a record to read its source. Connections show service membership and the citations used by each hypothesis.</p><span className="eyebrow">SOURCE / RELATIONSHIP / HYPOTHESIS</span></div>
    <p className="graph-legend">Solid line: supports or describes. Dashed rust line: contradicts.</p>
    {error && <p role="alert">{error}</p>}
    <div className="graph-surface" style={{height: 460, background: '#f2f1ea'}}>
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, node) => setSelected(node.data.record as GraphRecord)} fitView fitViewOptions={{padding: 0.16}} colorMode="light" nodesDraggable={false}>
        <Controls showInteractive={false}/>
      </ReactFlow>
    </div>
    {selected ? <article className="graph-inspector">
      <span className="eyebrow">{selected.type} / {selected.id}</span><h3>{selected.label}</h3>
      <p>{selected.source?.body || (selected.type === 'hypothesis' ? 'This working explanation comes from the investigation. Inspect its cited source records and verification steps before drawing a conclusion.' : 'This service groups the source records that describe or affect it. Select a connected source record for the underlying evidence.')}</p>
      {selected.source && <small>Local fictional record / {selected.source.timestamp}</small>}
    </article> : <p className="graph-empty">No record selected. Choose a node to inspect its provenance.</p>}
  </section>;
}
