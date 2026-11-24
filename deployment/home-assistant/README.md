# Home-Assistant-App (früher „Add-on“)

Hier entsteht in Phase 5 das App-Repository für Home Assistant OS:

```
repository.yaml
lifeos/
  config.yaml   # image: ghcr.io/<user>/lifeos-{arch}, arch: [aarch64, amd64], backup: cold
  DOCS.md
  icon.png
```

Zugriff per eigenem Tailscale-Knoten (`tailscale serve` → `https://lifeos.<tailnet>.ts.net`). Hintergrund und Alternativen: `docs/FEASIBILITY.md` §1 und §4, ADR-007/008.
