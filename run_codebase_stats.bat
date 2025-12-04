@echo off
echo File Count Analysis
echo # Total TypeScript/React files
powershell -command "(Get-ChildItem -Path 'client/src' -Recurse -Include '*.ts','*.tsx').Count"
echo # Utils directory file count
powershell -command "(Get-ChildItem -Path 'client/src/utils' -Recurse -Include '*.ts','*.tsx').Count"
echo # Components directory file count
powershell -command "(Get-ChildItem -Path 'client/src/components' -Recurse -Include '*.ts','*.tsx').Count"
echo # Hooks directory file count
powershell -command "(Get-ChildItem -Path 'client/src/hooks' -Recurse -Include '*.ts','*.tsx').Count"
echo # Services directory file count
powershell -command "(Get-ChildItem -Path 'client/src/services' -Recurse -Include '*.ts','*.tsx').Count"
echo # Test files count
powershell -command "(Get-ChildItem -Path 'client/src' -Recurse -Include '*.test.ts','*.test.tsx','*.spec.ts','*.spec.tsx').Count"
echo File Size Analysis
echo # Line counts for key files
powershell -command "(Get-Content 'client/src/utils/logger.ts' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/utils/asset-manager.ts' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/utils/performance-monitor.ts' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/utils/error-system.ts' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/utils/secure-token-manager.ts' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/components/error-handling/ErrorBoundary.tsx' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/store/middleware/authMiddleware.ts' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/components/AppProviders.tsx' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/App.tsx' | Measure-Object -Line).Lines"
powershell -command "(Get-Content 'client/src/main.tsx' | Measure-Object -Line).Lines"
echo # Top 10 largest files in utils
powershell -command "Get-ChildItem -Path 'client/src/utils' -Recurse -Include '*.ts','*.tsx' | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; [PSCustomObject]@{File=$_.Name; Lines=$lines} } | Sort-Object -Property Lines -Descending | Select-Object -First 10"
echo # Top 10 largest files in components
powershell -command "Get-ChildItem -Path 'client/src/components' -Recurse -Include '*.ts','*.tsx' | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; [PSCustomObject]@{File=$_.Name; Lines=$lines} } | Sort-Object -Property Lines -Descending | Select-Object -First 10"
echo # All utils files with line counts
powershell -command "Get-ChildItem -Path 'client/src/utils' -Recurse -Include '*.ts','*.tsx' | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; [PSCustomObject]@{File=$_.FullName; Lines=$lines} } | Sort-Object -Property Lines -Descending"
echo Code Quality Analysis
echo # Count of 'any' type usage
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'any').Count"
echo # Count of TODO/FIXME comments
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'TODO|FIXME').Count"
echo # Count of console.log statements (potential debug code)
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'console\.log').Count"
echo # Count of @ts-ignore comments
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern '@ts-ignore').Count"
echo # Count of eslint-disable comments
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'eslint-disable').Count"
echo Dependency Analysis
echo # Count of external imports
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'from [''\"']@').Count"
echo # Count of relative imports
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'from [''\"']\.\./').Count"
echo # Most imported external packages
powershell -command "Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'from [''\"']' | Where-Object { $_.Line -notmatch 'from [''\"']\.\./' -and $_.Line -notmatch 'from [''\"']\.' } | ForEach-Object { $_.Line -replace '.*from [''\"']', '' -replace '[[''\"']].*', '' } | Group-Object | Sort-Object -Property Count -Descending | Select-Object -First 20"
echo Architecture Analysis
echo # Count of React hooks usage
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'use[A-Z]').Count"
echo # Count of custom hooks
powershell -command "(Get-ChildItem -Path 'client/src/hooks' -Recurse -Include '*.ts','*.tsx').Count"
echo # Count of Redux/Zustand usage
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'useSelector|useDispatch|useStore').Count"
echo # Count of React Query usage
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'useQuery|useMutation').Count"
echo # Count of error boundaries
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'ErrorBoundary|componentDidCatch').Count"
echo Testing Analysis
echo # Test coverage by directory
powershell -command "Get-ChildItem -Path 'client/src' -Recurse -Include '*.test.ts','*.test.tsx' | Group-Object -Property { $_.DirectoryName } | Select-Object Name, Count"
echo # Mock usage in tests
powershell -command "(Select-String -Path 'client/src/__tests__' -Recurse -Include '*.ts','*.tsx' -Pattern 'mock|Mock').Count"
echo # Vitest/Jest usage
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.test.ts','*.test.tsx' -Pattern 'describe|it|test|expect').Count"
echo Performance Analysis
echo # Lazy loading usage
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'lazy|Suspense').Count"
echo # Dynamic imports
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'import\(').Count"
echo # Performance monitoring
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'performance|Performance').Count"
echo Security Analysis
echo # Potential security issues
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'localStorage|sessionStorage').Count"
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'innerHTML|dangerouslySetInnerHTML').Count"
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'eval|Function\(').Count"
echo # Authentication patterns
powershell -command "(Select-String -Path 'client/src' -Recurse -Include '*.ts','*.tsx' -Pattern 'token|auth|login|logout').Count"
echo Build Configuration Analysis
echo # Check package.json dependencies
powershell -command "(Get-Content 'client/package.json' | ConvertFrom-Json).dependencies.PSObject.Properties.Count"
powershell -command "(Get-Content 'client/package.json' | ConvertFrom-Json).devDependencies.PSObject.Properties.Count"
echo # TypeScript configuration
powershell -command "(Get-Content 'client/tsconfig.json' | ConvertFrom-Json).compilerOptions.strict"
powershell -command "((Get-Content 'client/tsconfig.json' | ConvertFrom-Json).include).Count"
powershell -command "((Get-Content 'client/tsconfig.json' | ConvertFrom-Json).exclude).Count"
echo File Structure Analysis
echo # Directory structure depth
powershell -command "(Get-ChildItem -Path 'client/src' -Recurse -Directory | ForEach-Object { ($_.FullName -split '\\').Count - ($_.FullName.IndexOf('client\src') + 1) } | Measure-Object -Maximum).Maximum"
echo # Files per directory
powershell -command "Get-ChildItem -Path 'client/src' -Recurse -Directory | ForEach-Object { $count = (Get-ChildItem -Path $_.FullName -File -Include '*.ts','*.tsx').Count; [PSCustomObject]@{Directory=$_.FullName; Count=$count} } | Sort-Object -Property Count -Descending | Select-Object -First 10"
echo # Empty directories
powershell -command "Get-ChildItem -Path 'client/src' -Recurse -Directory | Where-Object { (Get-ChildItem -Path $_.FullName).Count -eq 0 }"