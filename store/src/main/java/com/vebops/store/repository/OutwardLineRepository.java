package com.vebops.store.repository;

import com.vebops.store.model.OutwardLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OutwardLineRepository extends JpaRepository<OutwardLine, Long> {
    @Query(
        "select coalesce(sum(line.issueQty), 0) from OutwardLine line where line.register.project.id = :projectId and line.material.id = :materialId"
    )
    Double sumIssuedQtyByProjectAndMaterial(@Param("projectId") Long projectId, @Param("materialId") Long materialId);
}
