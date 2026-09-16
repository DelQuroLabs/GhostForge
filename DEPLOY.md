# Ghostforge — production deploy (GitHub → Contabo + Coolify)

One Docker container serves the whole app (client + API on port 3000).
All data lives in Supabase (books, chapters, settings incl. your AI key) —
the VPS holds nothing, so redeploys and server moves lose nothing.

## 0. What you need in hand

- A GitHub account (repo can be private — recommended).
- A Contabo VPS with **Coolify installed** and reachable on ports 80/443.
  (No Coolify yet? On the VPS: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`,
  then open `http://YOUR-SERVER-IP:8000` and finish onboarding.)
- A domain (or subdomain) whose DNS you control.
- Your Supabase values: project URL + publishable key + audio bucket name
  (Supabase dashboard → Settings → API; bucket from setup).

## 1. Push the code to GitHub (your machine, ~5 min)

```bash
unzip ghostforge-deploy.zip && cd ghostforge
git init -b main
git add .
git commit -m "Ghostforge production build"
# then EITHER (GitHub CLI):
gh repo create ghostforge --private --source=. --push
# ...OR create a private repo at github.com/new, then:
git remote add origin git@github.com:YOUR-USER/ghostforge.git
git push -u origin main
```

`.env` is git-ignored — secrets never enter the repo. Future updates are just
`git commit` + `git push` (Coolify redeploys; see §4).

## 2. Point DNS at the VPS (~2 min + propagation)

In your registrar/DNS (Cloudflare, Namecheap, …): add an **A record**
`books.your-domain.com → YOUR-CONTABO-IP` (proxy OFF / DNS-only if Cloudflare,
at least for the first deploy — orange-cloud is fine after SSL is green).

## 3. Create the resource in Coolify (~10 min)

1. Coolify → **+ New Resource** → **Public/Private Repository** → paste the repo URL.
   Private repo: copy the **public deploy key** Coolify shows → GitHub repo
   → Settings → Deploy keys → Add (read-only is enough).
2. Build Pack: **Dockerfile** (auto-detected). Exposed port: **3000**.
3. **Environment Variables** (paste values, no quotes needed):
   - `SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_…`
   - `SUPABASE_AUDIO_BUCKET` = `audiobooks`
   - (No AI key needed here — yours already lives in the database settings.)
4. **Domains**: add `https://books.your-domain.com`, enable SSL generation
   (Coolify provisions Let's Encrypt automatically once DNS resolves).
5. **Health check** path: `/api/health` — bad deploys never go live.
6. Press **Deploy**, watch the build log (~2–4 min first time).

## 4. Verify (2 min)

- `https://books.your-domain.com` → the Shelf with all your books.
- `https://books.your-domain.com/api/health` → `{"status":"ok",…}`.
- Settings → AI badge shows `key set …` (re-checks itself now).
- Open a book + a chapter (the old blank-screen bug is fixed + guarded).

## 5. Day-2 notes

- **Updates**: push to `main`, then Redeploy in Coolify — or enable the
  GitHub webhook Coolify shows you for push-to-deploy.
- **Logs**: Coolify → resource → Logs (same `[ghostforge]` / `[novel …]` lines
  as local dev).
- **Backups**: books/settings live in Supabase (use its dashboard backups);
  chapter MP3s live in the Supabase storage bucket. The VPS is disposable.
- **Lock the front door** (do this): Ghostforge is a single-user studio with
  no login — anyone with the URL could read/forge/delete books. Either keep
  the subdomain unguessable, or turn on **Basic Auth** for the resource in
  Coolify (Settings → authentication), or put Cloudflare Access in front.
- **Costs**: Contabo VPS (whatever your plan is) + Supabase (free tier covers
  this usage) + AI calls on your own provider key. Nothing here phones home.

## Local dev (unchanged)

```bash
npm install
cp .env.example .env   # fill SUPABASE_* (publishable values, public by design)
npm run dev            # → http://localhost:3000
```

Production equivalent of what Coolify runs:

```bash
npm run build && npm start   # serves dist/ + API on $PORT (default 3000)
```

## Local AI with Ollama (free, no key)

Ghostforge speaks to any OpenAI-compatible endpoint — including Ollama:

```bash
ollama serve
ollama pull gpt-oss:20b
```

Then Settings → provider **Ollama (local)** → Test. No key needed.
