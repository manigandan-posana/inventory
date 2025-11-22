package com.vebops.store.repository;

import com.vebops.store.model.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {
    Optional<Project> findByCodeIgnoreCase(String code);

    @Query("select distinct upper(substring(p.code, 1, 1)) from Project p where p.code is not null")
    List<String> distinctCodePrefixes();
}
