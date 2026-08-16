package dev.itscarlos.nexuscore.mixin.client;

import net.minecraft.client.renderer.entity.WitherBossRenderer;
import net.minecraft.world.entity.boss.wither.WitherBoss;
import net.minecraftforge.client.event.RenderLivingEvent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Prevents Epic Fight from replacing the renderer of a Wither when another
 * mod has installed a custom renderer that is not a vanilla
 * WitherBossRenderer.
 *
 * Wither: Reincarnated uses BetterWitherRenderer. Epic Fight's
 * PWitherRenderer expects WitherBossRenderer and its generated bridge casts
 * the renderer to that class, causing a ClassCastException.
 *
 * In that situation we skip Epic Fight's RenderLivingEvent handler and let
 * Forge continue with the custom renderer normally.
 *
 * Vanilla Withers using WitherBossRenderer are unaffected.
 */
@Pseudo
@Mixin(
    targets = "yesman.epicfight.client.events.engine.RenderEngine$Events",
    remap = false,
    priority = 1500
)
public abstract class EpicFightWitherRendererCompatMixin {

    @Inject(
        method = "renderLivingEvent",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private static void nexuscore$skipEpicFightForCustomWitherRenderer(
        RenderLivingEvent.Pre<?, ?> event,
        CallbackInfo callbackInfo
    ) {
        if (event.getEntity() instanceof WitherBoss
            && !(event.getRenderer() instanceof WitherBossRenderer)) {
            callbackInfo.cancel();
        }
    }
}