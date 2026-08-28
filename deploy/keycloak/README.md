# Keycloak local (laptop)

Copies of the OptimizeSolux common-infra realm + login themes for autonomous `docker compose up`.

- Source of truth: `optimize-common-infra/images/keycloak/`
- After editing common-infra, re-copy `themes/biocollect/`, `themes/optimizesolux/` and realm JSON here.
- Deploy / ops: see [`docs/KEYCLOAK-THEMES.md`](../../docs/KEYCLOAK-THEMES.md)

Local Keycloak: http://localhost:8180 (admin / admin)
Realm: `biocollect` · client: `biocollect-web` · theme: `biocollect`
