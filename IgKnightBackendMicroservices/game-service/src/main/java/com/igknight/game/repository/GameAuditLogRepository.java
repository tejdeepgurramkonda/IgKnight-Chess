package com.igknight.game.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.igknight.game.entity.GameAuditLog;
import com.igknight.game.entity.GameAuditLog.AuditEventType;
import com.igknight.game.entity.GameAuditLog.Severity;

@Repository
public interface GameAuditLogRepository extends JpaRepository<GameAuditLog, Long> {
    
    /**
     * Find all audit logs for a specific game
     */
    List<GameAuditLog> findByGameIdOrderByServerTimestampDesc(Long gameId);
    
    /**
     * Find all audit logs for a specific user
     */
    List<GameAuditLog> findByUserIdOrderByServerTimestampDesc(Long userId);
    
    /**
     * Find suspicious activities (WARNING or higher) for a user
     */
    List<GameAuditLog> findByUserIdAndSeverityInOrderByServerTimestampDesc(
        Long userId, 
        List<Severity> severities
    );
    
    /**
     * Check for duplicate move attempts by idempotency key
     */
    Optional<GameAuditLog> findFirstByIdempotencyKeyAndGameId(String idempotencyKey, Long gameId);
    
    /**
     * Count move attempts by user in a time window (rate limiting)
     */
    @Query("SELECT COUNT(a) FROM GameAuditLog a WHERE a.userId = ?1 AND a.eventType = ?2 AND a.serverTimestamp >= ?3")
    Long countMoveAttemptsByUserSince(Long userId, AuditEventType eventType, LocalDateTime since);
    
    /**
     * Find recent audit logs by event type
     */
    List<GameAuditLog> findByEventTypeAndServerTimestampAfterOrderByServerTimestampDesc(
        AuditEventType eventType,
        LocalDateTime after
    );
}
