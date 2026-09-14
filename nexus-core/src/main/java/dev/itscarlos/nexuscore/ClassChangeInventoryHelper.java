package dev.itscarlos.nexuscore;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtAccounter;
import net.minecraft.nbt.NbtIo;
import net.minecraft.nbt.Tag;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.Container;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.inventory.InventoryMenu;
import net.minecraft.world.item.ItemStack;
import top.theillusivec4.curios.api.CuriosApi;
import top.theillusivec4.curios.api.type.capability.ICuriosItemHandler;
import top.theillusivec4.curios.api.type.inventory.ICurioStacksHandler;
import yesman.epicfight.world.capabilities.EpicFightCapabilities;

/**
 * Server-thread inventory operations that are unsafe to reproduce in Rhino.
 * Class state, stages, journals, cooldowns and kits remain owned by KubeJS.
 */
public final class ClassChangeInventoryHelper {
    public static final int SNAPSHOT_VERSION = 1;
    public static final int MAX_SNAPSHOT_BYTES = 1_048_576;

    private static final String KEY_VERSION = "Version";
    private static final String KEY_VANILLA = "Vanilla";
    private static final String KEY_CURSOR = "Cursor";
    private static final String KEY_CRAFTING = "Crafting";
    private static final String KEY_CURIOS = "Curios";
    private static final String KEY_CURIOS_LAYOUT = "CuriosLayout";
    private static final String KEY_ID = "Id";
    private static final String KEY_STACKS = "Stacks";
    private static final String KEY_COSMETICS = "Cosmetics";
    private static final String KEY_IDENTIFIER = "Identifier";
    private static final String KEY_ITEMS = "Items";
    private static final String KEY_SLOT = "Slot";
    private static final String KEY_XP_LEVEL = "XpLevel";
    private static final String KEY_XP_TOTAL = "XpTotal";
    private static final String KEY_XP_PROGRESS = "XpProgress";

    private ClassChangeInventoryHelper() {
    }

