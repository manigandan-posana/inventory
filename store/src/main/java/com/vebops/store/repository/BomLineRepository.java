package com.vebops.store.repository;

import com.vebops.store.model.BomLine;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BomLineRepository extends JpaRepository<BomLine, Long> {
    List<BomLine> findByProjectId(Long projectId);

    Optional<BomLine> findByProjectIdAndMaterialId(Long projectId, Long materialId);

    void deleteByProjectIdAndMaterialId(Long projectId, Long materialId);

    @Query("select distinct b.project.id from BomLine b where b.project.id is not null")
    Set<Long> projectIdsWithAllocations();
}
