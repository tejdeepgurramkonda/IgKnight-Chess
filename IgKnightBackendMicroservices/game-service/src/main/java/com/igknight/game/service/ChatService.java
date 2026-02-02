package com.igknight.game.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.igknight.game.dto.ChatHistoryResponse;
import com.igknight.game.dto.ChatMessageDTO;
import com.igknight.game.entity.ChatMessage;
import com.igknight.game.entity.Game;
import com.igknight.game.repository.ChatMessageRepository;
import com.igknight.game.repository.GameRepository;

@Service
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final GameRepository gameRepository;

    public ChatService(ChatMessageRepository chatMessageRepository, GameRepository gameRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.gameRepository = gameRepository;
    }

    @Transactional
    public ChatMessageDTO saveMessage(Long gameId, Long userId, String username, String message) {
        Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new RuntimeException("Game not found with id: " + gameId));

        ChatMessage chatMessage = new ChatMessage(game, userId, username, message);
        ChatMessage saved = chatMessageRepository.save(chatMessage);

        return convertToDTO(saved);
    }

    @Transactional(readOnly = true)
    public ChatHistoryResponse getChatHistory(Long gameId) {
        // Verify game exists
        gameRepository.findById(gameId)
            .orElseThrow(() -> new RuntimeException("Game not found with id: " + gameId));

        List<ChatMessage> messages = chatMessageRepository.findByGameIdOrderByTimestamp(gameId);
        List<ChatMessageDTO> messageDTOs = messages.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());

        return new ChatHistoryResponse(gameId, messageDTOs);
    }

    private ChatMessageDTO convertToDTO(ChatMessage chatMessage) {
        return new ChatMessageDTO(
            chatMessage.getId(),
            chatMessage.getGame().getId(),
            chatMessage.getUserId(),
            chatMessage.getUsername(),
            chatMessage.getMessage(),
            chatMessage.getCreatedAt()
        );
    }
}
