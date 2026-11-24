# Docker-Image

`Dockerfile` (Build-Kontext: Repository-Wurzel) erzeugt das Image für die Home-Assistant-App:

- JavaScript wird auf der Build-Plattform gebaut; die letzte Stufe enthält **keine `RUN`-Befehle**. Der ARM64-Build für den Pi braucht dadurch keine Emulation.
- `npm ci --ignore-scripts`: better-sqlite3 lädt seine mitgelieferte Binärdatei (`prebuilds/linux-arm64.node`), es wird nichts kompiliert.
- Tailscale-Binärdateien und CA-Zertifikate stammen aus dem offiziellen Tailscale-Image (Version gepinnt).
- `run.sh` startet Tailscale (userspace), `tailscale serve` und dann den Node-Server. Optionen kommen aus `/data/options.json` (Home Assistant) oder aus Umgebungsvariablen.

Lokaler Test (Linux mit Docker):

```bash
docker build -f deployment/docker/Dockerfile -t lifeos:test .
docker run --rm --network host -e TAILSCALE_ENABLED=false -v lifeos-data:/data lifeos:test   # http://127.0.0.1:8080
```

Gebaut und veröffentlicht wird das Image von `.github/workflows/release.yml`.
