package dev.itscarlos.nexuscore.client;

import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.network.MarketTremorPacket;
import java.util.concurrent.ThreadLocalRandom;
import net.minecraft.client.Minecraft;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ViewportEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    value = Dist.CLIENT,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class ClientMarketTremorState {
    private static final long NANOS_PER_TICK = 50_000_000L;

    private static boolean active;
    private static long startNanos;
    private static long durationNanos;
    private static float intensity;
    private static long seed;
    private static int particleCooldown;

    private ClientMarketTremorState() {
    }

    public static void start(MarketTremorPacket packet) {
        int safeDuration = Math.max(10, Math.min(120, packet.durationTicks()));
        float safeIntensity = Math.max(0.0F, Math.min(1.0F, packet.intensity()));

        active = true;
        startNanos = System.nanoTime();
        durationNanos = safeDuration * NANOS_PER_TICK;
        intensity = safeIntensity;
        seed = packet.seed();
        particleCooldown = 0;
    }

    @SubscribeEvent
    public static void onCameraAngles(ViewportEvent.ComputeCameraAngles event) {
        if (!active) {
            return;
        }

        long elapsed = System.nanoTime() - startNanos;
        if (elapsed >= durationNanos) {
            active = false;
            return;
        }

        double progress = (double) elapsed / (double) durationNanos;
        double attack = Math.min(1.0D, progress * 8.0D);
        double decay = Math.pow(1.0D - progress, 0.70D);
        double envelope = attack * decay;

        double seconds = elapsed / 1_000_000_000.0D;
        double seedPhase = (seed & 0xFFFFL) * 0.00031D;
        double amplitude = intensity * envelope;

        float yawOffset = (float) (
            (
                Math.sin(seconds * 35.0D + seedPhase) * 0.62D
                + Math.sin(seconds * 21.0D + seedPhase * 0.7D) * 0.18D
            ) * amplitude
        );

        float pitchOffset = (float) (
            (
                Math.sin(seconds * 41.0D + seedPhase * 1.3D) * 0.42D
                + Math.sin(seconds * 17.0D + seedPhase) * 0.14D
            ) * amplitude
        );

        float rollOffset = (float) (
            Math.sin(seconds * 29.0D + seedPhase * 1.7D)
                * 1.20D
                * amplitude
        );

        event.setYaw(event.getYaw() + yawOffset);
        event.setPitch(event.getPitch() + pitchOffset);
        event.setRoll(event.getRoll() + rollOffset);
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END || !active) {
            return;
        }

        if (System.nanoTime() - startNanos >= durationNanos) {
            active = false;
            return;
        }

        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.level == null || minecraft.player == null) {
            return;
        }

        if (++particleCooldown < 5) {
            return;
        }
        particleCooldown = 0;

        ThreadLocalRandom random = ThreadLocalRandom.current();

        for (int i = 0; i < 2; i++) {
            double angle = random.nextDouble() * Math.PI * 2.0D;
            double radius = 0.45D + random.nextDouble() * 1.65D;
            double x = minecraft.player.getX() + Math.cos(angle) * radius;
            double z = minecraft.player.getZ() + Math.sin(angle) * radius;
            double y = minecraft.player.getY() + 0.06D;

            minecraft.level.addParticle(
                ParticleTypes.POOF,
                x,
                y,
                z,
                0.0D,
                0.015D,
                0.0D
            );
        }

        if (random.nextDouble() < 0.30D) {
            minecraft.level.addParticle(
                ParticleTypes.WITCH,
                minecraft.player.getX() + random.nextDouble(-1.2D, 1.2D),
                minecraft.player.getY() + random.nextDouble(0.15D, 0.8D),
                minecraft.player.getZ() + random.nextDouble(-1.2D, 1.2D),
                0.0D,
                0.01D,
                0.0D
            );
        }
    }
}