package dev.itscarlos.nexuscore.diagnostics;

import dev.itscarlos.nexuscore.NexusCore;
import java.io.PrintStream;
import java.lang.management.LockInfo;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.MonitorInfo;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.stream.Collectors;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.server.ServerStoppedEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLPaths;

/**
 * Produces one non-destructive JVM thread report when a dedicated server remains
 * alive long after Forge begins its orderly shutdown.
 */
@Mod.EventBusSubscriber(
    modid = NexusCore.MOD_ID,
    value = Dist.DEDICATED_SERVER,
    bus = Mod.EventBusSubscriber.Bus.FORGE
)
public final class ShutdownHangDiagnostic {
    static final String LOG_PREFIX = "[Nexus Shutdown Diagnostic]";
    static final Duration REPORT_DELAY = Duration.ofSeconds(45);
    static final String WATCHDOG_THREAD_NAME = "Nexus-Shutdown-Watchdog";
    private static final DateTimeFormatter FILE_TIMESTAMP =
        DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
    private static final Controller CONTROLLER =
        new Controller(REPORT_DELAY);

    static {
        safeInfo(
            "{} Component registered for dedicated-server shutdown events; timeout={} seconds",
            LOG_PREFIX,
            REPORT_DELAY.toSeconds()
        );
    }

    private ShutdownHangDiagnostic() {
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent event) {
        try {
            Path logsDirectory = FMLPaths.GAMEDIR.get().resolve("logs");
            boolean started = CONTROLLER.begin(logsDirectory);
            ShutdownState state = CONTROLLER.state();

            if (started) {
                safeInfo(
                    "{} ServerStoppingEvent received; pid={}, phase={}, watchdog started "
                        + "(name={}, daemon=true, timeout={} seconds)",
                    LOG_PREFIX,
                    state == null ? "unavailable" : state.pid(),
                    Phase.SERVER_STOPPING,
                    WATCHDOG_THREAD_NAME,
                    REPORT_DELAY.toSeconds()
                );
            } else {
                safeWarn(
                    "{} Duplicate ServerStoppingEvent ignored; the existing watchdog remains authoritative",
                    LOG_PREFIX
                );
            }
        } catch (Throwable error) {
            safeError(
                LOG_PREFIX + " Failed to start shutdown watchdog; shutdown will continue",
                error
            );
        }
    }

    @SubscribeEvent
    public static void onServerStopped(ServerStoppedEvent event) {
        try {
            ShutdownState state = CONTROLLER.markServerStopped();
            if (state == null) {
                safeWarn(
                    "{} ServerStoppedEvent received without an active diagnostic session",
                    LOG_PREFIX
                );
                return;
            }

            safeInfo(
                "{} ServerStoppedEvent received; phase={}, elapsedSinceStopping={} ms",
                LOG_PREFIX,
                state.phase(),
                Duration.between(state.stoppingInstant(), state.stoppedInstant()).toMillis()
            );
        } catch (Throwable error) {
            safeError(
                LOG_PREFIX + " Failed to record ServerStoppedEvent; shutdown will continue",
                error
            );
        }
    }

    static Thread createDaemonWatchdog(Runnable action) {
        Thread watchdog = new Thread(action, WATCHDOG_THREAD_NAME);
        watchdog.setDaemon(true);
        watchdog.setUncaughtExceptionHandler(
            (thread, error) -> safeError(
                LOG_PREFIX + " Uncaught watchdog failure; shutdown will continue",
                error
            )
        );
        return watchdog;
    }

