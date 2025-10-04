#!/bin/bash

# Test runner script for Kakille AI Backend
# Usage: ./run_tests.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
RUN_UNIT=true
RUN_INTEGRATION=true
COVERAGE=true
VERBOSE=false
HTML_REPORT=false
FAIL_UNDER=80

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_INTEGRATION=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            shift
            ;;
        --no-coverage)
            COVERAGE=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --html)
            HTML_REPORT=true
            shift
            ;;
        --fail-under)
            FAIL_UNDER="$2"
            shift 2
            ;;
        --help|-h)
            echo "Kakille AI Backend Test Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --unit-only          Run only unit tests"
            echo "  --integration-only   Run only integration tests"  
            echo "  --no-coverage        Skip coverage reporting"
            echo "  --verbose, -v        Verbose output"
            echo "  --html               Generate HTML coverage report"
            echo "  --fail-under NUM     Minimum coverage percentage (default: 80)"
            echo "  --help, -h           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🧪 Kakille AI Backend Test Suite${NC}"
echo "=================================="

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest not found. Please install test dependencies:${NC}"
    echo "pip install -r requirements.txt"
    exit 1
fi

# Build test command
PYTEST_CMD="pytest"

# Add test paths
if [[ "$RUN_UNIT" == true && "$RUN_INTEGRATION" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD tests/"
    echo -e "${BLUE}Running: Unit + Integration Tests${NC}"
elif [[ "$RUN_UNIT" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD tests/unit/"
    echo -e "${BLUE}Running: Unit Tests Only${NC}"
elif [[ "$RUN_INTEGRATION" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD tests/integration/"
    echo -e "${BLUE}Running: Integration Tests Only${NC}"
fi

# Add coverage options
if [[ "$COVERAGE" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD --cov=app --cov-report=term-missing --cov-fail-under=$FAIL_UNDER"
    if [[ "$HTML_REPORT" == true ]]; then
        PYTEST_CMD="$PYTEST_CMD --cov-report=html:htmlcov"
    fi
fi

# Add verbose option
if [[ "$VERBOSE" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD -v"
fi

# Add other useful options
PYTEST_CMD="$PYTEST_CMD --tb=short --strict-markers"

echo "Command: $PYTEST_CMD"
echo ""

# Run the tests
if eval $PYTEST_CMD; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    
    if [[ "$HTML_REPORT" == true ]]; then
        echo -e "${YELLOW}📊 HTML coverage report generated in htmlcov/index.html${NC}"
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi