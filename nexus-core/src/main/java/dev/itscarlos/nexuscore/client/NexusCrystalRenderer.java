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
import net.minecraft.client.renderer.entity.EntityRenderer;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;

/**
 * Nexus Crystal V7.1
 *
 * The important rule is unchanged: the essential crystal never uses partial
 * alpha blending. All four passes use CUTOUT. The "glass" look comes from
 * sparse opaque facets, real holes, two nested rotating shells, lighting and
 * a full-bright energy core.
 */
public final class NexusCrystalRenderer extends EntityRenderer<NexusCrystalEntity> {
    private static final ResourceLocation OUTER_SHELL_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/shell_outer.png"
        );

    private static final ResourceLocation INNER_SHELL_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/shell_inner.png"
        );

    private static final ResourceLocation CORE_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/core.png"
        );

    private static final ResourceLocation HIGHLIGHT_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/highlight.png"
        );

    private static final RenderType OUTER_SHELL_RENDER_TYPE =
        RenderType.entityCutoutNoCull(OUTER_SHELL_TEXTURE);

    private static final RenderType INNER_SHELL_RENDER_TYPE =
        RenderType.entityCutoutNoCull(INNER_SHELL_TEXTURE);

    private static final RenderType CORE_RENDER_TYPE =
        RenderType.entityCutoutNoCull(CORE_TEXTURE);

    private static final RenderType HIGHLIGHT_RENDER_TYPE =
        RenderType.entityCutoutNoCull(HIGHLIGHT_TEXTURE);

    /** 4 x 4 atlas; V7.1 uses cells 0..11. */
    private static final float ATLAS_SIZE = 256.0F;
    private static final float ATLAS_CELL_SIZE = 64.0F;

    private static final float[] RING_X = new float[6];
    private static final float[] RING_Z = new float[6];

    static {
        float[] degrees =
            new float[] {60.0F, 0.0F, -60.0F, -120.0F, -180.0F, -240.0F};

        for (int i = 0; i < degrees.length; i++) {
            double radians = Math.toRadians(degrees[i]);
            RING_X[i] =
                (float) (Math.cos(radians) * NexusCrystalVisuals.OUTER_RADIUS);
            RING_Z[i] =
                (float) (Math.sin(radians) * NexusCrystalVisuals.OUTER_RADIUS);
        }
    }

    public NexusCrystalRenderer(EntityRendererProvider.Context context) {
        super(context);
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
        float animationTime = entity.tickCount + partialTicks;
        float bob = NexusCrystalVisuals.bob(animationTime);

        // PASS 1 — world-lit outer crystal facets.
        poseStack.pushPose();
        applyCenteredRotation(
            poseStack,
            bob,
            animationTime * NexusCrystalVisuals.OUTER_SHELL_DEGREES_PER_TICK
        );
        renderAtlasBipyramid(
            poseStack,
            bufferSource.getBuffer(OUTER_SHELL_RENDER_TYPE),
            packedLight
        );
        poseStack.popPose();

        // PASS 2 — smaller, differently rotating inner "glass" shell.
        // This follows the successful vanilla End Crystal idea of nested,
        // transformed cutout shells rather than alpha-blended glass volumes.
        poseStack.pushPose();
        poseStack.translate(
            0.0D,
            bob + NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.mulPose(
            Axis.YP.rotationDegrees(
                NexusCrystalVisuals.INNER_SHELL_ROTATION_OFFSET_DEGREES
                    + animationTime
                    * NexusCrystalVisuals.INNER_SHELL_DEGREES_PER_TICK
            )
        );
        poseStack.scale(
            NexusCrystalVisuals.INNER_SHELL_SCALE,
            NexusCrystalVisuals.INNER_SHELL_SCALE,
            NexusCrystalVisuals.INNER_SHELL_SCALE
        );
        poseStack.translate(
            0.0D,
            -NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        renderAtlasBipyramid(
            poseStack,
            bufferSource.getBuffer(INNER_SHELL_RENDER_TYPE),
            packedLight
        );
        poseStack.popPose();

        // PASS 3 — existing energy core, full-bright and independent.
        poseStack.pushPose();
        poseStack.translate(
            0.0D,
            bob + NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.mulPose(
            Axis.YP.rotationDegrees(
                animationTime * NexusCrystalVisuals.CORE_DEGREES_PER_TICK
            )
        );

        float coreScale =
            NexusCrystalVisuals.CORE_SCALE
                * NexusCrystalVisuals.corePulse(animationTime);

        poseStack.scale(coreScale, coreScale, coreScale);
        poseStack.translate(
            0.0D,
            -NexusCrystalVisuals.CENTER_Y,
            0.0D
        );

        renderUniformUvBipyramid(
            poseStack,
            bufferSource.getBuffer(CORE_RENDER_TYPE),
            LightTexture.FULL_BRIGHT
        );
        poseStack.popPose();

        // PASS 4 — only a few moving full-bright glints.
        // Kept separate so highlights can bloom without turning the shell
        // itself into an emissive object.
        poseStack.pushPose();
        applyCenteredRotation(
            poseStack,
            bob,
            animationTime * NexusCrystalVisuals.OUTER_SHELL_DEGREES_PER_TICK
        );
        poseStack.translate(
            0.0D,
            NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.scale(1.004F, 1.004F, 1.004F);
        poseStack.translate(
            0.0D,
            -NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        renderAtlasBipyramid(
            poseStack,
            bufferSource.getBuffer(HIGHLIGHT_RENDER_TYPE),
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

    private static void applyCenteredRotation(
        PoseStack poseStack,
        float bob,
        float rotationDegrees
    ) {
        poseStack.translate(
            0.0D,
            bob + NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.mulPose(Axis.YP.rotationDegrees(rotationDegrees));
        poseStack.translate(
            0.0D,
            -NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
    }

    /**
     * Renders the 12 bipyramid faces using a unique 64x64 atlas cell per face.
     * Cells 0..5 are upper faces, 6..11 lower faces.
     */
    private static void renderAtlasBipyramid(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight
    ) {
        float ringY = NexusCrystalVisuals.OUTER_RING_Y;
        float topY = NexusCrystalVisuals.OUTER_TOP_Y;
        float bottomY = NexusCrystalVisuals.OUTER_BOTTOM_Y;

        for (int i = 0; i < 6; i++) {
            int next = (i + 1) % 6;

            int upperFace = i;
            triangle(
                poseStack,
                consumer,
                packedLight,
                RING_X[i], ringY, RING_Z[i],
                    atlasU(upperFace, 4.0F), atlasV(upperFace, 60.0F),
                RING_X[next], ringY, RING_Z[next],
                    atlasU(upperFace, 60.0F), atlasV(upperFace, 60.0F),
                0.0F, topY, 0.0F,
                    atlasU(upperFace, 32.0F), atlasV(upperFace, 4.0F)
            );

            int lowerFace = 6 + i;
            triangle(
                poseStack,
                consumer,
                packedLight,
                RING_X[next], ringY, RING_Z[next],
                    atlasU(lowerFace, 4.0F), atlasV(lowerFace, 4.0F),
                RING_X[i], ringY, RING_Z[i],
                    atlasU(lowerFace, 60.0F), atlasV(lowerFace, 4.0F),
                0.0F, bottomY, 0.0F,
                    atlasU(lowerFace, 32.0F), atlasV(lowerFace, 60.0F)
            );
        }
    }

    /**
     * Core keeps the simple full-texture mapping from V7.
     */
    private static void renderUniformUvBipyramid(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight
    ) {
        float ringY = NexusCrystalVisuals.OUTER_RING_Y;
        float topY = NexusCrystalVisuals.OUTER_TOP_Y;
        float bottomY = NexusCrystalVisuals.OUTER_BOTTOM_Y;

        for (int i = 0; i < 6; i++) {
            int next = (i + 1) % 6;

            triangle(
                poseStack,
                consumer,
                packedLight,
                RING_X[i], ringY, RING_Z[i], 0.06F, 0.94F,
                RING_X[next], ringY, RING_Z[next], 0.94F, 0.94F,
                0.0F, topY, 0.0F, 0.50F, 0.05F
            );

            triangle(
                poseStack,
                consumer,
                packedLight,
                RING_X[next], ringY, RING_Z[next], 0.94F, 0.06F,
                RING_X[i], ringY, RING_Z[i], 0.06F, 0.06F,
                0.0F, bottomY, 0.0F, 0.50F, 0.95F
            );
        }
    }

    private static float atlasU(int face, float localPixelX) {
        int column = face % 4;
        return (column * ATLAS_CELL_SIZE + localPixelX) / ATLAS_SIZE;
    }

    private static float atlasV(int face, float localPixelY) {
        int row = face / 4;
        return (row * ATLAS_CELL_SIZE + localPixelY) / ATLAS_SIZE;
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

        vertex(
            consumer, pose, packedLight,
            ax, ay, az, au, av, nx, ny, nz
        );
        vertex(
            consumer, pose, packedLight,
            bx, by, bz, bu, bv, nx, ny, nz
        );
        vertex(
            consumer, pose, packedLight,
            cx, cy, cz, cu, cv, nx, ny, nz
        );

        // Entity CUTOUT uses the quad vertex mode. The duplicated last point
        // creates a degenerate fourth corner for this triangular face.
        vertex(
            consumer, pose, packedLight,
            cx, cy, cz, cu, cv, nx, ny, nz
        );
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
        return OUTER_SHELL_TEXTURE;
    }
}