    static String buildReport(ShutdownState state, Instant reportInstant) {
        StringBuilder report = new StringBuilder(32_768);
        List<String> captureWarnings = new ArrayList<>();
        RuntimeMXBean runtimeBean = safeRuntimeBean(captureWarnings);
        MemoryMXBean memoryBean = safeMemoryBean(captureWarnings);
        ThreadSnapshot snapshot = captureThreads(captureWarnings);
        LifecycleState lifecycle = state.lifecycle();
        Runtime runtime = Runtime.getRuntime();

        long totalMemory = safeLong(runtime::totalMemory, captureWarnings, "Runtime.totalMemory");
        long freeMemory = safeLong(runtime::freeMemory, captureWarnings, "Runtime.freeMemory");
        long maxMemory = safeLong(runtime::maxMemory, captureWarnings, "Runtime.maxMemory");
        long usedMemory = totalMemory >= 0L && freeMemory >= 0L
            ? totalMemory - freeMemory
            : -1L;
        long uptimeMillis = runtimeBean == null
            ? -1L
            : safeLong(runtimeBean::getUptime, captureWarnings, "RuntimeMXBean.getUptime");

        line(report, "NEXUS CORE SHUTDOWN HANG DIAGNOSTIC");
        line(report, "===================================");
        line(report, "Local timestamp: " + formatLocal(reportInstant));
        line(report, "UTC instant: " + reportInstant);
        line(report, "PID: " + state.pid());
        line(report, "Java version: " + safeProperty("java.version"));
        line(report, "Java vendor: " + safeProperty("java.vendor"));
        line(report, "Java VM: " + safeProperty("java.vm.name"));
        line(report, "Operating system: " + safeProperty("os.name") + " " + safeProperty("os.version"));
        line(report, "Architecture: " + safeProperty("os.arch"));
        line(
            report,
            "JVM uptime: " + (uptimeMillis < 0L
                ? "unavailable"
                : formatDuration(uptimeMillis) + " (" + uptimeMillis + " ms)")
        );
        line(report, "Shutdown phase: " + lifecycle.phase());
        line(report, "ServerStoppingEvent instant: " + state.stoppingInstant());
        line(
            report,
            "ServerStoppedEvent instant: " + (
                lifecycle.stoppedInstant() == null ? "NOT_REACHED" : lifecycle.stoppedInstant()
            )
        );
        line(
            report,
            "Elapsed since ServerStoppingEvent: "
                + Duration.between(state.stoppingInstant(), reportInstant).toMillis()
                + " ms"
        );
        line(
            report,
            "ServerStoppingEvent -> ServerStoppedEvent: " + (
                lifecycle.stoppedInstant() == null
                    ? "NOT_AVAILABLE"
                    : Duration.between(state.stoppingInstant(), lifecycle.stoppedInstant()).toMillis() + " ms"
            )
        );
        line(report, "Memory used: " + formatBytes(usedMemory));
        line(report, "Memory free: " + formatBytes(freeMemory));
        line(report, "Memory total: " + formatBytes(totalMemory));
        line(report, "Memory maximum: " + formatBytes(maxMemory));
        appendManagementMemory(report, memoryBean, captureWarnings);
        line(report, "Total live threads (ThreadMXBean): " + snapshot.totalThreadCount());
        line(report, "Daemon threads (ThreadMXBean): " + snapshot.daemonThreadCount());
        line(report, "Non-daemon threads (ThreadMXBean): " + snapshot.nonDaemonThreadCount());
        line(report, "Thread records captured: " + snapshot.threads().size());
        line(report, "Peak thread count: " + snapshot.peakThreadCount());
        line(report, "Total threads started: " + snapshot.totalStartedThreadCount());
        line(report, "");

        appendInterpretation(report, lifecycle.phase());
        appendCaptureWarnings(report, captureWarnings);

        List<ThreadRecord> nonDaemon = snapshot.threads().stream()
            .filter(record -> Boolean.FALSE.equals(record.daemon()))
            .sorted(THREAD_ORDER)
            .toList();
        Set<Long> prioritizedIds = nonDaemon.stream()
            .map(ThreadRecord::id)
            .collect(Collectors.toSet());
        List<ThreadRecord> remaining = snapshot.threads().stream()
            .filter(record -> !prioritizedIds.contains(record.id()))
            .sorted(THREAD_ORDER)
            .toList();

        line(report, "NON-DAEMON THREADS");
        line(report, "==================");
        if (nonDaemon.isEmpty()) {
            line(report, "No non-daemon thread records were captured. This does not identify an external cause.");
            line(report, "");
        } else {
            nonDaemon.forEach(record -> appendThread(report, record));
        }

        line(report, "ALL REMAINING THREADS");
        line(report, "=====================");
        if (remaining.isEmpty()) {
            line(report, "No additional thread records were captured.");
            line(report, "");
        } else {
            remaining.forEach(record -> appendThread(report, record));
        }

        appendDeadlockAnalysis(report, snapshot);
        appendTopPackages(report, nonDaemon);
        return report.toString();
    }

