#!/bin/bash

# TechTrack Docker Deployment Helper Script
# Usage: ./docker-deploy.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Check Docker installation
check_docker() {
    print_section "Checking Docker Installation"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed: $(docker --version)"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed."
        exit 1
    fi
    print_success "Docker Compose is installed: $(docker-compose --version)"
}

# Build images
build() {
    print_section "Building Docker Images"
    
    if [[ "$1" == "prod" ]]; then
        print_info "Building production images with optimizations..."
        docker-compose build --no-cache
    else
        print_info "Building development images..."
        docker-compose build
    fi
    
    print_success "Docker images built successfully"
}

# Start services
start() {
    print_section "Starting Services"
    
    if [[ "$1" == "prod" ]]; then
        print_info "Using production environment (.env.production)"
        export $(cat .env.production | grep -v '^#' | xargs)
    else
        print_info "Using development environment (.env)"
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    docker-compose up -d
    print_success "Services started"
    
    # Wait for services to be ready
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    docker-compose ps
    
    print_info "Frontend: http://localhost"
    print_info "Backend: http://localhost:8000"
    print_info "API Docs: http://localhost:8000/api/"
}

# Stop services
stop() {
    print_section "Stopping Services"
    
    docker-compose down
    print_success "Services stopped"
}

# View logs
logs() {
    print_section "Service Logs"
    
    if [[ -z "$1" ]]; then
        docker-compose logs -f
    else
        docker-compose logs -f $1
    fi
}

# Database backup
backup_db() {
    print_section "Backing Up Database"
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T db mysqldump -u root -p"$DB_ROOT_PASSWORD" techtrack_db > "$BACKUP_FILE"
    print_success "Database backed up to: $BACKUP_FILE"
}

# Database restore
restore_db() {
    if [[ -z "$1" ]]; then
        print_error "Usage: $0 restore-db <backup-file>"
        exit 1
    fi
    
    print_section "Restoring Database"
    
    if [[ ! -f "$1" ]]; then
        print_error "Backup file not found: $1"
        exit 1
    fi
    
    docker-compose exec -T db mysql -u root -p"$DB_ROOT_PASSWORD" techtrack_db < "$1"
    print_success "Database restored from: $1"
}

# Run migrations
migrate() {
    print_section "Running Migrations"
    
    docker-compose exec backend python manage.py migrate
    print_success "Migrations completed"
}

# Create superuser
create_superuser() {
    print_section "Creating Superuser"
    
    docker-compose exec backend python manage.py createsuperuser
}

# Collect static files
static() {
    print_section "Collecting Static Files"
    
    docker-compose exec backend python manage.py collectstatic --noinput
    print_success "Static files collected"
}

# Full rebuild
rebuild() {
    print_section "Full Rebuild"
    
    print_info "Stopping services..."
    docker-compose down -v
    
    print_info "Building images..."
    docker-compose build --no-cache
    
    print_info "Starting services..."
    docker-compose up -d
    
    # Wait and run migrations
    sleep 15
    docker-compose exec -T backend python manage.py migrate
    
    print_success "Full rebuild completed"
}

# Status check
status() {
    print_section "Service Status"
    
    docker-compose ps
    
    print_section "Disk Usage"
    docker system df
    
    print_section "Health Checks"
    docker-compose exec db mysqladmin ping -h localhost 2>/dev/null && print_success "Database: Healthy" || print_error "Database: Unhealthy"
}

# Cleanup
cleanup() {
    print_section "Cleaning Up"
    
    print_info "Removing unused Docker resources..."
    docker system prune -f
    
    print_success "Cleanup completed"
}

# Help
show_help() {
    cat << EOF
TechTrack Docker Deployment Helper

USAGE:
    $0 [command] [options]

COMMANDS:
    check             Check Docker installation
    build [prod]      Build Docker images (use 'prod' for production)
    start [prod]      Start all services
    stop              Stop all services
    logs [service]    View service logs (backend, frontend, db)
    status            Show service status
    migrate           Run Django migrations
    superuser         Create Django superuser
    static            Collect static files
    backup-db         Backup MySQL database
    restore-db FILE   Restore from backup file
    rebuild           Full rebuild of all services
    cleanup           Remove unused Docker resources
    help              Show this help message

EXAMPLES:
    # Start development environment
    $0 start

    # Build and start production
    $0 build prod
    $0 start prod

    # View backend logs
    $0 logs backend

    # Backup database
    $0 backup-db

    # Create superuser
    $0 superuser

EOF
}

# Main
main() {
    if [[ -z "$1" ]]; then
        show_help
        exit 0
    fi
    
    case "$1" in
        check)      check_docker ;;
        build)      build "$2" ;;
        start)      start "$2" ;;
        stop)       stop ;;
        logs)       logs "$2" ;;
        status)     status ;;
        migrate)    migrate ;;
        superuser)  create_superuser ;;
        static)     static ;;
        backup-db)  backup_db ;;
        restore-db) restore_db "$2" ;;
        rebuild)    rebuild ;;
        cleanup)    cleanup ;;
        help)       show_help ;;
        *)          print_error "Unknown command: $1"; show_help; exit 1 ;;
    esac
}

main "$@"
