# Manual Database Queries

Files in this directory are not migrations and are never executed automatically.

- `read/` queries inspect linked or local state without changing it.
- `verify/` queries may use transactions and `SET LOCAL ROLE`, but must roll
  back and leave no persistent state.
- Mutating operational SQL requires a documented use case, target environment,
  backup, and explicit execution intent before an `ops/` directory is added.

Run a query against an explicitly selected database:

```bash
npx supabase db query --local --file supabase/queries/read/audit_baseline_state.sql
npx supabase db query --linked --file supabase/queries/read/audit_baseline_state.sql
```

Do not treat successful execution as proof that a migration is safe to deploy.
Migration history, grants, RLS behavior, application tests, and destructive SQL
still require separate review.
