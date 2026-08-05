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
import java.net.URL;
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
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.event.server.ServerStoppedEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLPaths;

/**
 * Produces one non-destructive JVM thread report when a dedicated server remains
 * alive long after Forge begins its orderly shutdown.
 *
 * <p>The shutdown watchdog is complemented by a bounded in-memory sampler. The
 * sampler starts after {@link ServerStartedEvent}, follows suspicious
 * non-daemon/executor threads while the server is healthy, and appends their
 * pre-shutdown history only when the 45-second hang report is generated.</p>
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
    static final String HISTORY_MONITOR_THREAD_NAME = "Nexus-Thread-History-Monitor";

    static final Duration DISCOVERY_INTERVAL = Duration.ofMillis(200);
    static final Duration FOCUSED_SAMPLE_INTERVAL = Duration.ofMillis(10);
    static final int MAX_CANDIDATES = 128;
    static final int MAX_SAMPLES_PER_CANDIDATE = 64;
    static final int MAX_TOTAL_RETAINED_SAMPLES = 512;
    static final int MAX_STACK_DEPTH = 96;

    private static final Pattern GENERIC_POOL_THREAD =
        Pattern.compile("^pool-\\d+-thread-\\d+$");
    private static final DateTimeFormatter FILE_TIMESTAMP =
        DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
    private static final Controller CONTROLLER = new Controller(REPORT_DELAY);
    private static final ThreadHistoryMonitor THREAD_HISTORY_MONITOR =
        new ThreadHistoryMonitor(
            DISCOVERY_INTERVAL,
            FOCUSED_SAMPLE_INTERVAL,
            MAX_CANDIDATES,
            MAX_SAMPLES_PER_CANDIDATE,
            MAX_TOTAL_RETAINED_SAMPLES,
            MAX_STACK_DEPTH
        );

    static {
        safeInfo(
            "{} Component registered for dedicated-server shutdown events; timeout={} seconds, "
                + "threadHistoryDiscovery={} ms, focusedSampling={} ms",
            LOG_PREFIX,
            REPORT_DELAY.toSeconds(),
            DISCOVERY_INTERVAL.toMillis(),
            FOCUSED_SAMPLE_INTERVAL.toMillis()
        );
    }

    private ShutdownHangDiagnostic() {
    }

    @SubscribeEvent
    public static void onServerStarted(ServerStartedEvent event) {
        try {
            if (THREAD_HISTORY_MONITOR.start()) {
                safeInfo(
                    "{} Pre-shutdown thread history monitor started "
                        + "(name={}, daemon=true, baselineThreads={}, maxCandidates={}, "
                        + "maxSamplesPerCandidate={}, maxTotalSamples={})",
                    LOG_PREFIX,
                    HISTORY_MONITOR_THREAD_NAME,
                    THREAD_HISTORY_MONITOR.baselineThreadCount(),
                    MAX_CANDIDATES,
                    MAX_SAMPLES_PER_CANDIDATE,
                    MAX_TOTAL_RETAINED_SAMPLES
                );
            } else {
                safeWarn(
                    "{} Duplicate ServerStartedEvent ignored; thread history monitor is already active",
                    LOG_PREFIX
                );
            }
        } catch (Throwable error) {
            safeError(
                LOG_PREFIX + " Failed to start pre-shutdown thread history monitor; server will continue",
                error
            );
        }
    }

    @SubscribeEvent
    public static void onServerStopping(ServerStoppingEvent event) {
        try {
            THREAD_HISTORY_MONITOR.markServerStopping();
        } catch (Throwable error) {
            safeError(
                LOG_PREFIX + " Failed to capture ServerStoppingEvent thread history; shutdown will continue",
                error
            );
        }

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
            THREAD_HISTORY_MONITOR.markServerStopped();
        } catch (Throwable error) {
            safeError(
                LOG_PREFIX + " Failed to capture ServerStoppedEvent thread history; shutdown will continue",
                error
            );
        }

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

    static Thread createDaemonHistoryMonitor(Runnable action) {
        Thread monitor = new Thread(action, HISTORY_MONITOR_THREAD_NAME);
        monitor.setDaemon(true);
        monitor.setPriority(Thread.NORM_PRIORITY);
        monitor.setUncaughtExceptionHandler(
            (thread, error) -> safeError(
                LOG_PREFIX + " Uncaught thread history monitor failure; server will continue",
                error
            )
        );
        return monitor;
    }

    static String buildReport(ShutdownState state, Instant reportInstant) {
        StringBuilder report = new StringBuilder(65_536);
        List<String> captureWarnings = new ArrayList<>();
        RuntimeMXBean runtimeBean = safeRuntimeBean(captureWarnings);
        MemoryMXBean memoryBean = safeMemoryBean(captureWarnings);
        ThreadSnapshot snapshot = captureThreads(captureWarnings);
        ThreadHistorySnapshot historySnapshot =
            THREAD_HISTORY_MONITOR.captureFinalAndSnapshot(snapshot, captureWarnings);
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
            .collect(Collectors.toCollection(LinkedHashSet::new));
        List<ThreadRecord> remaining = snapshot.threads().stream()
            .filter(record -> !prioritizedIds.contains(record.id()))
            .sorted(THREAD_ORDER)
            .toList();

        appendPreShutdownHistory(report, historySnapshot, prioritizedIds);

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
        } finally {
            THREAD_HISTORY_MONITOR.stopAndClear();
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
            List.copyOf(records),
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
                return new DeadlockResult(null, "deadlock APIs unavailable", describe(fallbackError));
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
        line(
            report,
            "- PRE-SHUTDOWN THREAD HISTORY contains bounded samples captured while the server was still running."
        );
        line(report, "- Package, class and JAR names are association evidence only; they are not automatic fault attribution.");
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

    private static void appendPreShutdownHistory(
        StringBuilder report,
        ThreadHistorySnapshot snapshot,
        Set<Long> prioritizedIds
    ) {
        line(report, "PRE-SHUTDOWN THREAD HISTORY");
        line(report, "===========================");
        line(report, "Monitor started: " + value(snapshot.startedInstant()));
        line(report, "Baseline thread count: " + snapshot.baselineThreadCount());
        line(report, "Candidates retained: " + snapshot.candidates().size());
        line(report, "Candidates discarded by limit: " + snapshot.discardedCandidates());
        line(report, "Samples retained globally: " + snapshot.totalRetainedSamples());
        line(report, "JFR ThreadStart capture: not enabled; safe bounded ThreadMXBean polling was used.");
        line(
            report,
            "Sampling: discovery=" + snapshot.discoveryIntervalMillis()
                + " ms, focused=" + snapshot.focusedIntervalMillis()
                + " ms, maxStackDepth=" + snapshot.maxStackDepth()
        );
        line(report, "");

        if (snapshot.candidates().isEmpty()) {
            line(report, "No candidate thread history was captured.");
            line(report, "");
            return;
        }

        List<CandidateHistorySnapshot> ordered = new ArrayList<>(snapshot.candidates());
        ordered.sort(
            Comparator
                .comparing((CandidateHistorySnapshot candidate) -> !prioritizedIds.contains(candidate.id()))
                .thenComparing(CandidateHistorySnapshot::name)
                .thenComparingLong(CandidateHistorySnapshot::id)
        );

        boolean residualHistoryFound = false;
        for (CandidateHistorySnapshot candidate : ordered) {
            boolean finalResidual = prioritizedIds.contains(candidate.id());
            residualHistoryFound |= finalResidual;
            appendCandidateHistory(report, candidate, finalResidual);
        }

        Set<Long> historyIds = ordered.stream()
            .map(CandidateHistorySnapshot::id)
            .collect(Collectors.toSet());
        List<Long> missingResidualHistory = prioritizedIds.stream()
            .filter(id -> !historyIds.contains(id))
            .toList();
        if (!missingResidualHistory.isEmpty()) {
            line(report, "Residual non-daemon thread IDs without pre-shutdown history: " + missingResidualHistory);
            line(report, "");
        } else if (!prioritizedIds.isEmpty() && !residualHistoryFound) {
            line(report, "No residual non-daemon thread had matching pre-shutdown history.");
            line(report, "");
        }
    }

    private static void appendCandidateHistory(
        StringBuilder report,
        CandidateHistorySnapshot candidate,
        boolean finalResidual
    ) {
        line(report, "Thread candidate:");
        line(report, "  finalResidual=" + finalResidual);
        line(report, "  finalName=" + candidate.name());
        line(report, "  finalId=" + candidate.id());
        line(report, "  firstSeen=" + candidate.firstSeen());
        line(report, "  lastSeen=" + candidate.lastSeen());
        line(report, "  daemon=" + value(candidate.daemon()));
        line(report, "  priority=" + value(candidate.priority()));
        line(report, "  group=" + candidate.group());
        line(report, "  contextClassLoader=" + candidate.contextClassLoader());
        line(report, "  baselineThread=" + candidate.baselineThread());
        line(report, "  discoveryReasons=" + candidate.discoveryReasons());
        line(report, "  statesObserved=" + candidate.statesObserved());
        line(report, "  totalSamples=" + candidate.totalSamples());
        line(report, "  retainedSamples=" + candidate.samples().size());
        line(report, "  discardedSamples=" + candidate.discardedSamples());
        line(report, "  creationSource=polling-first-observation");
        line(report, "  creationStackAvailable=false");

        ResourceAssociation association = candidate.firstExternalAssociation();
        if (association == null) {
            line(report, "  firstExternalClass=NOT_CAPTURED");
            line(report, "  firstExternalClassResource=NOT_AVAILABLE");
            line(report, "  possibleJarAssociation=NOT_AVAILABLE");
        } else {
            line(report, "  firstExternalClass=" + association.className());
            line(report, "  firstExternalClassResource=" + association.resourceUrl());
            line(report, "  possibleJarAssociation=" + association.jarAssociation());
            line(report, "  associationLimitation=" + association.limitation());
        }

        appendNamedStack(report, "firstObservedStack", candidate.firstObservedStack());
        appendNamedStack(report, "firstRunnableStack", candidate.firstRunnableStack());
        appendNamedStack(report, "lastRunnableStack", candidate.lastRunnableStack());
        appendNamedStack(report, "lastBeforeServerStopping", candidate.lastBeforeStoppingStack());
        appendNamedStack(report, "lastAfterServerStopped", candidate.lastAfterStoppedStack());

        line(report, "  Relevant samples:");
        if (candidate.samples().isEmpty()) {
            line(report, "    <none retained>");
        } else {
            for (ThreadHistorySample sample : candidate.samples()) {
                line(
                    report,
                    "    [" + sample.timestamp() + "] reason=" + sample.reason()
                        + " state=" + sample.state()
                        + " occurrences=" + sample.occurrences()
                        + " externalFrames=" + sample.hasExternalFrames()
                );
                if (sample.stackTrace().length == 0) {
                    line(report, "      <empty or unavailable>");
                } else {
                    for (StackTraceElement frame : sample.stackTrace()) {
                        line(report, "      at " + frame);
                    }
                }
            }
        }
        line(report, "");
    }

    private static void appendNamedStack(
        StringBuilder report,
        String label,
        StackTraceElement[] stack
    ) {
        line(report, "  " + label + ":");
        if (stack == null || stack.length == 0) {
            line(report, "    <empty or unavailable>");
            return;
        }
        for (StackTraceElement frame : stack) {
            line(report, "    at " + frame);
        }
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
            .flatMap(record -> Arrays.stream(record.stackTrace()))
            .map(StackTraceElement::getClassName)
            .map(ShutdownHangDiagnostic::packageName)
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

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

    private static boolean isExternalFrame(StackTraceElement frame) {
        if (frame == null) {
            return false;
        }
        String className = frame.getClassName();
        return !(className.startsWith("java.")
            || className.startsWith("javax.")
            || className.startsWith("jdk.")
            || className.startsWith("sun.")
            || className.startsWith("com.sun."));
    }

    private static boolean containsExecutorFrame(StackTraceElement[] stack) {
        if (stack == null) {
            return false;
        }
        for (StackTraceElement frame : stack) {
            String className = frame.getClassName();
            if (className.equals("java.util.concurrent.ScheduledThreadPoolExecutor")
                || className.startsWith("java.util.concurrent.ScheduledThreadPoolExecutor$")
                || className.equals("java.util.concurrent.ThreadPoolExecutor$Worker")
                || className.equals("java.util.concurrent.Executors$DefaultThreadFactory")) {
                return true;
            }
        }
        return false;
    }

    private static StackTraceElement firstExternalFrame(StackTraceElement[] stack) {
        if (stack == null) {
            return null;
        }
        for (StackTraceElement frame : stack) {
            if (isExternalFrame(frame)) {
                return frame;
            }
        }
        return null;
    }

    private static StackTraceElement[] boundedCopy(StackTraceElement[] stack, int maxDepth) {
        if (stack == null || stack.length == 0) {
            return new StackTraceElement[0];
        }
        int length = Math.min(stack.length, Math.max(maxDepth, 0));
        return Arrays.copyOf(stack, length);
    }

    private static String stackSignature(Thread.State state, StackTraceElement[] stack, SampleReason reason) {
        StringBuilder signature = new StringBuilder(512);
        signature.append(state).append('|');
        if (reason.isLifecycleSnapshot()) {
            signature.append(reason).append('|');
        }
        if (stack != null) {
            for (StackTraceElement frame : stack) {
                signature.append(frame.getClassName())
                    .append('#')
                    .append(frame.getMethodName())
                    .append(':')
                    .append(frame.getLineNumber())
                    .append(';');
            }
        }
        return signature.toString();
    }

    private static ResourceAssociation resolveExternalAssociation(
        StackTraceElement[] stack,
        Thread thread
    ) {
        StackTraceElement firstExternal = firstExternalFrame(stack);
        if (firstExternal == null) {
            return null;
        }

        String className = firstExternal.getClassName();
        String resourceName = className.replace('.', '/') + ".class";
        ClassLoader preferredLoader = null;
        String limitation = "Resource URL is association evidence only; the owning component is not proven.";

        try {
            if (thread != null) {
                preferredLoader = thread.getContextClassLoader();
            }
        } catch (Throwable ignored) {
            // Fallback loaders below remain available.
        }

        URL resource = null;
        try {
            if (preferredLoader != null) {
                resource = preferredLoader.getResource(resourceName);
            }
            if (resource == null) {
                ClassLoader fallback = ShutdownHangDiagnostic.class.getClassLoader();
                if (fallback != null) {
                    resource = fallback.getResource(resourceName);
                }
            }
            if (resource == null) {
                resource = ClassLoader.getSystemResource(resourceName);
            }
        } catch (Throwable error) {
            return new ResourceAssociation(
                className,
                "unavailable (" + describe(error) + ")",
                "unavailable",
                limitation
            );
        }

        if (resource == null) {
            return new ResourceAssociation(className, "NOT_FOUND", "NOT_AVAILABLE", limitation);
        }

        String externalForm = resource.toExternalForm();
        String association = externalForm;
        int separator = externalForm.indexOf("!/");
        if (separator >= 0) {
            association = externalForm.substring(0, separator);
            if (association.startsWith("jar:")) {
                association = association.substring("jar:".length());
            }
        }
        return new ResourceAssociation(className, externalForm, association, limitation);
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
        return bytes + " bytes ("
            + String.format(java.util.Locale.ROOT, "%.2f MiB", bytes / 1_048_576.0)
            + ")";
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

    enum SampleReason {
        FIRST_SEEN,
        DISCOVERY,
        STATE_CHANGE,
        STACK_CHANGE,
        RUNNABLE_EXTERNAL_STACK,
        SERVER_STOPPING_SNAPSHOT,
        SERVER_STOPPED_SNAPSHOT,
        FINAL_HANG_SNAPSHOT;

        boolean isLifecycleSnapshot() {
            return this == SERVER_STOPPING_SNAPSHOT
                || this == SERVER_STOPPED_SNAPSHOT
                || this == FINAL_HANG_SNAPSHOT;
        }
    }

    enum DiscoveryReason {
        NEW_NON_DAEMON,
        GENERIC_POOL_NAME,
        EXECUTOR_STACK,
        SHUTDOWN_NON_DAEMON
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

    static final class ThreadHistoryMonitor {
        private final Duration discoveryInterval;
        private final Duration focusedInterval;
        private final int maxCandidates;
        private final int maxSamplesPerCandidate;
        private final int maxTotalRetainedSamples;
        private final int maxStackDepth;
        private final Object lock = new Object();
        private final AtomicBoolean running = new AtomicBoolean(false);
        private final AtomicBoolean shutdownStarted = new AtomicBoolean(false);
        private final AtomicBoolean serverStopped = new AtomicBoolean(false);
        private final AtomicReference<Thread> monitorThread = new AtomicReference<>();
        private final AtomicInteger retainedSamples = new AtomicInteger(0);
        private final AtomicInteger discardedCandidates = new AtomicInteger(0);
        private final LinkedHashMap<Long, CandidateHistory> histories = new LinkedHashMap<>();
        private final AtomicReference<Map<Long, Thread>> liveThreads =
            new AtomicReference<>(Map.of());
        private volatile Set<Long> baselineThreadIds = Set.of();
        private volatile Instant startedInstant;

        ThreadHistoryMonitor(
            Duration discoveryInterval,
            Duration focusedInterval,
            int maxCandidates,
            int maxSamplesPerCandidate,
            int maxTotalRetainedSamples,
            int maxStackDepth
        ) {
            this.discoveryInterval = discoveryInterval;
            this.focusedInterval = focusedInterval;
            this.maxCandidates = maxCandidates;
            this.maxSamplesPerCandidate = maxSamplesPerCandidate;
            this.maxTotalRetainedSamples = maxTotalRetainedSamples;
            this.maxStackDepth = maxStackDepth;
        }

        boolean start() {
            if (!running.compareAndSet(false, true)) {
                return false;
            }

            Map<Thread, StackTraceElement[]> baseline = safeAllStackTraces(null);
            Set<Long> baselineIds = baseline.keySet().stream()
                .map(Thread::getId)
                .collect(Collectors.toUnmodifiableSet());
            baselineThreadIds = baselineIds;
            liveThreads.set(indexThreads(baseline.keySet()));
            startedInstant = Instant.now();
            shutdownStarted.set(false);
            serverStopped.set(false);

            Thread monitor = createDaemonHistoryMonitor(this::runLoop);
            monitorThread.set(monitor);
            monitor.start();
            return true;
        }

        int baselineThreadCount() {
            return baselineThreadIds.size();
        }

        void markServerStopping() {
            shutdownStarted.set(true);
            captureExplicit(SampleReason.SERVER_STOPPING_SNAPSHOT, null);
        }

        void markServerStopped() {
            serverStopped.set(true);
            captureExplicit(SampleReason.SERVER_STOPPED_SNAPSHOT, null);
        }

        ThreadHistorySnapshot captureFinalAndSnapshot(
            ThreadSnapshot finalSnapshot,
            List<String> warnings
        ) {
            try {
                captureFinalRecords(finalSnapshot);
            } catch (Throwable error) {
                warnings.add("Final thread history capture failed: " + describe(error));
            }
            return snapshot();
        }

        void stopAndClear() {
            running.set(false);
            Thread thread = monitorThread.getAndSet(null);
            if (thread != null && thread != Thread.currentThread()) {
                thread.interrupt();
                try {
                    thread.join(1_000L);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                } catch (Throwable error) {
                    safeError(
                        LOG_PREFIX + " Failed while waiting for history monitor shutdown",
                        error
                    );
                }
            }
            synchronized (lock) {
                histories.clear();
            }
            retainedSamples.set(0);
            discardedCandidates.set(0);
            baselineThreadIds = Set.of();
            liveThreads.set(Map.of());
        }

        private void runLoop() {
            long nextDiscovery = 0L;
            while (running.get()) {
                long now = System.nanoTime();
                try {
                    if (now >= nextDiscovery) {
                        discoverCandidates();
                        nextDiscovery = now + discoveryInterval.toNanos();
                    }
                    sampleKnownCandidates(SampleReason.STACK_CHANGE);
                } catch (Throwable error) {
                    safeError(
                        LOG_PREFIX + " Thread history sampling iteration failed; monitoring will continue",
                        error
                    );
                }

                try {
                    Thread.sleep(focusedInterval.toMillis());
                } catch (InterruptedException interrupted) {
                    if (!running.get()) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                } catch (Throwable error) {
                    safeError(
                        LOG_PREFIX + " Thread history monitor wait failed; monitoring will continue",
                        error
                    );
                }
            }
        }

        private void discoverCandidates() {
            Map<Thread, StackTraceElement[]> raw = safeAllStackTraces(null);
            Map<Long, Thread> byId = indexThreads(raw.keySet());
            liveThreads.set(byId);

            for (Map.Entry<Thread, StackTraceElement[]> entry : raw.entrySet()) {
                Thread thread = entry.getKey();
                StackTraceElement[] stack = boundedCopy(entry.getValue(), maxStackDepth);
                EnumSet<DiscoveryReason> reasons = discoveryReasons(thread, stack);
                if (reasons.isEmpty()) {
                    continue;
                }
                recordCandidate(
                    thread,
                    thread.getState(),
                    stack,
                    reasons,
                    SampleReason.DISCOVERY,
                    Instant.now()
                );
            }
        }

        private EnumSet<DiscoveryReason> discoveryReasons(
            Thread thread,
            StackTraceElement[] stack
        ) {
            EnumSet<DiscoveryReason> reasons = EnumSet.noneOf(DiscoveryReason.class);
            String name = safeThreadValue(thread::getName);
            boolean daemon = safeThreadBoolean(thread::isDaemon, true);
            long id = thread.getId();

            if (!daemon && !baselineThreadIds.contains(id) && !isIgnoredDiagnosticThread(name)) {
                reasons.add(DiscoveryReason.NEW_NON_DAEMON);
            }
            if (GENERIC_POOL_THREAD.matcher(name).matches()) {
                reasons.add(DiscoveryReason.GENERIC_POOL_NAME);
            }
            if (containsExecutorFrame(stack)) {
                reasons.add(DiscoveryReason.EXECUTOR_STACK);
            }
            if (shutdownStarted.get() && !daemon && !"DestroyJavaVM".equals(name)
                && !isIgnoredDiagnosticThread(name)) {
                reasons.add(DiscoveryReason.SHUTDOWN_NON_DAEMON);
            }
            return reasons;
        }

        private void sampleKnownCandidates(SampleReason requestedReason) {
            long[] ids;
            synchronized (lock) {
                if (histories.isEmpty()) {
                    return;
                }
                ids = histories.keySet().stream().mapToLong(Long::longValue).toArray();
            }

            ThreadMXBean bean;
            try {
                bean = ManagementFactory.getThreadMXBean();
            } catch (Throwable error) {
                return;
            }

            ThreadInfo[] infos;
            try {
                infos = bean.getThreadInfo(ids, maxStackDepth);
            } catch (Throwable error) {
                return;
            }

            Map<Long, Thread> byId = liveThreads.get();
            Instant now = Instant.now();
            for (int index = 0; index < ids.length; index++) {
                ThreadInfo info = infos == null || index >= infos.length ? null : infos[index];
                if (info == null) {
                    continue;
                }
                Thread thread = byId.get(ids[index]);
                StackTraceElement[] stack = boundedCopy(info.getStackTrace(), maxStackDepth);
                recordCandidate(
                    thread,
                    info.getThreadState(),
                    stack,
                    EnumSet.noneOf(DiscoveryReason.class),
                    requestedReason,
                    now,
                    ids[index],
                    info.getThreadName()
                );
            }
        }

        private void captureExplicit(SampleReason reason, List<String> warnings) {
            try {
                discoverCandidates();
                sampleKnownCandidates(reason);
            } catch (Throwable error) {
                if (warnings != null) {
                    warnings.add(reason + " thread history capture failed: " + describe(error));
                } else {
                    safeError(LOG_PREFIX + " " + reason + " thread history capture failed", error);
                }
            }
        }

        private void captureFinalRecords(ThreadSnapshot finalSnapshot) {
            Instant now = Instant.now();
            for (ThreadRecord record : finalSnapshot.threads()) {
                if (!Boolean.FALSE.equals(record.daemon()) || "DestroyJavaVM".equals(record.name())) {
                    continue;
                }
                Thread thread = liveThreads.get().get(record.id());
                EnumSet<DiscoveryReason> reasons = EnumSet.of(DiscoveryReason.SHUTDOWN_NON_DAEMON);
                if (GENERIC_POOL_THREAD.matcher(record.name()).matches()) {
                    reasons.add(DiscoveryReason.GENERIC_POOL_NAME);
                }
                if (containsExecutorFrame(record.stackTrace())) {
                    reasons.add(DiscoveryReason.EXECUTOR_STACK);
                }
                recordCandidate(
                    thread,
                    record.state(),
                    boundedCopy(record.stackTrace(), maxStackDepth),
                    reasons,
                    SampleReason.FINAL_HANG_SNAPSHOT,
                    now,
                    record.id(),
                    record.name()
                );
            }
        }

        private void recordCandidate(
            Thread thread,
            Thread.State state,
            StackTraceElement[] stack,
            EnumSet<DiscoveryReason> reasons,
            SampleReason requestedReason,
            Instant timestamp
        ) {
            long id = thread.getId();
            String name = safeThreadValue(thread::getName);
            recordCandidate(thread, state, stack, reasons, requestedReason, timestamp, id, name);
        }

        private void recordCandidate(
            Thread thread,
            Thread.State state,
            StackTraceElement[] stack,
            EnumSet<DiscoveryReason> reasons,
            SampleReason requestedReason,
            Instant timestamp,
            long id,
            String fallbackName
        ) {
            CandidateHistory history;
            boolean newlyCreated = false;
            synchronized (lock) {
                history = histories.get(id);
                if (history == null) {
                    if (histories.size() >= maxCandidates) {
                        discardedCandidates.incrementAndGet();
                        return;
                    }
                    history = CandidateHistory.create(
                        id,
                        fallbackName == null ? "<unknown>" : fallbackName,
                        thread,
                        baselineThreadIds.contains(id),
                        maxSamplesPerCandidate,
                        maxTotalRetainedSamples,
                        retainedSamples
                    );
                    histories.put(id, history);
                    newlyCreated = true;
                }
            }

            history.refreshMetadata(thread, fallbackName);
            history.addDiscoveryReasons(reasons);
            ResourceAssociation association = history.needsExternalAssociation()
                ? resolveExternalAssociation(stack, thread)
                : null;
            history.record(
                timestamp,
                state,
                boundedCopy(stack, maxStackDepth),
                newlyCreated ? SampleReason.FIRST_SEEN : requestedReason,
                association,
                shutdownStarted.get(),
                serverStopped.get()
            );
        }

        private ThreadHistorySnapshot snapshot() {
            List<CandidateHistory> candidates;
            synchronized (lock) {
                candidates = List.copyOf(histories.values());
            }
            List<CandidateHistorySnapshot> snapshots = candidates.stream()
                .map(CandidateHistory::snapshot)
                .toList();
            return new ThreadHistorySnapshot(
                startedInstant,
                baselineThreadIds.size(),
                discardedCandidates.get(),
                retainedSamples.get(),
                discoveryInterval.toMillis(),
                focusedInterval.toMillis(),
                maxStackDepth,
                snapshots
            );
        }

        private static Map<Thread, StackTraceElement[]> safeAllStackTraces(List<String> warnings) {
            try {
                return Thread.getAllStackTraces();
            } catch (Throwable error) {
                if (warnings != null) {
                    warnings.add("Thread.getAllStackTraces unavailable: " + describe(error));
                }
                return Map.of();
            }
        }

        private static Map<Long, Thread> indexThreads(Set<Thread> threads) {
            Map<Long, Thread> byId = new HashMap<>();
            for (Thread thread : threads) {
                byId.put(thread.getId(), thread);
            }
            return Map.copyOf(byId);
        }

        private static boolean isIgnoredDiagnosticThread(String name) {
            return WATCHDOG_THREAD_NAME.equals(name) || HISTORY_MONITOR_THREAD_NAME.equals(name);
        }
    }

    static final class CandidateHistory {
        private final long id;
        private final boolean baselineThread;
        private final int maxSamples;
        private final int maxTotalSamples;
        private final AtomicInteger globalRetainedSamples;
        private final LinkedHashMap<String, MutableSample> retained = new LinkedHashMap<>();
        private final EnumSet<DiscoveryReason> discoveryReasons =
            EnumSet.noneOf(DiscoveryReason.class);
        private final EnumSet<Thread.State> statesObserved =
            EnumSet.noneOf(Thread.State.class);

        private String name;
        private Boolean daemon;
        private Integer priority;
        private String group;
        private String contextClassLoader;
        private Instant firstSeen;
        private Instant lastSeen;
        private long totalSamples;
        private long discardedSamples;
        private String lastSignature;
        private Thread.State lastState;
        private StackTraceElement[] firstObservedStack = new StackTraceElement[0];
        private StackTraceElement[] firstRunnableStack = new StackTraceElement[0];
        private StackTraceElement[] lastRunnableStack = new StackTraceElement[0];
        private StackTraceElement[] lastBeforeStoppingStack = new StackTraceElement[0];
        private StackTraceElement[] lastAfterStoppedStack = new StackTraceElement[0];
        private ResourceAssociation firstExternalAssociation;

        private CandidateHistory(
            long id,
            String name,
            Thread thread,
            boolean baselineThread,
            int maxSamples,
            int maxTotalSamples,
            AtomicInteger globalRetainedSamples
        ) {
            this.id = id;
            this.name = name;
            this.baselineThread = baselineThread;
            this.maxSamples = maxSamples;
            this.maxTotalSamples = maxTotalSamples;
            this.globalRetainedSamples = globalRetainedSamples;
            updateMetadata(thread, name);
        }

        static CandidateHistory create(
            long id,
            String name,
            Thread thread,
            boolean baselineThread,
            int maxSamples,
            int maxTotalSamples,
            AtomicInteger globalRetainedSamples
        ) {
            return new CandidateHistory(
                id,
                name,
                thread,
                baselineThread,
                maxSamples,
                maxTotalSamples,
                globalRetainedSamples
            );
        }

        synchronized void refreshMetadata(Thread thread, String fallbackName) {
            updateMetadata(thread, fallbackName);
        }

        synchronized void addDiscoveryReasons(Set<DiscoveryReason> reasons) {
            discoveryReasons.addAll(reasons);
        }

        synchronized boolean needsExternalAssociation() {
            return firstExternalAssociation == null;
        }

        synchronized void record(
            Instant timestamp,
            Thread.State state,
            StackTraceElement[] stack,
            SampleReason requestedReason,
            ResourceAssociation association,
            boolean shutdownStarted,
            boolean serverStopped
        ) {
            totalSamples++;
            firstSeen = firstSeen == null ? timestamp : firstSeen;
            lastSeen = timestamp;
            if (state != null) {
                statesObserved.add(state);
            }
            if (firstObservedStack.length == 0 && stack.length > 0) {
                firstObservedStack = stack.clone();
            }
            if (state == Thread.State.RUNNABLE) {
                if (firstRunnableStack.length == 0) {
                    firstRunnableStack = stack.clone();
                }
                lastRunnableStack = stack.clone();
            }
            if (!shutdownStarted) {
                lastBeforeStoppingStack = stack.clone();
            }
            if (serverStopped) {
                lastAfterStoppedStack = stack.clone();
            }
            if (firstExternalAssociation == null && association != null) {
                firstExternalAssociation = association;
            }

            String genericSignature = stackSignature(state, stack, requestedReason);
            boolean first = lastSignature == null;
            boolean stateChanged = lastState != state;
            boolean stackChanged = !genericSignature.equals(lastSignature);
            boolean hasExternal = firstExternalFrame(stack) != null;
            SampleReason effectiveReason = requestedReason;
            if (!requestedReason.isLifecycleSnapshot()) {
                if (first) {
                    effectiveReason = SampleReason.FIRST_SEEN;
                } else if (stateChanged) {
                    effectiveReason = SampleReason.STATE_CHANGE;
                } else if (state == Thread.State.RUNNABLE && hasExternal) {
                    effectiveReason = SampleReason.RUNNABLE_EXTERNAL_STACK;
                } else if (stackChanged) {
                    effectiveReason = SampleReason.STACK_CHANGE;
                } else {
                    effectiveReason = SampleReason.DISCOVERY;
                }
            }

            String retainedSignature = stackSignature(state, stack, effectiveReason);
            MutableSample existing = retained.get(retainedSignature);
            if (existing != null) {
                existing.incrementOccurrences();
            } else {
                boolean relevant = first
                    || stateChanged
                    || stackChanged
                    || state == Thread.State.RUNNABLE
                    || state == Thread.State.BLOCKED
                    || hasExternal
                    || effectiveReason.isLifecycleSnapshot();
                if (relevant && retained.size() < maxSamples && reserveGlobalSample()) {
                    retained.put(
                        retainedSignature,
                        new MutableSample(timestamp, effectiveReason, state, stack, hasExternal)
                    );
                } else {
                    discardedSamples++;
                }
            }

            lastSignature = genericSignature;
            lastState = state;
        }

        synchronized CandidateHistorySnapshot snapshot() {
            List<ThreadHistorySample> samples = retained.values().stream()
                .map(MutableSample::snapshot)
                .toList();
            return new CandidateHistorySnapshot(
                id,
                name,
                daemon,
                priority,
                group,
                contextClassLoader,
                baselineThread,
                Set.copyOf(discoveryReasons),
                Set.copyOf(statesObserved),
                firstSeen,
                lastSeen,
                totalSamples,
                discardedSamples,
                firstObservedStack.clone(),
                firstRunnableStack.clone(),
                lastRunnableStack.clone(),
                lastBeforeStoppingStack.clone(),
                lastAfterStoppedStack.clone(),
                firstExternalAssociation,
                samples
            );
        }

        private boolean reserveGlobalSample() {
            while (true) {
                int current = globalRetainedSamples.get();
                if (current >= maxTotalSamples) {
                    return false;
                }
                if (globalRetainedSamples.compareAndSet(current, current + 1)) {
                    return true;
                }
            }
        }

        private void updateMetadata(Thread thread, String fallbackName) {
            name = fallbackName == null ? name : fallbackName;
            if (thread == null) {
                daemon = null;
                priority = null;
                group = "unavailable";
                contextClassLoader = "unavailable";
                return;
            }
            daemon = safeThreadBoolean(thread::isDaemon, false);
            priority = safeThreadInteger(thread::getPriority, null);
            group = safeThreadValue(() -> {
                ThreadGroup threadGroup = thread.getThreadGroup();
                return threadGroup == null ? null : threadGroup.getName();
            });
            contextClassLoader = safeThreadValue(() -> {
                ClassLoader loader = thread.getContextClassLoader();
                return loader == null
                    ? null
                    : loader.getClass().getName() + "@"
                        + Integer.toHexString(System.identityHashCode(loader));
            });
        }
    }

    static final class MutableSample {
        private final Instant timestamp;
        private final SampleReason reason;
        private final Thread.State state;
        private final StackTraceElement[] stackTrace;
        private final boolean hasExternalFrames;
        private int occurrences = 1;

        MutableSample(
            Instant timestamp,
            SampleReason reason,
            Thread.State state,
            StackTraceElement[] stackTrace,
            boolean hasExternalFrames
        ) {
            this.timestamp = timestamp;
            this.reason = reason;
            this.state = state;
            this.stackTrace = stackTrace.clone();
            this.hasExternalFrames = hasExternalFrames;
        }

        void incrementOccurrences() {
            occurrences++;
        }

        ThreadHistorySample snapshot() {
            return new ThreadHistorySample(
                timestamp,
                reason,
                state,
                stackTrace.clone(),
                hasExternalFrames,
                occurrences
            );
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

    private record ThreadHistorySnapshot(
        Instant startedInstant,
        int baselineThreadCount,
        int discardedCandidates,
        int totalRetainedSamples,
        long discoveryIntervalMillis,
        long focusedIntervalMillis,
        int maxStackDepth,
        List<CandidateHistorySnapshot> candidates
    ) {
    }

    private record CandidateHistorySnapshot(
        long id,
        String name,
        Boolean daemon,
        Integer priority,
        String group,
        String contextClassLoader,
        boolean baselineThread,
        Set<DiscoveryReason> discoveryReasons,
        Set<Thread.State> statesObserved,
        Instant firstSeen,
        Instant lastSeen,
        long totalSamples,
        long discardedSamples,
        StackTraceElement[] firstObservedStack,
        StackTraceElement[] firstRunnableStack,
        StackTraceElement[] lastRunnableStack,
        StackTraceElement[] lastBeforeStoppingStack,
        StackTraceElement[] lastAfterStoppedStack,
        ResourceAssociation firstExternalAssociation,
        List<ThreadHistorySample> samples
    ) {
    }

    private record ThreadHistorySample(
        Instant timestamp,
        SampleReason reason,
        Thread.State state,
        StackTraceElement[] stackTrace,
        boolean hasExternalFrames,
        int occurrences
    ) {
    }

    private record ResourceAssociation(
        String className,
        String resourceUrl,
        String jarAssociation,
        String limitation
    ) {
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
            Boolean daemon = thread == null ? null : safeThreadBoolean(thread::isDaemon, false);
            Integer priority = thread == null ? null : safeThreadInteger(thread::getPriority, null);
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
                        : loader.getClass().getName() + "@"
                            + Integer.toHexString(System.identityHashCode(loader));
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
                stack == null ? new StackTraceElement[0] : stack.clone()
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
                replacement.getStackTrace().clone()
            );
        }
    }

    private static boolean safeThreadBoolean(BooleanSupplierWithThrowable supplier, boolean fallback) {
        try {
            return supplier.getAsBoolean();
        } catch (Throwable error) {
            return fallback;
        }
    }

    private static Integer safeThreadInteger(IntSupplierWithThrowable supplier, Integer fallback) {
        try {
            return supplier.getAsInt();
        } catch (Throwable error) {
            return fallback;
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
    private interface BooleanSupplierWithThrowable {
        boolean getAsBoolean() throws Throwable;
    }

    @FunctionalInterface
    private interface ValueSupplier {
        Object get() throws Throwable;
    }
}
