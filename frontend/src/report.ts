import {Investigation} from './types';

export function serializeReport(investigation: Investigation): string {
  return JSON.stringify({
    format: 'flowstate-investigation-v1',
    exported_at: new Date().toISOString(),
    root_cause_verified: false,
    investigation,
  }, null, 2);
}

export function downloadReport(investigation: Investigation): void {
  const blob = new Blob([serializeReport(investigation)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = (investigation.incident_id+'-'+investigation.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  anchor.href = url;
  anchor.download = 'flowstate-'+safeName+'.json';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Allow the browser to start reading the Blob before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
