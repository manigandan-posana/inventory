package com.vebops.store.repository;

import com.vebops.store.model.UserAccount;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

public interface UserRepository extends JpaRepository<UserAccount, Long>, JpaSpecificationExecutor<UserAccount> {
    @EntityGraph(attributePaths = "projects")
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    @Override
    @EntityGraph(attributePaths = "projects")
    Page<UserAccount> findAll(Specification<UserAccount> spec, Pageable pageable);
}