    public static OperationResult capture(ServerPlayer player) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return threadCheck;
        }

        if (hasExternalMenu(player)) {
            return OperationResult.failure("external_menu_open");
        }

        ICuriosItemHandler curios = curios(player);
        if (curios == null) {
            return OperationResult.failure("curios_capability_unavailable");
        }

        CompoundTag snapshot = new CompoundTag();
        snapshot.putInt(KEY_VERSION, SNAPSHOT_VERSION);
        snapshot.put(KEY_VANILLA, player.getInventory().save(new ListTag()));
        snapshot.put(KEY_CURSOR, saveStack(player.containerMenu.getCarried()));
        snapshot.put(KEY_CRAFTING, saveContainer(player.inventoryMenu.getCraftSlots()));
        snapshot.put(KEY_CURIOS, curios.saveInventory(false));
        snapshot.put(KEY_CURIOS_LAYOUT, saveCuriosLayout(curios));
        snapshot.putInt(KEY_XP_LEVEL, player.experienceLevel);
        snapshot.putInt(KEY_XP_TOTAL, player.totalExperience);
        snapshot.putFloat(KEY_XP_PROGRESS, player.experienceProgress);

        OperationResult validation = validateSnapshot(snapshot);
        if (!validation.isOk()) {
            return validation;
        }

        return OperationResult.success(
            snapshot,
            validation.getSerializedBytes()
        );
    }

    public static OperationResult validateSnapshot(CompoundTag snapshot) {
        if (snapshot == null) {
            return OperationResult.failure("snapshot_missing");
        }

        if (
            snapshot.getInt(KEY_VERSION) != SNAPSHOT_VERSION
            || !snapshot.contains(KEY_VANILLA, Tag.TAG_LIST)
            || !snapshot.contains(KEY_CURSOR, Tag.TAG_COMPOUND)
            || !snapshot.contains(KEY_CRAFTING, Tag.TAG_LIST)
            || !snapshot.contains(KEY_CURIOS, Tag.TAG_LIST)
            || !snapshot.contains(KEY_CURIOS_LAYOUT, Tag.TAG_LIST)
            || !snapshot.contains(KEY_XP_LEVEL, Tag.TAG_INT)
            || !snapshot.contains(KEY_XP_TOTAL, Tag.TAG_INT)
            || !snapshot.contains(KEY_XP_PROGRESS, Tag.TAG_FLOAT)
        ) {
            return OperationResult.failure("snapshot_structure_invalid");
        }

        int level = snapshot.getInt(KEY_XP_LEVEL);
        int total = snapshot.getInt(KEY_XP_TOTAL);
        float progress = snapshot.getFloat(KEY_XP_PROGRESS);
        if (
            level < 0
            || total < 0
            || !Float.isFinite(progress)
            || progress < 0.0F
            || progress >= 1.0F
        ) {
            return OperationResult.failure("snapshot_experience_invalid");
        }

        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (DataOutputStream output = new DataOutputStream(bytes)) {
                NbtIo.write(snapshot, output);
            }

            int size = bytes.size();
            if (size > MAX_SNAPSHOT_BYTES) {
                return OperationResult.failure(
                    "snapshot_too_large:" + size
                );
            }

            CompoundTag decoded;
            try (
                DataInputStream input = new DataInputStream(
                    new ByteArrayInputStream(bytes.toByteArray())
                )
            ) {
                decoded = NbtIo.read(
                    input,
                    new NbtAccounter(MAX_SNAPSHOT_BYTES)
                );
            }

            if (!snapshot.equals(decoded)) {
                return OperationResult.failure("snapshot_round_trip_mismatch");
            }

            return OperationResult.success(snapshot, size);
        } catch (IOException | RuntimeException exception) {
            NexusCore.LOGGER.error(
                "Unable to serialize class-change snapshot",
                exception
            );
            return OperationResult.failure("snapshot_serialization_failed");
        }
    }

    public static OperationResult clearCoveredInventory(
        ServerPlayer player,
        CompoundTag snapshot
    ) {
        return OperationResult.failure("inventory_clear_disabled");
    }

    public static OperationResult restore(
        ServerPlayer player,
        CompoundTag snapshot
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return threadCheck;
        }

        OperationResult snapshotCheck = validateSnapshot(snapshot);
        if (!snapshotCheck.isOk()) {
            return snapshotCheck;
        }

        if (hasExternalMenu(player)) {
            return OperationResult.failure("external_menu_open");
        }

        OperationResult current = capture(player);
        if (current.isOk() && snapshot.equals(current.getSnapshot())) {
            return OperationResult.success(snapshot, snapshotCheck.getSerializedBytes());
        }

        if (!isCoveredInventoryEmpty(player)) {
            return OperationResult.failure("restore_target_not_empty");
        }

        ICuriosItemHandler curios = curios(player);
        if (curios == null) {
            return OperationResult.failure("curios_capability_unavailable");
        }

        OperationResult layoutCheck = validateCuriosLayout(
            curios,
            snapshot.getList(KEY_CURIOS_LAYOUT, Tag.TAG_COMPOUND),
            true
        );
        if (!layoutCheck.isOk()) {
            return layoutCheck;
        }

        player.getInventory().load(
            snapshot.getList(KEY_VANILLA, Tag.TAG_COMPOUND)
        );
        loadContainer(
            player.inventoryMenu.getCraftSlots(),
            snapshot.getList(KEY_CRAFTING, Tag.TAG_COMPOUND)
        );
        player.containerMenu.setCarried(
            ItemStack.of(snapshot.getCompound(KEY_CURSOR))
        );
        curios.loadInventory(
            snapshot.getList(KEY_CURIOS, Tag.TAG_COMPOUND)
        );
        restoreExperience(player, snapshot);
        markChanged(player);

        OperationResult restored = capture(player);
        if (!restored.isOk() || !snapshot.equals(restored.getSnapshot())) {
            return OperationResult.failure("restore_verification_failed");
        }

        return OperationResult.success(snapshot, snapshotCheck.getSerializedBytes());
    }

    /**
     * Completes an interrupted rollback while preserving additional stacks.
     * Snapshot contents are reconstructed first; current contents not already
     * represented by the snapshot are placed only in originally empty main-
     * inventory slots. Capacity is verified before any mutation.
     */
    public static OperationResult restoreRollback(
        ServerPlayer player,
        CompoundTag snapshot
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return threadCheck;
        }

        OperationResult snapshotCheck = validateSnapshot(snapshot);
        if (!snapshotCheck.isOk()) {
            return snapshotCheck;
        }

        if (hasExternalMenu(player)) {
            return OperationResult.failure("external_menu_open");
        }

        OperationResult current = capture(player);
        if (current.isOk() && snapshot.equals(current.getSnapshot())) {
            return OperationResult.success(
                snapshot,
                snapshotCheck.getSerializedBytes()
            );
        }

        ICuriosItemHandler curios = curios(player);
        if (curios == null) {
            return OperationResult.failure("curios_capability_unavailable");
        }

        OperationResult layoutCheck = validateCuriosLayout(
            curios,
            snapshot.getList(KEY_CURIOS_LAYOUT, Tag.TAG_COMPOUND),
            false
        );
        if (!layoutCheck.isOk()) {
            return layoutCheck;
        }

        RollbackPlan rollbackPlan = createRollbackPlan(
            player,
            curios,
            snapshot
        );
        if (!rollbackPlan.isOk()) {
            return OperationResult.failure(rollbackPlan.error());
        }

        player.getInventory().load(
            snapshot.getList(KEY_VANILLA, Tag.TAG_COMPOUND)
        );
        loadContainer(
            player.inventoryMenu.getCraftSlots(),
            snapshot.getList(KEY_CRAFTING, Tag.TAG_COMPOUND)
        );
        player.containerMenu.setCarried(
            ItemStack.of(snapshot.getCompound(KEY_CURSOR))
        );
        OperationResult curiosRestore = restoreCuriosRollback(
            curios,
            snapshot.getList(KEY_CURIOS, Tag.TAG_COMPOUND)
        );
        if (!curiosRestore.isOk()) {
            return curiosRestore;
        }
        applyPlannedMainInventory(
            player.getInventory(),
            rollbackPlan.plannedMain()
        );
        restoreExperience(player, snapshot);
        markChanged(player);

        OperationResult restored = capture(player);
        if (!restored.isOk()) {
            return OperationResult.failure(
                "rollback_restore_capture_failed:" + restored.getMessage()
            );
        }

        OperationResult restoredStackCheck = validateRollbackStackState(
            player,
            curios,
            snapshot,
            false,
            "rollback_restore_mismatch",
            rollbackPlan.plannedMain()
        );
        if (!restoredStackCheck.isOk()) {
            return restoredStackCheck;
        }

        CompoundTag restoredSnapshot = restored.getSnapshot();
        if (
            player.experienceLevel != snapshot.getInt(KEY_XP_LEVEL)
            || player.totalExperience != snapshot.getInt(KEY_XP_TOTAL)
            || Float.compare(
                player.experienceProgress,
                snapshot.getFloat(KEY_XP_PROGRESS)
            ) != 0
        ) {
            return OperationResult.failure("rollback_restore_mismatch:experience");
        }

        if (
            !snapshot.getList(KEY_CURIOS_LAYOUT, Tag.TAG_COMPOUND).equals(
                restoredSnapshot.getList(
                    KEY_CURIOS_LAYOUT,
                    Tag.TAG_COMPOUND
                )
            )
        ) {
            return OperationResult.failure("rollback_restore_mismatch:curios_layout");
        }

        if (
            !curiosMetadata(snapshot.getList(KEY_CURIOS, Tag.TAG_COMPOUND))
                .equals(
                    curiosMetadata(
                        restoredSnapshot.getList(
                            KEY_CURIOS,
                            Tag.TAG_COMPOUND
                        )
                    )
                )
        ) {
            return OperationResult.failure(
                "rollback_restore_mismatch:curios_metadata"
            );
        }

        return OperationResult.success(
            snapshot,
            snapshotCheck.getSerializedBytes(),
            rollbackPlan.extraStacks()
        );
    }

    public static OperationResult chargeExperience(
        ServerPlayer player,
        CompoundTag snapshot,
        int points
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return threadCheck;
        }

        OperationResult snapshotCheck = validateSnapshot(snapshot);
        if (!snapshotCheck.isOk()) {
            return snapshotCheck;
        }

        if (points <= 0) {
            return OperationResult.failure("experience_cost_invalid");
        }

        int originalLevel = snapshot.getInt(KEY_XP_LEVEL);
        int originalTotal = snapshot.getInt(KEY_XP_TOTAL);
        float originalProgress = snapshot.getFloat(KEY_XP_PROGRESS);

        if (
            player.experienceLevel != originalLevel
            || player.totalExperience != originalTotal
            || Float.compare(player.experienceProgress, originalProgress) != 0
        ) {
            return OperationResult.failure("experience_changed_after_snapshot");
        }

        if (originalTotal < points) {
            return OperationResult.failure("insufficient_experience");
        }

        player.giveExperiencePoints(-points);

        if (
            player.totalExperience != originalTotal - points
            || player.experienceLevel < 0
            || player.totalExperience < 0
            || !Float.isFinite(player.experienceProgress)
            || player.experienceProgress < 0.0F
            || player.experienceProgress >= 1.0F
        ) {
            restoreExperience(player, snapshot);
            return OperationResult.failure("experience_charge_not_exact");
        }

        return OperationResult.success(snapshot, snapshotCheck.getSerializedBytes());
    }

    public static void restoreExperience(
        ServerPlayer player,
        CompoundTag snapshot
    ) {
        player.experienceLevel = snapshot.getInt(KEY_XP_LEVEL);
        player.totalExperience = snapshot.getInt(KEY_XP_TOTAL);
        player.experienceProgress = snapshot.getFloat(KEY_XP_PROGRESS);
    }

    public static boolean hasExternalMenu(ServerPlayer player) {
        return player.containerMenu != player.inventoryMenu;
    }

    public static boolean closeExternalMenu(ServerPlayer player) {
        if (!hasExternalMenu(player)) {
            return false;
        }

        player.closeContainer();
        return true;
    }

    public static boolean isCoveredInventoryEmpty(ServerPlayer player) {
        Inventory inventory = player.getInventory();
        for (int index = 0; index < inventory.getContainerSize(); index++) {
            if (!inventory.getItem(index).isEmpty()) {
                return false;
            }
        }

        if (!player.containerMenu.getCarried().isEmpty()) {
            return false;
        }

        Container crafting = player.inventoryMenu.getCraftSlots();
        for (int index = 0; index < crafting.getContainerSize(); index++) {
            if (!crafting.getItem(index).isEmpty()) {
                return false;
            }
        }

        ICuriosItemHandler curios = curios(player);
        if (curios == null) {
            return false;
        }

        for (ICurioStacksHandler handler : curios.getCurios().values()) {
            for (int index = 0; index < handler.getSlots(); index++) {
                if (
                    !handler.getStacks().getStackInSlot(index).isEmpty()
                    || !handler.getCosmeticStacks().getStackInSlot(index).isEmpty()
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Inserts a starter-kit stack into the vanilla main inventory and reports
     * the native mutation result without exposing Rhino to ItemStack remainder
     * semantics. KubeJS remains responsible for the persistent delivery ledger.
     */
    public static OperationResult insertStarterStack(
        ServerPlayer player,
        ItemStack requestedStack
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return OperationResult.starterInsertionFailure(
                threadCheck.getMessage(),
                requestedStack == null ? 0 : requestedStack.getCount()
            );
        }

        if (requestedStack == null || requestedStack.isEmpty()) {
            return OperationResult.starterInsertionFailure(
                "starter_stack_invalid",
                0
            );
        }

        int requested = requestedStack.getCount();
        if (requested <= 0) {
            return OperationResult.starterInsertionFailure(
                "starter_stack_count_invalid",
                Math.max(0, requested)
            );
        }

        if (hasExternalMenu(player)) {
            return OperationResult.starterInsertionFailure(
                "external_menu_open",
                requested
            );
        }

        ItemStack remainingStack = requestedStack.copy();
        String reason;
        try {
            player.getInventory().add(remainingStack);
            reason = remainingStack.isEmpty()
                ? "inserted"
                : "insufficient_main_inventory_space";
        } catch (RuntimeException exception) {
            NexusCore.LOGGER.error(
                "Unable to insert starter-kit stack for {}",
                player.getGameProfile().getName(),
                exception
            );
            reason = "starter_inventory_insert_exception";
        }

        int remaining = Math.max(0, remainingStack.getCount());
        int inserted = Math.max(0, requested - remaining);
        if (inserted > 0) {
            markChanged(player);
        }

        return OperationResult.starterInsertion(
            remaining == 0,
            reason,
            requested,
            inserted,
            remaining
        );
    }

    /**
     * Native exact-stack count used only for one-shot legacy/in-flight ledger
     * reconciliation. A negative result means the inspection was unavailable.
     */
    public static int countMatchingStarterStack(
        ServerPlayer player,
        ItemStack desired
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (
            !threadCheck.isOk()
            || desired == null
            || desired.isEmpty()
        ) {
            return -1;
        }

        int count = 0;
        Inventory inventory = player.getInventory();
        for (int slot = 0; slot < inventory.getContainerSize(); slot++) {
            ItemStack current = inventory.getItem(slot);
            if (ItemStack.isSameItemSameTags(current, desired)) {
                count += current.getCount();
            }
        }
        return count;
    }

    /**
     * Moves only equipped items that are incompatible with the target class
     * into the vanilla main inventory. The complete move is capacity-
     * checked first; no item is dropped or deleted.
     */
    public static OperationResult unequipIncompatible(
        ServerPlayer player
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return threadCheck;
        }

        return unequipIncompatible(
            player,
            ClassData.getPlayerClass(player),
            true
        );
    }

    public static OperationResult checkUnequipCapacity(
        ServerPlayer player,
        String targetClassId
    ) {
        NexusClass targetClass = NexusClass.fromPersistentId(targetClassId);
        if (targetClass == NexusClass.NONE) {
            return OperationResult.failure("target_class_invalid");
        }

        return unequipIncompatible(player, targetClass, false);
    }

    public static OperationResult unequipIncompatibleForClass(
        ServerPlayer player,
        String targetClassId
    ) {
        NexusClass targetClass = NexusClass.fromPersistentId(targetClassId);
        if (targetClass == NexusClass.NONE) {
            return OperationResult.failure("target_class_invalid");
        }

        return unequipIncompatible(player, targetClass, true);
    }

    private static OperationResult unequipIncompatible(
        ServerPlayer player,
        NexusClass targetClass,
        boolean apply
    ) {
        OperationResult threadCheck = requireServerThread(player);
        if (!threadCheck.isOk()) {
            return threadCheck;
        }

        if (hasExternalMenu(player)) {
            return OperationResult.failure("external_menu_open");
        }

        ICuriosItemHandler curios = curios(player);
        if (curios == null) {
            return OperationResult.failure("curios_capability_unavailable");
        }

        List<EquippedStackRef> incompatible = new ArrayList<>();
        Inventory inventory = player.getInventory();

        for (int index = 0; index < inventory.armor.size(); index++) {
            final int slot = index;
            addIfIncompatible(
                targetClass,
                incompatible,
                inventory.armor.get(index),
                stack -> inventory.armor.set(slot, stack)
            );
        }

        for (int index = 0; index < inventory.offhand.size(); index++) {
            final int slot = index;
            addIfIncompatible(
                targetClass,
                incompatible,
                inventory.offhand.get(index),
                stack -> inventory.offhand.set(slot, stack)
            );
        }

        for (ICurioStacksHandler handler : curios.getCurios().values()) {
            for (int index = 0; index < handler.getSlots(); index++) {
                final int slot = index;
                addIfIncompatible(
                    targetClass,
                    incompatible,
                    handler.getStacks().getStackInSlot(index),
                    stack -> handler.getStacks().setStackInSlot(slot, stack)
                );
                addIfIncompatible(
                    targetClass,
                    incompatible,
                    handler.getCosmeticStacks().getStackInSlot(index),
                    stack -> handler.getCosmeticStacks().setStackInSlot(slot, stack)
                );
            }
        }

        if (incompatible.isEmpty()) {
            return OperationResult.success(null, 0, 0);
        }

        List<ItemStack> virtualMain = new ArrayList<>();
        for (ItemStack stack : inventory.items) {
            virtualMain.add(stack.copy());
        }

        for (EquippedStackRef reference : incompatible) {
            if (!insertVirtual(virtualMain, reference.stack().copy())) {
                return OperationResult.failure(
                    "insufficient_main_inventory_space"
                );
            }
        }

        if (!apply) {
            return OperationResult.success(null, 0, incompatible.size());
        }

        int moved = 0;
        for (EquippedStackRef reference : incompatible) {
            ItemStack moving = reference.stack();
            if (!insertExisting(inventory.items, moving)) {
                return OperationResult.failure(
                    "main_inventory_changed_during_unequip"
                );
            }

            reference.clear();
            moved++;
        }

        markChanged(player);
        return OperationResult.success(null, 0, moved);
    }

    private static OperationResult requireServerThread(ServerPlayer player) {
        if (player == null || player.getServer() == null) {
            return OperationResult.failure("server_player_unavailable");
        }

        return player.getServer().isSameThread()
            ? OperationResult.success(null, 0)
            : OperationResult.failure("not_server_thread");
    }

    private static ICuriosItemHandler curios(ServerPlayer player) {
        return CuriosApi.getCuriosInventory(player).orElse(null);
    }

    private static void addIfIncompatible(
        NexusClass targetClass,
        List<EquippedStackRef> result,
        ItemStack stack,
        Consumer<ItemStack> setter
    ) {
        if (
            stack != null
            && !stack.isEmpty()
            && ClassChangePolicy.requiresUnequip(
                ClassRules.requiredClassForItem(stack),
                targetClass
            )
        ) {
            result.add(new EquippedStackRef(stack, setter));
        }
    }

    private static boolean insertVirtual(
        List<ItemStack> inventory,
        ItemStack incoming
    ) {
        for (ItemStack existing : inventory) {
            if (
                incoming.isEmpty()
                || existing.isEmpty()
                || !ItemStack.isSameItemSameTags(existing, incoming)
            ) {
                continue;
            }

            int available = Math.min(
                existing.getMaxStackSize(),
                incoming.getMaxStackSize()
            ) - existing.getCount();
            if (available <= 0) {
                continue;
            }

            int transferred = Math.min(available, incoming.getCount());
            existing.grow(transferred);
            incoming.shrink(transferred);
        }

        for (int index = 0; index < inventory.size(); index++) {
            if (incoming.isEmpty()) {
                return true;
            }

            if (!inventory.get(index).isEmpty()) {
                continue;
            }

            int transferred = Math.min(
                incoming.getCount(),
                incoming.getMaxStackSize()
            );
            ItemStack inserted = incoming.copy();
            inserted.setCount(transferred);
            inventory.set(index, inserted);
            incoming.shrink(transferred);
        }

        return incoming.isEmpty();
    }

    private static boolean insertExisting(
        List<ItemStack> inventory,
        ItemStack incoming
    ) {
        for (ItemStack existing : inventory) {
            if (
                incoming.isEmpty()
                || existing.isEmpty()
                || !ItemStack.isSameItemSameTags(existing, incoming)
            ) {
                continue;
            }

            int available = Math.min(
                existing.getMaxStackSize(),
                incoming.getMaxStackSize()
            ) - existing.getCount();
            if (available <= 0) {
                continue;
            }

            int transferred = Math.min(available, incoming.getCount());
            existing.grow(transferred);
            incoming.shrink(transferred);
        }

        for (int index = 0; index < inventory.size(); index++) {
            if (incoming.isEmpty()) {
                return true;
            }

            if (!inventory.get(index).isEmpty()) {
                continue;
            }

            if (incoming.getCount() <= incoming.getMaxStackSize()) {
                inventory.set(index, incoming);
                return true;
            }

            inventory.set(index, incoming.split(incoming.getMaxStackSize()));
        }

        return incoming.isEmpty();
    }

    private static CompoundTag saveStack(ItemStack stack) {
        return stack.save(new CompoundTag());
    }

    private static ListTag saveContainer(Container container) {
        ListTag saved = new ListTag();
        for (int index = 0; index < container.getContainerSize(); index++) {
            CompoundTag entry = saveStack(container.getItem(index));
            entry.putInt("Slot", index);
            saved.add(entry);
        }
        return saved;
    }

    private static void loadContainer(Container container, ListTag saved) {
        container.clearContent();
        for (int index = 0; index < saved.size(); index++) {
            CompoundTag entry = saved.getCompound(index);
            int slot = entry.getInt("Slot");
            if (slot >= 0 && slot < container.getContainerSize()) {
                container.setItem(slot, ItemStack.of(entry));
            }
        }
        container.setChanged();
    }

    private static OperationResult validateRollbackStackState(
        ServerPlayer player,
        ICuriosItemHandler curios,
        CompoundTag snapshot,
        boolean allowEmpty,
        String mismatchPrefix,
        List<ItemStack> plannedMain
    ) {
        Inventory expectedInventory = new Inventory(player);
        expectedInventory.load(
            snapshot.getList(KEY_VANILLA, Tag.TAG_COMPOUND)
        );

        Inventory currentInventory = player.getInventory();
        for (int slot = 0; slot < currentInventory.getContainerSize(); slot++) {
            ItemStack expectedStack =
                plannedMain != null && slot < currentInventory.items.size()
                    ? plannedMain.get(slot)
                    : expectedInventory.getItem(slot);
            if (
                !isAcceptedRollbackStack(
                    currentInventory.getItem(slot),
                    expectedStack,
                    allowEmpty
                )
            ) {
                return OperationResult.failure(
                    mismatchPrefix + ":vanilla:" + slot
                );
            }
        }

        ItemStack currentCursor = player.containerMenu.getCarried();
        ItemStack expectedCursor = ItemStack.of(
            snapshot.getCompound(KEY_CURSOR)
        );
        if (
            !isAcceptedRollbackStack(
                currentCursor,
                expectedCursor,
                allowEmpty
            )
        ) {
            return OperationResult.failure(mismatchPrefix + ":cursor");
        }

        Container currentCrafting = player.inventoryMenu.getCraftSlots();
        ListTag expectedCrafting = snapshot.getList(
            KEY_CRAFTING,
            Tag.TAG_COMPOUND
        );
        for (int slot = 0; slot < currentCrafting.getContainerSize(); slot++) {
            if (
                !isAcceptedRollbackStack(
                    currentCrafting.getItem(slot),
                    savedStackAt(expectedCrafting, slot),
                    allowEmpty
                )
            ) {
                return OperationResult.failure(
                    mismatchPrefix + ":crafting:" + slot
                );
            }
        }

        ListTag expectedCurios = snapshot.getList(
            KEY_CURIOS,
            Tag.TAG_COMPOUND
        );
        for (
            Map.Entry<String, ICurioStacksHandler> entry
                : curios.getCurios().entrySet()
        ) {
            CompoundTag expectedHandler = findCuriosHandler(
                expectedCurios,
                entry.getKey()
            );
            if (expectedHandler == null) {
                return OperationResult.failure(
                    mismatchPrefix + ":curios_handler:" + entry.getKey()
                );
            }

            ICurioStacksHandler currentHandler = entry.getValue();
            ListTag expectedStacks = expectedHandler
                .getCompound(KEY_STACKS)
                .getList(KEY_ITEMS, Tag.TAG_COMPOUND);
            ListTag expectedCosmetics = expectedHandler
                .getCompound(KEY_COSMETICS)
                .getList(KEY_ITEMS, Tag.TAG_COMPOUND);

            for (int slot = 0; slot < currentHandler.getSlots(); slot++) {
                if (
                    !isAcceptedRollbackStack(
                        currentHandler.getStacks().getStackInSlot(slot),
                        savedStackAt(expectedStacks, slot),
                        allowEmpty
                    )
                ) {
                    return OperationResult.failure(
                        mismatchPrefix + ":curios:" +
                        entry.getKey() + ":" + slot
                    );
                }

                if (
                    !isAcceptedRollbackStack(
                        currentHandler.getCosmeticStacks().getStackInSlot(slot),
                        savedStackAt(expectedCosmetics, slot),
                        allowEmpty
                    )
                ) {
                    return OperationResult.failure(
                        mismatchPrefix + ":cosmetic:" +
                        entry.getKey() + ":" + slot
                    );
                }
            }
        }

        return OperationResult.success(null, 0);
    }

    private static RollbackPlan createRollbackPlan(
        ServerPlayer player,
        ICuriosItemHandler curios,
        CompoundTag snapshot
    ) {
        List<ItemStack> expectedRemaining = collectExpectedStacks(
            player,
            curios,
            snapshot
        );
        List<ItemStack> extras = new ArrayList<>();

        for (ItemStack current : collectCurrentStacks(player, curios)) {
            ItemStack remainder = current.copy();
            for (ItemStack expected : expectedRemaining) {
                if (
                    remainder.isEmpty()
                    || expected.isEmpty()
                    || !ItemStack.isSameItemSameTags(remainder, expected)
                ) {
                    continue;
                }

                int consumed = Math.min(
                    remainder.getCount(),
                    expected.getCount()
                );
                remainder.shrink(consumed);
                expected.shrink(consumed);
            }

            if (!remainder.isEmpty()) {
                extras.add(remainder);
            }
        }

        Inventory expectedInventory = new Inventory(player);
        expectedInventory.load(
            snapshot.getList(KEY_VANILLA, Tag.TAG_COMPOUND)
        );
        List<ItemStack> plannedMain = new ArrayList<>();
        boolean[] snapshotSlots = new boolean[expectedInventory.items.size()];
        for (int slot = 0; slot < expectedInventory.items.size(); slot++) {
            ItemStack expected = expectedInventory.items.get(slot).copy();
            plannedMain.add(expected);
            snapshotSlots[slot] = !expected.isEmpty();
        }

        for (ItemStack extra : extras) {
            if (!insertRollbackExtra(plannedMain, snapshotSlots, extra.copy())) {
                return RollbackPlan.failure("rollback_extra_inventory_full");
            }
        }

        return RollbackPlan.success(plannedMain, extras.size());
    }

    private static List<ItemStack> collectExpectedStacks(
        ServerPlayer player,
        ICuriosItemHandler curios,
        CompoundTag snapshot
    ) {
        List<ItemStack> result = new ArrayList<>();
        Inventory expectedInventory = new Inventory(player);
        expectedInventory.load(
            snapshot.getList(KEY_VANILLA, Tag.TAG_COMPOUND)
        );
        for (int slot = 0; slot < expectedInventory.getContainerSize(); slot++) {
            addStackCopy(result, expectedInventory.getItem(slot));
        }

        addStackCopy(result, ItemStack.of(snapshot.getCompound(KEY_CURSOR)));
        ListTag crafting = snapshot.getList(KEY_CRAFTING, Tag.TAG_COMPOUND);
        for (int slot = 0; slot < player.inventoryMenu.getCraftSlots().getContainerSize(); slot++) {
            addStackCopy(result, savedStackAt(crafting, slot));
        }

        ListTag savedCurios = snapshot.getList(KEY_CURIOS, Tag.TAG_COMPOUND);
        for (
            Map.Entry<String, ICurioStacksHandler> entry
                : curios.getCurios().entrySet()
        ) {
            CompoundTag savedHandler = findCuriosHandler(
                savedCurios,
                entry.getKey()
            );
            if (savedHandler == null) {
                continue;
            }

            ListTag stacks = savedHandler
                .getCompound(KEY_STACKS)
                .getList(KEY_ITEMS, Tag.TAG_COMPOUND);
            ListTag cosmetics = savedHandler
                .getCompound(KEY_COSMETICS)
                .getList(KEY_ITEMS, Tag.TAG_COMPOUND);
            for (int slot = 0; slot < entry.getValue().getSlots(); slot++) {
                addStackCopy(result, savedStackAt(stacks, slot));
                addStackCopy(result, savedStackAt(cosmetics, slot));
            }
        }

        return result;
    }

    private static List<ItemStack> collectCurrentStacks(
        ServerPlayer player,
        ICuriosItemHandler curios
    ) {
        List<ItemStack> result = new ArrayList<>();
        Inventory inventory = player.getInventory();
        for (int slot = 0; slot < inventory.getContainerSize(); slot++) {
            addStackCopy(result, inventory.getItem(slot));
        }

        addStackCopy(result, player.containerMenu.getCarried());
        Container crafting = player.inventoryMenu.getCraftSlots();
        for (int slot = 0; slot < crafting.getContainerSize(); slot++) {
            addStackCopy(result, crafting.getItem(slot));
        }

        for (ICurioStacksHandler handler : curios.getCurios().values()) {
            for (int slot = 0; slot < handler.getSlots(); slot++) {
                addStackCopy(result, handler.getStacks().getStackInSlot(slot));
                addStackCopy(
                    result,
                    handler.getCosmeticStacks().getStackInSlot(slot)
                );
            }
        }

        return result;
    }

    private static void addStackCopy(
        List<ItemStack> result,
        ItemStack stack
    ) {
        if (stack != null && !stack.isEmpty()) {
            result.add(stack.copy());
        }
    }

    private static boolean insertRollbackExtra(
        List<ItemStack> plannedMain,
        boolean[] snapshotSlots,
        ItemStack incoming
    ) {
        for (int slot = 0; slot < plannedMain.size(); slot++) {
            ItemStack existing = plannedMain.get(slot);
            if (
                incoming.isEmpty()
                || snapshotSlots[slot]
                || existing.isEmpty()
                || !ItemStack.isSameItemSameTags(existing, incoming)
            ) {
                continue;
            }

            int available = Math.min(
                existing.getMaxStackSize(),
                incoming.getMaxStackSize()
            ) - existing.getCount();
            int transferred = Math.min(available, incoming.getCount());
            if (transferred > 0) {
                existing.grow(transferred);
                incoming.shrink(transferred);
            }
        }

        for (int slot = 0; slot < plannedMain.size(); slot++) {
            if (incoming.isEmpty()) {
                return true;
            }
            if (snapshotSlots[slot] || !plannedMain.get(slot).isEmpty()) {
                continue;
            }

            int transferred = Math.min(
                incoming.getCount(),
                incoming.getMaxStackSize()
            );
            ItemStack inserted = incoming.copy();
            inserted.setCount(transferred);
            plannedMain.set(slot, inserted);
            incoming.shrink(transferred);
        }

        return incoming.isEmpty();
    }

    private static void applyPlannedMainInventory(
        Inventory inventory,
        List<ItemStack> plannedMain
    ) {
        for (int slot = 0; slot < plannedMain.size(); slot++) {
            inventory.items.set(slot, plannedMain.get(slot).copy());
        }
    }

    private static OperationResult restoreCuriosRollback(
        ICuriosItemHandler curios,
        ListTag saved
    ) {
        curios.loadInventory(curiosMetadata(saved));

        for (
            Map.Entry<String, ICurioStacksHandler> entry
                : curios.getCurios().entrySet()
        ) {
            CompoundTag savedHandler = findCuriosHandler(saved, entry.getKey());
            if (savedHandler == null) {
                return OperationResult.failure(
                    "rollback_curios_handler_missing:" + entry.getKey()
                );
            }

            ListTag stacks = savedHandler
                .getCompound(KEY_STACKS)
                .getList(KEY_ITEMS, Tag.TAG_COMPOUND);
            ListTag cosmetics = savedHandler
                .getCompound(KEY_COSMETICS)
                .getList(KEY_ITEMS, Tag.TAG_COMPOUND);
            ICurioStacksHandler handler = entry.getValue();
            for (int slot = 0; slot < handler.getSlots(); slot++) {
                handler.getStacks().setStackInSlot(
                    slot,
                    savedStackAt(stacks, slot)
                );
                handler.getCosmeticStacks().setStackInSlot(
                    slot,
                    savedStackAt(cosmetics, slot)
                );
            }
        }

        return OperationResult.success(null, 0);
    }

    private static CompoundTag findCuriosHandler(
        ListTag saved,
        String identifier
    ) {
        for (int index = 0; index < saved.size(); index++) {
            CompoundTag handler = saved.getCompound(index);
            if (identifier.equals(handler.getString(KEY_IDENTIFIER))) {
                return handler;
            }
        }

        return null;
    }

    private static ItemStack savedStackAt(ListTag saved, int slot) {
        for (int index = 0; index < saved.size(); index++) {
            CompoundTag entry = saved.getCompound(index);
            if (entry.getInt(KEY_SLOT) == slot) {
                return ItemStack.of(entry);
            }
        }

        return ItemStack.EMPTY;
    }

    private static ListTag curiosMetadata(ListTag saved) {
        ListTag metadata = saved.copy();
        for (int index = 0; index < metadata.size(); index++) {
            CompoundTag handler = metadata.getCompound(index);
            handler.getCompound(KEY_STACKS).put(KEY_ITEMS, new ListTag());
            handler.getCompound(KEY_COSMETICS).put(KEY_ITEMS, new ListTag());
        }

        return metadata;
    }

    private static boolean isAcceptedRollbackStack(
        ItemStack current,
        ItemStack expected,
        boolean allowEmpty
    ) {
        return (allowEmpty && current.isEmpty())
            || ItemStack.matches(current, expected);
    }

    private record RollbackPlan(
        boolean isOk,
        String error,
        List<ItemStack> plannedMain,
        int extraStacks
    ) {
        private static RollbackPlan success(
            List<ItemStack> plannedMain,
            int extraStacks
        ) {
            return new RollbackPlan(true, "ok", plannedMain, extraStacks);
        }

        private static RollbackPlan failure(String error) {
            return new RollbackPlan(false, error, List.of(), 0);
        }
    }

    private static ListTag saveCuriosLayout(ICuriosItemHandler curios) {
        ListTag layout = new ListTag();
        for (
            Map.Entry<String, ICurioStacksHandler> entry
                : curios.getCurios().entrySet()
        ) {
            CompoundTag handler = new CompoundTag();
            handler.putString(KEY_ID, entry.getKey());
            handler.putInt(KEY_STACKS, entry.getValue().getSlots());
            handler.putInt(
                KEY_COSMETICS,
                entry.getValue().getCosmeticStacks().getSlots()
            );
            layout.add(handler);
        }
        return layout;
    }

    private static OperationResult validateCuriosLayout(
        ICuriosItemHandler curios,
        ListTag expected,
        boolean requireEmpty
    ) {
        Map<String, ICurioStacksHandler> current = curios.getCurios();
        if (current.size() != expected.size()) {
            return OperationResult.failure("curios_layout_size_changed");
        }

        for (int index = 0; index < expected.size(); index++) {
            CompoundTag expectedHandler = expected.getCompound(index);
            String id = expectedHandler.getString(KEY_ID);
            ICurioStacksHandler actual = current.get(id);
            if (
                actual == null
                || actual.getSlots() != expectedHandler.getInt(KEY_STACKS)
                || actual.getCosmeticStacks().getSlots()
                    != expectedHandler.getInt(KEY_COSMETICS)
            ) {
                return OperationResult.failure("curios_layout_changed:" + id);
            }

            if (requireEmpty) {
                for (int slot = 0; slot < actual.getSlots(); slot++) {
                    if (
                        !actual.getStacks().getStackInSlot(slot).isEmpty()
                        || !actual.getCosmeticStacks().getStackInSlot(slot).isEmpty()
                    ) {
                        return OperationResult.failure(
                            "curios_restore_target_not_empty:" + id
                        );
                    }
                }
            }
        }

        return OperationResult.success(null, 0);
    }

    private static void markChanged(ServerPlayer player) {
        player.getInventory().setChanged();
        player.inventoryMenu.slotsChanged(
            player.inventoryMenu.getCraftSlots()
        );
        player.inventoryMenu.broadcastChanges();
        if (player.containerMenu != player.inventoryMenu) {
            player.containerMenu.broadcastChanges();
        }
    }

    public static final class OperationResult {
        private final boolean ok;
        private final String message;
        private final CompoundTag snapshot;
        private final int serializedBytes;
        private final int affectedStacks;
        private final int requestedItems;
        private final int insertedItems;
        private final int remainingItems;

        private OperationResult(
            boolean ok,
            String message,
            CompoundTag snapshot,
            int serializedBytes,
            int affectedStacks,
            int requestedItems,
            int insertedItems,
            int remainingItems
        ) {
            this.ok = ok;
            this.message = message;
            this.snapshot = snapshot;
            this.serializedBytes = serializedBytes;
            this.affectedStacks = affectedStacks;
            this.requestedItems = requestedItems;
            this.insertedItems = insertedItems;
            this.remainingItems = remainingItems;
        }

        public static OperationResult success(
            CompoundTag snapshot,
            int serializedBytes
        ) {
            return success(snapshot, serializedBytes, 0);
        }

        public static OperationResult success(
            CompoundTag snapshot,
            int serializedBytes,
            int affectedStacks
        ) {
            return new OperationResult(
                true,
                "ok",
                snapshot == null ? null : snapshot.copy(),
                serializedBytes,
                affectedStacks,
                0,
                0,
                0
            );
        }

        public static OperationResult failure(String message) {
            return new OperationResult(
                false,
                message,
                null,
                0,
                0,
                0,
                0,
                0
            );
        }

        public static OperationResult starterInsertion(
            boolean ok,
            String message,
            int requestedItems,
            int insertedItems,
            int remainingItems
        ) {
            return new OperationResult(
                ok,
                message,
                null,
                0,
                0,
                requestedItems,
                insertedItems,
                remainingItems
            );
        }

        public static OperationResult starterInsertionFailure(
            String message,
            int requestedItems
        ) {
            return starterInsertion(
                false,
                message,
                requestedItems,
                0,
                requestedItems
            );
        }

        public boolean isOk() {
            return ok;
        }

        public String getMessage() {
            return message;
        }

        public CompoundTag getSnapshot() {
            return snapshot == null ? null : snapshot.copy();
        }

        public int getSerializedBytes() {
            return serializedBytes;
        }

        public int getAffectedStacks() {
            return affectedStacks;
        }

        public int getRequestedItems() {
            return requestedItems;
        }

        public int getInsertedItems() {
            return insertedItems;
        }

        public int getRemainingItems() {
            return remainingItems;
        }
    }

    public static String getEpicFightClassChangeState(ServerPlayer player) {
        if (player == null) {
            return "PATCH_UNAVAILABLE";
        }

        var patch = EpicFightCapabilities.getServerPlayerPatch(player);

        if (patch == null) {
            return "PATCH_UNAVAILABLE";
        }

        var state = patch.getEntityState();

        if (state.attacking() || state.inaction()) {
            return "BUSY";
        }

        return "OK";
    }

    public static boolean sanitizeEpicFightState(ServerPlayer player) {
        if (player == null) {
            return false;
        }

        var patch = EpicFightCapabilities.getServerPlayerPatch(player);

        if (patch == null) {
            return false;
        }

        var state = patch.getEntityState();

        if (state.attacking() || state.inaction()) {
            return false;
        }

        if (patch.isHoldingAny()) {
            patch.resetHolding();
        }

        if (patch.isEpicFightMode()) {
            patch.toVanillaMode(true);
        }

        return !patch.isEpicFightMode() && !patch.isHoldingAny();
    }

    private record EquippedStackRef(
        ItemStack stack,
        Consumer<ItemStack> setter
    ) {
        private void clear() {
            setter.accept(ItemStack.EMPTY);
        }
    }
}
