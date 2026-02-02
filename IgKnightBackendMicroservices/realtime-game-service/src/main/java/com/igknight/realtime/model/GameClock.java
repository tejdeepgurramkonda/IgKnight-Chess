package com.igknight.realtime.model;

import lombok.Data;

import java.util.concurrent.locks.ReentrantLock;

/**
 * In-memory chess clock for a game
 * Thread-safe with ReentrantLock
 */
@Data
public class GameClock {
    private final String gameId;
    private Long whiteTimeMs;
    private Long blackTimeMs;
    private String activeColor; // "WHITE" or "BLACK"
    private Long lastTickTimestamp;
    private boolean paused;
    private final ReentrantLock lock = new ReentrantLock();

    public GameClock(String gameId, Long whiteTimeMs, Long blackTimeMs, String activeColor) {
        this.gameId = gameId;
        this.whiteTimeMs = whiteTimeMs;
        this.blackTimeMs = blackTimeMs;
        this.activeColor = activeColor;
        this.lastTickTimestamp = System.currentTimeMillis();
        this.paused = false;
    }

    /**
     * Update clock after a move
     * @return elapsed time in milliseconds
     */
    public long tick() {
        lock.lock();
        try {
            if (paused) {
                return 0;
            }

            long now = System.currentTimeMillis();
            long elapsed = now - lastTickTimestamp;

            // Deduct time from active player
            if ("WHITE".equals(activeColor)) {
                whiteTimeMs = Math.max(0, whiteTimeMs - elapsed);
            } else if ("BLACK".equals(activeColor)) {
                blackTimeMs = Math.max(0, blackTimeMs - elapsed);
            }

            lastTickTimestamp = now;
            return elapsed;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Switch active color after a move
     */
    public void switchActiveColor() {
        lock.lock();
        try {
            if ("WHITE".equals(activeColor)) {
                activeColor = "BLACK";
            } else if ("BLACK".equals(activeColor)) {
                activeColor = "WHITE";
            }
            lastTickTimestamp = System.currentTimeMillis();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Pause the clock (on disconnect)
     */
    public void pause() {
        lock.lock();
        try {
            if (!paused) {
                // Deduct elapsed time before pausing
                tick();
                paused = true;
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * Resume the clock (on reconnect)
     */
    public void resume() {
        lock.lock();
        try {
            if (paused) {
                paused = false;
                lastTickTimestamp = System.currentTimeMillis();
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * Check if time has expired for either player
     * @return color that timed out, or null
     */
    public String checkTimeout() {
        lock.lock();
        try {
            tick(); // Update time first

            if (whiteTimeMs <= 0) {
                return "WHITE";
            } else if (blackTimeMs <= 0) {
                return "BLACK";
            }
            return null;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Add increment to active player's time
     */
    public void addIncrement(int incrementMs) {
        lock.lock();
        try {
            if ("WHITE".equals(activeColor)) {
                whiteTimeMs += incrementMs;
            } else if ("BLACK".equals(activeColor)) {
                blackTimeMs += incrementMs;
            }
        } finally {
            lock.unlock();
        }
    }
}
