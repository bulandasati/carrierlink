package com.linkedin.userservice.repository;

import com.linkedin.userservice.entity.Connection;
import com.linkedin.userservice.entity.ConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<Connection, String> {

    boolean existsByRequesterIdAndReceiverId(String requesterId, String receiverId);

    @Query("SELECT COUNT(c) > 0 FROM Connection c WHERE (c.requesterId = :u1 AND c.receiverId = :u2) OR (c.requesterId = :u2 AND c.receiverId = :u1)")
    boolean existsConnectionBetween(@Param("u1") String u1, @Param("u2") String u2);

    @Query("SELECT c FROM Connection c WHERE (c.requesterId = :u1 AND c.receiverId = :u2) OR (c.requesterId = :u2 AND c.receiverId = :u1)")
    Optional<Connection> findConnectionBetween(@Param("u1") String u1, @Param("u2") String u2);

    List<Connection> findByRequesterIdAndStatus(String requesterId, ConnectionStatus status);
    List<Connection> findByReceiverIdAndStatus(String receiverId, ConnectionStatus status);

    @Query("SELECT c FROM Connection c WHERE (c.requesterId = :userId OR c.receiverId = :userId) AND c.status = :status")
    List<Connection> findAcceptedConnections(@Param("userId") String userId, @Param("status") ConnectionStatus status);

    @Query("SELECT c FROM Connection c WHERE c.requesterId = :userId OR c.receiverId = :userId")
    List<Connection> findAllConnectionsByUserId(@Param("userId") String userId);
}

