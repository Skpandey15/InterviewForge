package com.aip.interview.outbox;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.QueryHints;

import java.util.List;
import java.util.UUID;

public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {

    /**
     * Claims a batch of unpublished events. SKIP LOCKED makes the relay safe
     * to run on multiple instances concurrently.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2")) // SKIP LOCKED
    List<OutboxEvent> findTop50ByPublishedAtIsNullOrderByCreatedAt();

    default List<OutboxEvent> claimUnpublishedBatch() {
        return findTop50ByPublishedAtIsNullOrderByCreatedAt();
    }
}
