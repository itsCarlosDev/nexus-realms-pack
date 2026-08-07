package dev.itscarlos.nexuscore;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.Map;
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

        player.getInventory().clearContent();
        player.containerMenu.setCarried(ItemStack.EMPTY);
        player.inventoryMenu.clearCraftingContent();
        curios.saveInventory(true);
        markChanged(player);

        return isCoveredInventoryEmpty(player)
            ? OperationResult.success(snapshot, snapshotCheck.getSerializedBytes())
            : OperationResult.failure("covered_inventory_not_empty_after_clear");
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

        private OperationResult(
            boolean ok,
            String message,
            CompoundTag snapshot,
            int serializedBytes
        ) {
            this.ok = ok;
            this.message = message;
            this.snapshot = snapshot;
            this.serializedBytes = serializedBytes;
        }

        public static OperationResult success(
            CompoundTag snapshot,
            int serializedBytes
        ) {
            return new OperationResult(
                true,
                "ok",
                snapshot == null ? null : snapshot.copy(),
                serializedBytes
            );
        }

        public static OperationResult failure(String message) {
            return new OperationResult(false, message, null, 0);
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
    }
}
