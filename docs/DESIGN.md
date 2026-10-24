# FlowState: the incident desk
The interface takes its structure from an incident ledger: identifiable records, source references, timestamps, competing explanations and recorded decisions. Visual identity comes from the investigation workflow.

## Visual system
- Warm paper canvas, charcoal workspace rail, ink text, rust for actions and record identifiers; muted forest for source relationships.
- Self-hosted IBM Plex Sans for controls and reading; Georgia for editorial section headings; monospace for IDs and timestamps. No external font requests.
- Square or 2px corners, ruled sections, a semantic count strip and record registers. No gradients, halos, decorative stars, glass effects or background dot grids.
- Controls use restrained feedback and visible focus. No scroll animation. A loading spinner appears only during work and respects reduced-motion preference.

## Product structure
Overview presents real application counts, an investigation intake, an API-backed knowledge register and an incident register. Knowledge, connector and action screens use lists rather than repeated cards. The investigation retains its source/findings/decision columns and stacks on narrow screens. The access screen pairs the actual fictional Northstar case index with a straightforward password form.

The evidence graph groups source records, service membership and hypotheses. Solid links convey support or service relationships; dashed rust links mark contradictions. Selecting a node exposes its source or a clear description of the derived record. No decorative background is rendered.

The redesign changes presentation and reading order. It preserves the investigation engine, evidence citations, API contracts, approvals, unsent drafts, downloaded reports and free-hosting disclosure.

## Validation
See VERIFICATION.md for observed automated and full-browser checks. The free deployment still sleeps and uses temporary history. Design does not imply a production service-level guarantee.
