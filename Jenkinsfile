// Jenkins CI/CD pipeline: build all 6 microfrontends (mock mode) and deploy the
// combined static site to Cloudflare Pages.
//
// ── One-time Jenkins setup ────────────────────────────────────────────────
// 1. Cloudflare API token (CI can't use `wrangler login`):
//    Cloudflare dashboard → My Profile → API Tokens → Create Token
//      • Permissions: Account → Cloudflare Pages → Edit
//      • Account Resources: your account
//    Then in Jenkins → Manage Jenkins → Credentials → add a
//    "Secret text" credential with ID:  cloudflare-api-token
//
// 2. (Only if your token spans multiple accounts) add another "Secret text"
//    credential  cloudflare-account-id  and uncomment its line below.
//    This project's account id is 43d4f960270409ec2ed8551362485e15.
//
// 3. The Pages project must already exist (created once, out of band):
//      npx wrangler pages project create ai-interview-portal --production-branch=main
//
// ── Agent ─────────────────────────────────────────────────────────────────
// Uses a Docker agent with Node preinstalled (needs Docker + the "Docker
// Pipeline" plugin on the Jenkins agent). If you don't use Docker agents, see
// the `agent any` + NodeJS-plugin alternative at the bottom of this file.

pipeline {
  agent {
    docker {
      image 'node:22-bookworm-slim'
      // run as root so npm can write its cache inside the container
      args  '-u root:root'
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
    npm_config_cache = "${WORKSPACE}/.npm"   // keep npm cache inside the workspace
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
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

// ── Alternative: no Docker agent (NodeJS plugin) ──────────────────────────
// If your Jenkins can't run Docker agents, install the "NodeJS" plugin,
// configure a Node 20+ tool named e.g. "node22" under Global Tool
// Configuration, then replace the `agent { docker { ... } }` block above with:
//
//   agent any
//   tools { nodejs 'node22' }
//
// and drop the `args '-u root:root'` line. Everything else stays the same.
// On a Windows agent, change each `sh '...'` step to `bat '...'`.
