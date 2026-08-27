package dev.itscarlos.nexuscore.nexus;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public final class NexusCrystalVisualPolicyCheck {
    private static final String MODEL_RESOURCE =
        "/assets/nexuscore/models/block/nexus_crystal_v8.json";
    private static final String TEXTURE_RESOURCE =
        "/assets/nexuscore/textures/block/nexus_crystal/v8_shell.png";
    private static final String ANIMATION_RESOURCE =
        TEXTURE_RESOURCE + ".mcmeta";

    private NexusCrystalVisualPolicyCheck() {
    }

    public static void main(String[] args) throws Exception {
        checkRendererConstants();
        checkModel();
        checkTexture();
        checkAnimationMetadata();

        System.out.println(
            "Nexus Crystal V8.1 policy OK: 8-face CUTOUT model, "
                + "1.30 x 2.4375 envelope, stitched binary-alpha sprite, "
                + "Forge baked light, 35% core."
        );
    }

    private static void checkRendererConstants() {
        near("height", 2.4375F,
            NexusCrystalVisuals.OUTER_TOP_Y
                - NexusCrystalVisuals.OUTER_BOTTOM_Y,
            0.000001F);
        near("center", 1.21875F,
            NexusCrystalVisuals.CENTER_Y, 0.000001F);
        near("core", 0.35F,
            NexusCrystalVisuals.CORE_SCALE, 0.000001F);
        near("mapped nominal width",
            NexusCrystalVisuals.OUTER_RADIUS * 2.0F,
            NexusCrystalVisuals.SOURCE_MODEL_WIDTH
                * NexusCrystalVisuals.SHELL_SCALE_XZ,
            0.00001F);
        near("mapped height", 2.4375F,
            NexusCrystalVisuals.SOURCE_MODEL_HEIGHT
                * NexusCrystalVisuals.SHELL_SCALE_Y,
            0.00001F);
        near("rotation", 1.0F,
            NexusCrystalVisuals.SHELL_DEGREES_PER_TICK,
            0.000001F);
    }

    private static void checkModel() throws IOException {
        JsonObject model = readJson(MODEL_RESOURCE);

        equal("render type", "minecraft:cutout",
            model.get("render_type").getAsString());
        require(!model.get("ambientocclusion").getAsBoolean(),
            "Top-level ambient occlusion must be disabled.");

        JsonObject textures = model.getAsJsonObject("textures");
        equal("crystal sprite",
            "nexuscore:block/nexus_crystal/v8_shell",
            textures.get("crystal").getAsString());
        equal("particle sprite",
            "nexuscore:block/nexus_crystal/v8_shell",
            textures.get("particle").getAsString());

        JsonArray elements = model.getAsJsonArray("elements");
        require(elements.size() == 8,
            "Expected exactly 8 model elements, got " + elements.size());

        int upper = 0;
        int lower = 0;
        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double minZ = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        double maxZ = Double.NEGATIVE_INFINITY;
        Set<String> uniqueUvs = new HashSet<>();
        Map<String, Integer> faceCounts = new java.util.HashMap<>();

        for (JsonElement entry : elements) {
            JsonObject element = entry.getAsJsonObject();
            JsonArray from = element.getAsJsonArray("from");
            JsonArray to = element.getAsJsonArray("to");

            minX = Math.min(minX, from.get(0).getAsDouble());
            minY = Math.min(minY, from.get(1).getAsDouble());
            minZ = Math.min(minZ, from.get(2).getAsDouble());
            maxX = Math.max(maxX, to.get(0).getAsDouble());
            maxY = Math.max(maxY, to.get(1).getAsDouble());
            maxZ = Math.max(maxZ, to.get(2).getAsDouble());

            if (from.get(1).getAsDouble() >= 12.0D) {
                upper++;
            } else {
                lower++;
            }

            require(!element.get("shade").getAsBoolean(),
                "Every shell element must use shade:false.");

            JsonObject rotation = element.getAsJsonObject("rotation");
            near("facet rotation", 22.5D,
                Math.abs(rotation.get("angle").getAsDouble()), 0.000001D);
            require(rotation.get("rescale").getAsBoolean(),
                "Every facet rotation must use rescale:true.");

            JsonObject forgeData = element.getAsJsonObject("forge_data");
            require(forgeData != null,
                "Every facet requires Forge face-light data.");
            require(forgeData.get("block_light").getAsInt() == 15,
                "Every facet requires block_light 15.");
            require(forgeData.get("sky_light").getAsInt() == 15,
                "Every facet requires sky_light 15.");
            require(!forgeData.get("ambient_occlusion").getAsBoolean(),
                "Every facet must disable ambient occlusion.");

            JsonObject faces = element.getAsJsonObject("faces");
            require(faces.size() == 1,
                "Every element must contain exactly one face.");
            Map.Entry<String, JsonElement> face =
                faces.entrySet().iterator().next();
            faceCounts.merge(face.getKey(), 1, Integer::sum);
            JsonObject faceData = face.getValue().getAsJsonObject();
            equal("facet texture", "#crystal",
                faceData.get("texture").getAsString());
            uniqueUvs.add(faceData.getAsJsonArray("uv").toString());
        }

        require(upper == 4 && lower == 4,
            "Expected 4 upper and 4 lower elements.");
        require(uniqueUvs.size() == 8,
            "Every facet must use a unique UV region.");
        for (String direction : new String[] {
            "north", "south", "east", "west"
        }) {
            require(faceCounts.getOrDefault(direction, 0) == 2,
                "Expected two " + direction + " faces.");
        }

        near("JSON center X", 8.0D, (minX + maxX) / 2.0D, 0.000001D);
        near("JSON center Y", 12.63D, (minY + maxY) / 2.0D, 0.000001D);
        near("JSON center Z", 8.0D, (minZ + maxZ) / 2.0D, 0.000001D);

        double mappedWidth =
            ((maxX - minX) / 16.0D)
                * NexusCrystalVisuals.SHELL_SCALE_XZ;
        double mappedDepth =
            ((maxZ - minZ) / 16.0D)
                * NexusCrystalVisuals.SHELL_SCALE_XZ;
        double mappedHeight =
            ((maxY - minY) / 16.0D)
                * NexusCrystalVisuals.SHELL_SCALE_Y;

        near("mapped JSON width", 1.30D, mappedWidth, 0.005D);
        near("mapped JSON depth", 1.30D, mappedDepth, 0.005D);
        near("mapped JSON height", 2.4375D, mappedHeight, 0.00001D);
        near("mapped bottom", 0.0D,
            NexusCrystalVisuals.CENTER_Y - mappedHeight / 2.0D,
            0.00001D);
        near("mapped top", 2.4375D,
            NexusCrystalVisuals.CENTER_Y + mappedHeight / 2.0D,
            0.00001D);
    }

    private static void checkTexture() throws IOException {
        BufferedImage image;
        try (InputStream stream = resource(TEXTURE_RESOURCE)) {
            image = ImageIO.read(stream);
        }

        require(image != null, "The shell PNG could not be decoded.");
        require(image.getWidth() == 256,
            "Shell texture width must be 256 pixels.");
        require(image.getHeight() == 1536,
            "Shell texture must contain six 256x256 frames.");
        require(image.getHeight() % image.getWidth() == 0,
            "Animated shell frames must be square.");

        int frameSize = image.getWidth();
        int frameCount = image.getHeight() / frameSize;
        int cellSize = frameSize / 4;
        int cyanAccents = 0;

        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                int argb = image.getRGB(x, y);
                int alpha = argb >>> 24;
                require(alpha == 0 || alpha == 255,
                    "CUTOUT texture contains non-binary alpha at "
                        + x + "," + y + ": " + alpha);

                if (alpha == 255) {
                    int red = (argb >>> 16) & 0xFF;
                    int green = (argb >>> 8) & 0xFF;
                    int blue = argb & 0xFF;
                    if (green > red && blue > red) {
                        cyanAccents++;
                    }
                }
            }
        }

        require(cyanAccents > 0,
            "The shell texture must retain small cyan Nexus accents.");

        for (int frame = 0; frame < frameCount; frame++) {
            for (int cell = 0; cell < 8; cell++) {
                int cellX = (cell % 4) * cellSize;
                int cellY = frame * frameSize + (cell / 4) * cellSize;
                int components = opaqueComponents(
                    image, cellX, cellY, cellSize, cellSize
                );
                require(components == 1,
                    "Frame " + frame + ", facet " + cell
                        + " must be one cohesive opaque region; got "
                        + components);
            }
        }
    }

    private static void checkAnimationMetadata() throws IOException {
        JsonObject animation =
            readJson(ANIMATION_RESOURCE).getAsJsonObject("animation");
        require(animation.get("frametime").getAsInt() == 5,
            "Shell animation frametime must remain 5 ticks.");
        require(!animation.has("interpolate")
                || !animation.get("interpolate").getAsBoolean(),
            "CUTOUT animation must not interpolate alpha.");
    }

    private static int opaqueComponents(
        BufferedImage image,
        int originX,
        int originY,
        int width,
        int height
    ) {
        boolean[][] visited = new boolean[height][width];
        int components = 0;
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (visited[y][x]
                    || (image.getRGB(originX + x, originY + y) >>> 24)
                        != 255) {
                    continue;
                }

                components++;
                ArrayDeque<int[]> queue = new ArrayDeque<>();
                queue.add(new int[] {x, y});
                visited[y][x] = true;

                while (!queue.isEmpty()) {
                    int[] point = queue.removeFirst();
                    for (int direction = 0; direction < 4; direction++) {
                        int nextX = point[0] + dx[direction];
                        int nextY = point[1] + dy[direction];
                        if (nextX < 0 || nextX >= width
                            || nextY < 0 || nextY >= height
                            || visited[nextY][nextX]
                            || (image.getRGB(
                                originX + nextX,
                                originY + nextY
                            ) >>> 24) != 255) {
                            continue;
                        }
                        visited[nextY][nextX] = true;
                        queue.addLast(new int[] {nextX, nextY});
                    }
                }
            }
        }

        return components;
    }

    private static JsonObject readJson(String path) throws IOException {
        try (InputStream stream = resource(path);
             InputStreamReader reader = new InputStreamReader(
                 stream,
                 StandardCharsets.UTF_8
             )) {
            return JsonParser.parseReader(reader).getAsJsonObject();
        }
    }

    private static InputStream resource(String path) {
        InputStream stream =
            NexusCrystalVisualPolicyCheck.class.getResourceAsStream(path);
        if (stream == null) {
            throw new AssertionError("Missing classpath resource: " + path);
        }
        return stream;
    }

    private static void equal(
        String name,
        String expected,
        String actual
    ) {
        if (!expected.equals(actual)) {
            throw new AssertionError(
                name + ": expected " + expected + " got " + actual
            );
        }
    }

    private static void near(
        String name,
        float expected,
        float actual,
        float epsilon
    ) {
        near(name, (double) expected, actual, epsilon);
    }

    private static void near(
        String name,
        double expected,
        double actual,
        double epsilon
    ) {
        if (Math.abs(expected - actual) > epsilon) {
            throw new AssertionError(
                name + ": expected " + expected + " got " + actual
            );
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
