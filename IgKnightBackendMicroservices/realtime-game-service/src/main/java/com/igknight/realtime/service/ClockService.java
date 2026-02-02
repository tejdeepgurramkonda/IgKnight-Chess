package com.igknight.realtime.service;

import com.igknight.realtime.model.GameClock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.*;

/**
 * Service to manage chess clocks for all active games
 */
@Service
public class ClockService {

    private static final Logger log = LoggerFactory.getLogger(ClockService.class);
    private static final long GRACE_PERIOD_MS = 30_000; // 30 seconds

    // Thread-safe map of game clocks
    private final Map<String, GameClock> clocks = new ConcurrentHashMap<>();

    // Grace period timers for disconnected players
    private final Map<String, ScheduledFuture<?>> graceTimers = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    /**
     * Initialize or update clock for a game
     */
    public void initializeClock(String gameId, Long whiteTimeMs, Long blackTimeMs, String activeColor) {
        GameClock clock = new GameClock(gameId, whiteTimeMs, blackTimeMs, activeColor);
        clocks.put(gameId, clock);
        log.info("Clock initialized for game {}: white={}ms, black={}ms, active={}",
                gameId, whiteTimeMs, blackTimeMs, activeColor);
    }

    /**
     * Get clock for a game
     */
    public GameClock getClock(String gameId) {
        return clocks.get(gameId);
    }

    /**
     * Update clock after a move
     * @return updated clock state
     */
    public GameClock updateAfterMove(String gameId, int incrementMs) {
        GameClock clock = clocks.get(gameId);
        if (clock == null) {
            log.warn("Clock not found for game {}", gameId);
            return null;
        }

        // Tick to deduct elapsed time from active player
        clock.tick();

        // Add increment to the player who just moved (still active before switch)
        if (incrementMs > 0) {
            clock.addIncrement(incrementMs);
        }

        // Switch to next player
        clock.switchActiveColor();

        log.debug("Clock updated for game {}: white={}ms, black={}ms, active={}",
                gameId, clock.getWhiteTimeMs(), clock.getBlackTimeMs(), clock.getActiveColor());

        return clock;
    }

    /**
     * Pause clock on player disconnect and start grace timer
     */
    public void pauseClockOnDisconnect(String gameId, Runnable onGraceExpired) {
        GameClock clock = clocks.get(gameId);
        if (clock == null) {
            log.warn("Clock not found for game {} on disconnect", gameId);
            return;
        }

        clock.pause();
        log.info("Clock paused for game {} due to player disconnect", gameId);

        // Cancel existing grace timer if any
        cancelGraceTimer(gameId);

        // Start new grace timer
        ScheduledFuture<?> graceTimer = scheduler.schedule(() -> {
            log.warn("Grace period expired for game {}", gameId);
            graceTimers.remove(gameId);
            onGraceExpired.run();
        }, GRACE_PERIOD_MS, TimeUnit.MILLISECONDS);

        graceTimers.put(gameId, graceTimer);
        log.info("Grace timer started for game {}: {}ms", gameId, GRACE_PERIOD_MS);
    }

    /**
     * Resume clock on player reconnect
     */
    public void resumeClockOnReconnect(String gameId) {
        GameClock clock = clocks.get(gameId);
        if (clock == null) {
            log.warn("Clock not found for game {} on reconnect", gameId);
            return;
        }

        // Cancel grace timer
        cancelGraceTimer(gameId);

        clock.resume();
        log.info("Clock resumed for game {} after reconnect", gameId);
    }

    /**
     * Cancel grace timer for a game
     */
    private void cancelGraceTimer(String gameId) {
        ScheduledFuture<?> timer = graceTimers.remove(gameId);
        if (timer != null) {
            timer.cancel(false);
            log.info("Grace timer cancelled for game {}", gameId);
        }
    }

    /**
     * Check if any player has timed out
     * @return color that timed out, or null
     */
    public String checkTimeout(String gameId) {
        GameClock clock = clocks.get(gameId);
        if (clock == null) {
            return null;
        }
        return clock.checkTimeout();
    }

    /**
     * Remove clock for a game
     */
    public void removeClock(String gameId) {
        clocks.remove(gameId);
        cancelGraceTimer(gameId);
        log.info("Clock removed for game {}", gameId);
    }

    /**
     * Check if game has a clock
     */
    public boolean hasClock(String gameId) {
        return clocks.containsKey(gameId);
    }

    /**
     * Shutdown scheduler on service stop
     */
    public void shutdown() {
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
