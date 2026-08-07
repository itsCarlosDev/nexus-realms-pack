package dev.itscarlos.nexuscore.update;

import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.event.server.ServerStoppedEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class ServerUpdateWatcher {

    private static final String MANIFEST_URL =
        "https://itscarlosdev.github.io/nexus-realms-pack/manifest.json";

    private static final Path INSTALLED_RELEASE =
        Path.of(".nexus-installed-release")
            .toAbsolutePath()
            .normalize();

    private static final Path UPDATE_REQUEST =
        Path.of(".nexus-update-requested")
            .toAbsolutePath()
            .normalize();

    private static final Pattern COMMIT_PATTERN =
        Pattern.compile(
            "\"commit\"\\s*:\\s*\"([0-9a-fA-F]{40})\""
        );

    private static final HttpClient HTTP =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    private static final AtomicBoolean UPDATE_QUEUED =
        new AtomicBoolean(false);

    private static ScheduledExecutorService executor;

    private ServerUpdateWatcher() {
    }

    @SubscribeEvent
    public static synchronized void onServerStarted(
        ServerStartedEvent event
    ) {
        if (executor != null) {
            executor.shutdownNow();
        }

        UPDATE_QUEUED.set(false);

        executor =
            Executors.newSingleThreadScheduledExecutor(
                runnable -> {
                    Thread thread =
                        new Thread(
                            runnable,
                            "Nexus-Update-Watcher"
                        );

                    thread.setDaemon(true);

                    return thread;
                }
            );

        MinecraftServer server = event.getServer();

        executor.scheduleWithFixedDelay(
            () -> checkForUpdate(server),
            30,
            60,
            TimeUnit.SECONDS
        );

        NexusCore.LOGGER.info(
            "Nexus update watcher started."
        );
    }

    @SubscribeEvent
    public static synchronized void onServerStopped(
        ServerStoppedEvent event
    ) {
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }

        UPDATE_QUEUED.set(false);
    }

    private static void checkForUpdate(
        MinecraftServer server
    ) {
        if (UPDATE_QUEUED.get()) {
            return;
        }

        try {
            if (!Files.isRegularFile(INSTALLED_RELEASE)) {
                NexusCore.LOGGER.warn(
                    "Update watcher skipped: {} does not exist.",
                    INSTALLED_RELEASE
                );

                return;
            }

            String installedCommit =
                Files.readString(
                    INSTALLED_RELEASE,
                    StandardCharsets.UTF_8
                ).trim().toLowerCase(Locale.ROOT);

            if (!installedCommit.matches(
                "[0-9a-f]{40}"
            )) {
                NexusCore.LOGGER.warn(
                    "Invalid installed release marker: {}",
                    installedCommit
                );

                return;
            }

            URI requestUri =
                URI.create(
                    MANIFEST_URL +
                        "?nexus=" +
                        System.currentTimeMillis()
                );

            HttpRequest request =
                HttpRequest.newBuilder(requestUri)
                    .timeout(Duration.ofSeconds(10))
                    .header(
                        "Cache-Control",
                        "no-cache"
                    )
                    .GET()
                    .build();

            HttpResponse<String> response =
                HTTP.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(
                        StandardCharsets.UTF_8
                    )
                );

            if (response.statusCode() != 200) {
                NexusCore.LOGGER.warn(
                    "Update check returned HTTP {}.",
                    response.statusCode()
                );

                return;
            }

            Matcher matcher =
                COMMIT_PATTERN.matcher(
                    response.body()
                );

            if (!matcher.find()) {
                NexusCore.LOGGER.warn(
                    "Published manifest does not contain a valid commit."
                );

                return;
            }

            String publishedCommit =
                matcher.group(1)
                    .toLowerCase(Locale.ROOT);

            if (
                installedCommit.equals(
                    publishedCommit
                )
            ) {
                return;
            }

            if (!UPDATE_QUEUED.compareAndSet(
                false,
                true
            )) {
                return;
            }

            NexusCore.LOGGER.info(
                "New Nexus release detected: installed={}, published={}",
                installedCommit,
                publishedCommit
            );

            server.execute(
                () -> beginCountdown(
                    server,
                    publishedCommit
                )
            );
        }
        catch (
            IOException |
            InterruptedException |
            RuntimeException exception
        ) {
            if (
                exception
                    instanceof InterruptedException
            ) {
                Thread.currentThread()
                    .interrupt();
            }

            NexusCore.LOGGER.warn(
                "Unable to check for Nexus updates.",
                exception
            );
        }
    }

    private static void beginCountdown(
        MinecraftServer server,
        String publishedCommit
    ) {
        int playerCount =
            server.getPlayerCount();

        int totalSeconds =
            playerCount == 0
                ? 15
                : 300;

        if (playerCount == 0) {
            NexusCore.LOGGER.info(
                "No players online. Update restart in 15 seconds."
            );

            broadcast(
                server,
                "§6[Nexus] §fNueva actualización detectada. " +
                    "Reinicio automático en §e15 segundos§f."
            );
        }
        else {
            broadcast(
                server,
                "§6[Nexus] §fNueva actualización disponible."
            );

            broadcast(
                server,
                "§6[Nexus] §fEl servidor se reiniciará automáticamente " +
                    "en §e5 minutos§f."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 60,
                "§6[Nexus] §fReinicio por actualización en §e1 minuto§f."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 30,
                "§6[Nexus] §fReinicio por actualización en §e30 segundos§f."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 10,
                "§6[Nexus] §fReinicio por actualización en §e10 segundos§f."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 5,
                "§6[Nexus] §fReinicio en §e5§f..."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 4,
                "§6[Nexus] §fReinicio en §e4§f..."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 3,
                "§6[Nexus] §fReinicio en §e3§f..."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 2,
                "§6[Nexus] §fReinicio en §e2§f..."
            );

            scheduleAnnouncement(
                server,
                totalSeconds - 1,
                "§6[Nexus] §fReinicio en §e1§f..."
            );
        }

        executor.schedule(
            () ->
                server.execute(
                    () -> shutdownForUpdate(
                        server,
                        publishedCommit
                    )
                ),
            totalSeconds,
            TimeUnit.SECONDS
        );
    }

    private static void scheduleAnnouncement(
        MinecraftServer server,
        int delaySeconds,
        String message
    ) {
        if (delaySeconds < 0) {
            return;
        }

        executor.schedule(
            () ->
                server.execute(
                    () -> broadcast(
                        server,
                        message
                    )
                ),
            delaySeconds,
            TimeUnit.SECONDS
        );
    }

    private static void shutdownForUpdate(
        MinecraftServer server,
        String publishedCommit
    ) {
        try {
            Files.writeString(
                UPDATE_REQUEST,
                publishedCommit +
                    System.lineSeparator(),
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING
            );
        }
        catch (IOException exception) {
            NexusCore.LOGGER.error(
                "Unable to create update restart marker.",
                exception
            );

            UPDATE_QUEUED.set(false);

            broadcast(
                server,
                "§c[Nexus] No se pudo preparar la actualización. " +
                    "El reinicio automático ha sido cancelado."
            );

            return;
        }

        broadcast(
            server,
            "§6[Nexus] §fGuardando mundo y aplicando actualización..."
        );

        server.getCommands()
            .performPrefixedCommand(
                server
                    .createCommandSourceStack()
                    .withPermission(4),
                "save-all flush"
            );

        NexusCore.LOGGER.info(
            "Stopping server for Nexus release {}.",
            publishedCommit
        );

        server.getCommands()
            .performPrefixedCommand(
                server
                    .createCommandSourceStack()
                    .withPermission(4),
                "stop"
            );
    }

    private static void broadcast(
        MinecraftServer server,
        String message
    ) {
        server
            .getPlayerList()
            .broadcastSystemMessage(
                Component.literal(message),
                false
            );

        NexusCore.LOGGER.info(
            message.replaceAll(
                "§.",
                ""
            )
        );
    }
}