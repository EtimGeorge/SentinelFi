Failed to compile
./hooks/useAuthHooks.ts
Error: 
  × Expression expected
     ╭─[C:\temp\SentinelFi\frontend\hooks\useAuthHooks.ts:223:1]
 223 │ 
 224 │ 
 225 │   if (!isInitialized || isLoading) return null; // Or a loading spinner
 226 │   return canAccess ? <>{children}</> : <>{fallback}</>;
     ·                       ─
 227 │ };
 228 │ 
 229 │ // ============================================================================
     ╰────

  × Expression expected
     ╭─[C:\temp\SentinelFi\frontend\hooks\useAuthHooks.ts:223:1]
 223 │ 
 224 │ 
 225 │   if (!isInitialized || isLoading) return null; // Or a loading spinner
 226 │   return canAccess ? <>{children}</> : <>{fallback}</>;
     ·                                                       ─
 227 │ };
 228 │ 
 229 │ // ============================================================================
     ╰────

Caused by:
    Syntax Error
This error occurred during the build process and can only be dismissed by fixing the error.