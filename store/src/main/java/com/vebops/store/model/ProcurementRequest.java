package com.vebops.store.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "procurement_requests")
public class ProcurementRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id")
    private Material material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    private UserAccount requestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private UserAccount resolvedBy;

    private double capturedRequiredQty;
    private double requestedIncrease;
    private Double resolvedRequiredQty;
    private String reason;

    @Enumerated(EnumType.STRING)
    private ProcurementRequestStatus status = ProcurementRequestStatus.PENDING;

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String resolutionNote;

    public Long getId() {
        return id;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public UserAccount getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(UserAccount requestedBy) {
        this.requestedBy = requestedBy;
    }

    public UserAccount getResolvedBy() {
        return resolvedBy;
    }

    public void setResolvedBy(UserAccount resolvedBy) {
        this.resolvedBy = resolvedBy;
    }

    public double getCapturedRequiredQty() {
        return capturedRequiredQty;
    }

    public void setCapturedRequiredQty(double capturedRequiredQty) {
        this.capturedRequiredQty = capturedRequiredQty;
    }

    public double getRequestedIncrease() {
        return requestedIncrease;
    }

    public void setRequestedIncrease(double requestedIncrease) {
        this.requestedIncrease = requestedIncrease;
    }

    public Double getResolvedRequiredQty() {
        return resolvedRequiredQty;
    }

    public void setResolvedRequiredQty(Double resolvedRequiredQty) {
        this.resolvedRequiredQty = resolvedRequiredQty;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public ProcurementRequestStatus getStatus() {
        return status;
    }

    public void setStatus(ProcurementRequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }
}
