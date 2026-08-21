# QWEN 3.8 — NEXUS REALMS AGENT POLICY

This policy applies when the workspace is operated with Qwen 3.8 through Cline.

Its purpose is to maximize reliability, preserve architectural constraints, minimize hallucinations, and avoid wasting context.

---

# 1. AUTHORITATIVE PROJECT INSTRUCTIONS

`AGENTS.md` is the authoritative project instruction file.

Before performing any repository-specific implementation or audit:

1. Read `AGENTS.md`.
2. Treat its architectural declarations as constraints, not suggestions.
3. Repository code does NOT override an explicit architectural rule in `AGENTS.md` merely because that code exists.
4. If code appears to conflict with `AGENTS.md`, report the conflict before modifying anything.

Never infer architectural authority from:

* file size;
* number of call sites;
* location inside Nexus Core;
* implementation complexity;
* apparent convenience.

If `AGENTS.md` declares a system authoritative, that declaration takes precedence unless repository evidence proves the instruction file is stale or the user explicitly changes the architecture.

---

# 2. MANDATORY PRE-TASK CHECK

Before modifying files, verify:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short
```

The repository root must be the active `NexusRealms_dev` worktree.

The active branch must be:

```text
dev
```

If either condition is false:

STOP.

Do not switch branches automatically.

Do not change directories to another repository copy.

Record the initial `git status --short`.

Existing modified or untracked files belong to the user or another agent unless evidence proves otherwise.

---

# 3. ARCHITECTURE BEFORE IMPLEMENTATION

Before implementing a repository-specific feature or fix:

1. Identify the subsystem involved.
2. Read the relevant section of `AGENTS.md`.
3. Inspect the existing implementation.
4. Identify the authoritative system.
5. Search for relevant call sites/configuration only when needed.
6. Determine whether the requested approach conflicts with existing architecture.
7. Modify only after the architecture is understood.

Never implement a "quick fix" that creates a parallel system when an authoritative system already exists.

If the user asks for an implementation that conflicts with `AGENTS.md`:

DO NOT blindly follow the requested implementation.

Explain the conflict and investigate the existing architecture first.

---

# 4. EVIDENCE DISCIPLINE

Repository-specific claims must be supported by evidence.

Valid evidence includes:

* `AGENTS.md`;
* source code;
* configuration;
* Git history;
* Git diff;
* runtime logs;
* command output;
* actual build/test output;
* JAR inspection when necessary.

Never invent:

* file paths;
* classes;
* methods;
* events;
* registry IDs;
* mod IDs;
* item IDs;
* entity IDs;
* configuration fields;
* command syntax;
* runtime behavior.

Use these labels when uncertainty matters:

```text
VERIFIED
INFERRED
NOT VERIFIED
```

`VERIFIED` means direct evidence was inspected.

`INFERRED` means the conclusion follows reasonably from evidence but was not directly demonstrated.

`NOT VERIFIED` means the available evidence cannot establish the claim.

Never upgrade `INFERRED` or `NOT VERIFIED` to `VERIFIED` merely because an implementation looks plausible.

---

# 5. SOURCE CODE DOES NOT PROVE RUNTIME

Compilation proves compilation only.

Tests prove only what those tests cover.

Static source inspection does not prove Minecraft runtime behavior.

Do not say:

```text
fixed
working
resolved
fully functional
```

unless the required validation actually occurred.

Instead distinguish:

```text
Build verified.
Tests verified.
Runtime NOT VERIFIED.
```

For Minecraft-specific behavior, runtime validation may require:

* launching the development environment;
* reproducing the scenario;
* inspecting `latest.log`;
* observing the actual in-game result.

---

# 6. CONTEXT DISCIPLINE

The model has limited active context.

Do not waste context on large irrelevant outputs.

Never recursively enumerate the entire repository unless the task genuinely requires it.

Avoid commands such as:

```powershell
Get-ChildItem -Recurse
```

against the entire repository without filters.

Prefer targeted inspection.

Good:

```powershell
Get-ChildItem .\nexus-core\src -Recurse -File -Filter *.java |
Select-String -Pattern "ClassRules"
```

Bad:

```powershell
Get-ChildItem . -Recurse
```

Do not inspect generated/runtime directories unless relevant:

```text
nexus-core/build/
nexus-core/.gradle/
nexus-core/run/
dist/
generated/
backup_mod_metadata/
.nexus-disabled-mods/
```

Do not dump complete large files when only a small relevant section is required.

Prefer:

1. exact known file;
2. relevant section;
3. targeted search;
4. broader search only if necessary.

---

# 7. KNOWN PATHS

When an exact path is already known:

READ THAT FILE DIRECTLY.

Do not search the repository to rediscover it.

Examples:

```text
AGENTS.md
nexus-core/src/main/java/dev/itscarlos/nexuscore/ClassRules.java
config/historystages/individual/
```

If a previous step already identified the relevant file, continue from that file.

Do not repeatedly rediscover known paths after context compaction.

---

# 8. SEARCH POLICY

Repository searches should be targeted and read-only.

Prefer searching the smallest relevant directory.

Example:

```powershell
Get-ChildItem .\nexus-core\src -Recurse -File |
Where-Object { $_.Extension -eq ".java" } |
Select-String -Pattern "requiredClassForItem"
```

For configuration:

```powershell
Get-ChildItem .\config\historystages -Recurse -File |
Where-Object { $_.Extension -eq ".json" } |
Select-String -Pattern "tacz"
```

Search broadly only when targeted searches fail.

If no result is found:

1. verify the search path;
2. verify the search term;
3. broaden scope carefully;
4. inspect nearby architecture;
5. only then conclude that something is absent.

---

# 9. DO NOT CONFUSE RELATED SYSTEMS WITH AUTHORITATIVE SYSTEMS

Finding related logic does not make that logic authoritative.

When multiple systems participate in a feature, identify their responsibilities separately.

Use this reasoning structure:

```text
SYSTEM
Responsibility:
Evidence:
Authority:
Relationship to other systems:
```

Example reasoning:

```text
History Stages
Responsibility: ...
Authority: VERIFIED / INFERRED / NOT VERIFIED

