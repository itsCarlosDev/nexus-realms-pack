package dev.itscarlos.nexuscore.camera;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

public final class CameraIntegrationPolicyCheck {
    private CameraIntegrationPolicyCheck() {
    }

    public static void main(String[] args) throws Exception {
        requireValid(100, 0, 100);
        requireValid(1_000_000, 970_000, 30_000);
        requireInvalid(0, 0, 1);
        requireInvalid(1_000_001, 0, 1);
        requireInvalid(100, -1, 1);
        requireInvalid(100, 99, 2);
        requireInvalid(40_000, 0, 30_001);

        Path temporaryRoot = Files.createTempDirectory(
            "nexuscore-camera-"
        );
        Path imageParent = temporaryRoot.resolve("camera_images");
        File image = imageParent.resolve("image-id.jpg").toFile();

        try {
            if (!CameraIntegrationPolicy.ensureImageParentDirectory(
                image
            )) {
                throw new AssertionError(
                    "Image parent directory was not created"
                );
            }
            if (!Files.isDirectory(imageParent)) {
                throw new AssertionError(
                    "Image parent is not a directory"
                );
            }
            if (image.exists()) {
                throw new AssertionError(
                    "Final JPEG path must not become a directory"
                );
            }
        } finally {
            Files.deleteIfExists(image.toPath());
            Files.deleteIfExists(imageParent);
            Files.deleteIfExists(temporaryRoot);
        }

        System.out.println("Camera integration checks passed: 8/8");
    }

    private static void requireValid(
        int totalLength,
        int offset,
        int fragmentLength
    ) {
        if (!CameraIntegrationPolicy.isValidUploadFragment(
            totalLength,
            offset,
            new byte[fragmentLength]
        )) {
            throw new AssertionError("Fragment should be valid");
        }
    }

    private static void requireInvalid(
        int totalLength,
        int offset,
        int fragmentLength
    ) {
        if (CameraIntegrationPolicy.isValidUploadFragment(
            totalLength,
            offset,
            new byte[fragmentLength]
        )) {
            throw new AssertionError("Fragment should be invalid");
        }
    }
}
