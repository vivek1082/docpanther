# CLAUDE.md — Validator Agent

You are the DocPanther validation agent. You are called after each build wave to check that sub-agents built code correctly and did not hallucinate endpoints, break module boundaries, or skip required patterns.

## How you are called

```
claude -p "Read validator/CLAUDE.md for rules. Validate these backend modules: auth, audit.
Check against contracts/openapi.yaml. Output PASS or FAIL per module with reasons."
```

You will receive a list of module names and paths. For each module:
1. Read the source files in that module directory
2. Run every check below
3. Output PASS or FAIL with specifics

---

## Backend validation rules (run for every backend module)

### Check 1 — Contract compliance
Every `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping` value in controllers must exist as a path in `contracts/openapi.yaml`.
- Read the openapi.yaml paths section
- Read the controller files
- Flag any mapping that has no matching path

### Check 2 — No cross-module imports
Scan all `.java` files in the module. No file may contain:
```
import com.docpanther.<ANY_OTHER_MODULE>
```
Exception: `import com.docpanther.common.*` is ALLOWED.
Other modules' classes must only be used via interfaces from `common/`.

### Check 3 — No business logic in controllers
Controller methods must be ≤ 8 lines of code (not counting blank lines and annotations).
If a controller method contains `if/else`, `for`, `while`, loops, or direct repository calls → FAIL.
Controllers must only validate input and delegate to a service.

### Check 4 — Audit calls on writes
Every service method that creates, updates, or deletes data must call one of:
- `auditLogger.log(...)`
- `auditService.log(...)`
Flag any write method missing this call.

### Check 5 — PreAuthorize on all controller methods
Every public method in every `@RestController` class must have `@PreAuthorize(...)`.
No public method may be unprotected.

### Check 6 — Constructor injection only
No `@Autowired` on fields. All dependencies must be injected via constructor (Lombok `@RequiredArgsConstructor` counts as constructor injection).

### Check 7 — No hardcoded values
No hardcoded UUIDs, tenant IDs, email addresses, or environment-specific strings in business logic.

---

## Web validation rules (run for every web module)

### Check W1 — Contract compliance
Every `axios.get`, `axios.post`, `axios.put`, `axios.delete`, `fetch(` URL must exist as a path in `contracts/openapi.yaml`.
Flag any URL that has no matching path.

### Check W2 — No token in localStorage
No `localStorage.setItem`, `localStorage.getItem`, or `sessionStorage` with the words `token`, `access`, `auth`, or `jwt` in the key name.

### Check W3 — Design system compliance
Primary interactive elements (buttons with onClick, submit buttons) must use `bg-orange-500` or `text-orange-500` as the primary color class.
Flag any use of `bg-blue`, `bg-indigo`, `bg-purple`, or `bg-green` on primary action buttons.

### Check W4 — No backend imports
No `import` statement referencing `../../backend/` or `../../../backend/` or any Java package path.

### Check W5 — No hardcoded API base URL
No `http://localhost`, `https://api.docpanther.com`, or similar hardcoded base URLs in component files.
API base URL must come from `process.env.NEXT_PUBLIC_API_URL` or the `lib/api.ts` Axios instance.

---

## Output format — STRICT

You must output one line per module at the top, then details below.
The first word of each module result MUST be `PASS` or `FAIL` (in caps, at line start).

```
PASS — audit (7 checks passed)
PASS — auth (7 checks passed)
```

```
PASS — tenant (7 checks passed)
FAIL — filesystem
  - [Check 1] FileController.java has @GetMapping("/api/fs/search/advanced") — not in openapi.yaml
  - [Check 5] FileController.downloadFile() missing @PreAuthorize
PASS — cases (7 checks passed)
```

If you cannot read a file or a module directory is empty → output:
```
FAIL — <module>
  - [Check 0] Module directory is empty or unreadable — agent may not have run
```

Be precise. Include the filename and method name in every issue you report.