Nexus Core
Responsibility: ...
Authority: ...

KubeJS
Responsibility: ...
Authority: ...
```

Do not collapse multiple responsibilities into one architecture merely because they interact.

---

# 10. CONFLICT CHECK BEFORE EDITING

Before the first edit, internally verify:

```text
Does this implementation contradict AGENTS.md?

Am I introducing a parallel system?

Am I duplicating existing behavior?

Am I assuming an API or identifier?

Have I inspected the authoritative implementation?

Do I know why the current behavior fails?
```

If any answer is uncertain:

INVESTIGATE FIRST.

Do not edit yet.

---

# 11. MODIFICATION DISCIPLINE

Implement only the requested scope.

Do not opportunistically:

* refactor unrelated code;
* rename unrelated files;
* update unrelated mods;
* introduce dependencies;
* redesign working systems;
* clean unrelated code;
* change formatting across unrelated files.

Before modifying a file already changed in Git:

```powershell
git diff -- <FILE>
```

Understand and preserve pre-existing changes.

---

# 12. GIT SAFETY

Never automatically run:

```text
git add
git commit
git push
git reset
git restore
git stash
git clean
```

Never automatically stage changes.

Never push.

Never modify `main`.

Never discard user changes.

Never create or delete branches unless explicitly requested.

Git is evidence and safety infrastructure, not permission to overwrite work.

---

# 13. VALIDATION LOOP

For implementation tasks, do not stop immediately after editing.

Use the strongest validation available for the affected subsystem.

Typical sequence:

```text
inspect
↓
implement
↓
static checks
↓
build
↓
tests
↓
inspect failure
↓
correct
↓
repeat validation
↓
git diff
↓
final report
```

If a validation fails:

1. read the actual error;
2. identify the demonstrated cause;
3. correct only that cause;
4. rerun the relevant validation.

Do not guess fixes repeatedly.

Do not declare success while required checks are still failing.

---

# 14. COMPLETION CRITERIA

An implementation task is not complete merely because code was written.

Before declaring completion, verify as applicable:

```text
[ ] requested behavior implemented
[ ] architecture respected
[ ] no unrelated files changed
[ ] static checks pass
[ ] build passes
[ ] relevant tests pass
[ ] git diff reviewed
[ ] final git status reviewed
[ ] runtime status clearly identified
```

If runtime was not tested:

say explicitly:

```text
Runtime: NOT VERIFIED
```

---

# 15. AUDIT MODE

If the user requests an audit, investigation, review, diagnosis, or read-only task:

DO NOT MODIFY FILES.

Do not create helper files.

Do not "fix while auditing".

Investigate and report only.

At the end show:

```text
Initial Git status:
Final Git status:
Files modified: NONE
```

If modifications occurred accidentally:

report them immediately.

Do not hide or automatically revert them.

---

# 16. CONTEXT COMPACTION / RESUME

After context compaction, task resume, summarization or long tool sequences:

Do not reconstruct the entire repository.

Recover state using:

1. `AGENTS.md` if architectural rules are needed;
2. `git status --short`;
3. the exact files already identified;
4. their current diff when relevant;
5. remaining task requirements.

Before an architectural decision after context compaction, re-check the relevant section of `AGENTS.md`.

Do not rely solely on a compressed summary for architectural authority.

---

# 17. FINAL RESPONSE REQUIREMENTS

For implementation work, report:

```text
Result:
Files changed:
Why:
Validation:
Build:
Tests:
Runtime:
Git status:
Remaining uncertainty:
```

For audit work, report:

```text
VERIFIED:
INFERRED:
NOT VERIFIED:

Relevant files:
Evidence:
Git status:
Files modified: NONE
```

Do not claim more certainty than the evidence supports.

---

# CORE PRINCIPLE

Reliability is more important than speed.

The correct sequence is:

```text
READ RULES
↓
VERIFY REPOSITORY
↓
IDENTIFY ARCHITECTURE
↓
COLLECT EVIDENCE
↓
IMPLEMENT
↓
VALIDATE
↓
RECHECK
```

Never replace that sequence with:

```text
ASSUME
↓
IMPLEMENT QUICKLY
```
