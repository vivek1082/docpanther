package com.docpanther.superadmin.repository;

import com.docpanther.superadmin.model.Pod;
import com.docpanther.superadmin.model.PodStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PodRepository extends JpaRepository<Pod, UUID> {
    long countByStatus(PodStatus status);
}
