# Deploying to k3d (Traefik on :8081)

Layout mirrors ARCHITECTURE.md §11: `aip-data` · `aip-platform` · `aip-ai` ·
`aip-frontend`, with Traefik `Ingress` routing on `*.aip.localtest.me`
(localtest.me resolves to 127.0.0.1 — same pattern as Focus Forge).

## 1. Build images

```powershell
# Backend
docker build -t aip/auth-service       --build-arg MODULE=auth-service       backend/
docker build -t aip/interview-platform --build-arg MODULE=interview-platform backend/
docker build -t aip/ai-gateway ai/ai-gateway/

# Frontend remotes. Each MFE compiles its own copy of the shared api layer,
# so the API-mode build args must be passed to ALL of them, not just the shell.
$apiArgs = @(
  "--build-arg", "VITE_API_MODE=real",
  "--build-arg", "VITE_API_BASE_AUTH=http://api.aip.localtest.me:8081",
  "--build-arg", "VITE_API_BASE_INTERVIEW=http://api.aip.localtest.me:8081"
)
foreach ($app in @("mfe-auth","mfe-dashboard","mfe-interview","mfe-results","mfe-admin")) {
  docker build -f Dockerfile.frontend -t "aip/$app" --build-arg APP=$app @apiArgs .
}

# Shell additionally needs the deployed remote-entry URLs
docker build -f Dockerfile.frontend -t aip/shell --build-arg APP=shell @apiArgs `
  --build-arg REMOTE_AUTH_URL=http://mfe-auth.aip.localtest.me:8081/remoteEntry.js `
  --build-arg REMOTE_DASHBOARD_URL=http://mfe-dashboard.aip.localtest.me:8081/remoteEntry.js `
  --build-arg REMOTE_INTERVIEW_URL=http://mfe-interview.aip.localtest.me:8081/remoteEntry.js `
  --build-arg REMOTE_RESULTS_URL=http://mfe-results.aip.localtest.me:8081/remoteEntry.js `
  --build-arg REMOTE_ADMIN_URL=http://mfe-admin.aip.localtest.me:8081/remoteEntry.js `
  .
```

## 2. Import into k3d (no registry needed locally)

```powershell
k3d image import -c dev aip/auth-service aip/interview-platform aip/ai-gateway `
  aip/shell aip/mfe-auth aip/mfe-dashboard aip/mfe-interview aip/mfe-results aip/mfe-admin
```

(CI path: Gitea Actions builds `image:<sha>`, pushes, bumps the tag in the
gitops repo, ArgoCD syncs — identical to the Focus Forge pipeline.)

## 3. Deploy

Manual (first time / without ArgoCD):

```powershell
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/platform/secrets.yaml
kubectl apply -f k8s/data/
kubectl apply -f k8s/platform/ -f k8s/ai/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

GitOps: push this repo, edit `repoURL` in `k8s/argocd/*.yaml`, then
`kubectl apply -f k8s/argocd/root-app.yaml`. Sync waves order the rollout
(namespaces → data → services → frontend → ingress).

## 4. Use it

- App:  http://aip.localtest.me:8081  (demo logins on the login screen)
- API:  http://api.aip.localtest.me:8081/api/v1/…

## Notes / honest limitations

- `secrets.yaml` holds dev values in plain text — replace with SealedSecrets
  or External Secrets before anything real (ARCHITECTURE.md ADR).
- Single-replica Kafka/Postgres, MinIO on emptyDir: dev-grade by design
  (ADR-11). Production values live in Helm in Phase 2.
- Manifests are hand-verified for structure but were authored, not yet
  soak-tested on the cluster — expect first-deploy tuning (probe timings,
  storage class name) on your k3d.
- NetworkPolicies + observability stack (Prometheus/Grafana/Tempo) are the
  next layer per ARCHITECTURE.md Phase 2.
