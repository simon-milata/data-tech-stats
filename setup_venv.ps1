Write-Host "Starting Environment Setup."

if (!(Test-Path .venv)) {
    Write-Host "Creating Virtual Environment..."
    python -m venv .venv
}

Write-Host "Activating Environment..."
& .\.venv\Scripts\Activate.ps1

Write-Host "Installing Common Layer..."
pip install -e ./backend/layers/common_layer/python

Write-Host "Installing Extract Requirements..."
pip install -r ./backend/extract/requirements.txt

Write-Host "Installing Aggregate Requirements..."
pip install -r ./backend/aggregate/requirements.txt

Write-Host "Installing API Requirements..."
pip install -r ./backend/api/requirements.txt

Write-Host "Setup Complete!"