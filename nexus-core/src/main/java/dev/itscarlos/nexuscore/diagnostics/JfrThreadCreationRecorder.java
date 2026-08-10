package dev.itscarlos.nexuscore.diagnostics;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import jdk.jfr.FlightRecorder;
import jdk.jfr.Recording;
import jdk.jfr.consumer.RecordedEvent;
import jdk.jfr.consumer.RecordedFrame;
import jdk.jfr.consumer.RecordedMethod;
import jdk.jfr.consumer.RecordedStackTrace;
import jdk.jfr.consumer.RecordedThread;
import jdk.jfr.consumer.RecordingFile;

/**
 * Owns the bounded JFR recording used only by the shutdown hang diagnostic.
 * It does not create an executor or a Java monitoring thread of its own.
 */
final class JfrThreadCreationRecorder implements AutoCloseable {
    static final String EVENT_NAME = "jdk.ThreadStart";
    static final String RECORDING_NAME = "Nexus-Shutdown-Thread-Creation";
    static final String MAX_AGE_DESCRIPTION = "not configured (maxSize is the authoritative bound)";

    private final Object lock = new Object();
    private final long maxSizeBytes;

    private boolean availabilityChecked;
    private boolean available;
    private boolean startAttempted;
    private boolean startedSuccessfully;
    private boolean stackTracesEnabled;
    private boolean toDisk;
    private boolean dumpOnExit;
    private Instant startedInstant;
    private String startFailure;
    private Recording recording;
    private CaptureSnapshot completedCapture;

    JfrThreadCreationRecorder(long maxSizeBytes) {
        if (maxSizeBytes <= 0L) {
            throw new IllegalArgumentException("maxSizeBytes must be positive");
        }
        this.maxSizeBytes = maxSizeBytes;
    }

    StartResult start() {
        synchronized (lock) {
            if (recording != null) {
                return StartResult.ALREADY_ACTIVE;
            }
            if (startAttempted) {
                return StartResult.FAILED;
            }

            startAttempted = true;
            Recording candidate = null;
            try {
                availabilityChecked = true;
                available = FlightRecorder.isAvailable();
                if (!available) {
                    startFailure = "FlightRecorder.isAvailable() returned false";
                    return StartResult.FAILED;
                }

                candidate = new Recording();
                candidate.setName(RECORDING_NAME);
                candidate.setDumpOnExit(false);
                candidate.setToDisk(true);
                candidate.setMaxSize(maxSizeBytes);
                candidate.enable(EVENT_NAME).withStackTrace();
                candidate.start();

                recording = candidate;
                candidate = null;
                startedSuccessfully = true;
                stackTracesEnabled = true;
                toDisk = recording.isToDisk();
                dumpOnExit = recording.getDumpOnExit();
                startedInstant = recording.getStartTime();
                if (startedInstant == null) {
                    startedInstant = Instant.now();
                }
                return StartResult.STARTED;
            } catch (Throwable error) {
                startFailure = describe(error);
                closeQuietly(candidate);
                return StartResult.FAILED;
            }
        }
    }

    StatusSnapshot status() {
        synchronized (lock) {
            return statusLocked();
        }
    }

    CaptureSnapshot captureAndClose(Set<Long> requestedJavaThreadIds) {
        Set<Long> requestedIds = Set.copyOf(requestedJavaThreadIds);
        synchronized (lock) {
            if (completedCapture != null) {
                return completedCapture;
            }

            StatusSnapshot status = statusLocked();
            Recording current = recording;
            recording = null;
            if (current == null) {
                completedCapture = new CaptureSnapshot(
                    status,
                    false,
                    0L,
                    requestedIds,
                    Map.of(),
                    startFailure == null ? "recording was not active" : startFailure
                );
                return completedCapture;
            }

            Path dumpPath = null;
            long eventsScanned = 0L;
            Map<Long, MutableEvidence> matches = new HashMap<>();
            String captureFailure = null;
            try {
                if (current.getState() == jdk.jfr.RecordingState.RUNNING) {
                    current.stop();
                }
                dumpPath = Files.createTempFile("nexus-thread-start-", ".jfr");
                current.dump(dumpPath);
                current.close();

                try (RecordingFile file = new RecordingFile(dumpPath)) {
                    while (file.hasMoreEvents()) {
                        RecordedEvent event = file.readEvent();
                        if (!EVENT_NAME.equals(event.getEventType().getName())) {
                            continue;
                        }
                        eventsScanned++;
                        RecordedThread startedThread = event.getValue("thread");
                        if (startedThread == null) {
                            continue;
                        }
                        long javaThreadId = startedThread.getJavaThreadId();
                        if (!requestedIds.contains(javaThreadId)) {
                            continue;
                        }

                        ThreadStartEvidence evidence = toEvidence(event, startedThread);
                        MutableEvidence retained = matches.get(javaThreadId);
                        if (retained == null) {
                            matches.put(javaThreadId, new MutableEvidence(evidence));
                        } else {
                            retained.consider(evidence);
                        }
                    }
                }
            } catch (Throwable error) {
                captureFailure = describe(error);
            } finally {
                closeQuietly(current);
                if (dumpPath != null) {
                    try {
                        Files.deleteIfExists(dumpPath);
                    } catch (Throwable deleteError) {
                        String deleteFailure = "temporary JFR dump cleanup failed: " + describe(deleteError);
                        captureFailure = captureFailure == null
                            ? deleteFailure
                            : captureFailure + "; " + deleteFailure;
                    }
                }
            }

            Map<Long, ThreadStartEvidence> evidenceById = new HashMap<>();
            matches.forEach((id, mutable) -> evidenceById.put(id, mutable.snapshot()));
            completedCapture = new CaptureSnapshot(
                status,
                true,
                eventsScanned,
                requestedIds,
                Map.copyOf(evidenceById),
                captureFailure
            );
            return completedCapture;
        }
    }

