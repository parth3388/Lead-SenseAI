param(
  [string]$Region = "us-east-1",
  [string]$BackendServiceName = "leadsense-backend",
  [string]$FrontendServiceName = "leadsense-frontend",
  [string]$MongoDbUri = $env:MONGODB_URI,
  [string]$MongoDbName = "leadsense_ai",
  [string]$JwtSecret = $env:JWT_SECRET,
  [string]$OpenAiApiKey = $env:OPENAI_API_KEY
)

$ErrorActionPreference = "Stop"

function Find-CommandPath {
  param(
    [string]$CommandName,
    [string[]]$FallbackPaths = @()
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($fallbackPath in $FallbackPaths) {
    if (Test-Path $fallbackPath) {
      return $fallbackPath
    }
  }

  throw "$CommandName was not found. Install it, reopen the terminal, and run this script again."
}

function New-RandomSecret {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes)
}

function Invoke-AwsJson {
  param([string[]]$Arguments)

  $output = & $script:Aws @Arguments --output json
  if (-not $output) {
    return $null
  }

  return $output | ConvertFrom-Json
}

function Ensure-EcrRepository {
  param([string]$Name)

  try {
    Invoke-AwsJson @("ecr", "describe-repositories", "--repository-names", $Name, "--region", $Region) | Out-Null
  } catch {
    Invoke-AwsJson @("ecr", "create-repository", "--repository-name", $Name, "--region", $Region) | Out-Null
  }
}

function Ensure-AppRunnerAccessRole {
  param([string]$RoleName)

  try {
    $role = Invoke-AwsJson @("iam", "get-role", "--role-name", $RoleName)
    return $role.Role.Arn
  } catch {
    $trustPolicy = @{
      Version = "2012-10-17"
      Statement = @(
        @{
          Effect = "Allow"
          Principal = @{ Service = "build.apprunner.amazonaws.com" }
          Action = "sts:AssumeRole"
        }
      )
    }

    $trustPath = Join-Path $env:TEMP "leadsense-apprunner-trust.json"
    $trustPolicy | ConvertTo-Json -Depth 10 | Set-Content -Path $trustPath -Encoding UTF8

    $role = Invoke-AwsJson @(
      "iam", "create-role",
      "--role-name", $RoleName,
      "--assume-role-policy-document", "file://$trustPath"
    )

    Invoke-AwsJson @(
      "iam", "attach-role-policy",
      "--role-name", $RoleName,
      "--policy-arn", "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
    ) | Out-Null

    Start-Sleep -Seconds 10
    return $role.Role.Arn
  }
}

function Get-AppRunnerServiceArn {
  param([string]$ServiceName)

  $services = Invoke-AwsJson @("apprunner", "list-services", "--region", $Region)
  $service = $services.ServiceSummaryList | Where-Object { $_.ServiceName -eq $ServiceName } | Select-Object -First 1
  return $service.ServiceArn
}

function Wait-AppRunnerService {
  param([string]$ServiceArn)

  while ($true) {
    $service = Invoke-AwsJson @("apprunner", "describe-service", "--service-arn", $ServiceArn, "--region", $Region)
    $status = $service.Service.Status
    Write-Host "App Runner status for $($service.Service.ServiceName): $status"

    if ($status -eq "RUNNING") {
      return $service.Service
    }

    if ($status -in @("CREATE_FAILED", "DELETE_FAILED", "OPERATION_FAILED")) {
      throw "App Runner service $($service.Service.ServiceName) failed with status $status."
    }

    Start-Sleep -Seconds 20
  }
}

function New-SourceConfiguration {
  param(
    [string]$ImageUri,
    [string]$Port,
    [hashtable]$EnvironmentVariables,
    [string]$AccessRoleArn
  )

  return @{
    AuthenticationConfiguration = @{ AccessRoleArn = $AccessRoleArn }
    AutoDeploymentsEnabled = $true
    ImageRepository = @{
      ImageIdentifier = $ImageUri
      ImageRepositoryType = "ECR"
      ImageConfiguration = @{
        Port = $Port
        RuntimeEnvironmentVariables = $EnvironmentVariables
      }
    }
  }
}