    static Path writeReport(Path logsDirectory, ShutdownState state, Instant reportInstant) {
        try {
            Files.createDirectories(logsDirectory);
            String timestamp = ZonedDateTime.ofInstant(reportInstant, ZoneId.systemDefault())
                .format(FILE_TIMESTAMP);
            String baseName = "nexus-shutdown-hang-" + timestamp;
            Path preferred = logsDirectory.resolve(baseName + ".log");
            Path reportPath = Files.exists(preferred)
                ? logsDirectory.resolve(
                    baseName + "-pid-" + state.pid() + "-" + Long.toUnsignedString(System.nanoTime()) + ".log"
                )
                : preferred;

            Files.writeString(
                reportPath,
                buildReport(state, reportInstant),
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE_NEW,
                StandardOpenOption.WRITE
            );
            safeInfo("{} Shutdown hang report generated: {}", LOG_PREFIX, reportPath.toAbsolutePath());
            return reportPath;
        } catch (Throwable error) {
            safeError(
                LOG_PREFIX + " Failed to generate shutdown hang report at " + logsDirectory,
                error
            );
            return null;
        }
    }

    private static ThreadSnapshot captureThreads(List<String> warnings) {
        ThreadMXBean threadBean;
        try {
            threadBean = ManagementFactory.getThreadMXBean();
        } catch (Throwable error) {
            warnings.add("ThreadMXBean unavailable: " + describe(error));
            threadBean = null;
        }

        Map<Thread, StackTraceElement[]> rawThreads;
        try {
            rawThreads = Thread.getAllStackTraces();
        } catch (Throwable error) {
            warnings.add("Thread.getAllStackTraces unavailable: " + describe(error));
            rawThreads = Map.of();
        }

        Map<Long, Thread> liveById = new HashMap<>();
        rawThreads.keySet().forEach(thread -> liveById.put(thread.getId(), thread));
        Map<Long, ThreadInfo> infoById = new LinkedHashMap<>();

        int totalThreadCount = rawThreads.size();
        int daemonThreadCount = (int) rawThreads.keySet().stream().filter(Thread::isDaemon).count();
        int peakThreadCount = -1;
        long totalStartedThreadCount = -1L;

        if (threadBean != null) {
            totalThreadCount = safeInt(
                threadBean::getThreadCount,
                warnings,
                "ThreadMXBean.getThreadCount",
                totalThreadCount
            );
            daemonThreadCount = safeInt(
                threadBean::getDaemonThreadCount,
                warnings,
                "ThreadMXBean.getDaemonThreadCount",
                daemonThreadCount
            );
            peakThreadCount = safeInt(
                threadBean::getPeakThreadCount,
                warnings,
                "ThreadMXBean.getPeakThreadCount",
                -1
            );
            totalStartedThreadCount = safeLong(
                threadBean::getTotalStartedThreadCount,
                warnings,
                "ThreadMXBean.getTotalStartedThreadCount"
            );

            ThreadInfo[] infos = dumpThreadInfos(threadBean, warnings);
            if (infos != null) {
                for (ThreadInfo info : infos) {
                    if (info != null) {
                        infoById.put(info.getThreadId(), info);
                    }
                }
            }
        }

        Set<Long> allIds = new HashSet<>(liveById.keySet());
        allIds.addAll(infoById.keySet());
        List<ThreadRecord> records = new ArrayList<>(allIds.size());
        for (long id : allIds) {
            Thread thread = liveById.get(id);
            ThreadInfo info = infoById.get(id);
            StackTraceElement[] fallbackStack = thread == null
                ? new StackTraceElement[0]
                : rawThreads.getOrDefault(thread, new StackTraceElement[0]);
            records.add(ThreadRecord.capture(id, thread, info, fallbackStack));
        }

        DeadlockResult deadlocks = detectDeadlocks(threadBean, warnings);
        return new ThreadSnapshot(
            records,
            Math.max(totalThreadCount, 0),
            Math.max(daemonThreadCount, 0),
            Math.max(totalThreadCount - daemonThreadCount, 0),
            peakThreadCount,
            totalStartedThreadCount,
            deadlocks
        );
    }

