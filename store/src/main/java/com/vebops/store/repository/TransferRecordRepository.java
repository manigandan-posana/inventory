package com.vebops.store.repository;

import com.vebops.store.model.TransferRecord;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransferRecordRepository extends JpaRepository<TransferRecord, Long> {
    @EntityGraph(attributePaths = {"fromProject", "toProject", "lines", "lines.material"})
    List<TransferRecord> findAllByOrderByTransferDateDesc();

    long countByTransferDate(LocalDate transferDate);
}
