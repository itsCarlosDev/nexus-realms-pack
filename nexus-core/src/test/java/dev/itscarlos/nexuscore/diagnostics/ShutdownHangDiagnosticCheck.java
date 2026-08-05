package dev.itscarlos.nexuscore.diagnostics;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;

public final class ShutdownHangDiagnosticCheck {
    private ShutdownHangDiagnosticCheck() {
    }

    public static void main(String[] args) throws Exception {
        checkDaemonFactory();
        checkSingleWatchdog();
        checkReportStructure();
        checkWriteFailureIsContained();
        System.out.println("Shutdown hang diagnostic checks passed: 6/6");
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

    private static void checkReportStructure() {
        Instant stopping = Instant.now().minusSeconds(50);
        ShutdownHangDiagnostic.ShutdownState state =
            new ShutdownHangDiagnostic.ShutdownState(stopping, ProcessHandle.current().pid());
        state.markServerStopped(stopping.plusSeconds(2));

        String report = ShutdownHangDiagnostic.buildReport(state, Instant.now());
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
