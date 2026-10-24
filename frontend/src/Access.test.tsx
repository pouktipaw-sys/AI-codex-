import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import Access from './Access';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('requires the demo password and submits it without storing it',async()=>{
 const fetcher=vi.fn(async(_path:unknown,init?:RequestInit)=>({ok:true,json:async()=>init?.method==='POST'?{authenticated:true}:{required:true,authenticated:false}} as Response));
 vi.stubGlobal('fetch',fetcher);
 render(<Access/>);
 await screen.findByLabelText('Demo access password');
 fireEvent.change(screen.getByLabelText('Demo access password'),{target:{value:'interview-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Enter demo workspace'}));
 await waitFor(()=>expect(fetcher.mock.calls.some(([,init])=>init?.method==='POST')).toBe(true));
 const call=fetcher.mock.calls.find(([,init])=>init?.method==='POST')!;
 expect(JSON.parse(call[1]!.body as string)).toEqual({password:'interview-password'});
 await waitFor(()=>expect(screen.getByLabelText('Demo access password')).toHaveValue(''));
 expect(sessionStorage.getItem('interview-password')).toBeNull();
});
