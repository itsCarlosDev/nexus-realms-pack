package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.market.MarketProtection;
import java.util.UUID;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.network.NetworkEvent;
import net.minecraftforge.registries.ForgeRegistries;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Pseudo
@Mixin(
    targets = "de.maxhenkel.camera.net.MessageResizeFrame",
    remap = false
)
public abstract class CameraResizeFrameMessageMixin {
    private static final ResourceLocation CAMERA_FRAME =
        new ResourceLocation("camera", "image_frame");

    @Shadow
    private UUID uuid;

    @Inject(
        method = "executeServerSide",
        at = @At("HEAD"),
        cancellable = true,
        remap = false
    )
    private void nexuscore$protectMarketResize(
        NetworkEvent.Context context,
        CallbackInfo callbackInfo
    ) {
        ServerPlayer player = context.getSender();

        if (player == null || uuid == null
            || MarketProtection.hasAdminBypass(player)) {
            return;
        }

        ServerLevel level = player.serverLevel();
        Entity entity = level.getEntity(uuid);

        if (entity != null
            && CAMERA_FRAME.equals(
                ForgeRegistries.ENTITY_TYPES.getKey(entity.getType())
            )
            && MarketProtection.isInsideProtectedMarket(
                level,
                entity.blockPosition()
            )) {
            callbackInfo.cancel();
        }
    }
}