function Upsert-AppRunnerService {
  param(
    [string]$ServiceName,
    [hashtable]$SourceConfiguration,
    [string]$Cpu = "1 vCPU",
    [string]$Memory = "2 GB",
    [string]$HealthPath = ""
  )

  $serviceArn = Get-AppRunnerServiceArn -ServiceName $ServiceName
  $sourcePath = Join-Path $env:TEMP "$ServiceName-source.json"
  $SourceConfiguration | ConvertTo-Json -Depth 20 | Set-Content -Path $sourcePath -Encoding UTF8

  if ($serviceArn) {
    Write-Host "Updating App Runner service $ServiceName"
    Invoke-AwsJson @(
      "apprunner", "update-service",
      "--service-arn", $serviceArn,
      "--source-configuration", "file://$sourcePath",
      "--region", $Region
    ) | Out-Null
  } else {
    Write-Host "Creating App Runner service $ServiceName"
    $input = @{
      ServiceName = $ServiceName
      SourceConfiguration = $SourceConfiguration
      InstanceConfiguration = @{
        Cpu = $Cpu
        Memory = $Memory
      }
    }

    if ($HealthPath) {
      $input.HealthCheckConfiguration = @{
        Protocol = "HTTP"
        Path = $HealthPath
        Interval = 10
        Timeout = 5
        HealthyThreshold = 1
        UnhealthyThreshold = 5
      }
    }

    $inputPath = Join-Path $env:TEMP "$ServiceName-create.json"
    $input | ConvertTo-Json -Depth 20 | Set-Content -Path $inputPath -Encoding UTF8
    $created = Invoke-AwsJson @("apprunner", "create-service", "--cli-input-json", "file://$inputPath", "--region", $Region)
    $serviceArn = $created.Service.ServiceArn
  }

  return Wait-AppRunnerService -ServiceArn $serviceArn
}

$script:Aws = Find-CommandPath "aws" @("C:\Program Files\Amazon\AWSCLIV2\aws.exe")
$Docker = Find-CommandPath "docker" @(
  "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
  "C:\Program Files\Docker\Docker\resources\bin\com.docker.cli.exe"
)
$DockerBin = Split-Path -Parent $Docker
if ($env:PATH -notlike "*$DockerBin*") {
  $env:PATH = "$DockerBin;$env:PATH"
}

if (-not $JwtSecret) {
  $JwtSecret = New-RandomSecret
  Write-Host "Generated a JWT secret for this deployment."
}

if (-not $MongoDbUri) {
  Write-Warning "MONGODB_URI was not provided. The backend will deploy with its in-memory fallback; data will not persist after restarts."
}

Write-Host "Checking AWS identity..."
$identity = Invoke-AwsJson @("sts", "get-caller-identity")
$accountId = $identity.Account
$registry = "$accountId.dkr.ecr.$Region.amazonaws.com"
$accessRoleArn = Ensure-AppRunnerAccessRole -RoleName "LeadSenseAppRunnerEcrAccessRole"

Ensure-EcrRepository -Name $BackendServiceName
Ensure-EcrRepository -Name $FrontendServiceName

Write-Host "Logging Docker in to ECR..."
& $script:Aws ecr get-login-password --region $Region | & $Docker login --username AWS --password-stdin $registry

$backendImage = "$registry/${BackendServiceName}:latest"
$frontendImage = "$registry/${FrontendServiceName}:latest"

Write-Host "Building and pushing backend image..."
& $Docker build -t $BackendServiceName ./backend
& $Docker tag "${BackendServiceName}:latest" $backendImage
& $Docker push $backendImage

$backendEnv = @{
  PORT = "5000"
  JWT_SECRET = $JwtSecret
  MONGODB_DB = $MongoDbName
}

if ($MongoDbUri) {
  $backendEnv.MONGODB_URI = $MongoDbUri
}

if ($OpenAiApiKey) {
  $backendEnv.OPENAI_API_KEY = $OpenAiApiKey
}

$backendSource = New-SourceConfiguration -ImageUri $backendImage -Port "5000" -EnvironmentVariables $backendEnv -AccessRoleArn $accessRoleArn
$backendService = Upsert-AppRunnerService -ServiceName $BackendServiceName -SourceConfiguration $backendSource -Memory "3 GB" -HealthPath "/health"
$backendUrl = "https://$($backendService.ServiceUrl)"

Write-Host "Backend URL: $backendUrl"
Write-Host "Building and pushing frontend image with NEXT_PUBLIC_API_BASE_URL=$backendUrl ..."
& $Docker build --build-arg "NEXT_PUBLIC_API_BASE_URL=$backendUrl" -t $FrontendServiceName ./frontend
& $Docker tag "${FrontendServiceName}:latest" $frontendImage
& $Docker push $frontendImage

$frontendSource = New-SourceConfiguration -ImageUri $frontendImage -Port "3000" -EnvironmentVariables @{ PORT = "3000" } -AccessRoleArn $accessRoleArn
$frontendService = Upsert-AppRunnerService -ServiceName $FrontendServiceName -SourceConfiguration $frontendSource -Memory "2 GB"
$frontendUrl = "https://$($frontendService.ServiceUrl)"

Write-Host "Frontend URL: $frontendUrl"
Write-Host "Updating backend CORS_ORIGINS to allow the frontend..."
$backendEnv.CORS_ORIGINS = $frontendUrl
$backendSource = New-SourceConfiguration -ImageUri $backendImage -Port "5000" -EnvironmentVariables $backendEnv -AccessRoleArn $accessRoleArn
$backendService = Upsert-AppRunnerService -ServiceName $BackendServiceName -SourceConfiguration $backendSource -Memory "3 GB" -HealthPath "/health"

Write-Host ""
Write-Host "Deployment complete."
Write-Host "Backend health: $backendUrl/health"
Write-Host "Frontend: $frontendUrl"
