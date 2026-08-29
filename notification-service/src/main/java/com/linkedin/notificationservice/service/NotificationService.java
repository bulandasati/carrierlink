package com.linkedin.notificationservice.service;

import com.linkedin.notificationservice.client.UserClient;
import com.linkedin.notificationservice.dto.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final UserClient userClient;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:bulandasati06@gmail.com}")
    private String mailFrom;

    /**
     * Consume user.created event
     * Send Welcome notification
     */
    @KafkaListener(topics = "user.created")
    public void consumeUserCreated(@Payload Map<String, Object> payload) {
        try {
            String userId = (String) payload.get("userId");
            String firstName = (String) payload.get("firstName");
            String email = (String) payload.get("email");

            log.info("Received user.created event for userId: {}, email: {}", userId, email);

            sendNotificationWithEmail(
                    userId,
                    email,
                    "Welcome to CarrierLink!",
                    String.format("Welcome %s! Your CarrierLink account has been successfully created. Start connecting with professionals today!", firstName != null ? firstName : "there")
            );
        } catch (Exception e) {
            log.error("Error sending welcome notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume connection.requested event
     * Notify receiver about connection request.
     */
    @KafkaListener(topics = "connection.requested")
    public void consumeConnectionRequest(@Payload Map<String, Object> payload) {
        try {
            String receiverId = (String) payload.get("receiverId");
            String requesterId = (String) payload.get("requesterId");
            String requesterName = getUserFullName(requesterId);

            sendNotification(
                    receiverId,
                    "New Connection Request",
                    String.format("%s wants to connect with you on CarrierLink.", requesterName)
            );
        } catch (Exception e) {
            log.error("Error sending connection request notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume connection.accepted event.
     * Notify requester that connection was accepted
     */
    @KafkaListener(topics = "connection.accepted")
    public void consumeConnectionAccepted(@Payload Map<String, Object> payload) {
        try {
            String receiverId = (String) payload.get("receiverId");
            String requesterId = (String) payload.get("requesterId");
            String receiverName = getUserFullName(receiverId);

            sendNotification(
                    requesterId,
                    "Connection Accepted",
                    String.format("%s accepted your connection request. You are now connected on CarrierLink!", receiverName)
            );
        } catch (Exception e) {
            log.error("Error sending connection accepted notification: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume post.liked event
     */
    @KafkaListener(topics = "post.liked")
    public void consumePostLiked(@Payload Map<String, Object> payload) {
        try {
            String authorId = (String) payload.get("authorId");
            String userId = (String) payload.get("userId");
            String likerName = getUserFullName(userId);

            sendNotification(
                    authorId,
                    "Someone liked your post",
                    String.format("%s liked your post on CarrierLink.", likerName)
            );
        } catch (Exception e) {
            log.error("Error sending like notification: {}", e.getMessage(), e);
        }
    }

    private String getUserFullName(String userId) {
        if (userId == null || userId.isBlank()) {
            return "A CarrierLink member";
        }
        try {
            UserDto user = userClient.getUserById(userId);
            if (user != null) {
                String firstName = user.getFirstName() != null ? user.getFirstName() : "";
                String lastName = user.getLastName() != null ? user.getLastName() : "";
                String fullName = (firstName + " " + lastName).trim();
                if (!fullName.isEmpty()) {
                    return fullName;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user name for {}: {}", userId, e.getMessage());
        }
        return "A CarrierLink member";
    }

    private void sendNotification(String userId, String title, String message) {
        if (userId == null || userId.isBlank()) return;

        try {
            UserDto user = userClient.getUserById(userId);
            if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
                sendNotificationWithEmail(userId, user.getEmail(), title, message);
            } else {
                log.warn("Could not find valid user/email for userId: {}", userId);
            }
        } catch (Exception e) {
            log.error("Failed to send email notification to user {}: {}", userId, e.getMessage());
        }
    }

    private void sendNotificationWithEmail(String userId, String email, String title, String message) {
        log.info("------------------------------------------");
        log.info("NOTIFICATION TRIGGERED");
        log.info("To User: {} ({})", userId, email);
        log.info("Title: {}", title);
        log.info("Message: {}", message);
        log.info("------------------------------------------");

        if (email == null || email.isBlank()) {
            log.warn("Recipient email is empty, skipping email dispatch");
            return;
        }

        if (mailSender != null) {
            try {
                SimpleMailMessage mailMessage = new SimpleMailMessage();
                mailMessage.setFrom(mailFrom);
                mailMessage.setTo(email);
                mailMessage.setSubject(title);
                mailMessage.setText(message);

                mailSender.send(mailMessage);
                log.info("EMAIL SUCCESSFULLY SENT via SMTP to {}", email);
            } catch (Exception e) {
                log.error("SMTP error sending email to {}: {}", email, e.getMessage(), e);
            }
        } else {
            log.warn("JavaMailSender bean is not active. Logged notification for {}", email);
        }
    }
}