    private static ThreadInfo[] dumpThreadInfos(ThreadMXBean threadBean, List<String> warnings) {
        try {
            boolean monitors = threadBean.isObjectMonitorUsageSupported();
            boolean synchronizers = threadBean.isSynchronizerUsageSupported();
            return threadBean.dumpAllThreads(monitors, synchronizers);
        } catch (Throwable dumpError) {
            warnings.add("dumpAllThreads degraded to getThreadInfo: " + describe(dumpError));
            try {
                return threadBean.getThreadInfo(threadBean.getAllThreadIds(), Integer.MAX_VALUE);
            } catch (Throwable fallbackError) {
                warnings.add("ThreadInfo fallback unavailable: " + describe(fallbackError));
                return null;
            }
        }
    }

    private static DeadlockResult detectDeadlocks(ThreadMXBean threadBean, List<String> warnings) {
        if (threadBean == null) {
            return new DeadlockResult(null, "ThreadMXBean unavailable", null);
        }

        try {
            return deadlockDetails(threadBean, threadBean.findDeadlockedThreads(), "findDeadlockedThreads");
        } catch (Throwable primaryError) {
            warnings.add("findDeadlockedThreads unavailable: " + describe(primaryError));
            try {
                return deadlockDetails(
                    threadBean,
                    threadBean.findMonitorDeadlockedThreads(),
                    "findMonitorDeadlockedThreads fallback"
                );
            } catch (Throwable fallbackError) {
                warnings.add("findMonitorDeadlockedThreads unavailable: " + describe(fallbackError));
                return new DeadlockResult(
                    null,
                    "deadlock APIs unavailable",
                    describe(fallbackError)
                );
            }
        }
    }

    private static DeadlockResult deadlockDetails(ThreadMXBean threadBean, long[] ids, String method) {
        if (ids == null || ids.length == 0) {
            return new DeadlockResult(new ThreadInfo[0], method, null);
        }

        try {
            return new DeadlockResult(threadBean.getThreadInfo(ids, true, true), method, null);
        } catch (Throwable detailError) {
            ThreadInfo[] partial = threadBean.getThreadInfo(ids, Integer.MAX_VALUE);
            return new DeadlockResult(partial, method, describe(detailError));
        }
    }

    private static void appendInterpretation(StringBuilder report, Phase phase) {
        line(report, "INTERPRETATION GUIDANCE");
        line(report, "=======================");
        line(report, "- This file proves that JVM code was still running after the configured shutdown threshold.");
        if (phase == Phase.SERVER_STOPPING) {
            line(
                report,
                "- ServerStoppedEvent was not observed. A shutdown-path block is possible; this report alone does not prove its owner."
            );
        } else {
            line(
                report,
                "- ServerStoppedEvent was observed. Forge completed that lifecycle phase, so inspect residual threads, locks and hooks."
            );
        }
        line(report, "- Package and class names are association evidence only; they are not automatic attribution of fault.");
        line(report, "- Original stack traces and lock ownership below are the authoritative evidence.");
        line(
            report,
            "- If a panel remains STOPPING but no report exists, Java may have exited and the wrapper/panel may be responsible."
        );
        line(
            report,
            "- Absence of this file is not proof unless component registration, ServerStoppingEvent receipt and watchdog startup were confirmed."
        );
        line(report, "");
    }

