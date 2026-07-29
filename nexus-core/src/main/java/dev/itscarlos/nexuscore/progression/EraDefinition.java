package dev.itscarlos.nexuscore.progression;

import java.util.List;
import net.minecraft.resources.ResourceLocation;

public record EraDefinition(
    int id,
    String roman,
    String name,
    String shortName,
    String description,
    ResourceLocation icon,
    int color,
    int nextEra,
    int minimumDay,
    List<String> features
) {
}
