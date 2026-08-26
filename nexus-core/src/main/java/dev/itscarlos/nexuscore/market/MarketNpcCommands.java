package dev.itscarlos.nexuscore.market;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import com.mojang.brigadier.exceptions.CommandSyntaxException;
import com.mojang.brigadier.suggestion.Suggestions;
import com.mojang.brigadier.suggestion.SuggestionsBuilder;
import com.mojang.brigadier.tree.CommandNode;
import dev.itscarlos.nexuscore.NexusCore;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.SharedSuggestionProvider;
import net.minecraft.commands.arguments.UuidArgument;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.ModContainer;
import net.minecraftforge.fml.ModList;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLPaths;

@Mod.EventBusSubscriber(modid = NexusCore.MOD_ID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class MarketNpcCommands {
    static final double BIND_NEAREST_RADIUS = 4.0D;

    private static final String PREFIX = "[Nexus NPC] ";
    private static final String EASY_NPC_ROOT = "easy_npc";
    private static final String SUPPORTED_EASY_NPC_VERSION = "7.2.0";
    private static final String EASY_NPC_PRESET = "preset";
    private static final String EASY_NPC_IMPORT = "import";
    private static final String EASY_NPC_CUSTOM = "custom";

    private MarketNpcCommands() {
    }

    @SubscribeEvent
    public static void registerCommands(RegisterCommandsEvent event) {
        event.getDispatcher().register(
            Commands.literal("nexus_npc")
                .requires(source -> source.hasPermission(MarketProtection.ADMIN_PERMISSION_LEVEL))
                .then(
                    Commands.literal("bind")
                        .then(
                            Commands.argument("npc_id", StringArgumentType.word())
                                .suggests(MarketNpcCommands::suggestNpcIds)
                                .then(
                                    Commands.argument("uuid", UuidArgument.uuid())
                                        .executes(context -> bind(
                                            context.getSource(),
                                            StringArgumentType.getString(context, "npc_id"),
                                            UuidArgument.getUuid(context, "uuid")
                                        ))
                                )
                        )
                )
                .then(
                    Commands.literal("bind_nearest")
                        .then(
                            Commands.argument("npc_id", StringArgumentType.word())
                                .suggests(MarketNpcCommands::suggestNpcIds)
                                .executes(context -> bindNearest(
                                    context.getSource(),
                                    StringArgumentType.getString(context, "npc_id")
                                ))
                        )
                )
                .then(
                    Commands.literal("reload")
                        .then(Commands.literal("all").executes(context -> reloadAll(context.getSource())))
                        .then(
                            Commands.argument("npc_id", StringArgumentType.word())
                                .suggests(MarketNpcCommands::suggestNpcIds)
                                .executes(context -> reloadOne(
                                    context.getSource(),
                                    StringArgumentType.getString(context, "npc_id")
                                ))
                        )
                )
                .then(Commands.literal("status").executes(context -> status(context.getSource())))
        );
    }

    private static CompletableFuture<Suggestions> suggestNpcIds(
        CommandContext<CommandSourceStack> context,
        SuggestionsBuilder builder
    ) {
        return SharedSuggestionProvider.suggest(
            MarketNpcRegistry.definitions().stream().map(MarketNpcDefinition::logicalId),
            builder
        );
    }

    private static int bind(CommandSourceStack source, String logicalId, UUID uuid) {
        Optional<MarketNpcDefinition> definition = MarketNpcRegistry.find(logicalId);
        if (definition.isEmpty()) {
            return failure(source, "ID desconocido: " + logicalId);
        }

        MarketNpcPresetInspector.Inspection preset = inspectPreset(definition.get());
        if (!preset.valid()) {
            return failure(source, logicalId + " — " + preset.error());
        }

        LocatedEntity located = findLoadedEntity(source.getServer(), uuid);
        if (located == null) {
            return failure(source, logicalId + " — UUID no encontrado entre las entidades cargadas: " + uuid);
        }
        String compatibilityError = compatibilityError(definition.get(), located.entity());
        if (compatibilityError != null) {
            return failure(source, logicalId + " — " + compatibilityError);
        }
        return persistBinding(source, definition.get(), located);
    }

    private static int bindNearest(CommandSourceStack source, String logicalId) throws CommandSyntaxException {
        Optional<MarketNpcDefinition> definition = MarketNpcRegistry.find(logicalId);
        if (definition.isEmpty()) {
            return failure(source, "ID desconocido: " + logicalId);
        }

        MarketNpcPresetInspector.Inspection preset = inspectPreset(definition.get());
        if (!preset.valid()) {
            return failure(source, logicalId + " — " + preset.error());
        }

        ServerPlayer player = source.getPlayerOrException();
        ServerLevel level = player.serverLevel();
        AABB searchBox = player.getBoundingBox().inflate(BIND_NEAREST_RADIUS);
        List<Entity> candidates = level.getEntities(
            player,
            searchBox,
            entity -> definition.get().entityType().equals(entityTypeId(entity))
                && entity.distanceToSqr(player) <= BIND_NEAREST_RADIUS * BIND_NEAREST_RADIUS
        );
        candidates.sort(Comparator.comparingDouble(entity -> entity.distanceToSqr(player)));

        if (candidates.isEmpty()) {
            return failure(
                source,
                logicalId + " — no hay un " + definition.get().entityType()
                    + " cargado a " + formatDistance(BIND_NEAREST_RADIUS) + " bloques o menos"
            );
        }
        if (candidates.size() > 1) {
            return failure(
                source,
                logicalId + " — hay " + candidates.size()
                    + " candidatos cercanos; acércate más o usa /nexus_npc bind <npc_id> <uuid>"
            );
        }

        return persistBinding(source, definition.get(), new LocatedEntity(level, candidates.get(0)));
    }

    private static int persistBinding(
        CommandSourceStack source,
        MarketNpcDefinition definition,
        LocatedEntity located
    ) {
        MarketNpcBindingsData data = MarketNpcBindingsData.get(source.getServer());
        Optional<String> existingLogicalId = data.logicalIdFor(located.entity().getUUID());
        if (existingLogicalId.isPresent() && !existingLogicalId.get().equals(definition.logicalId())) {
            return failure(
                source,
                definition.logicalId() + " — el UUID ya está vinculado a " + existingLogicalId.get()
            );
        }

        ResourceLocation dimension = located.level().dimension().location();
        data.bind(definition.logicalId(), located.entity().getUUID(), dimension);
        source.sendSuccess(
            () -> Component.literal(PREFIX + definition.logicalId() + " vinculado"),
            false
        );
        source.sendSuccess(
            () -> Component.literal("UUID: " + located.entity().getUUID() + " | Dimensión: " + dimension),
            false
        );
        return 1;
    }

    private static int reloadOne(CommandSourceStack source, String logicalId) {
        Optional<MarketNpcDefinition> definition = MarketNpcRegistry.find(logicalId);
        if (definition.isEmpty()) {
            return failure(source, "ID desconocido: " + logicalId);
        }
        String integrationError = easyNpcIntegrationError(source.getServer());
        if (integrationError != null) {
            return failure(source, integrationError);
        }

        ReloadResult result = reload(source.getServer(), definition.get());
        if (!result.success()) {
            return failure(source, logicalId + " — " + result.detail());
        }
        source.sendSuccess(() -> Component.literal(PREFIX + logicalId + " actualizado"), false);
        return 1;
    }

    private static int reloadAll(CommandSourceStack source) {
        String integrationError = easyNpcIntegrationError(source.getServer());
        if (integrationError != null) {
            return failure(source, integrationError);
        }

        source.sendSuccess(() -> Component.literal(PREFIX + "Recarga del Market"), false);
        int updated = 0;
        List<String> failures = new ArrayList<>();
        for (MarketNpcDefinition definition : MarketNpcRegistry.definitions()) {
            ReloadResult result = reload(source.getServer(), definition);
            if (result.success()) {
                updated++;
                source.sendSuccess(() -> Component.literal("✓ " + definition.logicalId()), false);
            } else {
                failures.add(definition.logicalId() + " — " + result.detail());
                source.sendFailure(Component.literal("✗ " + definition.logicalId() + " — " + result.detail()));
            }
        }

        int finalUpdated = updated;
        if (failures.isEmpty()) {
            source.sendSuccess(
                () -> Component.literal(PREFIX + finalUpdated + " actualizados | 0 errores"),
                false
            );
        } else {
            source.sendFailure(
                Component.literal(PREFIX + finalUpdated + " actualizados | " + failures.size() + " errores")
            );
        }
        return updated;
    }

    private static ReloadResult reload(MinecraftServer server, MarketNpcDefinition definition) {
        Optional<MarketNpcBindingsData.Binding> bindingOptional = MarketNpcBindingsData.get(server)
            .binding(definition.logicalId());
        if (bindingOptional.isEmpty()) {
            return ReloadResult.failure("sin binding");
        }
        MarketNpcBindingsData.Binding binding = bindingOptional.get();

        ResourceKey<net.minecraft.world.level.Level> dimensionKey = ResourceKey.create(
            Registries.DIMENSION,
            binding.dimension()
        );
        ServerLevel level = server.getLevel(dimensionKey);
        if (level == null) {
            return ReloadResult.failure("dimensión no disponible: " + binding.dimension());
        }

        Entity entity = level.getEntity(binding.uuid());
        if (entity == null || entity.isRemoved()) {
            return ReloadResult.failure("NPC no encontrado o no cargado: " + binding.uuid());
        }
        if (!binding.dimension().equals(entity.level().dimension().location())) {
            return ReloadResult.failure("la entidad cargada no está en la dimensión vinculada");
        }
        String compatibilityError = compatibilityError(definition, entity);
        if (compatibilityError != null) {
            return ReloadResult.failure(compatibilityError);
        }

        MarketNpcPresetInspector.Inspection preset = inspectPreset(definition);
        if (!preset.valid()) {
            return ReloadResult.failure(preset.error());
        }

        RuntimeSnapshot snapshot = RuntimeSnapshot.capture(entity);
        String command = EASY_NPC_ROOT + " " + EASY_NPC_PRESET + " " + EASY_NPC_IMPORT + " "
            + EASY_NPC_CUSTOM + " " + definition.preset() + " ~ ~ ~ " + binding.uuid();
        CommandSourceStack importSource = server.createCommandSourceStack()
            .withLevel(level)
            .withPosition(snapshot.position())
            .withSuppressedOutput();

        try {
            int result = server.getCommands().getDispatcher().execute(command, importSource);
            if (result <= 0) {
                snapshot.rollback(entity);
                return ReloadResult.failure("Easy NPC rechazó la importación; se restauró el estado anterior");
            }

            Entity current = level.getEntity(binding.uuid());
            if (current != entity || current.isRemoved()) {
                return ReloadResult.failure("Easy NPC sustituyó o eliminó inesperadamente la entidad; recarga abortada");
            }
            if (!definition.entityType().equals(entityTypeId(current))) {
                snapshot.rollback(current);
                return ReloadResult.failure("el EntityType cambió inesperadamente; se restauró el estado anterior");
            }

            snapshot.restoreRuntimeState(current);
            String preservationError = snapshot.preservationError(current);
            if (preservationError != null) {
                snapshot.rollback(current);
                return ReloadResult.failure(preservationError + "; se restauró el estado anterior");
            }
            return ReloadResult.ok();
        } catch (CommandSyntaxException | RuntimeException exception) {
            Entity current = level.getEntity(binding.uuid());
            if (current == entity && !current.isRemoved()) {
                try {
                    snapshot.rollback(current);
                } catch (RuntimeException rollbackException) {
                    exception.addSuppressed(rollbackException);
                }
            }
            NexusCore.LOGGER.error("Failed to reload Market NPC {}", definition.logicalId(), exception);
            return ReloadResult.failure("error de importación: " + conciseMessage(exception));
        }
    }

    private static int status(CommandSourceStack source) {
        MarketNpcBindingsData data = MarketNpcBindingsData.get(source.getServer());
        source.sendSuccess(() -> Component.literal(PREFIX + "Estado de bindings"), false);
        int loaded = 0;
        for (MarketNpcDefinition definition : MarketNpcRegistry.definitions()) {
            Optional<MarketNpcBindingsData.Binding> bindingOptional = data.binding(definition.logicalId());
            if (bindingOptional.isEmpty()) {
                source.sendSuccess(
                    () -> Component.literal(definition.logicalId() + " — sin binding"),
                    false
                );
                continue;
            }

            MarketNpcBindingsData.Binding binding = bindingOptional.get();
            ResourceKey<net.minecraft.world.level.Level> dimensionKey = ResourceKey.create(
                Registries.DIMENSION,
                binding.dimension()
            );
            ServerLevel level = source.getServer().getLevel(dimensionKey);
            Entity entity = level == null ? null : level.getEntity(binding.uuid());
            String state;
            if (level == null) {
                state = "dimensión no disponible";
            } else if (entity == null || entity.isRemoved()) {
                state = "no encontrado/cargado";
            } else {
                String error = compatibilityError(definition, entity);
                state = error == null ? "CARGADO" : "INCOMPATIBLE: " + error;
                if (error == null) {
                    loaded++;
                }
            }
            source.sendSuccess(
                () -> Component.literal(
                    definition.logicalId() + " — " + binding.uuid() + " | " + binding.dimension() + " | " + state
                ),
                false
            );
        }
        int finalLoaded = loaded;
        source.sendSuccess(
            () -> Component.literal(PREFIX + finalLoaded + "/" + MarketNpcRegistry.definitions().size() + " cargados"),
            false
        );
        return loaded;
    }

    private static MarketNpcPresetInspector.Inspection inspectPreset(MarketNpcDefinition definition) {
        Path configDirectory = FMLPaths.CONFIGDIR.get();
        return MarketNpcPresetInspector.inspect(configDirectory, definition);
    }

    private static String compatibilityError(MarketNpcDefinition definition, Entity entity) {
        ResourceLocation actualType = entityTypeId(entity);
        if (!definition.entityType().equals(actualType)) {
            return "EntityType esperado " + definition.entityType() + " pero encontrado " + actualType;
        }
        return null;
    }

    private static ResourceLocation entityTypeId(Entity entity) {
        return BuiltInRegistries.ENTITY_TYPE.getKey(entity.getType());
    }

    private static LocatedEntity findLoadedEntity(MinecraftServer server, UUID uuid) {
        LocatedEntity found = null;
        for (ServerLevel level : server.getAllLevels()) {
            Entity entity = level.getEntity(uuid);
            if (entity == null || entity.isRemoved()) {
                continue;
            }
            if (found != null) {
                return null;
            }
            found = new LocatedEntity(level, entity);
        }
        return found;
    }

    private static boolean hasEasyNpcImportCommand(MinecraftServer server) {
        CommandDispatcher<CommandSourceStack> dispatcher = server.getCommands().getDispatcher();
        CommandNode<CommandSourceStack> node = dispatcher.getRoot().getChild(EASY_NPC_ROOT);
        if (node == null) {
            return false;
        }
        node = node.getChild(EASY_NPC_PRESET);
        if (node == null) {
            return false;
        }
        node = node.getChild(EASY_NPC_IMPORT);
        if (node == null) {
            return false;
        }
        return node.getChild(EASY_NPC_CUSTOM) != null;
    }

    private static String easyNpcIntegrationError(MinecraftServer server) {
        Optional<? extends ModContainer> container = ModList.get().getModContainerById(EASY_NPC_ROOT);
        if (container.isEmpty()) {
            return "Easy NPC Core no está cargado";
        }
        String version = container.get().getModInfo().getVersion().toString();
        if (!SUPPORTED_EASY_NPC_VERSION.equals(version)) {
            return "versión Easy NPC no auditada: " + version + " (esperada " + SUPPORTED_EASY_NPC_VERSION + ")";
        }
        if (!hasEasyNpcImportCommand(server)) {
            return "Easy NPC " + SUPPORTED_EASY_NPC_VERSION
                + " no expone la ruta easy_npc preset import custom";
        }
        return null;
    }

    private static int failure(CommandSourceStack source, String message) {
        source.sendFailure(Component.literal(PREFIX + message));
        return 0;
    }

    private static String conciseMessage(Throwable throwable) {
        String message = throwable.getMessage();
        return message == null || message.isBlank() ? throwable.getClass().getSimpleName() : message;
    }

    private static String formatDistance(double distance) {
        return String.format(Locale.ROOT, "%.1f", distance);
    }

    private record LocatedEntity(ServerLevel level, Entity entity) {
    }

    private record ReloadResult(boolean success, String detail) {
        private static ReloadResult ok() {
            return new ReloadResult(true, "");
        }

        private static ReloadResult failure(String detail) {
            return new ReloadResult(false, detail);
        }
    }

    private record RuntimeSnapshot(
        UUID uuid,
        ResourceLocation dimension,
        CompoundTag fullTag,
        Vec3 position,
        float yaw,
        float pitch,
        float headYaw,
        float bodyYaw,
        boolean noGravity
    ) {
        private static RuntimeSnapshot capture(Entity entity) {
            CompoundTag fullTag = entity.saveWithoutId(new CompoundTag());
            float bodyYaw = entity instanceof LivingEntity livingEntity ? livingEntity.yBodyRot : entity.getYRot();
            return new RuntimeSnapshot(
                entity.getUUID(),
                entity.level().dimension().location(),
                fullTag.copy(),
                entity.position(),
                entity.getYRot(),
                entity.getXRot(),
                entity.getYHeadRot(),
                bodyYaw,
                entity.isNoGravity()
            );
        }

        private void restoreRuntimeState(Entity entity) {
            CompoundTag updatedTag = entity.saveWithoutId(new CompoundTag());
            restoreTagPresence(fullTag, updatedTag, "Owner");
            restoreTagPresence(fullTag, updatedTag, "Navigation");
            restoreConfiguredNoGravity(fullTag, updatedTag);
            updatedTag.putBoolean("NoGravity", noGravity);
            updatedTag.putUUID("UUID", uuid);
            entity.load(updatedTag);
            restorePlacement(entity);
        }

        private void rollback(Entity entity) {
            entity.load(fullTag.copy());
            restorePlacement(entity);
        }

        private String preservationError(Entity entity) {
            if (!uuid.equals(entity.getUUID())) {
                return "el UUID cambió inesperadamente";
            }
            if (!dimension.equals(entity.level().dimension().location())) {
                return "la dimensión cambió inesperadamente";
            }
            if (!position.equals(entity.position())) {
                return "la posición cambió inesperadamente";
            }
            if (Float.compare(yaw, entity.getYRot()) != 0 || Float.compare(pitch, entity.getXRot()) != 0) {
                return "la rotación cambió inesperadamente";
            }
            if (noGravity != entity.isNoGravity()) {
                return "NoGravity no pudo conservarse";
            }

            CompoundTag current = entity.saveWithoutId(new CompoundTag());
            if (!sameTag(fullTag, current, "Owner")) {
                return "owner no pudo conservarse";
            }
            if (!sameTag(fullTag, current, "Navigation")) {
                return "home/navigation no pudo conservarse";
            }
            Tag beforeConfiguredNoGravity = fullTag.getCompound("EntityAttribute").get("NoGravity");
            Tag currentConfiguredNoGravity = current.getCompound("EntityAttribute").get("NoGravity");
            if (!Objects.equals(beforeConfiguredNoGravity, currentConfiguredNoGravity)) {
                return "EntityAttribute.NoGravity no pudo conservarse";
            }
            return null;
        }

        private void restorePlacement(Entity entity) {
            entity.moveTo(position.x, position.y, position.z, yaw, pitch);
            entity.setYHeadRot(headYaw);
            if (entity instanceof LivingEntity livingEntity) {
                livingEntity.yBodyRot = bodyYaw;
            }
            entity.setNoGravity(noGravity);
        }

        private static void restoreTagPresence(CompoundTag before, CompoundTag after, String key) {
            Tag previous = before.get(key);
            if (previous == null) {
                after.remove(key);
            } else {
                after.put(key, previous.copy());
            }
        }

        private static boolean sameTag(CompoundTag first, CompoundTag second, String key) {
            return Objects.equals(first.get(key), second.get(key));
        }

        private static void restoreConfiguredNoGravity(CompoundTag before, CompoundTag after) {
            CompoundTag beforeAttributes = before.getCompound("EntityAttribute");
            CompoundTag afterAttributes = after.getCompound("EntityAttribute");
            Tag previous = beforeAttributes.get("NoGravity");
            if (previous == null) {
                afterAttributes.remove("NoGravity");
            } else {
                afterAttributes.put("NoGravity", previous.copy());
            }
            if (after.contains("EntityAttribute", Tag.TAG_COMPOUND) || !afterAttributes.isEmpty()) {
                after.put("EntityAttribute", afterAttributes);
            }
        }
    }
}
