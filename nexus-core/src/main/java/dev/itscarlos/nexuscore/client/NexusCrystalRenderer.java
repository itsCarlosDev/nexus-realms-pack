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
 * Nexus Crystal V7.2 — Plane Shell.
 *
 * V7.1's visual failure came from two closed, no-cull bipyramids. Through
 * every cutout hole the player could see rear faces, then a second shell,
 * creating a dense broken-rock look.
 *
 * V7.2 uses only eight outward-facing square-bipyramid planes and enables
 * back-face culling for the shell. The visible crystal is therefore normally
 * two or three sparse facets at once, not 24+ overlapping shell faces.
 */
public final class NexusCrystalRenderer extends EntityRenderer<NexusCrystalEntity> {
    private static final ResourceLocation SHELL_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/shell_planes.png"
        );

    private static final ResourceLocation CORE_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/core.png"
        );

    private static final ResourceLocation HIGHLIGHT_TEXTURE =
        new ResourceLocation(
            NexusCore.MOD_ID,
            "textures/entity/nexus_crystal/highlight_planes.png"
        );

    /**
     * entityCutout keeps the normal CULL state. This is intentional.
     * Rear shell faces must not render through front-face holes.
     */
    private static final RenderType SHELL_RENDER_TYPE =
        RenderType.entityCutout(SHELL_TEXTURE);

    /**
     * The core is an independent small energy object. No-cull is safe here
     * because it does not form the transparent-looking outer shell.
     */
    private static final RenderType CORE_RENDER_TYPE =
        RenderType.entityCutoutNoCull(CORE_TEXTURE);

    private static final RenderType HIGHLIGHT_RENDER_TYPE =
        RenderType.entityCutout(HIGHLIGHT_TEXTURE);

    /** 4 x 2 used region inside a 256 x 128 atlas; one unique cell per plane. */
    private static final float ATLAS_WIDTH = 256.0F;
    private static final float ATLAS_HEIGHT = 128.0F;
    private static final float CELL_SIZE = 64.0F;

    /** Four cardinal equator points create exactly eight shell planes. */
    private static final float[] RING_X = new float[4];
    private static final float[] RING_Z = new float[4];

    static {
        float[] degrees = new float[] {0.0F, 90.0F, 180.0F, 270.0F};

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

        // PASS 1 — the only outer shell.
        poseStack.pushPose();
        applyCenteredRotation(
            poseStack,
            bob,
            animationTime * NexusCrystalVisuals.SHELL_DEGREES_PER_TICK
        );
        renderPlaneShell(
            poseStack,
            bufferSource.getBuffer(SHELL_RENDER_TYPE),
            packedLight
        );
        poseStack.popPose();

        // PASS 2 — unchanged small full-bright energy core.
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

        renderCoreBipyramid(
            poseStack,
            bufferSource.getBuffer(CORE_RENDER_TYPE),
            LightTexture.FULL_BRIGHT
        );
        poseStack.popPose();

        // PASS 3 — very sparse glints on the same culled shell planes.
        poseStack.pushPose();
        applyCenteredRotation(
            poseStack,
            bob,
            animationTime * NexusCrystalVisuals.SHELL_DEGREES_PER_TICK
        );
        poseStack.translate(
            0.0D,
            NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        poseStack.scale(1.003F, 1.003F, 1.003F);
        poseStack.translate(
            0.0D,
            -NexusCrystalVisuals.CENTER_Y,
            0.0D
        );
        renderPlaneShell(
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
     * Eight single-sided triangular planes:
     *
     * 4 upper:
     *     ring[next] -> ring[current] -> top
     *
     * 4 lower:
     *     ring[current] -> ring[next] -> bottom
     *
     * The winding is intentionally opposite between halves so all normals
     * point outward. With entityCutout's CULL state, rear faces disappear.
     */
    private static void renderPlaneShell(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight
    ) {
        float ringY = NexusCrystalVisuals.OUTER_RING_Y;
        float topY = NexusCrystalVisuals.OUTER_TOP_Y;
        float bottomY = NexusCrystalVisuals.OUTER_BOTTOM_Y;

        for (int i = 0; i < 4; i++) {
            int next = (i + 1) % 4;

            int upperFace = i;
            triangle(
                poseStack,
                consumer,
                packedLight,
                RING_X[next], ringY, RING_Z[next],
                    atlasU(upperFace, 60.0F), atlasV(upperFace, 60.0F),
                RING_X[i], ringY, RING_Z[i],
                    atlasU(upperFace, 4.0F), atlasV(upperFace, 60.0F),
                0.0F, topY, 0.0F,
                    atlasU(upperFace, 32.0F), atlasV(upperFace, 4.0F)
            );

            int lowerFace = 4 + i;
            triangle(
                poseStack,
                consumer,
                packedLight,
                RING_X[i], ringY, RING_Z[i],
                    atlasU(lowerFace, 4.0F), atlasV(lowerFace, 4.0F),
                RING_X[next], ringY, RING_Z[next],
                    atlasU(lowerFace, 60.0F), atlasV(lowerFace, 4.0F),
                0.0F, bottomY, 0.0F,
                    atlasU(lowerFace, 32.0F), atlasV(lowerFace, 60.0F)
            );
        }
    }

    /**
     * The V7 core remains a six-sided bipyramid. It is deliberately separate
     * from the shell so a bright solid energy crystal stays readable through
     * the shell's real holes.
     */
    private static void renderCoreBipyramid(
        PoseStack poseStack,
        VertexConsumer consumer,
        int packedLight
    ) {
        final int sides = 6;
        float radius = NexusCrystalVisuals.OUTER_RADIUS;
        float ringY = NexusCrystalVisuals.OUTER_RING_Y;
        float topY = NexusCrystalVisuals.OUTER_TOP_Y;
        float bottomY = NexusCrystalVisuals.OUTER_BOTTOM_Y;

        for (int i = 0; i < sides; i++) {
            double angleA = Math.toRadians(60.0D - i * 60.0D);
            double angleB = Math.toRadians(60.0D - ((i + 1) % sides) * 60.0D);

            float ax = (float) (Math.cos(angleA) * radius);
            float az = (float) (Math.sin(angleA) * radius);
            float bx = (float) (Math.cos(angleB) * radius);
            float bz = (float) (Math.sin(angleB) * radius);

            triangle(
                poseStack,
                consumer,
                packedLight,
                ax, ringY, az, 0.06F, 0.94F,
                bx, ringY, bz, 0.94F, 0.94F,
                0.0F, topY, 0.0F, 0.50F, 0.05F
            );

            triangle(
                poseStack,
                consumer,
                packedLight,
                bx, ringY, bz, 0.94F, 0.06F,
                ax, ringY, az, 0.06F, 0.06F,
                0.0F, bottomY, 0.0F, 0.50F, 0.95F
            );
        }
    }

    private static float atlasU(int face, float localPixelX) {
        int column = face % 4;
        return (column * CELL_SIZE + localPixelX) / ATLAS_WIDTH;
    }

    private static float atlasV(int face, float localPixelY) {
        int row = face / 4;
        return (row * CELL_SIZE + localPixelY) / ATLAS_HEIGHT;
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

        // NEW_ENTITY cutout uses QUADS. Duplicate C as a degenerate 4th vertex.
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
        return SHELL_TEXTURE;
    }
}
