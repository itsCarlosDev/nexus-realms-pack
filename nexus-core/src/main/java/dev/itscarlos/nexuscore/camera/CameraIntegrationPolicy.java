package dev.itscarlos.nexuscore.camera;

import java.io.File;

public final class CameraIntegrationPolicy {
    public static final int MAX_IMAGE_BYTES = 1_000_000;
    public static final int MAX_FRAGMENT_BYTES = 30_000;

    private CameraIntegrationPolicy() {
    }

    public static boolean ensureImageParentDirectory(File imageFile) {
        if (imageFile == null) {
            return false;
        }

        File parent = imageFile.getParentFile();
        return parent != null
            && (parent.isDirectory() || parent.mkdirs());
    }

    public static boolean isValidUploadFragment(
        int totalLength,
        int offset,
        byte[] fragment
    ) {
        if (totalLength <= 0 || totalLength > MAX_IMAGE_BYTES
            || offset < 0 || offset > totalLength
            || fragment == null || fragment.length <= 0
            || fragment.length > MAX_FRAGMENT_BYTES) {
            return false;
        }

        return fragment.length <= totalLength - offset;
    }
}
