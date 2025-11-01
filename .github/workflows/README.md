# Project Service CI/CD

This workflow builds and pushes the Project Service Docker image to AWS ECR using OIDC authentication.

## Configuration

1. **Add Repository Variable**:
   - Repository → Settings → Secrets and variables → Actions → Variables
   - Add variable: `AWS_ROLE_ARN` = `arn:aws:iam::158670175038:role/ecr-registry-github-actions-role`
   - Note: ARNs are not secrets, so use a variable instead

2. **Enable OIDC**:
   - Settings → Actions → General
   - Workflow permissions: "Read and write permissions"

## What It Does

- ✅ Runs tests and linter
- ✅ Builds Docker image
- ✅ Pushes to ECR: `158670175038.dkr.ecr.ap-southeast-1.amazonaws.com/docker:project-<tag>`
- ✅ Also tags as `latest`

## Image Tags

- **Commit SHA**: `project-<8-char-sha>`
- **Git Tag (v\*)**: `project-v<version>`
- **Latest**: `project-latest`

Example: `158670175038.dkr.ecr.ap-southeast-1.amazonaws.com/docker:project-a1b2c3d4`
