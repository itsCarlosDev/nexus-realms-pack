package dev.itscarlos.nexuscore.mixin.client;

import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(Gui.class)
public abstract class GuiExperienceLevelMixin {

    /**
     * 1.00F = tamaño vanilla.
     * 0.60F = 60 % del tamaño vanilla.
     */
    @Unique
    private static final float NEXUSCORE_XP_LEVEL_SCALE = 0.60F;

    /**
     * Desplazamiento vertical respecto a la posición vanilla.
     * Un valor mayor baja el número.
     * Un valor menor sube el número.
     */
    @Unique
    private static final float NEXUSCORE_XP_LEVEL_Y_OFFSET = 3.0F;

    /**
     * renderExperienceBar dibuja el número varias veces para crear
     * el contorno negro. Esta variable evita dibujarlo repetidamente.
     */
    @Unique
    private boolean nexuscore$xpLevelDrawn;

    @Inject(
        method = "renderExperienceBar(Lnet/minecraft/client/gui/GuiGraphics;I)V",
        at = @At("HEAD")
    )
    private void nexuscore$resetXpLevelDrawState(
        GuiGraphics graphics,
        int barX,
        CallbackInfo ci
    ) {
        this.nexuscore$xpLevelDrawn = false;
    }

    /**
     * Intercepta exclusivamente las llamadas que dibujan el texto del
     * nivel de experiencia. La barra de experiencia original no se modifica.
     */
    @Redirect(
        method = "renderExperienceBar(Lnet/minecraft/client/gui/GuiGraphics;I)V",
        at = @At(
            value = "INVOKE",
            target = "Lnet/minecraft/client/gui/GuiGraphics;drawString(Lnet/minecraft/client/gui/Font;Ljava/lang/String;IIIZ)I"
        )
    )
    private int nexuscore$renderSmallerExperienceLevel(
        GuiGraphics graphics,
        Font font,
        String text,
        int originalX,
        int originalY,
        int originalColor,
        boolean originalShadow
    ) {
        // Vanilla llama varias veces a drawString para crear el contorno.
        // Nosotros sustituimos todas esas llamadas por un único render.
        if (this.nexuscore$xpLevelDrawn) {
            return 0;
        }

        this.nexuscore$xpLevelDrawn = true;

        float centerX = graphics.guiWidth() / 2.0F;

        var poseStack = graphics.pose();
        poseStack.pushPose();

        try {
            poseStack.translate(
                centerX,
                originalY + NEXUSCORE_XP_LEVEL_Y_OFFSET,
                0.0F
            );

            poseStack.scale(
                NEXUSCORE_XP_LEVEL_SCALE,
                NEXUSCORE_XP_LEVEL_SCALE,
                1.0F
            );

            int textX = -font.width(text) / 2;

            // Contorno negro.
            graphics.drawString(
                font,
                text,
                textX + 1,
                0,
                0xFF000000,
                false
            );

            graphics.drawString(
                font,
                text,
                textX - 1,
                0,
                0xFF000000,
                false
            );

            graphics.drawString(
                font,
                text,
                textX,
                1,
                0xFF000000,
                false
            );

            graphics.drawString(
                font,
                text,
                textX,
                -1,
                0xFF000000,
                false
            );

            // Interior verde.
            graphics.drawString(
                font,
                text,
                textX,
                0,
                0xFF80FF20,
                false
            );
        } finally {
            poseStack.popPose();
        }

        return 0;
    }
}