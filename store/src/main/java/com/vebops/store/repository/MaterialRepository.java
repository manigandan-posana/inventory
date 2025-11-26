package com.vebops.store.repository;

import com.vebops.store.model.Material;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface MaterialRepository extends JpaRepository<Material, Long>, JpaSpecificationExecutor<Material> {
    Optional<Material> findByCodeIgnoreCase(String code);

    @Query("select distinct m.category from Material m where m.category is not null and m.category <> ''")
    List<String> distinctCategories();

    @Query("select distinct m.unit from Material m where m.unit is not null and m.unit <> ''")
    List<String> distinctUnits();

    @Query("select distinct m.lineType from Material m where m.lineType is not null and m.lineType <> ''")
    List<String> distinctLineTypes();
}
