@echo off
echo Running parts import script...
cd %~dp0
call pnpm run import-parts
echo.
echo Import complete. Press any key to exit...
pause > nul 