    private static void appendCaptureWarnings(StringBuilder report, List<String> warnings) {
        line(report, "CAPTURE LIMITATIONS");
        line(report, "===================");
        if (warnings.isEmpty()) {
            line(report, "No monitoring API degradation was observed while capturing this report.");
        } else {
            warnings.forEach(warning -> line(report, "- " + warning));
        }
        line(report, "");
    }

    private static void appendThread(StringBuilder report, ThreadRecord record) {
        line(
            report,
            "\"" + record.name() + "\""
                + " id=" + record.id()
                + " state=" + record.state()
                + " daemon=" + value(record.daemon())
                + " priority=" + value(record.priority())
        );
        line(report, "  threadClass=" + record.threadClass());
        line(report, "  group=" + record.group());
        line(report, "  contextClassLoader=" + record.contextClassLoader());

        ThreadInfo info = record.info();
        if (info == null) {
            line(report, "  lock=unavailable (thread disappeared or ThreadMXBean data unavailable)");
        } else {
            line(report, "  waitingOnLock=" + value(info.getLockInfo()));
            line(
                report,
                "  lockOwner=" + (
                    info.getLockOwnerName() == null
                        ? "none"
                        : "\"" + info.getLockOwnerName() + "\" id=" + info.getLockOwnerId()
                )
            );
            line(report, "  suspended=" + info.isSuspended() + " inNative=" + info.isInNative());
            line(
                report,
                "  blockedCount=" + info.getBlockedCount()
                    + " blockedTimeMs=" + info.getBlockedTime()
                    + " waitedCount=" + info.getWaitedCount()
                    + " waitedTimeMs=" + info.getWaitedTime()
            );
        }

        line(report, "  stackTrace:");
        StackTraceElement[] stack = record.stackTrace();
        if (stack.length == 0) {
            line(report, "    <empty or unavailable>");
        } else {
            for (StackTraceElement frame : stack) {
                line(report, "    at " + frame);
            }
        }

        line(report, "  lockedMonitors:");
        MonitorInfo[] monitors = info == null ? new MonitorInfo[0] : info.getLockedMonitors();
        if (monitors.length == 0) {
            line(report, "    <none or unavailable>");
        } else {
            for (MonitorInfo monitor : monitors) {
                line(
                    report,
                    "    - " + monitor
                        + " lockedAtDepth=" + monitor.getLockedStackDepth()
                        + " lockedAt=" + value(monitor.getLockedStackFrame())
                );
            }
        }

        line(report, "  lockedSynchronizers:");
        LockInfo[] synchronizers = info == null ? new LockInfo[0] : info.getLockedSynchronizers();
        if (synchronizers.length == 0) {
            line(report, "    <none or unavailable>");
        } else {
            for (LockInfo synchronizer : synchronizers) {
                line(report, "    - " + synchronizer);
            }
        }
        line(report, "");
    }

    private static void appendDeadlockAnalysis(StringBuilder report, ThreadSnapshot snapshot) {
        DeadlockResult result = snapshot.deadlocks();
        line(report, "DEADLOCK ANALYSIS");
        line(report, "=================");
        line(report, "Detection method: " + result.method());
        if (result.error() != null) {
            line(report, "Detection limitation: " + result.error());
        }
        if (result.threadInfos() == null) {
            line(report, "Deadlock status: NOT VERIFIED because monitoring APIs were unavailable.");
        } else if (result.threadInfos().length == 0) {
            line(report, "No deadlock detected.");
        } else {
            line(report, "Detected deadlocked threads: " + result.threadInfos().length);
            Map<Long, ThreadRecord> recordById = snapshot.threads().stream()
                .collect(Collectors.toMap(ThreadRecord::id, Function.identity(), (left, right) -> left));
            for (ThreadInfo info : result.threadInfos()) {
                if (info == null) {
                    line(report, "- Deadlocked thread disappeared before its details could be captured.");
                    continue;
                }

                ThreadRecord existing = recordById.get(info.getThreadId());
                ThreadRecord record = existing == null
                    ? ThreadRecord.capture(info.getThreadId(), null, info, info.getStackTrace())
                    : existing.withInfo(info);
                appendThread(report, record);
            }
        }
        line(report, "");
    }

