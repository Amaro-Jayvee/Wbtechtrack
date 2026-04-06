@echo off
REM TechTrack Docker Deployment Helper Script for Windows
REM Usage: docker-deploy.bat [command] [options]

setlocal enabledelayedexpansion
cls

REM Colors simulation (Windows doesn't support ANSI by default)
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "NC=[0m"

if "%1"=="" (
    call :show_help
    exit /b 0
)

if /i "%1"=="check" (
    call :check_docker
) else if /i "%1"=="build" (
    call :build %2
) else if /i "%1"=="start" (
    call :start %2
) else if /i "%1"=="stop" (
    call :stop
) else if /i "%1"=="logs" (
    call :logs %2
) else if /i "%1"=="status" (
    call :status
) else if /i "%1"=="migrate" (
    call :migrate
) else if /i "%1"=="superuser" (
    call :create_superuser
) else if /i "%1"=="static" (
    call :static
) else if /i "%1"=="backup-db" (
    call :backup_db
) else if /i "%1"=="restore-db" (
    call :restore_db %2
) else if /i "%1"=="rebuild" (
    call :rebuild
) else if /i "%1"=="cleanup" (
    call :cleanup
) else if /i "%1"=="help" (
    call :show_help
) else (
    echo Error: Unknown command "%1"
    call :show_help
    exit /b 1
)

exit /b 0

:check_docker
echo.
echo === Checking Docker Installation ===
echo.
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)
echo ^✓ Docker is installed: 
docker --version

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed.
    exit /b 1
)
echo ^✓ Docker Compose is installed:
docker-compose --version
exit /b 0

:build
echo.
echo === Building Docker Images ===
echo.
if /i "%~1"=="prod" (
    echo Building production images...
    docker-compose build --no-cache
) else (
    echo Building development images...
    docker-compose build
)
echo ^✓ Docker images built successfully
exit /b 0

:start
echo.
echo === Starting Services ===
echo.
if /i "%~1"=="prod" (
    echo Using production environment
    REM Load .env.production (Docker Compose will do this automatically)
) else (
    echo Using development environment
)
docker-compose up -d
echo ^✓ Services started
echo Waiting for services to be healthy...
timeout /t 10 /nobreak
docker-compose ps
echo.
echo Frontend: http://localhost
echo Backend: http://localhost:8000
exit /b 0

:stop
echo.
echo === Stopping Services ===
echo.
docker-compose down
echo ^✓ Services stopped
exit /b 0

:logs
echo.
echo === Service Logs ===
echo.
if "%~1"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %~1
)
exit /b 0

:status
echo.
echo === Service Status ===
echo.
docker-compose ps
echo.
echo === System Disk Usage ===
echo.
docker system df
exit /b 0

:migrate
echo.
echo === Running Migrations ===
echo.
docker-compose exec backend python manage.py migrate
echo ^✓ Migrations completed
exit /b 0

:create_superuser
echo.
echo === Creating Superuser ===
echo.
docker-compose exec backend python manage.py createsuperuser
exit /b 0

:static
echo.
echo === Collecting Static Files ===
echo.
docker-compose exec backend python manage.py collectstatic --noinput
echo ^✓ Static files collected
exit /b 0

:backup_db
echo.
echo === Backing Up Database ===
echo.
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set "BACKUP_FILE=backup_%mydate%_%mytime%.sql"
docker-compose exec db mysqldump -u root -ptechtrack_secure_password techtrack_db > %BACKUP_FILE%
echo ^✓ Database backed up to: %BACKUP_FILE%
exit /b 0

:restore_db
echo.
echo === Restoring Database ===
echo.
if "%~1"=="" (
    echo Usage: docker-deploy.bat restore-db ^<backup-file^>
    exit /b 1
)
if not exist "%~1" (
    echo Error: Backup file not found: %~1
    exit /b 1
)
docker-compose exec db mysql -u root -ptechtrack_secure_password techtrack_db < %~1
echo ^✓ Database restored from: %~1
exit /b 0

:rebuild
echo.
echo === Full Rebuild ===
echo.
echo Stopping services...
docker-compose down -v
echo Building images...
docker-compose build --no-cache
echo Starting services...
docker-compose up -d
echo Waiting for services...
timeout /t 15 /nobreak
echo Running migrations...
docker-compose exec -T backend python manage.py migrate
echo ^✓ Full rebuild completed
exit /b 0

:cleanup
echo.
echo === Cleaning Up ===
echo.
echo Removing unused Docker resources...
docker system prune -f
echo ^✓ Cleanup completed
exit /b 0

:show_help
cls
echo.
echo TechTrack Docker Deployment Helper for Windows
echo.
echo USAGE:
echo     docker-deploy.bat [command] [options]
echo.
echo COMMANDS:
echo     check            Check Docker installation
echo     build [prod]     Build Docker images
echo     start [prod]     Start all services
echo     stop             Stop all services
echo     logs [service]   View service logs
echo     status           Show service status
echo     migrate          Run Django migrations
echo     superuser        Create Django superuser
echo     static           Collect static files
echo     backup-db        Backup MySQL database
echo     restore-db FILE  Restore from backup
echo     rebuild          Full rebuild
echo     cleanup          Remove unused resources
echo     help             Show this help message
echo.
echo EXAMPLES:
echo     docker-deploy.bat check
echo     docker-deploy.bat start
echo     docker-deploy.bat logs backend
echo     docker-deploy.bat backup-db
echo.
exit /b 0
