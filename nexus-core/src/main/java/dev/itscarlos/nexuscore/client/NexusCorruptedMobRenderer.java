package dev.itscarlos.nexuscore.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import dev.itscarlos.nexuscore.NexusCore;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.block.BlockRenderDispatcher;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.level.block.AmethystClusterBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RenderLivingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    value = Dist.CLIENT,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class NexusCorruptedMobRenderer {

    private static final TagKey<EntityType<?>> CORRUPTION_IMMUNE =
        TagKey.create(
            Registries.ENTITY_TYPE,
            new ResourceLocation(NexusCore.MOD_ID, "corruption_immune")
        );

    private static final TagKey<EntityType<?>> FORCE_CORRUPTED =
        TagKey.create(
            Registries.ENTITY_TYPE,
            new ResourceLocation(NexusCore.MOD_ID, "force_corrupted")
        );

    private static final Attachment[] ATTACHMENTS = {
        new Attachment(+0.50F, 0.72F, +0.02F, Direction.EAST),
        new Attachment(-0.50F, 0.61F, -0.05F, Direction.WEST),
        new Attachment(+0.12F, 0.57F, -0.50F, Direction.NORTH),
        new Attachment(-0.18F, 0.39F, +0.50F, Direction.SOUTH),
        new Attachment(+0.10F, 0.91F, +0.06F, Direction.UP),
        new Attachment(+0.50F, 0.31F, -0.13F, Direction.EAST)
    };

    private static final long GOLDEN_GAMMA = 0x9E3779B97F4A7C15L;

    private NexusCorruptedMobRenderer() {
    }

    @SubscribeEvent
    public static void onRenderLivingPost(RenderLivingEvent.Post<?, ?> event) {
        LivingEntity entity = event.getEntity();

        if (!shouldRenderCorruption(entity)) {
            return;
        }

        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.level == null) {
            return;
        }

        float width = entity.getBbWidth();
        float height = entity.getBbHeight();

        if (width <= 0.0F || height <= 0.0F) {
            return;
        }

        long seed = corruptionSeed(entity);
        int plannedCount = 2 + (int) ((seed >>> 1) % 3L);

        LivingEntity viewer = minecraft.player;
        int count = plannedCount;

        if (viewer != null) {
            double distanceSqr = entity.distanceToSqr(viewer);

            if (distanceSqr > 32.0D * 32.0D) {
                count = 1;
            } else if (distanceSqr > 16.0D * 16.0D) {
                count = Math.min(count, 2);
            }
        }

        int startIndex = (int) ((seed >>> 9) % ATTACHMENTS.length);
        int step = ((seed >>> 17) & 1L) == 0L ? 1 : 5;

        float bodyYaw = Mth.rotLerp(
            event.getPartialTick(),
            entity.yBodyRotO,
            entity.yBodyRot
        );

        float baseScale = Mth.clamp(
            Math.min(width, height * 0.45F),
            0.28F,
            1.25F
        );

        PoseStack poseStack = event.getPoseStack();
        BlockRenderDispatcher blockRenderer = minecraft.getBlockRenderer();

        poseStack.pushPose();
        poseStack.mulPose(Axis.YP.rotationDegrees(-bodyYaw));

        for (int i = 0; i < count; i++) {
            int attachmentIndex = Math.floorMod(
                startIndex + i * step,
                ATTACHMENTS.length
            );

            Attachment attachment = ATTACHMENTS[attachmentIndex];
            long pieceSeed = mix64(seed + GOLDEN_GAMMA * (i + 1L));
            BlockState state = chooseAmethyst(pieceSeed);
            float pieceScale = baseScale * scaleFor(state.getBlock());

            renderAttachment(
                poseStack,
                event,
                blockRenderer,
                state,
                attachment,
                width,
                height,
                pieceScale
            );
        }

        poseStack.popPose();
    }

    private static boolean shouldRenderCorruption(LivingEntity entity) {
        if (!entity.isAlive() || entity.isInvisible()) {
            return false;
        }

        EntityType<?> type = entity.getType();

        if (type.is(CORRUPTION_IMMUNE)) {
            return false;
        }

        if (type.is(FORCE_CORRUPTED)) {
            return true;
        }

        return entity instanceof Enemy
            || type.getCategory() == MobCategory.MONSTER;
    }

    private static void renderAttachment(
        PoseStack poseStack,
        RenderLivingEvent.Post<?, ?> event,
        BlockRenderDispatcher blockRenderer,
        BlockState state,
        Attachment attachment,
        float width,
        float height,
        float scale
    ) {
        poseStack.pushPose();

        poseStack.translate(
            attachment.xFactor() * width,
            attachment.yFactor() * height,
            attachment.zFactor() * width
        );

        rotateUpToFacing(poseStack, attachment.facing());

        poseStack.scale(scale, scale, scale);
        poseStack.translate(-0.5D, 0.0D, -0.5D);

        blockRenderer.renderSingleBlock(
            state,
            poseStack,
            event.getMultiBufferSource(),
            event.getPackedLight(),
            OverlayTexture.NO_OVERLAY
        );

        poseStack.popPose();
    }

    private static void rotateUpToFacing(PoseStack poseStack, Direction facing) {
        switch (facing) {
            case NORTH -> poseStack.mulPose(Axis.XP.rotationDegrees(-90.0F));
            case SOUTH -> poseStack.mulPose(Axis.XP.rotationDegrees(90.0F));
            case EAST -> poseStack.mulPose(Axis.ZP.rotationDegrees(-90.0F));
            case WEST -> poseStack.mulPose(Axis.ZP.rotationDegrees(90.0F));
            case DOWN -> poseStack.mulPose(Axis.XP.rotationDegrees(180.0F));
            case UP -> {
            }
        }
    }

    private static BlockState chooseAmethyst(long seed) {
        int roll = (int) ((seed >>> 1) % 100L);
        Block block;

        if (roll < 60) {
            block = Blocks.SMALL_AMETHYST_BUD;
        } else if (roll < 85) {
            block = Blocks.MEDIUM_AMETHYST_BUD;
        } else if (roll < 95) {
            block = Blocks.LARGE_AMETHYST_BUD;
        } else {
            block = Blocks.AMETHYST_CLUSTER;
        }

        return block
            .defaultBlockState()
            .setValue(AmethystClusterBlock.FACING, Direction.UP);
    }

    private static float scaleFor(Block block) {
        if (block == Blocks.SMALL_AMETHYST_BUD) {
            return 1.05F;
        }

        if (block == Blocks.MEDIUM_AMETHYST_BUD) {
            return 1.00F;
        }

        if (block == Blocks.LARGE_AMETHYST_BUD) {
            return 0.94F;
        }

        return 0.88F;
    }

    private static long corruptionSeed(LivingEntity entity) {
        long most = entity.getUUID().getMostSignificantBits();
        long least = entity.getUUID().getLeastSignificantBits();

        return mix64(most ^ Long.rotateLeft(least, 23));
    }

    private static long mix64(long value) {
        value = (value ^ (value >>> 30)) * 0xBF58476D1CE4E5B9L;
        value = (value ^ (value >>> 27)) * 0x94D049BB133111EBL;
        return value ^ (value >>> 31);
    }

    private record Attachment(
        float xFactor,
        float yFactor,
        float zFactor,
        Direction facing
    ) {
    }
}
