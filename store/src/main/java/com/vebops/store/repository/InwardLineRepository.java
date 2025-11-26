package com.vebops.store.repository;

import com.vebops.store.model.InwardLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InwardLineRepository extends JpaRepository<InwardLine, Long> {
    @Query(
        "select coalesce(sum(line.receivedQty), 0) from InwardLine line where line.record.project.id = :projectId and line.material.id = :materialId"
    )
    Double sumReceivedQtyByProjectAndMaterial(@Param("projectId") Long projectId, @Param("materialId") Long materialId);
    // NEW: total ordered qty per project + material
    @Query(
        "select coalesce(sum(line.orderedQty), 0) " +
        "from InwardLine line " +
        "where line.record.project.id = :projectId and line.material.id = :materialId"
    )
    Double sumOrderedQtyByProjectAndMaterial(
        @Param("projectId") Long projectId,
        @Param("materialId") Long materialId
    );
}
