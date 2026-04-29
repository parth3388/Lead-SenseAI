# AWS App Runner Deployment

This project is ready to deploy as two App Runner services:

- `leadsense-backend`: Express API on port `5000`
- `leadsense-frontend`: Next.js app on port `3000`

The FastAPI service in `services/lead-scoring-api` also has a Dockerfile, but the current Express backend already runs its local Python AI analysis from `backend/ai/model.py`. Deploy the FastAPI service only if you plan to wire the backend to call it over HTTP.

## Prerequisites

1. Install AWS CLI v2.
2. Run `aws configure` or authenticate with AWS SSO.
3. Install Docker Desktop.
4. Create a MongoDB Atlas database or another MongoDB-compatible database reachable from AWS.
5. Decide an AWS region, for example `us-east-1`.

## Build And Push Images To ECR

### Automated PowerShell Deployment

On Windows, after installing Docker Desktop and signing in to AWS CLI, you can run the full deployment flow from the repo root:

```powershell
.\scripts\deploy-aws-apprunner.ps1 `
  -Region us-east-1 `
  -MongoDbUri "mongodb+srv://user:password@example.mongodb.net/leadsense_ai" `
  -OpenAiApiKey "optional-openai-key"
```

The script creates ECR repositories, creates the App Runner ECR access role, builds and pushes both images, creates or updates the backend and frontend App Runner services, and updates backend CORS after the frontend URL exists.

If you do not pass `-MongoDbUri`, the backend will deploy with its in-memory fallback and data will not persist after restarts.

### Manual Commands

Replace `AWS_ACCOUNT_ID` and `AWS_REGION` before running these commands.

```bash
AWS_ACCOUNT_ID=123456789012
AWS_REGION=us-east-1

aws ecr create-repository --repository-name leadsense-backend --region "$AWS_REGION"
aws ecr create-repository --repository-name leadsense-frontend --region "$AWS_REGION"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t leadsense-backend ./backend
docker tag leadsense-backend:latest "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/leadsense-backend:latest"
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/leadsense-backend:latest"
```

After creating the backend App Runner service and copying its public URL, build the frontend with that URL:

```bash
BACKEND_URL=https://your-backend-service.awsapprunner.com

docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL" \
  -t leadsense-frontend ./frontend

docker tag leadsense-frontend:latest "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/leadsense-frontend:latest"
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/leadsense-frontend:latest"
```

## Create App Runner Services

In AWS Console:

1. Open App Runner.
2. Create a service from container registry.
3. Choose private ECR.
4. Select `leadsense-backend:latest`.
5. Set port to `5000`.
6. Add environment variables from `backend/.env.example`.
7. Set `JWT_SECRET` to a long random value.
8. Set `MONGODB_URI` and `MONGODB_DB`.
9. Set `OPENAI_API_KEY` if you want OpenAI-powered responses.
10. Leave `CORS_ORIGINS` blank until the frontend service URL exists, then update it.

Create the frontend service:

1. Select `leadsense-frontend:latest`.
2. Set port to `3000`.
3. No runtime env var is required for `NEXT_PUBLIC_API_BASE_URL` because it is baked into the Next.js client build.

After the frontend URL exists, update backend `CORS_ORIGINS`:

```text
CORS_ORIGINS=https://your-frontend-service.awsapprunner.com
```

## Health Checks

Use these URLs after deployment:

```text
https://your-backend-service.awsapprunner.com/health
https://your-frontend-service.awsapprunner.com
```

## Notes

- The backend has an in-memory fallback if `MONGODB_URI` is missing, but production data will be lost on restarts without MongoDB.
- App Runner service URLs are HTTPS by default.
- If you add a custom domain, also add that frontend domain to `CORS_ORIGINS`.
