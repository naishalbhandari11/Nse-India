@echo off
<<<<<<< HEAD
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
=======
REM -------------------------------
REM Push changes to personal GitHub
REM -------------------------------

REM Navigate to the repo folder (optional if bat is in the folder)
cd /d "%~dp0"

REM Initialize git if not already
if not exist ".git" (
    echo Initializing Git repository...
    git init
)

REM Set commit identity for this repo
git config user.name "naishalbhandari11"
git config user.email "naishalbhandari123@gmail.com"

REM Add all changes
git add .

REM Commit changes
set /p COMMITMSG=Enter commit message: 
if "%COMMITMSG%"=="" (
    set COMMITMSG=Update code
)
git commit -m "%COMMITMSG%"

REM Set branch to main
git branch -M main

REM Add SSH remote for personal account (skip if already exists)
git remote remove origin 2>nul
git remote add origin git@github-personal:naishalbhandari11/Nse-India.git

REM Push to GitHub
git push -u origin main

echo.
echo ✅ Done! Your code has been pushed using personal account.
pause
>>>>>>> 5563257e981e470e0187565e49369889f345f1c5
