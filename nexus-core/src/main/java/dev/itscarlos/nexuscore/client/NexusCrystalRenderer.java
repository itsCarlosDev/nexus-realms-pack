package dev.itscarlos.nexuscore.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Axis;
import dev.itscarlos.nexuscore.NexusCore;
import dev.itscarlos.nexuscore.nexus.NexusCrystalEntity;
import dev.itscarlos.nexuscore.nexus.NexusCrystalVisuals;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.block.ModelBlockRenderer;
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.client.resources.model.BakedModel;
import net.minecraft.client.resources.model.ModelManager;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.client.RenderTypeHelper;
import net.minecraftforge.client.model.data.ModelData;

/**
 * Nexus Crystal V8.1.
 *
 * Shell: vanilla BakedModel, 8 ultra-thin single-face planes, CUTOUT,
 * baked full-bright light, globally rotated. The model is rendered through
 * ModelBlockRenderer and Forge's block-atlas entity render type so the vertex
 * format remains compatible with entity/shader rendering.
 *
 * Core: existing V7 energy bipyramid, 35%, full-bright.
 */
public final class NexusCrystalRenderer
    extends EntityRenderer<NexusCrystalEntity> {

    private static final ResourceLocation CORE_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/core.png"
        );

    private static final RenderType CORE_RENDER_TYPE =
        RenderType.entityCutoutNoCull(CORE_TEXTURE);

    private static final RenderType SHELL_CHUNK_RENDER_TYPE =
        RenderType.cutout();

    /**
     * Forge converts the BLOCK-format chunk layer to the NEW_ENTITY-format
     * block sheet required by a MultiBufferSource in an EntityRenderer.
     */
    private static final RenderType SHELL_ENTITY_RENDER_TYPE =
        RenderTypeHelper.getEntityRenderType(
            SHELL_CHUNK_RENDER_TYPE,
            true
        );

    private final ModelBlockRenderer modelRenderer;
    private final ModelManager modelManager;

    public NexusCrystalRenderer(EntityRendererProvider.Context context) {
        super(context);
        this.modelRenderer =
            context.getBlockRenderDispatcher().getModelRenderer();
        this.modelManager = context.getModelManager();
        this.shadowRadius = 0.0F;
    }

    @Override
    public void render(
        NexusCrystalEntity entity,
        float entityYaw,
        float partialTicks,
        PoseStack poseStack,
        MultiBufferSource bufferSource,
        int packedLight
    ) {
        float time = entity.tickCount + partialTicks;
        float bob = NexusCrystalVisuals.bob(time);

        // PASS 1: Botania-style baked shell.
        poseStack.pushPose();
        poseStack.translate(
            0.0D,
            bob + NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.mulPose(
            Axis.YP.rotationDegrees(
                time * NexusCrystalVisuals.SHELL_DEGREES_PER_TICK
            )
        );
        poseStack.scale(
            NexusCrystalVisuals.SHELL_SCALE_XZ,
            NexusCrystalVisuals.SHELL_SCALE_Y,
            NexusCrystalVisuals.SHELL_SCALE_XZ
        );
        poseStack.translate(
            -NexusCrystalVisuals.SOURCE_MODEL_CENTER_XZ,
            -NexusCrystalVisuals.SOURCE_MODEL_CENTER_Y,
            -NexusCrystalVisuals.SOURCE_MODEL_CENTER_XZ
        );

        renderBakedShell(
            poseStack,
            bufferSource.getBuffer(SHELL_ENTITY_RENDER_TYPE),
            packedLight
        );
        poseStack.popPose();

        // PASS 2: existing Nexus core.
        poseStack.pushPose();
        poseStack.translate(
            0.0D,
            bob + NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.mulPose(
            Axis.YP.rotationDegrees(
                time * NexusCrystalVisuals.CORE_DEGREES_PER_TICK
            )
        );

        float coreScale =
            NexusCrystalVisuals.CORE_SCALE
                * NexusCrystalVisuals.corePulse(time);

        poseStack.scale(coreScale, coreScale, coreScale);
        poseStack.translate(
            0.0D,
            -NexusCrystalVisuals.CENTER_Y,
            0.0D
        );

        renderCoreBipyramid(
            poseStack,
            bufferSource.getBuffer(CORE_RENDER_TYPE),
            LightTexture.FULL_BRIGHT
        );
        poseStack.popPose();

        super.render(
            entity,
            entityYaw,
            partialTicks,
            poseStack,
            bufferSource,
            packedLight
        );
    }

    private void renderBakedShell(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight
    ) {
        BakedModel model =
            modelManager.getModel(
                NexusCrystalClientModels.V8_SHELL_MODEL
            );

        if (model == modelManager.getMissingModel()) {
            return;
        }

        modelRenderer.renderModel(
            poseStack.last(),
            consumer,
            null,
            model,
            1.0F,
            1.0F,
            1.0F,
            packedLight,
            OverlayTexture.NO_OVERLAY,
            ModelData.EMPTY,
            SHELL_CHUNK_RENDER_TYPE
        );
    }

    private static void renderCoreBipyramid(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight
    ) {
        final int sides = 6;
        float radius = NexusCrystalVisuals.OUTER_RADIUS;
        float ringY = 0.9375F;
        float topY = NexusCrystalVisuals.OUTER_TOP_Y;
        float bottomY = NexusCrystalVisuals.OUTER_BOTTOM_Y;

        for (int i = 0; i < sides; i++) {
            double angleA =
                Math.toRadians(60.0D - i * 60.0D);
            double angleB =
                Math.toRadians(
                    60.0D - ((i + 1) % sides) * 60.0D
                );

            float ax = (float) (Math.cos(angleA) * radius);
            float az = (float) (Math.sin(angleA) * radius);
            float bx = (float) (Math.cos(angleB) * radius);
            float bz = (float) (Math.sin(angleB) * radius);

            triangle(
                poseStack, consumer, packedLight,
                ax, ringY, az, 0.06F, 0.94F,
                bx, ringY, bz, 0.94F, 0.94F,
                0.0F, topY, 0.0F, 0.50F, 0.05F
            );

            triangle(
                poseStack, consumer, packedLight,
                bx, ringY, bz, 0.94F, 0.06F,
                ax, ringY, az, 0.06F, 0.06F,
                0.0F, bottomY, 0.0F, 0.50F, 0.95F
            );
        }
    }

    private static void triangle(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight,
        float ax, float ay, float az, float au, float av,
        float bx, float by, float bz, float bu, float bv,
        float cx, float cy, float cz, float cu, float cv
    ) {
        float abx = bx - ax;
        float aby = by - ay;
        float abz = bz - az;
        float acx = cx - ax;
        float acy = cy - ay;
        float acz = cz - az;

        float nx = aby * acz - abz * acy;
        float ny = abz * acx - abx * acz;
        float nz = abx * acy - aby * acx;

        float length =
            (float) Math.sqrt(nx * nx + ny * ny + nz * nz);

        if (length > 0.000001F) {
            nx /= length;
            ny /= length;
            nz /= length;
        }

        PoseStack.Pose pose = poseStack.last();

        vertex(consumer, pose, packedLight,
            ax, ay, az, au, av, nx, ny, nz);
        vertex(consumer, pose, packedLight,
            bx, by, bz, bu, bv, nx, ny, nz);
        vertex(consumer, pose, packedLight,
            cx, cy, cz, cu, cv, nx, ny, nz);
        vertex(consumer, pose, packedLight,
            cx, cy, cz, cu, cv, nx, ny, nz);
    }

    private static void vertex(
        VertexConsumer consumer,
        PoseStack.Pose pose,
        int packedLight,
        float x, float y, float z,
        float u, float v,
        float nx, float ny, float nz
    ) {
        consumer.vertex(pose.pose(), x, y, z)
            .color(255, 255, 255, 255)
            .uv(u, v)
            .overlayCoords(OverlayTexture.NO_OVERLAY)
            .uv2(packedLight)
            .normal(pose.normal(), nx, ny, nz)
            .endVertex();
    }

    @Override
    public ResourceLocation getTextureLocation(
        NexusCrystalEntity entity
    ) {
        return CORE_TEXTURE;
    }
}
