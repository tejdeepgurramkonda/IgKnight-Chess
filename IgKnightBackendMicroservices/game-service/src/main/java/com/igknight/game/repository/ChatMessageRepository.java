package com.igknight.game.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.igknight.game.entity.ChatMessage;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT c FROM ChatMessage c WHERE c.game.id = :gameId ORDER BY c.createdAt ASC")
    List<ChatMessage> findByGameIdOrderByTimestamp(@Param("gameId") Long gameId);

    @Query("SELECT COUNT(c) FROM ChatMessage c WHERE c.game.id = :gameId")
    Long countMessagesByGameId(@Param("gameId") Long gameId);
}
