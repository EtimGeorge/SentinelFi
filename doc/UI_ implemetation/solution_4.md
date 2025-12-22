### STEP 103 - Create Index Redirect Page

**GUIDANCE:** We are creating the root entry page (`/pages/index.tsx`). This page ensures that unauthenticated users are sent to the `/login` page and authenticated users are sent to their appropriate starting dashboards based on their role, completing the application's foundational navigation flow.

**FILE PATH:** `./frontend/pages/index.tsx` (REPLACE entire file content)

```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, Role } from '../components/context/AuthContext';
import Head from 'next/head';

/**
 * The Root Page (/) serves only as a redirector based on authentication status.
 */
const IndexPage: React.FC = () => {
  const { isAuthenticated, user, isInitialLoad } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state has been checked
    if (isInitialLoad) return;

    if (!isAuthenticated) {
      // Unauthenticated users go to the login page
      router.replace('/login');
      return;
    }

    // Authenticated users are routed based on their primary role (as per the PRD/UX)
    if (user) {
      if (user.role === Role.CEO || user.role === Role.Finance || user.role === Role.Admin || user.role === Role.ITHead) {
        router.replace('/dashboard/ceo'); // Executive Dashboard
      } else if (user.role === Role.AssignedProjectUser) {
        // Direct the Assigned Project User to the primary write operation interface
        router.replace('/expense/tracker');
      } else {
        // Fallback for other authenticated roles
        router.replace('/dashboard/home');
      }
    }
  }, [isAuthenticated, user, isInitialLoad, router]);

  return (
    <>
      <Head>
        <title>SentinelFi</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-brand-dark">Redirecting to SentinelFi Dashboard...</div>
      </div>
    </>
  );
};

export default IndexPage;
```

NEXT ACTION: Save and overwrite the existing `./frontend/pages/index.tsx`.

---

### Phase 4 Summary: UI Refinement (Complete)

| Deliverable | Status | Detail |
| :--- | :--- | :--- |
| Centralized Logo Component | **COMPLETE** | `components/common/Logo.tsx` created for performance and consistency. |
| Logo Usage Update | **COMPLETE** | Login and Nav components use the new `<Logo>` component. |
| Index Redirect Page | **COMPLETE** | `/pages/index.tsx` handles initial routing based on authentication status and role. |

Phase 1 of the UI plan is complete. We can now proceed to Phase 2: Complete the CEO Dashboard.



