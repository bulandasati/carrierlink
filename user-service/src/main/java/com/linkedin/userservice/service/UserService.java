package com.linkedin.userservice.service;

import com.linkedin.userservice.dto.PresignedUrlResponse;
import com.linkedin.userservice.dto.UserResponse;
import com.linkedin.userservice.entity.Connection;
import com.linkedin.userservice.entity.ConnectionStatus;
import com.linkedin.userservice.entity.User;
import com.linkedin.userservice.repository.ConnectionRepository;
import com.linkedin.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final ConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final S3Service s3Service;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String CONNECTION_REQUESTED_TOPIC = "connection.requested";
    private static final String CONNECTION_ACCEPTED_TOPIC = "connection.accepted";
    private static final String USER_UPDATED_TOPIC = "user.updated";


    public String sendConnectionRequest(String receiverId, String requesterId){

        if (receiverId.equals(requesterId)) {
            throw new RuntimeException("Cannot connect with yourself");
        }

        if (connectionRepository.existsConnectionBetween(requesterId, receiverId)){
            throw new RuntimeException("A connection or request already exists between these users");
        }

        Connection connection = new Connection();
        connection.setRequesterId(requesterId);
        connection.setReceiverId(receiverId);
        connection.setStatus(ConnectionStatus.PENDING);


        connectionRepository.save(connection);

        // Publish connection.requested event

        Map<String, Object> connectionRequestedEvent = new HashMap<>();
        connectionRequestedEvent.put("requesterId", requesterId);
        connectionRequestedEvent.put("receiverId", receiverId);

        kafkaTemplate.send(CONNECTION_REQUESTED_TOPIC, requesterId, connectionRequestedEvent);

        log.info("Connection request sent: {} -> {}",
                requesterId, receiverId);

        return "Connection request sent";
    }

    public List<Connection> getPendingConnections(String userId){
        return connectionRepository
                .findByReceiverIdAndStatus(userId, ConnectionStatus.PENDING);
    }

    public String acceptConnectionRequest(String connectionId){

        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException(
                        "Connection not found: "+connectionId
                ));

        connection.setStatus(ConnectionStatus.CONNECTED);
        connectionRepository.save(connection);

        // Publish connection.accepted event

        Map<String, Object> connectionAcceptedEvent = new HashMap<>();
        connectionAcceptedEvent.put("requesterId", connection.getRequesterId());
        connectionAcceptedEvent.put("receiverId", connection.getReceiverId());

        kafkaTemplate.send(CONNECTION_ACCEPTED_TOPIC, connection.getRequesterId(),
                connectionAcceptedEvent);

        log.info("Connection accpeted: {}", connectionId);

        return "Connection accepted";
    }

    public List<UserResponse> getConnections(String userId){
        List<Connection> connections = connectionRepository
                .findAcceptedConnections(userId, ConnectionStatus.CONNECTED);

        return connections.stream()
                .map(c -> {
                    String otherUserId = c.getRequesterId().equals(userId) ? c.getReceiverId() : c.getRequesterId();
                    return getUserProfile(otherUserId);
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getConnectionStatus(String targetUserId, String currentUserId){
        Map<String, Object> map = new HashMap<>();
        if (targetUserId.equals(currentUserId)) {
            map.put("status", "SELF");
            return map;
        }
        Optional<Connection> conn = connectionRepository.findConnectionBetween(targetUserId, currentUserId);
        if (conn.isPresent()) {
            map.put("status", conn.get().getStatus().name());
            map.put("requesterId", conn.get().getRequesterId());
            map.put("connectionId", conn.get().getId());
        } else {
            map.put("status", "NOT_CONNECTED");
        }
        return map;
    }

    public List<UserResponse> getAllUsers(String requestingUserId) {
        List<Connection> userConnections = connectionRepository.findAllConnectionsByUserId(requestingUserId);

        Set<String> excludedUserIds = userConnections.stream()
                .map(c -> c.getRequesterId().equals(requestingUserId) ? c.getReceiverId() : c.getRequesterId())
                .collect(Collectors.toSet());

        excludedUserIds.add(requestingUserId);

        return userRepository.findAll().stream()
                .filter(user -> !excludedUserIds.contains(user.getId()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public UserResponse getUserProfile(String userId){

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(
                        "User not found: "+userId
                ));

        return mapToResponse(user);
    }

    public UserResponse updateProfile(String userId,
                                      UserResponse request){

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(
                        "User not found: "+userId
                ));

        user.setHeadline(request.getHeadline());
        user.setAbout(request.getAbout());
        user.setLocation(request.getLocation());
        user.setSkills(request.getSkills());

        User savedUser = userRepository.save(user);

        // Publish user.updated event
        Map<String, Object> userUpdatedEvent = new HashMap<>();
        userUpdatedEvent.put("userId", savedUser.getId());
        userUpdatedEvent.put("firstName", savedUser.getFirstName());
        userUpdatedEvent.put("lastName", savedUser.getLastName());
        userUpdatedEvent.put("headline", savedUser.getHeadline());
        userUpdatedEvent.put("location", savedUser.getLocation());
        userUpdatedEvent.put("skills", savedUser.getSkills());

        kafkaTemplate.send(USER_UPDATED_TOPIC, savedUser.getId(), userUpdatedEvent);

        log.info("user.updated event published: {}", savedUser.getId());
        return mapToResponse(savedUser);
    }

    public UserResponse uploadProfilePhoto(String userId,
                                           MultipartFile file){

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(
                        "User not found: "+userId
                ));
        String photoUrl = s3Service.uploadFile(
                file, "profiles/" + userId + "/avatar");

        user.setProfilePhotoUrl(photoUrl);
        User savedUser = userRepository.save(user);

        log.info("Profile photo uploaded for user: {}", userId);
        return mapToResponse(savedUser);

    }

    public PresignedUrlResponse getAvatarPresignedUrl(String userId, String fileName, String contentType) {
        log.info("Generating avatar presigned URL for user: {}", userId);
        return s3Service.generatePresignedUploadUrl("profiles/" + userId + "/avatar", fileName, contentType);
    }

    public UserResponse updateProfilePhotoUrl(String userId, String photoUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        user.setProfilePhotoUrl(photoUrl);
        User savedUser = userRepository.save(user);

        // Publish to Kafka so Search Service stays in sync
        Map<String, Object> userUpdatedEvent = new HashMap<>();
        userUpdatedEvent.put("userId", savedUser.getId());
        userUpdatedEvent.put("firstName", savedUser.getFirstName());
        userUpdatedEvent.put("lastName", savedUser.getLastName());
        userUpdatedEvent.put("headline", savedUser.getHeadline());
        userUpdatedEvent.put("about", savedUser.getAbout());
        userUpdatedEvent.put("location", savedUser.getLocation());
        userUpdatedEvent.put("profilePhotoUrl", savedUser.getProfilePhotoUrl());
        userUpdatedEvent.put("coverPhotoUrl", savedUser.getCoverPhotoUrl());

        kafkaTemplate.send(USER_UPDATED_TOPIC, savedUser.getId(), userUpdatedEvent);
        log.info("Avatar updated via pre-signed URL confirmation for user: {}", userId);
        return mapToResponse(savedUser);
    }

    private UserResponse mapToResponse(User user){
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setHeadline(user.getHeadline());
        response.setAbout(user.getAbout());
        response.setLocation(user.getLocation());
        response.setProfilePhotoUrl(user.getProfilePhotoUrl());
        response.setCoverPhotoUrl(user.getCoverPhotoUrl());
        response.setRole(user.getRole());
        response.setSkills(user.getSkills());
        response.setCreatedAt(user.getCreatedAt());

        return response;
    }






















}
