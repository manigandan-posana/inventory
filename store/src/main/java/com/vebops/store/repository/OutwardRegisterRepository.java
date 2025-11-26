package com.vebops.store.repository;

import com.vebops.store.model.OutwardRegister;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutwardRegisterRepository extends JpaRepository<OutwardRegister, Long> {
    @EntityGraph(attributePaths = {"project", "lines", "lines.material"})
    List<OutwardRegister> findAllByOrderByDateDesc();

    @EntityGraph(attributePaths = {"project", "lines", "lines.material"})
    List<OutwardRegister> findByLinesMaterialIdOrderByDateDesc(Long materialId);

    Optional<OutwardRegister> findByProjectIdAndDate(Long projectId, LocalDate date);

    long countByDate(LocalDate date);
}
