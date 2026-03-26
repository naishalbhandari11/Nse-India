@echo off
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