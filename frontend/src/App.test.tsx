import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import App,{ActionCard} from './App';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
describe('Safe actions',()=>{
 it('requires a decision callback and never offers execution',()=>{
 const fn=vi.fn();render(<ActionCard action={{id:'A1',title:'Review evidence',evidence:['KB-17'],status:'pending',execution_status:'not_executed'}} onDecision={fn}/>);
 fireEvent.click(screen.getByText('Approve'));expect(fn).toHaveBeenCalledWith('approved');
 expect(screen.getByText(/Approval records intent only/)).toBeInTheDocument();
 });
 it('hides decision controls after approval',()=>{
 render(<ActionCard action={{id:'A1',title:'Review evidence',evidence:[],status:'approved',execution_status:'not_executed'}} onDecision={()=>{}}/>);
 expect(screen.queryByRole('button',{name:'Approve'})).not.toBeInTheDocument();
 });
});
it('loads actual metrics, investigates, and records an approval reason',async()=>{
 const source={id:'INC-1042',title:'Northstar auth failure',kind:'incident',service:'identity',body:'403 scope errors',timestamp:'2026-10-24T09:18:00Z',status:'investigating'};
 const run={id:'run-1',incident_id:'INC-1042',evidence:[source],summary:'Unverified',provider:'local',hypotheses:[],actions:[{id:'A1',title:'Review traces',evidence:['INC-1042'],status:'pending',execution_status:'not_executed'}],customer_update:'Investigating. Cause unconfirmed.'};
 const mock=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=String(input);
 let result:unknown=[];
 if(url.endsWith('/overview'))result={active_incidents:3,investigations:0,pending_approvals:0,sources:1};
 else if(url.endsWith('/settings'))result={provider:'local'};
 else if(url.endsWith('/incidents'))result=[source];
 else if(url.endsWith('/investigations')&&init?.method==='POST')result=run;
 else if(url.endsWith('/investigations/run-1'))result=run;
 else if(url.includes('/decision'))result=run.actions[0];
 return {ok:true,json:async()=>result} as Response;
 });
 vi.stubGlobal('fetch',mock);
 render(<App/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:/Investigate Northstar/})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:/Investigate Northstar/}));
 await screen.findByText('FlowState investigator');
 fireEvent.click(screen.getByRole('button',{name:'Approve'}));
 expect(screen.getByRole('button',{name:'Record decision'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Decision reason'),{target:{value:'Verified the cited evidence'}});
 fireEvent.click(screen.getByRole('button',{name:'Record decision'}));
 await screen.findByText('Decision recorded. No external action executed.');
 const call=mock.mock.calls.find(([url])=>String(url).includes('/decision'));
 expect(JSON.parse(call![1]!.body as string)).toEqual({decision:'approved',reason:'Verified the cited evidence'});
});
it('discloses free hosting sleep and temporary history without promising persistence',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL)=>{
   const url=String(input);
   const data=url.endsWith('/settings')?{provider:'local',free_hosting:true,storage_mode:'ephemeral'}:url.endsWith('/overview')?{}:[];
   return {ok:true,json:async()=>data} as Response;
 }));
 render(<App/>);
 expect(await screen.findByRole('note')).toHaveTextContent('The service can sleep when idle');
 expect(screen.getByRole('note')).toHaveTextContent('Investigation history may reset');
 fireEvent.click(screen.getByRole('button',{name:'Settings'}));
 expect(screen.getByText(/This free demo uses temporary server storage/)).toBeInTheDocument();
 expect(screen.queryByText(/history persist across restarts/)).not.toBeInTheDocument();
});
