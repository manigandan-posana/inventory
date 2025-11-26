package com.vebops.store.repository;

import com.vebops.store.model.InwardRecord;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InwardRecordRepository extends JpaRepository<InwardRecord, Long> {
    @EntityGraph(attributePaths = {"project", "lines", "lines.material"})
    List<InwardRecord> findAllByOrderByEntryDateDesc();

    @EntityGraph(attributePaths = {"project", "lines", "lines.material"})
    List<InwardRecord> findByLinesMaterialIdOrderByEntryDateDesc(Long materialId);

    long countByEntryDate(LocalDate entryDate);
}
