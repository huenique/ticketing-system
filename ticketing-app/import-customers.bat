@echo off
echo Running customers import script...
cd %~dp0
call pnpm run import-customers
echo.
echo Import complete. Press any key to exit...
pause > nul 