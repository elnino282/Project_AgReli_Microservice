package org.example.season.repository;

import org.example.season.entity.TrainingProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingProgramRepository extends JpaRepository<TrainingProgram, Integer> {
    List<TrainingProgram> findByCategory(String category);

    List<TrainingProgram> findByIsMandatoryTrue();
}

