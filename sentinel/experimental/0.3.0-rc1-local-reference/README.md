# Sentinel 0.3.0-RC1 — Local Reference Candidate

This directory preserves the exact GILGAL/Sentinel-only diff validated in the LAN House Files 2.0 proving ground before upstream adaptation.

It is **not** the official Sentinel release and does not replace `sentinel/src` yet.

- GILGAL Protocol: `0.5.0`
- Official upstream Sentinel baseline: `0.2.0`
- Local candidate: `0.3.0-RC1`
- Local base SHA: `75c729d33c181114dd8104006674547c9dabee8e`
- Validated candidate SHA: `a0a6ddee5b19bd1bec8c43b6831733d579f107ba`
- Local post-promotion STABLE record SHA: `ad5d0087b0902a682c090b43ba5efa57dc8726f4`
- Promotion tag: `gilgal/promoted/2026-09-02-130259`
- Patch SHA-256: `d0bc920017f9ab37e0f6c360607097a9773fec0a95278134f33c9fd18f1f1e6c`

Validated locally before promotion: 333/333 tests PASS, 28/28 adversarial tests PASS, 4/4 regression replays PASS, typecheck PASS, build PASS, evidence integrity PASS.

The patch contains only the 15 GILGAL/Sentinel/test files changed between the base and the validated candidate; no LAN House product source files are included.

Key candidate capabilities: six-state topological context machine, tiered output, canonical evidence digest, structured artifact identity, verifier provenance, Gate provenance, trusted-policy comparison, FAST-profile rejection for promotion, and stale governance-approval detection.

Upstreaming should adapt these ideas to the official TypeScript Sentinel architecture rather than blindly applying project-specific paths or test assumptions.