    private static void appendTopPackages(StringBuilder report, List<ThreadRecord> nonDaemon) {
        Map<String, Long> packages = nonDaemon.stream()
            .flatMap(record -> List.of(record.stackTrace()).stream())
            .map(StackTraceElement::getClassName)
            .map(ShutdownHangDiagnostic::packageName)
            .collect(
                Collectors.groupingBy(
                    Function.identity(),
                    Collectors.counting()
                )
            );

        line(report, "TOP PACKAGES OBSERVED IN NON-DAEMON THREADS");
        line(report, "===========================================");
        line(report, "These counts are navigation hints, not fault attribution.");
        if (packages.isEmpty()) {
            line(report, "No package names were available from captured non-daemon stacks.");
        } else {
            packages.entrySet().stream()
                .sorted(
                    Map.Entry.<String, Long>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey())
                )
                .limit(20)
                .forEach(entry -> line(report, "- " + entry.getKey() + ": " + entry.getValue() + " frame(s)"));
        }
        line(report, "");
    }

    private static void appendManagementMemory(
        StringBuilder report,
        MemoryMXBean memoryBean,
        List<String> warnings
    ) {
        if (memoryBean == null) {
            line(report, "Heap memory (MemoryMXBean): unavailable");
            line(report, "Non-heap memory (MemoryMXBean): unavailable");
            return;
        }

        try {
            line(report, "Heap memory (MemoryMXBean): " + formatMemoryUsage(memoryBean.getHeapMemoryUsage()));
            line(report, "Non-heap memory (MemoryMXBean): " + formatMemoryUsage(memoryBean.getNonHeapMemoryUsage()));
        } catch (Throwable error) {
            warnings.add("MemoryMXBean usage unavailable: " + describe(error));
            line(report, "Heap/non-heap memory (MemoryMXBean): unavailable");
        }
    }

    private static RuntimeMXBean safeRuntimeBean(List<String> warnings) {
        try {
            return ManagementFactory.getRuntimeMXBean();
        } catch (Throwable error) {
            warnings.add("RuntimeMXBean unavailable: " + describe(error));
            return null;
        }
    }

    private static MemoryMXBean safeMemoryBean(List<String> warnings) {
        try {
            return ManagementFactory.getMemoryMXBean();
        } catch (Throwable error) {
            warnings.add("MemoryMXBean unavailable: " + describe(error));
            return null;
        }
    }

    private static long safePid() {
        try {
            return ProcessHandle.current().pid();
        } catch (Throwable error) {
            safeError(LOG_PREFIX + " Unable to read current PID", error);
            return -1L;
        }
    }

    private static String safeProperty(String name) {
        try {
            return System.getProperty(name, "unavailable");
        } catch (Throwable error) {
            return "unavailable (" + describe(error) + ")";
        }
    }

    private static long safeLong(
        LongSupplierWithThrowable supplier,
        List<String> warnings,
        String operation
    ) {
        try {
            return supplier.getAsLong();
        } catch (Throwable error) {
            warnings.add(operation + " unavailable: " + describe(error));
            return -1L;
        }
    }

    private static int safeInt(
        IntSupplierWithThrowable supplier,
        List<String> warnings,
        String operation,
        int fallback
    ) {
        try {
            return supplier.getAsInt();
        } catch (Throwable error) {
            warnings.add(operation + " unavailable: " + describe(error));
            return fallback;
        }
    }

    private static String safeThreadValue(ValueSupplier supplier) {
        try {
            Object value = supplier.get();
            return value == null ? "bootstrap/null" : value.toString();
        } catch (Throwable error) {
            return "unavailable (" + describe(error) + ")";
        }
    }

    private static String packageName(String className) {
        int separator = className.lastIndexOf('.');
        return separator < 0 ? "<default package>" : className.substring(0, separator);
    }

    private static String formatLocal(Instant instant) {
        try {
            return ZonedDateTime.ofInstant(instant, ZoneId.systemDefault())
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (Throwable error) {
            return "unavailable (" + describe(error) + ")";
        }
    }

    private static String formatDuration(long millis) {
        return Duration.ofMillis(Math.max(millis, 0L)).toString();
    }

    private static String formatMemoryUsage(MemoryUsage usage) {
        if (usage == null) {
            return "unavailable";
        }
        return "used=" + formatBytes(usage.getUsed())
            + ", committed=" + formatBytes(usage.getCommitted())
            + ", initial=" + formatBytes(usage.getInit())
            + ", maximum=" + formatBytes(usage.getMax());
    }

    private static String formatBytes(long bytes) {
        if (bytes < 0L) {
            return "unavailable";
        }
        return bytes + " bytes (" + String.format(java.util.Locale.ROOT, "%.2f MiB", bytes / 1_048_576.0) + ")";
    }

    private static String value(Object value) {
        return value == null ? "unavailable" : value.toString();
    }

    private static String describe(Throwable error) {
        String message = error.getMessage();
        return error.getClass().getName() + (message == null ? "" : ": " + message);
    }

    private static void line(StringBuilder report, String text) {
        report.append(text).append('\n');
    }

    private static void safeInfo(String message, Object... arguments) {
        try {
            NexusCore.LOGGER.info(message, arguments);
        } catch (Throwable loggerError) {
            safeStderr(message + " arguments=" + Arrays.toString(arguments), loggerError);
        }
    }

    private static void safeWarn(String message, Object... arguments) {
        try {
            NexusCore.LOGGER.warn(message, arguments);
        } catch (Throwable loggerError) {
            safeStderr(message + " arguments=" + Arrays.toString(arguments), loggerError);
        }
    }

    private static void safeError(String message, Throwable error) {
        try {
            NexusCore.LOGGER.error(message, error);
        } catch (Throwable loggerError) {
            safeStderr(message, error);
            safeStderr("Logger failure: " + describe(loggerError), loggerError);
        }
    }

    private static void safeStderr(String message, Throwable error) {
        try {
            PrintStream stderr = System.err;
            stderr.println(message);
            if (error != null) {
                error.printStackTrace(stderr);
            }
        } catch (Throwable ignored) {
            // Both logging sinks are unavailable; there is no safer final evidence channel.
        }
    }

    private static final Comparator<ThreadRecord> THREAD_ORDER =
        Comparator.comparing(ThreadRecord::name).thenComparingLong(ThreadRecord::id);

    enum Phase {
        SERVER_STOPPING,
        SERVER_STOPPED_EVENT_REACHED
    }

    static final class Controller {
        private final Duration reportDelay;
        private final AtomicReference<ShutdownState> state = new AtomicReference<>();
        private final AtomicReference<Thread> watchdogThread = new AtomicReference<>();

        Controller(Duration reportDelay) {
            this.reportDelay = reportDelay;
        }

        boolean begin(Path logsDirectory) {
            ShutdownState newState = new ShutdownState(Instant.now(), safePid());
            if (!state.compareAndSet(null, newState)) {
                return false;
            }

            Thread watchdog = createDaemonWatchdog(() -> awaitAndReport(logsDirectory, newState));
            watchdogThread.set(watchdog);
            watchdog.start();
            return true;
        }

        ShutdownState markServerStopped() {
            ShutdownState current = state.get();
            if (current != null) {
                current.markServerStopped(Instant.now());
            }
            return current;
        }

        ShutdownState state() {
            return state.get();
        }

        Thread watchdogThread() {
            return watchdogThread.get();
        }

        private void awaitAndReport(Path logsDirectory, ShutdownState session) {
            try {
                Thread.sleep(reportDelay.toMillis());
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                safeError(
                    LOG_PREFIX + " Watchdog was interrupted; no report will be generated",
                    interrupted
                );
                return;
            } catch (Throwable error) {
                safeError(
                    LOG_PREFIX + " Watchdog wait failed; shutdown will continue",
                    error
                );
                return;
            }

            writeReport(logsDirectory, session, Instant.now());
        }
    }

    static final class ShutdownState {
        private final Instant stoppingInstant;
        private final long pid;
        private final AtomicReference<LifecycleState> lifecycle = new AtomicReference<>(
            new LifecycleState(Phase.SERVER_STOPPING, null)
        );

        ShutdownState(Instant stoppingInstant, long pid) {
            this.stoppingInstant = stoppingInstant;
            this.pid = pid;
        }

        void markServerStopped(Instant instant) {
            lifecycle.updateAndGet(
                current -> current.phase() == Phase.SERVER_STOPPED_EVENT_REACHED
                    ? current
                    : new LifecycleState(Phase.SERVER_STOPPED_EVENT_REACHED, instant)
            );
        }

        Instant stoppingInstant() {
            return stoppingInstant;
        }

        Instant stoppedInstant() {
            return lifecycle.get().stoppedInstant();
        }

        long pid() {
            return pid;
        }

        Phase phase() {
            return lifecycle.get().phase();
        }

        LifecycleState lifecycle() {
            return lifecycle.get();
        }
    }

    private record LifecycleState(Phase phase, Instant stoppedInstant) {
    }

    private record ThreadSnapshot(
        List<ThreadRecord> threads,
        int totalThreadCount,
        int daemonThreadCount,
        int nonDaemonThreadCount,
        int peakThreadCount,
        long totalStartedThreadCount,
        DeadlockResult deadlocks
    ) {
    }

    private record DeadlockResult(ThreadInfo[] threadInfos, String method, String error) {
    }

    private record ThreadRecord(
        long id,
        String name,
        Thread.State state,
        Boolean daemon,
        Integer priority,
        String threadClass,
        String group,
        String contextClassLoader,
        ThreadInfo info,
        StackTraceElement[] stackTrace
    ) {
        static ThreadRecord capture(
            long id,
            Thread thread,
            ThreadInfo info,
            StackTraceElement[] fallbackStack
        ) {
            String name = info != null
                ? info.getThreadName()
                : thread == null ? "<unknown>" : safeThreadValue(thread::getName);
            Thread.State state = info != null
                ? info.getThreadState()
                : thread == null ? null : thread.getState();
            Boolean daemon = thread == null ? null : thread.isDaemon();
            Integer priority = thread == null ? null : thread.getPriority();
            String threadClass = thread == null
                ? "unavailable"
                : safeThreadValue(() -> thread.getClass().getName());
            String group = thread == null
                ? "unavailable"
                : safeThreadValue(() -> {
                    ThreadGroup threadGroup = thread.getThreadGroup();
                    return threadGroup == null ? null : threadGroup.getName();
                });
            String contextClassLoader = thread == null
                ? "unavailable"
                : safeThreadValue(() -> {
                    ClassLoader loader = thread.getContextClassLoader();
                    return loader == null
                        ? null
                        : loader.getClass().getName() + "@" + Integer.toHexString(System.identityHashCode(loader));
                });
            StackTraceElement[] stack = info == null ? fallbackStack : info.getStackTrace();
            return new ThreadRecord(
                id,
                name,
                state,
                daemon,
                priority,
                threadClass,
                group,
                contextClassLoader,
                info,
                stack == null ? new StackTraceElement[0] : stack
            );
        }

        ThreadRecord withInfo(ThreadInfo replacement) {
            return new ThreadRecord(
                id,
                replacement.getThreadName(),
                replacement.getThreadState(),
                daemon,
                priority,
                threadClass,
                group,
                contextClassLoader,
                replacement,
                replacement.getStackTrace()
            );
        }
    }

    @FunctionalInterface
    private interface LongSupplierWithThrowable {
        long getAsLong() throws Throwable;
    }

    @FunctionalInterface
    private interface IntSupplierWithThrowable {
        int getAsInt() throws Throwable;
    }

    @FunctionalInterface
    private interface ValueSupplier {
        Object get() throws Throwable;
    }
}
