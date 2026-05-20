@echo off
setlocal

set "DOCKERHUB_USER=jacurtwongapp"
set "IMAGE_NAME=sudoku-star"
set "IMAGE_TAG=latest"
set "IMAGE=%DOCKERHUB_USER%/%IMAGE_NAME%:%IMAGE_TAG%"
set "BUILDER=sudoku-star-builder"

cd /d "%~dp0"

echo.
echo ========================================
echo  Build and push Docker image
echo  Image: %IMAGE%
echo ========================================
echo.

docker --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker command not found.
  echo Please install/start Docker Desktop first.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker is not running.
  echo Please start Docker Desktop first.
  pause
  exit /b 1
)

echo [1/4] Checking Docker Hub login...
docker pull hello-world:latest >nul 2>&1
if errorlevel 1 (
  echo Please login to Docker Hub as %DOCKERHUB_USER%.
  docker login -u %DOCKERHUB_USER%
  if errorlevel 1 (
    echo [ERROR] Docker login failed.
    pause
    exit /b 1
  )
)

echo [2/4] Preparing buildx builder...
docker buildx inspect %BUILDER% >nul 2>&1
if errorlevel 1 (
  docker buildx create --name %BUILDER% --use
) else (
  docker buildx use %BUILDER%
)
if errorlevel 1 (
  echo [ERROR] Failed to prepare Docker buildx.
  pause
  exit /b 1
)

echo [3/4] Building and pushing multi-arch image...
docker buildx build --platform linux/amd64,linux/arm64 -t %IMAGE% --push .
if errorlevel 1 (
  echo.
  echo [ERROR] Build or push failed.
  pause
  exit /b 1
)

echo.
echo [4/4] Done.
echo Pushed: %IMAGE%
echo.
echo Use this on your NAS:
echo docker compose pull
echo docker compose up -d
echo.
pause
