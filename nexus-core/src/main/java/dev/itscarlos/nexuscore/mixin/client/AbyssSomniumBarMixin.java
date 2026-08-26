package dev.itscarlos.nexuscore.mixin.client;

import dev.itscarlos.nexuscore.client.AbyssSomniumCompat;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.player.Player;
import net.minecraftforge.client.event.RenderGuiEvent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Pseudo
@Mixin(
    targets = "net.yezon.theabyss.client.screens.SomniumBarOverlay",
    remap = false
)
public abstract class AbyssSomniumBarMixin {

    @Inject(
        method = "eventHandler",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private static void nexuscore$hideUnusedSomniumBar(
        RenderGuiEvent.Pre event,
        CallbackInfo ci
    ) {
        Player player = Minecraft.getInstance().player;

        if (
            player != null &&
            !AbyssSomniumCompat.shouldRender(player)
        ) {
            ci.cancel();
        }
    }
}