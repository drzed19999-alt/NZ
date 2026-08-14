@echo off
REM ===========================================================
REM NZ - launch all services in separate windows
REM   CRM (Next.js)         http://localhost:3000
REM   VT Markets API        http://localhost:4000
REM   VT Markets Frontend   http://localhost:5500
REM ===========================================================

setlocal
set "ROOT=%~dp0"

REM ---- install deps if missing --------------------------------
if not exist "%ROOT%crm-adminpanel\node_modules" (
    echo Installing CRM dependencies...
    pushd "%ROOT%crm-adminpanel" && call npm install && popd
)
if not exist "%ROOT%Platforms\vtmarkets\server\node_modules" (
    echo Installing VT Markets backend dependencies...
    pushd "%ROOT%Platforms\vtmarkets\server" && call npm install && popd
)

REM ---- launch the three services in their own windows ---------
start "CRM  (Next.js  :3000)"        cmd /k "cd /d %ROOT%crm-adminpanel && npm run dev"
start "VT Markets API  :4000"        cmd /k "cd /d %ROOT%Platforms\vtmarkets\server && npm run dev"
start "VT Markets Web  :5500"        cmd /k "cd /d %ROOT%Platforms\vtmarkets && npx -y serve -l 5500 -s ."

echo.
echo ===========================================================
echo   CRM              http://localhost:3000
echo   VT Markets API   http://localhost:4000
echo   VT Markets Web   http://localhost:5500
echo ===========================================================
echo Each service opened in its own window. Close a window to stop it.
echo.
endlocal
