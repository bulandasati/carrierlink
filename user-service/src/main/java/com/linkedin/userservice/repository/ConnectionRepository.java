package com.linkedin.userservice.repository;

import com.linkedin.userservice.entity.Connection;
import com.linkedin.userservice.entity.ConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConnectionRepository extends JpaRepository<Connection, String> {

    boolean existsByRequesterIdAndReceiverId(String requesterId, String receiverId);
    List<Connection> findByRequesterIdAndStatus(String requesterId, ConnectionStatus status);
    List<Connection> findByReceiverIdAndStatus(String receiverId, ConnectionStatus status);

    @Query("SELECT c FROM Connection c WHERE (c.requesterId = :userId OR c.receiverId = :userId) AND c.status = :status")
    List<Connection> findAcceptedConnections(@Param("userId") String userId, @Param("status") ConnectionStatus status);

    @Query("SELECT c FROM Connection c WHERE c.requesterId = :userId OR c.receiverId = :userId")
    List<Connection> findAllConnectionsByUserId(@Param("userId") String userId);
}

