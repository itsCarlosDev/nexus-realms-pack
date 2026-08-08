# Safe class-change administration

## Commands

```mcfunction
/nexus_changeclass <player> <warrior|mage|arcanist|metallurgist|gunslinger>
/nexus_repairclass <player>
/nexus_changeclass_status <player>
/nexus_changeclass_clearcooldown <player>
```

All four administrative commands require permission level 2 and an online target. A return value of `1` means the requested operation was fully verified. Any rejection, rollback, or pending recovery returns `0`.

The public `/nexus_select` command delegates to the same authority for initial selection. Its player-facing destinations are `warrior`, `arcanist`, `metallurgist`, and `gunslinger`; `mage` remains as a compatibility target. Initial selection remains free, preserves inventory, creates no cooldown, and delivers the existing class/specialization starter kit atomically.

`/nexus_resetclass` and `/nexus_resetclass_clean` are deliberately disabled because they bypassed the transaction authority.

## Later class changes

A later change costs exactly 41 Minecraft levels and starts a 12-hour cooldown from the transaction `started_at` value. Normal inventory, hotbar, cursor, crafting grid, Ender Chest, and stored Curios are preserved. Only equipped items incompatible with the destination are moved safely into the main inventory, and preflight rejects the change before charging when all required moves cannot fit.

An external menu is never snapshotted or cleared. The first activation closes it and reports `interfaz cerrada; activa de nuevo el altar`; activate the altar or command again after returning to the player inventory.

History Stages remains the restriction authority. The transaction leaves exactly one main-class stage and only a compatible specialization stage. Nexus Core suppresses intermediate class packets and sends a forced class/specialization sync after commit, rollback, or repair.

## Journal and recovery

The durable phases are:

`PREPARED -> COST_RESERVED -> SANITIZING -> OLD_STATE_REVOKED -> NEW_STATE_APPLIED -> KIT_APPLIED -> VERIFYING -> COMMITTING -> COMPLETED`

Before `OLD_STATE_REVOKED`, failures restore the old inventory, cursor, crafting grid, Curios, XP, class, specialization, tags, stages, and Allomancy snapshot. No cooldown is written.

`OLD_STATE_REVOKED` is the forward-recovery boundary. At or after it, the server keeps completing the new class, never charges XP again, and delivers only kit deficits. Login retries a pending journal at most three times.

Use `/nexus_changeclass_status <player>` to inspect raw/authoritative class, tags, stages, specialization, Allomancy count, lock, journal phase, timestamps, cooldown, and coherence.

Use `/nexus_changeclass_clearcooldown <player>` only for administrative QA. It refuses to run while a lock or journal is active and removes only the paired class-change cooldown timestamps; class, specialization, transaction history, inventory, XP, and recovery state remain unchanged.

## Repair

`/nexus_repairclass` first processes a pending journal. With no journal, the exact persistent value `warrior`, `mage`, or `gunslinger` is authoritative. An absent or invalid value means no class; tags and stages are not used to infer one.

Repair has no XP cost, cooldown, or kit. It reconciles chosen state, tags, History Stages, specialization, structural Mage compatibility, and Allomancy. It fixes cooldown only when the timestamp pair is demonstrably corrupt. Confirmed incompatible equipped armor/offhand/Curios are moved to the vanilla main inventory only when every affected stack fits; nothing is dropped or deleted.

## Metalomante

Metalomante requires only the structural state `nexus_class=mage` plus `nexus_specialization=metallurgist`. It is available without Era III and without `nexus_specialization_metallurgist_unlocked`; that old key is retained only as historical metadata. Global era stages may still balance access to Allomancy items, but they do not authorize the specialization. Allomancy powers are managed through the public capability, synchronized through `Network.sync`, and verified after grant/revocation.

## Offline escalation

If recovery remains `RECOVERY_REQUIRED` after three attempts:

1. Stop the server cleanly and make a save backup.
2. Do not delete the journal, inventory snapshot, or playerdata manually on the live save.
3. Record `/nexus_changeclass_status <player>` and the `[NexusClassAudit]` lines from `latest.log`.
4. Preserve `nexus_class_change_phase`, `tx_id`, `old_class`, `new_class`, `started_at`, `snapshot`, `recovery_mode`, `attempts`, and `last_error` for diagnosis.
5. Diagnose the missing mod/API, changed Curios layout, invalid History Stage definition, or unavailable inventory capacity in a copy of the save.
6. Restart only after the demonstrated cause is corrected. Login never exceeds the bounded three automatic attempts.
7. Run `/nexus_repairclass <player>` once. This explicit administrative action opens a new bounded recovery window and records `manual_recovery_retry` in the audit log; it does not remove the journal or infer a class from tags/stages.

Runtime behavior must be validated in Minecraft before declaring the feature operational.
