export type Source={id:string;kind:string;title:string;service:string;body:string;timestamp:string;status:string};
export type Hypothesis={id:string;explanation:string;supporting_evidence:string[];contradictory_evidence:string[];missing_information:string[];verification_steps:string[];confidence:string};
export type Action={id:string;title:string;evidence:string[];status:string;execution_status:string};
export type Investigation={id:string;incident_id:string;summary:string;evidence:Source[];hypotheses:Hypothesis[];actions:Action[];customer_update:string;provider:string};
export type AuditEvent={seq:number;timestamp:string;kind:string;investigation_id:string;payload:Record<string,unknown>};
export type Connector={id:string;name:string;status:string;permissions:string[];mode:string};
