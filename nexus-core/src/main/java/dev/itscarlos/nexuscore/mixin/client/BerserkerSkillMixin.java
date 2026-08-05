package dev.itscarlos.nexuscore.mixin.client;

import net.minecraft.resources.ResourceLocation;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Coerce;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Removes only the solid red body overlay registered by Epic Fight's
 * Berserker skill.
 *
 * <p>The skill bonuses, HUD and particle generator remain untouched.
 */
@Pseudo
@Mixin(
    targets = "yesman.epicfight.skill.passive.BerserkerSkill",
    remap = false
)
public abstract class BerserkerSkillMixin {

    /**
     * Suppresses the BERSERKER_OVERLAY registration performed inside
     * BerserkerSkill#onInitiateClient.
     *
     * <p>The separate addParticleGenerator invocation is not intercepted.
     */
    @Redirect(
        method = "onInitiateClient",
        at = @At(
            value = "INVOKE",
            target = "Lyesman/epicfight/world/capabilities/entitypatch/EntityDecorations;addDecorationOverlay(Lnet/minecraft/resources/ResourceLocation;Lyesman/epicfight/world/capabilities/entitypatch/EntityDecorations$DecorationOverlay;)V"
        ),
        remap = false,
        require = 1
    )
    private void nexuscore$suppressBerserkerOverlay(
        @Coerce Object decorations,
        ResourceLocation overlayId,
        @Coerce Object overlay
    ) {
        // Intentionally empty: only the Berserker body overlay is suppressed.
    }
}
