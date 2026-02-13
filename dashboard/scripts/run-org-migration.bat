@echo off
echo ===========================================
echo   Organization Hierarchy Setup
echo ===========================================
echo.
echo This script will:
echo 1. Run SQL migration to create organization structure
echo 2. Add sample data for branches, departments, sub-departments
echo.
pause

cd /d "%~dp0"

echo.
echo Running migration...
psql -U postgres -d dashboard_db -f "scripts\add-organization-hierarchy.sql"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Migration completed successfully!
    echo ========================================
    echo.
    echo Created tables:
    echo - branches ^(สาขา^)
    echo - departments ^(แผนก^)
    echo - sub_departments ^(แผนกย่อย^)
    echo.
    echo Updated:
    echo - roles table with organization hierarchy
    echo.
) else (
    echo.
    echo ========================================
    echo   Migration failed!
    echo ========================================
    echo Please check the error message above
    echo.
)

pause
