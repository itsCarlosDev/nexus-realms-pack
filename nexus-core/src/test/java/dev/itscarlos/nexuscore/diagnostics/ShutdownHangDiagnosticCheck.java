package dev.itscarlos.nexuscore.diagnostics;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public final class ShutdownHangDiagnosticCheck {
    private ShutdownHangDiagnosticCheck() {
    }

    public static void main(String[] args) throws Exception {
        checkDaemonFactory();
        checkSingleWatchdog();
        checkJfrThreadStartCorrelation();
        checkReportStructure();
        checkWriteFailureIsContained();
        System.out.println("Shutdown hang diagnostic checks passed");
    }

    private static void checkDaemonFactory() {
        Thread watchdog = ShutdownHangDiagnostic.createDaemonWatchdog(() -> {
        });
        require(watchdog.isDaemon(), "watchdog factory must create a daemon thread");
        require(
            ShutdownHangDiagnostic.WATCHDOG_THREAD_NAME.equals(watchdog.getName()),
            "watchdog must have its stable diagnostic name"
        );
    }

    private static void checkSingleWatchdog() {
        ShutdownHangDiagnostic.Controller controller =
            new ShutdownHangDiagnostic.Controller(Duration.ofMinutes(5));
        Path unusedLogsDirectory = Path.of("build", "shutdown-diagnostic-check-unused");

        require(controller.begin(unusedLogsDirectory), "first watchdog start must succeed");
        Thread watchdog = controller.watchdogThread();
        require(watchdog != null && watchdog.isDaemon(), "started watchdog must be daemon");
        require(!controller.begin(unusedLogsDirectory), "second watchdog start must be rejected");
        require(controller.watchdogThread() == watchdog, "duplicate start must preserve the first watchdog");
    }

    private static void checkJfrThreadStartCorrelation() throws Exception {
        JfrThreadCreationRecorder recorder = new JfrThreadCreationRecorder(8L * 1024L * 1024L);
        CountDownLatch workerStarted = new CountDownLatch(1);
        CountDownLatch releaseWorker = new CountDownLatch(1);
        Thread worker = new Thread(() -> {
            workerStarted.countDown();
            try {
                releaseWorker.await();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        }, "Nexus-JFR-Correlation-Check");

        try {
            require(
                recorder.start() == JfrThreadCreationRecorder.StartResult.STARTED,
                "JFR ThreadStart recording must start on the verified Java 17 runtime"
            );
            worker.start();
            require(workerStarted.await(5L, TimeUnit.SECONDS), "controlled worker must start");
            require(
                Thread.getAllStackTraces().keySet().stream()
                    .filter(thread -> thread.getName().startsWith("JFR "))
                    .allMatch(Thread::isDaemon),
                "JFR infrastructure threads must be daemon"
            );

            JfrThreadCreationRecorder.CaptureSnapshot capture =
                recorder.captureAndClose(Set.of(worker.getId()));
            JfrThreadCreationRecorder.ThreadStartEvidence evidence =
                capture.evidenceByJavaThreadId().get(worker.getId());

            require(capture.captureAttempted(), "JFR capture must be attempted");
            require(capture.captureFailure() == null, "JFR capture must complete without degradation");
            require(evidence != null, "controlled worker must correlate by Java thread ID");
            require(
                evidence.startedThread().javaThreadId() == worker.getId(),
                "recorded Java thread ID must equal the live worker ID"
            );
            require(
                "Nexus-JFR-Correlation-Check".equals(evidence.startedThread().name()),
                "recorded start name must identify the controlled worker"
            );
            require(
                evidence.parentThread() != null
                    && evidence.parentThread().javaThreadId() == Thread.currentThread().getId(),
                "ThreadStart parent must identify the creating main thread"
            );
            require(evidence.stackAvailable(), "ThreadStart event must retain its creation stack");
            require(
                evidence.creationStack().stream().anyMatch(
                    frame -> ShutdownHangDiagnosticCheck.class.getName().equals(frame.className())
                ),
                "creation stack must contain the local thread creation call site"
            );
        } finally {
            recorder.close();
            releaseWorker.countDown();
            worker.join(5_000L);
            require(!worker.isAlive(), "controlled worker must terminate after the check");
        }
    }

    private static void checkReportStructure() throws Exception {
        Instant stopping = Instant.now().minusSeconds(50);
        ShutdownHangDiagnostic.ShutdownState state =
            new ShutdownHangDiagnostic.ShutdownState(stopping, ProcessHandle.current().pid());
        state.markServerStopped(stopping.plusSeconds(2));

        ShutdownHangDiagnostic.initialize();
        CountDownLatch residualStarted = new CountDownLatch(1);
        CountDownLatch releaseResidual = new CountDownLatch(1);
        Thread residual = new Thread(() -> {
            residualStarted.countDown();
            try {
                releaseResidual.await();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        }, "Nexus-JFR-Report-Check");
        String report;
        try {
            residual.start();
            require(residualStarted.await(5L, TimeUnit.SECONDS), "report residual must start");
            report = ShutdownHangDiagnostic.buildReport(state, Instant.now());
        } finally {
            releaseResidual.countDown();
            residual.join(5_000L);
            require(!residual.isAlive(), "report residual must terminate after capture");
        }
        int nonDaemonSection = report.indexOf("NON-DAEMON THREADS");
        int remainingSection = report.indexOf("ALL REMAINING THREADS");

        require(report.contains("Shutdown phase: SERVER_STOPPED_EVENT_REACHED"), "report must include final phase");
        require(
            nonDaemonSection >= 0 && remainingSection > nonDaemonSection,
            "non-daemon section must be prioritized"
        );
        require(
            report.contains("\"main\"") && report.contains("daemon=false"),
            "current non-daemon main thread must appear in the report"
        );
        require(report.contains("DEADLOCK ANALYSIS"), "report must include deadlock analysis");
        require(
            report.contains("JFR THREAD CREATION CORRELATION")
                && report.contains("correlationMethod=exact Java thread ID")
                && report.contains("threadNameUsedForCorrelation=false"),
            "report must describe ID-based JFR correlation without name matching"
        );
        require(
            report.contains("finalName=Nexus-JFR-Report-Check")
                && report.contains("jfrThreadStartMatched=true")
                && report.contains("firstExternalClass=" + ShutdownHangDiagnosticCheck.class.getName())
                && report.contains("creationStackAvailable=true"),
            "report must include end-to-end ThreadStart creation evidence for the live residual"
        );
        require(
            report.contains("No deadlock detected.") || report.contains("Detected deadlocked threads:"),
            "deadlock analysis must contain a valid result"
        );
        require(report.contains("lockedMonitors:") && report.contains("lockedSynchronizers:"),
            "report must include monitor and synchronizer details");
    }

    private static void checkWriteFailureIsContained() throws Exception {
        Path existingFile = Files.createTempFile("nexus-shutdown-diagnostic-check", ".tmp");
        try {
            ShutdownHangDiagnostic.ShutdownState state =
                new ShutdownHangDiagnostic.ShutdownState(Instant.now(), ProcessHandle.current().pid());
            Path result = ShutdownHangDiagnostic.writeReport(existingFile, state, Instant.now());
            require(result == null, "write failure must be contained and reported as an empty result");
        } finally {
            Files.deleteIfExists(existingFile);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
