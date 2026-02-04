package com.igknight.game.service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.igknight.game.entity.GameAuditLog;
import com.igknight.game.entity.GameAuditLog.AuditEventType;
import com.igknight.game.entity.GameAuditLog.Severity;
import com.igknight.game.repository.GameAuditLogRepository;

/**
 * Audit Service - Security event logging and monitoring
 * 
 * Logs all game operations for:
 * - Security analysis
 * - Fraud detection
 * - Debugging
 * - Compliance
 */
@Service
public class GameAuditService {

    private static final Logger logger = LoggerFactory.getLogger(GameAuditService.class);
    private static final long MAX_MOVES_PER_MINUTE = 30; // Anti-spam: max 30 moves per minute

    private final GameAuditLogRepository auditLogRepository;

    public GameAuditService(GameAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Log a move submission
     */
    public void logMoveSubmitted(Long gameId, Long userId, String username, String from, String to, 
                                  String fenBefore, String idempotencyKey, Long clientTimestamp) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.MOVE_SUBMITTED, Severity.INFO,
                "Move submitted: " + from + " to " + to);
        log.setUsername(username);
        log.setMoveFrom(from);
        log.setMoveTo(to);
        log.setFenBefore(fenBefore);
        log.setIdempotencyKey(idempotencyKey);
        log.setClientTimestamp(clientTimestamp);
        
        // Calculate clock drift (if client timestamp provided)
        if (clientTimestamp != null) {
            long serverTimestampMs = System.currentTimeMillis();
            long driftMs = Math.abs(serverTimestampMs - clientTimestamp);
            log.setClockDriftMs(driftMs);
            
            // Warn if clock drift is excessive (>5 seconds)
            if (driftMs > 5000) {
                logger.warn("Excessive clock drift detected: {}ms for user {} in game {}", 
                           driftMs, userId, gameId);
            }
        }
        
        auditLogRepository.save(log);
    }

    /**
     * Log a successful move
     */
    public void logMoveAccepted(Long gameId, Long userId, String from, String to, String fenAfter) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.MOVE_ACCEPTED, Severity.INFO,
                "Move accepted: " + from + " to " + to);
        log.setMoveFrom(from);
        log.setMoveTo(to);
        log.setFenAfter(fenAfter);
        auditLogRepository.save(log);
    }

    /**
     * Log a rejected move
     */
    public void logMoveRejected(Long gameId, Long userId, String from, String to, String reason) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.MOVE_REJECTED, Severity.WARNING,
                "Move rejected: " + reason);
        log.setMoveFrom(from);
        log.setMoveTo(to);
        auditLogRepository.save(log);
    }

    /**
     * Log an illegal move attempt (security event)
     */
    public void logIllegalMoveAttempt(Long gameId, Long userId, String from, String to, String fenBefore) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.ILLEGAL_MOVE_ATTEMPT, Severity.WARNING,
                "Illegal move attempted: " + from + " to " + to);
        log.setMoveFrom(from);
        log.setMoveTo(to);
        log.setFenBefore(fenBefore);
        auditLogRepository.save(log);
        
        logger.warn("Illegal move attempt by user {} in game {}: {} to {}", userId, gameId, from, to);
    }

    /**
     * Log an out-of-turn move attempt (possible cheating)
     */
    public void logOutOfTurnAttempt(Long gameId, Long userId, String currentTurn) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.OUT_OF_TURN_ATTEMPT, Severity.WARNING,
                "Out-of-turn move attempted (current turn: " + currentTurn + ")");
        auditLogRepository.save(log);
        
        logger.warn("Out-of-turn move attempt by user {} in game {} (current turn: {})", 
                   userId, gameId, currentTurn);
    }

    /**
     * Log a duplicate move attempt (idempotency violation)
     */
    public void logDuplicateMoveAttempt(Long gameId, Long userId, String idempotencyKey) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.DUPLICATE_MOVE_ATTEMPT, Severity.WARNING,
                "Duplicate move attempt detected (idempotency key: " + idempotencyKey + ")");
        log.setIdempotencyKey(idempotencyKey);
        auditLogRepository.save(log);
        
        logger.warn("Duplicate move attempt by user {} in game {} (key: {})", userId, gameId, idempotencyKey);
    }

    /**
     * Log clock tampering detection
     */
    public void logClockTampering(Long gameId, Long userId, long clockDriftMs) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.CLOCK_TAMPERING_DETECTED, Severity.ERROR,
                "Clock tampering detected: " + clockDriftMs + "ms drift");
        log.setClockDriftMs(clockDriftMs);
        auditLogRepository.save(log);
        
        logger.error("Clock tampering detected for user {} in game {}: {}ms drift", userId, gameId, clockDriftMs);
    }

    /**
     * Log rate limit exceeded (spam protection)
     */
    public void logRateLimitExceeded(Long gameId, Long userId) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.RATE_LIMIT_EXCEEDED, Severity.ERROR,
                "Rate limit exceeded: Too many move attempts");
        auditLogRepository.save(log);
        
        logger.error("Rate limit exceeded for user {} in game {}", userId, gameId);
    }

    /**
     * Log authorization failure
     */
    public void logAuthorizationFailure(Long gameId, Long userId, String reason) {
        GameAuditLog log = new GameAuditLog(gameId, userId, AuditEventType.AUTHORIZATION_FAILURE, Severity.ERROR,
                "Authorization failed: " + reason);
        auditLogRepository.save(log);
        
        logger.error("Authorization failure for user {} in game {}: {}", userId, gameId, reason);
    }

    /**
     * Check if idempotency key was already used
     */
    public boolean isIdempotencyKeyUsed(String idempotencyKey, Long gameId) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return false;
        }
        return auditLogRepository.findFirstByIdempotencyKeyAndGameId(idempotencyKey, gameId).isPresent();
    }

    /**
     * Check if user is rate limited
     */
    public boolean isRateLimited(Long userId) {
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        Long moveCount = auditLogRepository.countMoveAttemptsByUserSince(
            userId, 
            AuditEventType.MOVE_SUBMITTED, 
            oneMinuteAgo
        );
        return moveCount >= MAX_MOVES_PER_MINUTE;
    }

    /**
     * Get all audit logs for a game
     */
    public List<GameAuditLog> getGameAuditLogs(Long gameId) {
        return auditLogRepository.findByGameIdOrderByServerTimestampDesc(gameId);
    }

    /**
     * Get suspicious activities for a user
     */
    public List<GameAuditLog> getSuspiciousActivities(Long userId) {
        return auditLogRepository.findByUserIdAndSeverityInOrderByServerTimestampDesc(
            userId,
            List.of(Severity.WARNING, Severity.ERROR, Severity.CRITICAL)
        );
    }
}
