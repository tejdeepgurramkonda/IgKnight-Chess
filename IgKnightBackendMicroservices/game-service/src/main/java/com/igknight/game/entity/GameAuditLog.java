package com.igknight.game.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Audit log for security events and move validation
 * Tracks all game operations for security analysis and debugging
 */
@Entity
@Table(name = "game_audit_log")
public class GameAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "username")
    private String username;

    @Column(name = "event_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private AuditEventType eventType;

    @Column(name = "severity")
    @Enumerated(EnumType.STRING)
    private Severity severity;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "move_from")
    private String moveFrom;

    @Column(name = "move_to")
    private String moveTo;

    @Column(name = "fen_before", length = 500)
    private String fenBefore;

    @Column(name = "fen_after", length = 500)
    private String fenAfter;

    @Column(name = "client_timestamp")
    private Long clientTimestamp;

    @Column(name = "server_timestamp", nullable = false)
    private LocalDateTime serverTimestamp;

    @Column(name = "clock_drift_ms")
    private Long clockDriftMs;

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    public enum AuditEventType {
        MOVE_SUBMITTED,
        MOVE_ACCEPTED,
        MOVE_REJECTED,
        ILLEGAL_MOVE_ATTEMPT,
        OUT_OF_TURN_ATTEMPT,
        DUPLICATE_MOVE_ATTEMPT,
        CLOCK_TAMPERING_DETECTED,
        RATE_LIMIT_EXCEEDED,
        GAME_CREATED,
        GAME_JOINED,
        GAME_ENDED,
        GAME_RESIGNED,
        GAME_ABANDONED,
        AUTHORIZATION_FAILURE,
        SUSPICIOUS_ACTIVITY
    }

    public enum Severity {
        INFO,
        WARNING,
        ERROR,
        CRITICAL
    }

    // Constructors
    public GameAuditLog() {
    }

    public GameAuditLog(Long gameId, Long userId, AuditEventType eventType, Severity severity, String description) {
        this.gameId = gameId;
        this.userId = userId;
        this.eventType = eventType;
        this.severity = severity;
        this.description = description;
        this.serverTimestamp = LocalDateTime.now();
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getGameId() {
        return gameId;
    }

    public void setGameId(Long gameId) {
        this.gameId = gameId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public AuditEventType getEventType() {
        return eventType;
    }

    public void setEventType(AuditEventType eventType) {
        this.eventType = eventType;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getMoveFrom() {
        return moveFrom;
    }

    public void setMoveFrom(String moveFrom) {
        this.moveFrom = moveFrom;
    }

    public String getMoveTo() {
        return moveTo;
    }

    public void setMoveTo(String moveTo) {
        this.moveTo = moveTo;
    }

    public String getFenBefore() {
        return fenBefore;
    }

    public void setFenBefore(String fenBefore) {
        this.fenBefore = fenBefore;
    }

    public String getFenAfter() {
        return fenAfter;
    }

    public void setFenAfter(String fenAfter) {
        this.fenAfter = fenAfter;
    }

    public Long getClientTimestamp() {
        return clientTimestamp;
    }

    public void setClientTimestamp(Long clientTimestamp) {
        this.clientTimestamp = clientTimestamp;
    }

    public LocalDateTime getServerTimestamp() {
        return serverTimestamp;
    }

    public void setServerTimestamp(LocalDateTime serverTimestamp) {
        this.serverTimestamp = serverTimestamp;
    }

    public Long getClockDriftMs() {
        return clockDriftMs;
    }

    public void setClockDriftMs(Long clockDriftMs) {
        this.clockDriftMs = clockDriftMs;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
}
