package dev.itscarlos.nexuscore.progression;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.itscarlos.nexuscore.NexusCore;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.resources.ResourceLocation;

public final class EraRegistry {
    private static final String RESOURCE = "/assets/nexuscore/progression/eras.json";
    private static final Map<Integer, EraDefinition> ERAS = new HashMap<>();
    private static final EraDefinition FALLBACK = new EraDefinition(
        0,
        "0",
        "Preparación",
        "Preparación",
        "El mundo todavía se está preparando.",
        new ResourceLocation("minecraft", "clock"),
        0x8A8A8A,
        1,
        0,
        List.of()
    );

    private EraRegistry() {
    }

    public static synchronized void load() {
        ERAS.clear();

        try (InputStream stream = EraRegistry.class.getResourceAsStream(RESOURCE)) {
            if (stream == null) {
                throw new IllegalStateException("Missing progression resource " + RESOURCE);
            }

            JsonObject root = JsonParser.parseReader(
                new InputStreamReader(stream, StandardCharsets.UTF_8)
            ).getAsJsonObject();
            JsonArray eras = root.getAsJsonArray("eras");

            for (JsonElement element : eras) {
                JsonObject json = element.getAsJsonObject();
                int id = json.get("id").getAsInt();
                List<String> features = new ArrayList<>();

                if (json.has("features")) {
                    for (JsonElement feature : json.getAsJsonArray("features")) {
                        features.add(feature.getAsString());
                    }
                }

                ERAS.put(id, new EraDefinition(
                    id,
                    json.get("roman").getAsString(),
                    json.get("name").getAsString(),
                    json.get("short_name").getAsString(),
                    json.get("description").getAsString(),
                    new ResourceLocation(json.get("icon").getAsString()),
                    parseColor(json.get("color").getAsString()),
                    json.get("next_era").getAsInt(),
                    json.get("minimum_day").getAsInt(),
                    Collections.unmodifiableList(features)
                ));
            }

            NexusCore.LOGGER.info("Loaded {} Nexus progression eras.", ERAS.size());
        } catch (Exception exception) {
            NexusCore.LOGGER.error("Failed to load Nexus progression eras.", exception);
            ERAS.put(FALLBACK.id(), FALLBACK);
        }
    }

    public static EraDefinition get(int era) {
        return ERAS.getOrDefault(era, FALLBACK);
    }

    public static List<String> activeFeatures(int era) {
        List<String> result = new ArrayList<>();
        ERAS.values().stream()
            .filter(definition -> definition.id() <= era)
            .sorted((left, right) -> Integer.compare(left.id(), right.id()))
            .forEach(definition -> result.addAll(definition.features()));
        return result;
    }

    private static int parseColor(String color) {
        String value = color.startsWith("#") ? color.substring(1) : color;
        return Integer.parseInt(value, 16) & 0xFFFFFF;
    }
}
