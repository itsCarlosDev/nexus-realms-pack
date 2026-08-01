package dev.itscarlos.nexuscore.mixin;

import dev.itscarlos.nexuscore.camera.CameraIntegrationPolicy;
import java.io.File;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

@Pseudo
@Mixin(targets = "de.maxhenkel.camera.ImageTools", remap = false)
public abstract class CameraImageToolsMixin {
    @Redirect(
        method = "saveImage",
        at = @At(
            value = "INVOKE",
            target = "Ljava/io/File;mkdirs()Z"
        ),
        remap = false
    )
    private static boolean nexuscore$createImageParent(
        File imageFile
    ) {
        return CameraIntegrationPolicy.ensureImageParentDirectory(
            imageFile
        );
    }
}
