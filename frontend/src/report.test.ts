import {afterEach,expect,it,vi} from 'vitest';
import {downloadReport,serializeReport} from './report';
import {Investigation} from './types';

const investigation: Investigation = {
  id:'run-1',incident_id:'INC-1042',summary:'Scope policy remains unverified.',
  evidence:[{id:'CHG-281',kind:'change',title:'Scope policy',service:'identity',body:'Legacy token check enabled.',timestamp:'2026-10-24T09:10:00Z',status:'active'}],
  hypotheses:[{id:'H1',explanation:'Scope rejection is possible.',supporting_evidence:['CHG-281'],contradictory_evidence:[],missing_information:['Customer traces'],verification_steps:['Compare scope metadata'],confidence:'moderate'}],
  actions:[{id:'A1',title:'Review traces',evidence:['CHG-281'],status:'approved',execution_status:'not_executed'}],
  customer_update:'We are investigating.',provider:'local',
};

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()});
it('exports the actual evidence, uncertainty and recorded decision without browser credentials',()=>{
  sessionStorage.setItem('flow-token','private-api-token');
  const text=serializeReport(investigation);
  const report=JSON.parse(text);
  expect(report.investigation).toEqual(investigation);
  expect(report.root_cause_verified).toBe(false);
  expect(report.investigation.actions[0].execution_status).toBe('not_executed');
  expect(text).not.toContain('private-api-token');
  sessionStorage.removeItem('flow-token');
});
it('starts a real file download and releases the temporary Blob URL afterwards',()=>{
  vi.useFakeTimers();
  const create=vi.fn((_blob: Blob)=> 'blob:report');
  const revoke=vi.fn();
  vi.stubGlobal('URL',class extends URL {static createObjectURL=create; static revokeObjectURL=revoke;});
  let filename='';
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this: HTMLAnchorElement){filename=this.download;expect(this.href).toBe('blob:report')});
  downloadReport(investigation);
  expect(click).toHaveBeenCalledOnce();
  expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
  expect(filename).toBe('flowstate-INC-1042-run-1.json');
  expect(document.querySelector('a[download]')).toBeNull();
  expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:report');
});
