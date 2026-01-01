@echo off
pushd ai-agent
.\venv\Scripts\ruff check . --fix
if %errorlevel% neq 0 exit /b %errorlevel%
.\venv\Scripts\ruff format .
if %errorlevel% neq 0 exit /b %errorlevel%
popd
