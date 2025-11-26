package com.vebops.store.repository;

import com.vebops.store.model.ProcurementRequest;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcurementRequestRepository extends JpaRepository<ProcurementRequest, Long> {
    List<ProcurementRequest> findAllByOrderByCreatedAtDesc();

    List<ProcurementRequest> findByRequestedByIdOrderByCreatedAtDesc(Long userId);
}