    @Override
    public void close() {
        synchronized (lock) {
            Recording current = recording;
            recording = null;
            closeQuietly(current);
        }
    }

    private StatusSnapshot statusLocked() {
        return new StatusSnapshot(
            availabilityChecked,
            available,
            startAttempted,
            startedSuccessfully,
            startedInstant,
            EVENT_NAME,
            stackTracesEnabled,
            maxSizeBytes,
            MAX_AGE_DESCRIPTION,
            toDisk,
            dumpOnExit,
            startFailure
        );
    }

    private static ThreadStartEvidence toEvidence(
        RecordedEvent event,
        RecordedThread startedThread
    ) {
        RecordedThread parentThread = event.getValue("parentThread");
        RecordedThread eventThread = event.getThread();
        RecordedStackTrace recordedStack = event.getStackTrace();
        List<CreationFrame> frames = recordedStack == null
            ? List.of()
            : recordedStack.getFrames().stream()
                .map(JfrThreadCreationRecorder::toFrame)
                .filter(frame -> frame != null)
                .toList();
        return new ThreadStartEvidence(
            event.getStartTime(),
            toIdentity(startedThread),
            toIdentity(parentThread),
            toIdentity(eventThread),
            recordedStack != null,
            recordedStack != null && recordedStack.isTruncated(),
            frames,
            1
        );
    }

    private static CreationFrame toFrame(RecordedFrame frame) {
        if (frame == null) {
            return null;
        }
        RecordedMethod method = frame.getMethod();
        if (method == null || method.getType() == null) {
            return new CreationFrame(
                "<unavailable>",
                "<unavailable>",
                frame.getLineNumber(),
                frame.getBytecodeIndex(),
                frame.getType(),
                frame.isJavaFrame()
            );
        }
        return new CreationFrame(
            method.getType().getName(),
            method.getName(),
            frame.getLineNumber(),
            frame.getBytecodeIndex(),
            frame.getType(),
            frame.isJavaFrame()
        );
    }

    private static ThreadIdentity toIdentity(RecordedThread thread) {
        if (thread == null) {
            return null;
        }
        return new ThreadIdentity(
            thread.getJavaName(),
            thread.getJavaThreadId(),
            thread.getOSThreadId(),
            thread.getId()
        );
    }

    private static void closeQuietly(Recording recording) {
        if (recording == null) {
            return;
        }
        try {
            recording.close();
        } catch (Throwable ignored) {
            // Shutdown diagnostics must never fail the server because JFR cleanup failed.
        }
    }

    private static String describe(Throwable error) {
        String message = error.getMessage();
        return error.getClass().getName() + (message == null ? "" : ": " + message);
    }

    enum StartResult {
        STARTED,
        ALREADY_ACTIVE,
        FAILED
    }

    record StatusSnapshot(
        boolean availabilityChecked,
        boolean available,
        boolean startAttempted,
        boolean startedSuccessfully,
        Instant startedInstant,
        String eventName,
        boolean stackTracesEnabled,
        long maxSizeBytes,
        String maxAgeDescription,
        boolean toDisk,
        boolean dumpOnExit,
        String startFailure
    ) {
    }

    record CaptureSnapshot(
        StatusSnapshot status,
        boolean captureAttempted,
        long eventsScanned,
        Set<Long> requestedJavaThreadIds,
        Map<Long, ThreadStartEvidence> evidenceByJavaThreadId,
        String captureFailure
    ) {
    }

    record ThreadStartEvidence(
        Instant startInstant,
        ThreadIdentity startedThread,
        ThreadIdentity parentThread,
        ThreadIdentity eventThread,
        boolean stackAvailable,
        boolean stackTruncated,
        List<CreationFrame> creationStack,
        int matchingEventCount
    ) {
        ThreadStartEvidence withMatchingEventCount(int count) {
            return new ThreadStartEvidence(
                startInstant,
                startedThread,
                parentThread,
                eventThread,
                stackAvailable,
                stackTruncated,
                creationStack,
                count
            );
        }
    }

    record ThreadIdentity(
        String name,
        long javaThreadId,
        long osThreadId,
        long recordedThreadIdentityId
    ) {
    }

    record CreationFrame(
        String className,
        String methodName,
        int lineNumber,
        int bytecodeIndex,
        String frameType,
        boolean javaFrame
    ) {
    }

    private static final class MutableEvidence {
        private ThreadStartEvidence latest;
        private int count = 1;

        private MutableEvidence(ThreadStartEvidence evidence) {
            this.latest = evidence;
        }

        private void consider(ThreadStartEvidence candidate) {
            count++;
            if (candidate.startInstant().isAfter(latest.startInstant())) {
                latest = candidate;
            }
        }

        private ThreadStartEvidence snapshot() {
            return latest.withMatchingEventCount(count);
        }
    }
}
