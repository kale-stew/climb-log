# climb-log Security Fixes (Embedded photos-api)

**Status: COMPLETE**

The embedded photos-api at `utils/photos-api.ts` has been updated.

---

## Summary

| Issue                   | Status                      | Notes                                       |
| ----------------------- | --------------------------- | ------------------------------------------- |
| SQL injection in PATCH  | Already fixed               | Uses Zod validation + parameterized queries |
| SQL injection in upload | Already fixed               | Uses parameterized INSERT                   |
| WebP format detection   | Fixed                       | Was storing WebP as "jpeg"                  |
| Auth on admin routes    | Handled by Astro middleware | `src/middleware.ts` checks JWT              |

---

## Change Made

### WebP Format Detection (line 922-930)

**Before:**

```ts
const format = file.type === 'image/png' ? 'png' : 'jpeg'
```

**After:**

```ts
const formatMap: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const format = formatMap[file.type] ?? 'jpeg'
```

---

## Already Secure

### PATCH Handler (lines 637-713)

Uses Zod validation with `zValidator` and parameterized queries:

```ts
app.patch(
  "/api/admin/photos/:id",
  zValidator("json", updatePhotoSchema, ...),
  async (c) => {
    // ... builds parameterized query
    await env.DB.prepare(`UPDATE photos SET ${setClause} WHERE id = ?`)
      .bind(...updateValues)
      .run();
  }
);
```

### Upload Handler (lines 945-964)

Uses parameterized INSERT:

```ts
await env.DB.prepare(`
  INSERT INTO photos (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(id, shortId, r2Key, title, ...).run();
```

### Auth Layer

climb-log has a two-layer auth system:

1. **Astro middleware** (`src/middleware.ts`) — checks `Cf-Access-Jwt-Assertion` OR `Authorization: Bearer <CRON_SECRET>` for all `/admin/*` and `/api/admin/*` routes

2. **Embedded app middleware** (`utils/photos-api.ts:317-323`) — secondary JWT check

The outer Astro layer handles auth before requests reach the embedded app.

---

## Architecture Note

climb-log embeds a copy of photos-api rather than calling it over the network. This means:

- Fixes to photos-api don't automatically propagate here
- The embedded copy uses its own D1 (`climb-log-db`) and R2 (`climb-log-images`)
- Auth is handled differently (Astro middleware vs. standalone Worker)

Consider extracting a shared package if maintenance becomes burdensome.

---

## Testing

```bash
# Type check
npm run typecheck

# Manual tests:
# 1. Upload WebP image → verify format="webp" in DB
# 2. Access /admin/photos without Cloudflare Access → should 401
# 3. POST /api/admin/photos/upload without JWT → should 401
```
