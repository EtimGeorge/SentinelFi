$ports = @(3000, 3001)

foreach ($port in $ports) {
    try {
        $pids = (netstat -ano | Select-String ":$port\s" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique)
        
        if ($pids) {
            Write-Host "Found processes on port $port with PIDs: $($pids -join ', ')"
            foreach ($pid in $pids) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    Write-Host "Terminated process with PID $pid on port $port."
                } catch {
                    # This block catches errors specifically from Stop-Process
                    Write-Warning "Could not terminate process with PID $pid. Error: $_"
                }
            }
        } else {
            Write-Host "No processes found on port $port."
        }
    } catch {
        # This block catches errors from the netstat command or other parts of the script
        Write-Error "An error occurred while checking port $port. Error: $_"
    }
}