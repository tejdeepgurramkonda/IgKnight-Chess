package com.igknight.game.repository;

import com.igknight.game.entity.GameMove;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameMoveRepository extends JpaRepository<GameMove, Long> {

    @Query("SELECT m FROM GameMove m WHERE m.game.id = :gameId ORDER BY m.moveNumber ASC")
    List<GameMove> findByGameIdOrderByMoveNumber(@Param("gameId") Long gameId);

    @Query("SELECT m FROM GameMove m WHERE m.game.id = :gameId ORDER BY m.moveNumber DESC")
    List<GameMove> findByGameIdOrderByMoveNumberDesc(@Param("gameId") Long gameId);

    @Query("SELECT COUNT(m) FROM GameMove m WHERE m.game.id = :gameId")
    Long countMovesByGameId(@Param("gameId") Long gameId);
}
