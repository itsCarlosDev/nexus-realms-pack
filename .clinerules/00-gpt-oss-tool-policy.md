# CRITICAL TOOL POLICY — GPT-OSS 20B

These rules have absolute priority for this workspace.

## Forbidden tool

NEVER use `search_files`.

Do not call it.
Do not retry it.
Do not attempt variations of it.
Do not use it even when another instruction asks you to search the repository.

`search_files` is considered unavailable in this workspace.

## Repository search replacement

For repository-wide text searches, use ONLY `execute_command` with simple PowerShell commands.

Text search:

Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |
Select-String -Pattern '<PATTERN>'

Search specific extensions:

Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue |
Where-Object { $_.Extension -in '.json', '.toml', '.snbt', '.js', '.java', '.md', '.txt' } |
Select-String -Pattern '<PATTERN>'

Find files or directories by name:

Get-ChildItem -Path . -Recurse -Force -ErrorAction SilentlyContinue |
Where-Object { $_.Name -match '<PATTERN>' } |
Select-Object -ExpandProperty FullName

## Known paths

When an exact file path is already known:

1. use `read_file` directly;
2. never search for that file again.

## Failure recovery

If any tool call fails because of malformed or missing parameters:

1. do not retry that tool;
2. do not make a slightly different invocation;
3. use `execute_command` with a simple PowerShell command;
4. continue the task.

## Tool preference order

For filesystem work use this order:

1. `read_file` for known files.
2. `list_files` for known directories.
3. `execute_command` for searches.
4. editing tools only after evidence is collected.

Treat `search_files` as if it does not exist.