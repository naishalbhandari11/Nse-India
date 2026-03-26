@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===============================
echo   Git Push Script (Safe)
echo ===============================

REM 1. Init repo if needed
if not exist ".git" (
echo [INFO] Initializing repository...
git init
)

REM 2. Set identity
git config user.name "naishalbhandari11"
git config user.email "[naishalbhandari123@gmail.com](mailto:naishalbhandari123@gmail.com)"

REM 3. Ensure remote exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
echo [INFO] Adding remote origin...
git remote add origin git@github-personal:naishalbhandari11/Nse-India.git
)

REM 4. Add files
echo [INFO] Adding files...
git add .

REM 5. Check if changes exist
git diff --cached --quiet
if errorlevel 1 (
set /p COMMITMSG=Enter commit message:
if "!COMMITMSG!"=="" set COMMITMSG=Update code

```
echo [INFO] Committing...
git commit -m "!COMMITMSG!"
```

) else (
echo [INFO] Nothing to commit.
)

REM 6. Set branch
git branch -M main

REM 7. Pull (merge, not rebase to avoid errors)
echo [INFO] Pulling from remote...
git pull origin main --allow-unrelated-histories

REM 8. Push
echo [INFO] Pushing to GitHub...
git push -u origin main

REM 9. Result check
if errorlevel 1 (
echo [ERROR] Push failed.
) else (
echo [SUCCESS] Push completed.
)

pause
endlocal
