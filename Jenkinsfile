// Jenkins CI/CD pipeline: build all 6 microfrontends (mock mode) and deploy the
// combined static site to Cloudflare Pages.
//
// TARGET: a Windows Jenkins host that runs the build inside a LINUX Docker
// container (Docker Desktop or Rancher Desktop in Linux-container mode).
//
// IMPORTANT: the build steps execute *inside the Linux container*, so they use
// `sh` even though the Jenkins host OS is Windows. Do NOT change them to `bat`
// — `bat` would run on the Windows host, outside the container.
//
// ── Host requirements ─────────────────────────────────────────────────────
//   • Docker (Docker Desktop or Rancher Desktop) in Linux-container mode, with
//     the daemon reachable by the OS account the Jenkins agent runs as. If
//     Jenkins runs as a Windows service, that service account (not just your
//     interactive login) must be able to run `docker` — otherwise the agent
//     can't start the container.
//   • Jenkins plugins: "Docker" and "Docker Pipeline".
//   • `docker` CLI on the agent's PATH.
//
// ── One-time Jenkins setup ────────────────────────────────────────────────
//   1. Cloudflare API token (CI can't use `wrangler login`):
//        Cloudflare dashboard → My Profile → API Tokens → Create Token
//          • Permissions: Account → Cloudflare Pages → Edit
//          • Account Resources: your account
//      Then Jenkins → Manage Jenkins → Credentials → add a "Secret text"
//      credential with ID:  cloudflare-api-token
//   2. (Only if your token spans multiple accounts) add a "Secret text"
//      credential  cloudflare-account-id  and uncomment its line below.
//      This project's account id is 43d4f960270409ec2ed8551362485e15.
//   3. Create the Pages project once (out of band):
//        npx wrangler pages project create ai-interview-portal --production-branch=main

pipeline {
  agent {
    docker {
      image 'node:22-bookworm-slim'
      // Run as root so npm/wrangler can write caches inside the container.
      args  '-u root:root'
      // If only some agents have Docker in Linux-container mode, pin them:
      // label 'docker-linux'
    }
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 20, unit: 'MINUTES')
  }

  environment {
    CLOUDFLARE_API_TOKEN = credentials('cloudflare-api-token')
    // CLOUDFLARE_ACCOUNT_ID = credentials('cloudflare-account-id') // uncomment if needed
    CF_PAGES_PROJECT = 'ai-interview-portal'
    // Keep the npm cache inside the workspace (writable in the container).
    npm_config_cache = "${WORKSPACE}/.npm"
  }

  stages {
    stage('Environment') {
      // Sanity-check we really are inside the Linux container.
      steps { sh 'node --version && npm --version && uname -a' }
    }

    stage('Install') {
      steps { sh 'npm ci --no-audit --no-fund' }
    }

    stage('Typecheck') {
      steps { sh 'npm run typecheck' }
    }

    stage('Build') {
      // Produces dist-deploy/ (shell at /, remotes under /mfe-*/, + _redirects)
      steps { sh 'npm run build:static' }
    }

    stage('Deploy to Cloudflare Pages') {
      when { branch 'main' }   // only the main branch publishes to production
      steps {
        sh '''
          npx wrangler pages deploy dist-deploy \
            --force \
            --project-name="$CF_PAGES_PROJECT" \
            --branch=main \
            --commit-dirty=true
        '''
      }
    }
  }

  post {
    success {
      echo 'Deployed → https://ai-interview-portal.pages.dev'
    }
    failure {
      echo 'Build or deploy failed — check the stage logs above.'
    }
    always {
      deleteDir()   // built-in workspace cleanup (no extra plugin required)
    }
  }
}

// ── If the declarative Docker agent fails to mount the workspace ───────────
// On some Windows + Docker setups the plugin's automatic workspace volume mount
// misbehaves. If that happens, drive Docker explicitly instead: use a Windows
// node and run each step in a throwaway Linux container, e.g.
//
//   agent any
//   ...
//   steps {
//     bat 'docker run --rm -v "%CD%":/work -w /work node:22-bookworm-slim ^
//          sh -lc "npm ci --no-audit --no-fund && npm run build:static"'
//   }
//
// This keeps the build in a Linux container while sidestepping the plugin's
// implicit mount, at the cost of a more verbose Jenkinsfile.
